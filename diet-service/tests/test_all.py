import os
import sys
import numpy as np
import pandas as pd
from pydantic import ValidationError

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.data_pipeline import (
    NUMERIC_FEATURES,
    STANDARD_MEAL_TYPES,
    load_raw_data,
    check_missing_and_duplicates,
    validate_atwater_and_outliers,
    explode_meal_types,
    engineer_features,
)
from src.recommender import DietRecommender
from main import (
    app,
    health_check,
    generate_diet_plan,
    DietPlanRequest,
    HealthResponse,
    DietPlanResponse,
)

def get_dataset_path():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_dir, "..", "data", "pakistani_food_dataset_100g.csv")

def test_dataset_exists_and_loads(dataset_path=None):
    if dataset_path is None:
        dataset_path = get_dataset_path()
    df = load_raw_data(dataset_path)
    assert isinstance(df, pd.DataFrame)
    assert len(df) == 495, f"Expected 495 items, found {len(df)}"
    expected_cols = {"food_id", "dish_name", "meal_type", "serving_basis", "calories_kcal", "protein_g", "carbs_g", "fats_g"}
    assert expected_cols.issubset(set(df.columns))

def test_no_missing_values(dataset_path=None):
    if dataset_path is None:
        dataset_path = get_dataset_path()
    df = load_raw_data(dataset_path)
    report = check_missing_and_duplicates(df)
    for col, count in report["missing_per_column"].items():
        assert count == 0, f"Column {col} has {count} missing values"

def test_no_duplicate_food_ids(dataset_path=None):
    if dataset_path is None:
        dataset_path = get_dataset_path()
    df = load_raw_data(dataset_path)
    report = check_missing_and_duplicates(df)
    assert report["duplicate_food_ids"] == 0, f"Found duplicate food_ids: {report['duplicate_food_ids']}"

def test_no_negative_or_extreme_values(dataset_path=None):
    if dataset_path is None:
        dataset_path = get_dataset_path()
    df = load_raw_data(dataset_path)
    _, report = validate_atwater_and_outliers(df, tolerance=0.05)
    assert report["negative_value_count"] == 0, "Found negative nutrient values"
    assert report["high_calorie_outlier_count"] == 0, "Found calories > 800 kcal / 100g"

def test_meal_type_explosion(dataset_path=None):
    if dataset_path is None:
        dataset_path = get_dataset_path()
    df = load_raw_data(dataset_path)
    exploded = explode_meal_types(df)
    assert len(exploded) >= len(df), "Exploded catalog must have at least as many rows as raw catalog"
    assert "slot_meal_type" in exploded.columns

    has_slash = exploded["slot_meal_type"].str.contains("/").any()
    assert not has_slash, "slot_meal_type should contain single meal slot names only"

def test_feature_engineering_dimensions_and_scaling(dataset_path=None):
    if dataset_path is None:
        dataset_path = get_dataset_path()
    df = load_raw_data(dataset_path)
    exploded = explode_meal_types(df)
    feature_matrix, scaler, encoder, transformed_df = engineer_features(
        exploded, meal_weight=0.35, fit=True
    )

    expected_dim = 4 + 1 + len(STANDARD_MEAL_TYPES)
    assert feature_matrix.shape == (len(exploded), expected_dim)
    assert not np.isnan(feature_matrix).any(), "Feature matrix contains NaN values"

    zero_cal_item = transformed_df[transformed_df["calories_kcal"] == 0.0]
    if len(zero_cal_item) > 0:
        assert (zero_cal_item["protein_ratio"] == 0.0).all(), "Zero-calorie items must have protein_ratio = 0.0"

def test_health_check_endpoint():
    resp = health_check()
    assert isinstance(resp, dict)
    assert resp["status"] == "healthy"
    assert "version" in resp
    assert "model_loaded" in resp

def test_generate_diet_plan_valid_request():
    req = DietPlanRequest(
        target_calories=2000.0,
        protein_g=150.0,
        carbs_g=200.0,
        fats_g=65.0,
        fitness_goal="lose weight",
        days=2,
        random_seed=42,
    )
    result = generate_diet_plan(req)
    assert isinstance(result, dict)
    assert result["status"] == "success"
    assert result["days_count"] == 2
    assert len(result["plan_days"]) == 2
    assert "meals" in result["plan_days"][0]
    assert "daily_totals" in result["plan_days"][0]
    assert "error_percentages" in result["plan_days"][0]

    validated_response = DietPlanResponse(**result)
    assert validated_response.status == "success"

