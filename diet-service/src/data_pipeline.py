"""
data_pipeline.py: Data Loading, Cleaning, Validation, Explosion, and Feature Engineering
for PoseFit Diet Plan Recommendation Module.
"""

import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from typing import Dict, List, Optional, Tuple, Any
import numpy as np
import pandas as pd

from src.recommender import StandardScaler, OneHotEncoder

NUMERIC_FEATURES = ["calories_kcal", "protein_g", "carbs_g", "fats_g"]
STANDARD_MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack", "Dessert"]


def load_raw_data(filepath: str) -> pd.DataFrame:
    """Load raw dataset CSV and return pandas DataFrame."""
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Dataset not found at {filepath}")
    df = pd.read_csv(filepath)
    return df


def check_missing_and_duplicates(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Check for missing values and duplicates on food_id and dish_name.
    Returns audit dictionary.
    """
    missing_counts = df.isna().sum().to_dict()
    duplicate_food_ids = int(df["food_id"].duplicated().sum())
    duplicate_dish_names = int(df["dish_name"].str.strip().str.lower().duplicated().sum())

    report = {
        "total_rows": len(df),
        "missing_per_column": missing_counts,
        "duplicate_food_ids": duplicate_food_ids,
        "duplicate_dish_names": duplicate_dish_names,
    }
    return report


def validate_atwater_and_outliers(
    df: pd.DataFrame, tolerance: float = 0.05
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Validate macronutrient energy consistency via Atwater factors:
      Expected Calories = (protein_g * 4) + (carbs_g * 4) + (fats_g * 9)
    Tolerance threshold: ~5% deviation.
    Also flags negative values and calories > 800 kcal / 100g.
    """
    df = df.copy()

    # Calculate expected calories
    expected_cal = (df["protein_g"] * 4.0) + (df["carbs_g"] * 4.0) + (df["fats_g"] * 9.0)
    df["calculated_calories"] = expected_cal.round(2)

    # Relative difference (safe against 0 calories)
    denom = np.maximum(df["calories_kcal"], 1.0)
    rel_diff = np.abs(df["calories_kcal"] - expected_cal) / denom
    df["atwater_rel_diff"] = rel_diff.round(4)

    # Flags
    atwater_discrepancies = df[rel_diff > tolerance]
    negative_values = df[
        (df["calories_kcal"] < 0)
        | (df["protein_g"] < 0)
        | (df["carbs_g"] < 0)
        | (df["fats_g"] < 0)
    ]
    high_calorie_outliers = df[df["calories_kcal"] > 800.0]

    report = {
        "atwater_discrepancy_count": len(atwater_discrepancies),
        "atwater_discrepant_sample": atwater_discrepancies[
            ["food_id", "dish_name", "calories_kcal", "calculated_calories", "atwater_rel_diff"]
        ].head(10).to_dict(orient="records"),
        "negative_value_count": len(negative_values),
        "high_calorie_outlier_count": len(high_calorie_outliers),
    }

    return df, report


def explode_meal_types(df: pd.DataFrame) -> pd.DataFrame:
    """
    Explode compound meal_type column (e.g. 'Breakfast/Lunch/Dinner')
    so each slot becomes its own distinct row for slot-based retrieval,
    while preserving original food_id and dish metadata.
    """
    df = df.copy()
    exploded_rows = []

    for _, row in df.iterrows():
        raw_types = str(row["meal_type"]).split("/")
        for m_type in raw_types:
            clean_type = m_type.strip()
            if clean_type:
                new_row = row.to_dict()
                new_row["slot_meal_type"] = clean_type
                exploded_rows.append(new_row)

    exploded_df = pd.DataFrame(exploded_rows)
    exploded_df.reset_index(drop=True, inplace=True)
    return exploded_df


def engineer_features(
    df: pd.DataFrame,
    scaler: Optional[StandardScaler] = None,
    encoder: Optional[OneHotEncoder] = None,
    meal_weight: float = 0.35,
    fit: bool = True,
) -> Tuple[np.ndarray, StandardScaler, OneHotEncoder, pd.DataFrame]:
    """
    Step 4 Feature Engineering:
    - 4 Core numeric features standardized (calories_kcal, protein_g, carbs_g, fats_g)
    - Derived feature: protein_ratio = (protein_g * 4) / calories_kcal (safe for 0-cal items)
    - One-hot encoded slot_meal_type blended at reduced weight (meal_weight ~0.3-0.4x)
    Returns (feature_matrix, fitted_scaler, fitted_encoder, transformed_df).
    """
    df = df.copy()

    # Derived Feature: protein_ratio
    # Safe division for 0 calories (e.g., water, black coffee)
    df["protein_ratio"] = np.where(
        df["calories_kcal"] > 0,
        (df["protein_g"] * 4.0) / df["calories_kcal"],
        0.0,
    )
    df["protein_ratio"] = df["protein_ratio"].clip(0.0, 1.0)

    numeric_cols = NUMERIC_FEATURES + ["protein_ratio"]

    # StandardScaler for numeric features
    if fit or scaler is None:
        scaler = StandardScaler()
        scaled_numeric = scaler.fit_transform(df[numeric_cols].to_numpy())
    else:
        scaled_numeric = scaler.transform(df[numeric_cols].to_numpy())

    # OneHotEncoder for meal slot
    if "slot_meal_type" not in df.columns:
        df["slot_meal_type"] = df["meal_type"]

    if fit or encoder is None:
        encoder = OneHotEncoder(categories=[STANDARD_MEAL_TYPES])
        encoded_meal = encoder.fit_transform(df[["slot_meal_type"]].to_numpy())
    else:
        encoded_meal = encoder.transform(df[["slot_meal_type"]].to_numpy())

    # Blend meal slot with reduced weight
    weighted_meal = encoded_meal * meal_weight

    # Final feature matrix: [scaled_cal, scaled_pro, scaled_carbs, scaled_fats, scaled_pro_ratio, weighted_one_hot_meals]
    feature_matrix = np.hstack([scaled_numeric, weighted_meal])

    # Store scaled features on df for inspection
    for i, col in enumerate(numeric_cols):
        df[f"scaled_{col}"] = scaled_numeric[:, i]

    return feature_matrix, scaler, encoder, df


def run_pipeline_report(csv_path: str) -> Dict[str, Any]:
    """Execute end-to-end data cleaning & preprocessing pipeline and print report."""
    print("=" * 80)
    print("STEP 3: DATA CLEANING & PREPROCESSING REPORT")
    print("=" * 80)

    raw_df = load_raw_data(csv_path)
    print(f"[1] Raw Data Loaded: {len(raw_df)} food items.")
    print("Columns:", list(raw_df.columns))

    # Audit Missing & Duplicates
    clean_report = check_missing_and_duplicates(raw_df)
    print(f"\n[2] Missing Values Check:")
    for col, count in clean_report["missing_per_column"].items():
        print(f"    - {col}: {count} missing")
    print(f"    - Duplicate Food IDs: {clean_report['duplicate_food_ids']}")
    print(f"    - Duplicate Dish Names: {clean_report['duplicate_dish_names']}")

    # Atwater & Outliers
    validated_df, atwater_report = validate_atwater_and_outliers(raw_df, tolerance=0.05)
    print(f"\n[3] Outlier & Atwater Consistency Check (5% tolerance):")
    print(f"    - Negative values found: {atwater_report['negative_value_count']}")
    print(f"    - Calories > 800/100g: {atwater_report['high_calorie_outlier_count']}")
    print(f"    - Rows with >5% Atwater deviation: {atwater_report['atwater_discrepancy_count']} / {len(raw_df)}")
    if atwater_report["atwater_discrepancy_count"] > 0:
        print("    Sample slight discrepancies (normal due to roundings / dietary fibre in natural foods):")
        for item in atwater_report["atwater_discrepant_sample"][:5]:
            print(f"      * [{item['food_id']}] {item['dish_name']}: Listed={item['calories_kcal']} kcal, Calculated={item['calculated_calories']} kcal (diff: {item['atwater_rel_diff']*100:.1f}%)")

    # Explode meal types
    exploded_df = explode_meal_types(raw_df)
    print(f"\n[4] Meal Type Explosion:")
    print(f"    - Original Catalog Rows: {len(raw_df)}")
    print(f"    - Exploded Slot-Meal Rows: {len(exploded_df)}")
    print("    Per-Slot Counts in Exploded Catalog:")
    print(exploded_df["slot_meal_type"].value_counts().to_string())

    # Feature engineering
    print("\n" + "=" * 80)
    print("STEP 4: FEATURE ENGINEERING")
    print("=" * 80)

    feature_matrix, scaler, encoder, transformed_df = engineer_features(
        exploded_df, meal_weight=0.35, fit=True
    )
    print(f"[5] Feature Matrix Shape: {feature_matrix.shape}")
    print(f"    - 4 Core Macros: {NUMERIC_FEATURES}")
    print(f"    - 1 Derived Ratio: protein_ratio = (protein_g * 4) / calories_kcal")
    print(f"    - 5 Weighted One-Hot Meal Slots (weight = 0.35): {STANDARD_MEAL_TYPES}")
    print("\nSample Transformed Rows:")
    sample_cols = ["food_id", "dish_name", "slot_meal_type", "calories_kcal", "protein_ratio", "scaled_calories_kcal", "scaled_protein_g"]
    print(transformed_df[sample_cols].head(5).to_string())

    return {
        "raw_count": len(raw_df),
        "exploded_count": len(exploded_df),
        "feature_shape": feature_matrix.shape,
        "clean_report": clean_report,
        "atwater_report": atwater_report,
        "scaler": scaler,
        "encoder": encoder,
        "exploded_df": exploded_df,
        "feature_matrix": feature_matrix,
    }


if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(current_dir, "..", "data", "pakistani_food_dataset_100g.csv")
    run_pipeline_report(data_path)