def test_generate_diet_plan_with_exclusions():
    req = DietPlanRequest(
        target_calories=1800.0,
        protein_g=130.0,
        carbs_g=180.0,
        fats_g=60.0,
        fitness_goal="maintain weight",
        days=1,
        exclude_food_ids=[85, 292],
        random_seed=42,
    )
    result = generate_diet_plan(req)
    assert isinstance(result, dict)
    assert result["status"] == "success"

    for slot_key, slot_data in result["plan_days"][0]["meals"].items():
        for item in slot_data["items"]:
            assert item["food_id"] not in [85, 292], f"Food ID {item['food_id']} should have been excluded"

def test_generate_diet_plan_invalid_calories():
    try:
        DietPlanRequest(
            target_calories=100.0,
            protein_g=150.0,
            carbs_g=200.0,
            fats_g=65.0,
            fitness_goal="lose weight",
            days=2,
        )
        assert False, "Should have raised ValidationError for target_calories <= 500"
    except ValidationError:
        pass

def test_generate_diet_plan_invalid_days():
    try:
        DietPlanRequest(
            target_calories=2000.0,
            protein_g=150.0,
            carbs_g=200.0,
            fats_g=65.0,
            fitness_goal="lose weight",
            days=45,
        )
        assert False, "Should have raised ValidationError for days > 30"
    except ValidationError:
        pass

def run_e2e_profile_tests():

    models_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models"))
    recommender = DietRecommender(models_dir=models_dir)

    profiles = [
        {
            "name": "Profile 1: Weight Loss (Caloric Deficit)",
            "goal": "lose weight",
            "target_calories": 1400.0,
            "protein_g": 110.0,
            "carbs_g": 140.0,
            "fats_g": 44.0,
            "days": 3,
        },
        {
            "name": "Profile 2: Maintenance (Equilibrium)",
            "goal": "maintain weight",
            "target_calories": 2000.0,
            "protein_g": 135.0,
            "carbs_g": 215.0,
            "fats_g": 67.0,
            "days": 3,
        },
        {
            "name": "Profile 3: Weight Gain (Caloric Surplus)",
            "goal": "gain weight",
            "target_calories": 2800.0,
            "protein_g": 175.0,
            "carbs_g": 350.0,
            "fats_g": 78.0,
            "days": 3,
        },
    ]

    print("\n" + "#" * 90)
    print("STEP 12: END-TO-END RECOMMENDATION VERIFICATION ON 3 SAMPLE PROFILES")
    print("#" * 90)

    summary_records = []

    for prof in profiles:
        print("\n" + "=" * 90)
        print(f"RUNNING: {prof['name']}")
        print(f"Target: {prof['target_calories']} kcal | {prof['protein_g']}g P | {prof['carbs_g']}g C | {prof['fats_g']}g F")
        print("=" * 90)

        plan = recommender.generate_plan(
            target_calories=prof["target_calories"],
            protein_g=prof["protein_g"],
            carbs_g=prof["carbs_g"],
            fats_g=prof["fats_g"],
            fitness_goal=prof["goal"],
            days=prof["days"],
            random_seed=42,
            debug_trace=True,
        )

        for day in plan["plan_days"]:
            day_num = day["day"]
            print(f"\n--- DAY {day_num} MEAL BREAKDOWN ---")
            for slot_key, slot_data in day["meals"].items():
                slot_title = slot_data.get("slot_name", slot_key.title())
                items_str = ", ".join(
                    [f"{it['dish_name']} ({it['portion_grams']}g)" for it in slot_data["items"]]
                )
                print(
                    f"  * {slot_title:<15}: {items_str:<58} -> "
                    f"{slot_data['total_calories']:>5.1f} kcal | "
                    f"{slot_data['total_protein']:>4.1f}g P | "
                    f"{slot_data['total_carbs']:>4.1f}g C | "
                    f"{slot_data['total_fats']:>4.1f}g F"
                )

            tot = day["daily_totals"]
            tgt = day["target_totals"]
            err = day["error_percentages"]
            print(f"\n  >> DAILY SUMMARY (Day {day_num}):")
            print(
                f"     Actual:  {tot['calories']} kcal | {tot['protein_g']}g Pro | {tot['carbs_g']}g Carb | {tot['fats_g']}g Fat\n"
                f"     Target:  {tgt['calories']} kcal | {tgt['protein_g']}g Pro | {tgt['carbs_g']}g Carb | {tgt['fats_g']}g Fat\n"
                f"     Error %: Cal {err['calories_error_pct']}% | Pro {err['protein_error_pct']}% | Carb {err['carbs_error_pct']}% | Fat {err['fats_error_pct']}%"
            )

            summary_records.append({
                "Profile": prof["name"].split(":")[1].strip(),
                "Day": day_num,
                "Target Cal": tgt["calories"],
                "Actual Cal": tot["calories"],
                "Cal Error %": err["calories_error_pct"],
                "Target Pro": tgt["protein_g"],
                "Actual Pro": tot["protein_g"],
                "Pro Error %": err["protein_error_pct"],
                "Target Carb": tgt["carbs_g"],
                "Actual Carb": tot["carbs_g"],
                "Target Fat": tgt["fats_g"],
                "Actual Fat": tot["fats_g"],
            })

    print("\n" + "=" * 90)
    print("OVERALL PERFORMANCE SUMMARY TABLE ACROSS ALL TEST PROFILES")
    print("=" * 90)
    summary_df = pd.DataFrame(summary_records)
    print(summary_df.to_string(index=False))

    assert len(summary_df) == 9, "Expected 9 day evaluation summaries (3 days * 3 profiles)"
    mean_cal_err = summary_df["Cal Error %"].mean()
    print(f"\nAverage Daily Calorie Deviation across all days & profiles: {mean_cal_err:.2f}%")
    assert mean_cal_err < 8.0, f"Average calorie error too high: {mean_cal_err}%"
    print("All End-to-End Profile Tests PASSED with high accuracy!")

def run_regeneration_variability_test():

    models_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models"))
    recommender = DietRecommender(models_dir=models_dir)

    print("\n" + "=" * 90)
    print("NEW FEATURE 2: REGENERATION VARIABILITY TEST (3 CALLS WITH IDENTICAL INPUTS)")
    print("=" * 90)

    target_cal = 2000.0
    pro_g = 140.0
    carb_g = 220.0
    fat_g = 65.0
    goal = "maintain weight"

    runs = []
    dish_signatures = []

    for call_idx in range(1, 4):
        print(f"\n[REGENERATION RUN {call_idx}] Inputs: {target_cal} kcal, {pro_g}g P, {carb_g}g C, {fat_g}g F (No seed)")
        plan = recommender.generate_plan(
            target_calories=target_cal,
            protein_g=pro_g,
            carbs_g=carb_g,
            fats_g=fat_g,
            fitness_goal=goal,
            days=1,
            random_seed=None,
            debug_trace=False,
        )

        day1 = plan["plan_days"][0]
        dishes = []
        for slot_key, slot_data in day1["meals"].items():
            for item in slot_data["items"]:
                dishes.append(f"{item['dish_name']} ({item['portion_grams']}g)")

        sig = " | ".join(dishes)
        dish_signatures.append(sig)
        cal_err = day1["error_percentages"]["calories_error_pct"]
        tot_cal = day1["daily_totals"]["calories"]

        print(f"  * Recommended Menu: {sig}")
        print(f"  * Total Calories: {tot_cal} kcal (Target: {target_cal} kcal, Error: {cal_err}%)")
        runs.append((tot_cal, cal_err))

        assert cal_err <= 10.0, f"Run {call_idx} calorie error exceeded 10%: {cal_err}%"

    print("\n[REGENERATION EVALUATION]")
    distinct_plans = len(set(dish_signatures))
    print(f"Total Runs: 3 | Distinct Menu Variations: {distinct_plans} / 3")
    assert distinct_plans >= 2, "Regeneration did not produce diverse recommendations across 3 calls"
    print("Regeneration Variability Test PASSED! Menus differ dynamically while adhering strictly to macro targets.")

def generate_test_profiles() -> list:

    profiles = []

    loss_calories = [1200.0, 1350.0, 1500.0, 1650.0, 1800.0, 1950.0, 2100.0]
    for cal in loss_calories:
        pro = round((cal * 0.30) / 4.0, 1)
        carb = round((cal * 0.40) / 4.0, 1)
        fat = round((cal * 0.30) / 9.0, 1)
        profiles.append({
            "target_calories": cal,
            "protein_g": pro,
            "carbs_g": carb,
            "fats_g": fat,
            "fitness_goal": "weight_loss",
        })

    maint_calories = [1800.0, 2000.0, 2150.0, 2300.0, 2450.0, 2600.0]
    for cal in maint_calories:
        pro = round((cal * 0.25) / 4.0, 1)
        carb = round((cal * 0.50) / 4.0, 1)
        fat = round((cal * 0.25) / 9.0, 1)
        profiles.append({
            "target_calories": cal,
            "protein_g": pro,
            "carbs_g": carb,
            "fats_g": fat,
            "fitness_goal": "maintenance",
        })

    gain_calories = [2200.0, 2400.0, 2600.0, 2750.0, 2900.0, 3000.0, 3100.0]
    for cal in gain_calories:
        pro = round((cal * 0.25) / 4.0, 1)
        carb = round((cal * 0.50) / 4.0, 1)
        fat = round((cal * 0.25) / 9.0, 1)
        profiles.append({
            "target_calories": cal,
            "protein_g": pro,
            "carbs_g": carb,
            "fats_g": fat,
            "fitness_goal": "weight_gain",
        })

    return profiles

def test_accuracy_and_performance_benchmark():

    models_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models"))
    recommender = DietRecommender(models_dir=models_dir)

    profiles = generate_test_profiles()
    slot_records = []

    print("\n" + "=" * 90)
    print(f"RUNNING ACCURACY BENCHMARK ACROSS {len(profiles)} TEST PROFILES (1200 - 3100 kcal)")
    print("=" * 90)

    for idx, prof in enumerate(profiles, start=1):
        plan = recommender.generate_plan(
            target_calories=prof["target_calories"],
            protein_g=prof["protein_g"],
            carbs_g=prof["carbs_g"],
            fats_g=prof["fats_g"],
            fitness_goal=prof["fitness_goal"],
            days=1,
            random_seed=42 + idx,
            debug_trace=False,
        )

        day_meals = plan["plan_days"][0]["meals"]

        for slot_key, slot_data in day_meals.items():
            slot_name = slot_data["slot_name"]
            tgt_cal = slot_data["target_calories"]
            act_cal = slot_data["total_calories"]
            tgt_pro = slot_data["target_protein"]
            act_pro = slot_data["total_protein"]
            tgt_carb = slot_data["target_carbs"]
            act_carb = slot_data["total_carbs"]
            tgt_fat = slot_data["target_fats"]
            act_fat = slot_data["total_fats"]

            cal_err_pct = round(abs(act_cal - tgt_cal) / max(tgt_cal, 1.0) * 100, 2)
            pro_err_pct = round(abs(act_pro - tgt_pro) / max(tgt_pro, 1.0) * 100, 2)
            carb_err_pct = round(abs(act_carb - tgt_carb) / max(tgt_carb, 1.0) * 100, 2)
            fat_err_pct = round(abs(act_fat - tgt_fat) / max(tgt_fat, 1.0) * 100, 2)
            weighted_loss = slot_data["weighted_loss"]

            dishes = ", ".join([f"{it['dish_name']} ({it['portion_grams']}g)" for it in slot_data["items"]])

            slot_records.append({
                "profile_id": idx,
                "fitness_goal": prof["fitness_goal"],
                "meal_type": slot_name,
                "target_calories": tgt_cal,
                "actual_calories": act_cal,
                "cal_err_pct": cal_err_pct,
                "target_protein": tgt_pro,
                "actual_protein": act_pro,
                "pro_err_pct": pro_err_pct,
                "target_carbs": tgt_carb,
                "actual_carbs": act_carb,
                "carb_err_pct": carb_err_pct,
                "target_fats": tgt_fat,
                "actual_fats": act_fat,
                "fat_err_pct": fat_err_pct,
                "weighted_loss": weighted_loss,
                "recommended_dishes": dishes,
            })

    records_df = pd.DataFrame(slot_records)

    avg_cal_err = records_df["cal_err_pct"].mean()
    avg_pro_err = records_df["pro_err_pct"].mean()
    avg_carb_err = records_df["carb_err_pct"].mean()
    avg_fat_err = records_df["fat_err_pct"].mean()
    avg_loss = records_df["weighted_loss"].mean()

    within_10_pct = (records_df["cal_err_pct"] <= 10.0).mean() * 100
    within_15_pct = (records_df["cal_err_pct"] <= 15.0).mean() * 100

    meal_type_summary = records_df.groupby("meal_type")[
        ["cal_err_pct", "pro_err_pct", "carb_err_pct", "fat_err_pct", "weighted_loss"]
    ].mean().round(2)

    goal_summary = records_df.groupby("fitness_goal")[
        ["cal_err_pct", "pro_err_pct", "carb_err_pct", "fat_err_pct", "weighted_loss"]
    ].mean().round(2)

    print("\n" + "=" * 90)
    print("ACCURACY BENCHMARK RESULTS OVERVIEW")
    print("=" * 90)
    print(f"Total Test Cases Evaluated (Meal Slots): {len(records_df)}")
    print(f"  * Mean Calorie Error:   {avg_cal_err:.2f}%")
    print(f"  * Mean Protein Error:   {avg_pro_err:.2f}%")
    print(f"  * Mean Carbs Error:     {avg_carb_err:.2f}%")
    print(f"  * Mean Fats Error:      {avg_fat_err:.2f}%")
    print(f"  * Mean Weighted Loss:   {avg_loss:.4f}")
    print(f"  * Recommendations <= 10% Calorie Error: {within_10_pct:.1f}%")
    print(f"  * Recommendations <= 15% Calorie Error: {within_15_pct:.1f}%")

    print("\n" + "=" * 90)
    print("ERROR METRICS BREAKDOWN BY MEAL TYPE (SLOT)")
    print("=" * 90)
    print(meal_type_summary.to_string())

    print("\n" + "=" * 90)
    print("ERROR METRICS BREAKDOWN BY FITNESS GOAL")
    print("=" * 90)
    print(goal_summary.to_string())

    csv_path = os.path.join(os.path.dirname(__file__), "accuracy_report.csv")
    records_df.to_csv(csv_path, index=False)
    print(f"\nSaved complete per-slot evaluation data to: {csv_path}")

    assert len(records_df) == 80, f"Expected 80 evaluated meal slots, got {len(records_df)}"
    assert within_10_pct >= 85.0, f"Expected >= 85% recommendations within 10% calorie error, got {within_10_pct:.1f}%"
    assert within_15_pct >= 95.0, f"Expected >= 95% recommendations within 15% calorie error, got {within_15_pct:.1f}%"

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    d_path = os.path.join(base_dir, "..", "data", "pakistani_food_dataset_100g.csv")

    print("Running Pipeline Unit Tests...")
    test_dataset_exists_and_loads(d_path)
    print("  [PASSED] test_dataset_exists_and_loads")
    test_no_missing_values(d_path)
    print("  [PASSED] test_no_missing_values")
    test_no_duplicate_food_ids(d_path)
    print("  [PASSED] test_no_duplicate_food_ids")
    test_no_negative_or_extreme_values(d_path)
    print("  [PASSED] test_no_negative_or_extreme_values")
    test_meal_type_explosion(d_path)
    print("  [PASSED] test_meal_type_explosion")
    test_feature_engineering_dimensions_and_scaling(d_path)
    print("  [PASSED] test_feature_engineering_dimensions_and_scaling")
    print("\nALL PIPELINE UNIT TESTS PASSED!")

    print("\nRunning FastAPI Integration Tests...")
    test_health_check_endpoint()
    print("  [PASSED] test_health_check_endpoint")
    test_generate_diet_plan_valid_request()
    print("  [PASSED] test_generate_diet_plan_valid_request")
    test_generate_diet_plan_with_exclusions()
    print("  [PASSED] test_generate_diet_plan_with_exclusions")
    test_generate_diet_plan_invalid_calories()
    print("  [PASSED] test_generate_diet_plan_invalid_calories")
    test_generate_diet_plan_invalid_days()
    print("  [PASSED] test_generate_diet_plan_invalid_days")
    print("\nALL FASTAPI INTEGRATION TESTS PASSED!")

    run_e2e_profile_tests()
    run_regeneration_variability_test()

    test_accuracy_and_performance_benchmark()
