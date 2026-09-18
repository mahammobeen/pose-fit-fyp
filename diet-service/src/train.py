"""
train.py: Model Training, 5-Fold CV Hyperparameter Tuning, Evaluation,
and Consolidated Artifact Serialization for PoseFit Diet Recommendation Engine.
"""

import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from typing import Any, Dict, List, Optional, Tuple
import joblib
import numpy as np
import pandas as pd

from src.recommender import NearestNeighbors
from src.data_pipeline import (
    NUMERIC_FEATURES,
    load_raw_data,
    explode_meal_types,
    engineer_features,
)


def train_test_split_custom(
    df: pd.DataFrame,
    test_size: float = 0.20,
    random_state: int = 42,
    stratify_col: Optional[str] = "slot_meal_type",
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """Stratified train/test split across meal slot categories."""
    np.random.seed(random_state)
    ref_rows = []
    query_rows = []

    if stratify_col and stratify_col in df.columns:
        for val, group in df.groupby(stratify_col):
            shuffled = group.sample(frac=1.0, random_state=random_state)
            n_test = int(round(len(shuffled) * test_size))
            query_rows.append(shuffled.iloc[:n_test])
            ref_rows.append(shuffled.iloc[n_test:])
        ref_df = pd.concat(ref_rows).sample(frac=1.0, random_state=random_state).reset_index(drop=True)
        query_df = pd.concat(query_rows).sample(frac=1.0, random_state=random_state).reset_index(drop=True)
    else:
        shuffled = df.sample(frac=1.0, random_state=random_state)
        n_test = int(round(len(shuffled) * test_size))
        query_df = shuffled.iloc[:n_test].reset_index(drop=True)
        ref_df = shuffled.iloc[n_test:].reset_index(drop=True)

    return ref_df, query_df


def compute_reconstruction_mae(
    knn_model: NearestNeighbors,
    ref_df: pd.DataFrame,
    query_df: pd.DataFrame,
    query_features: np.ndarray,
) -> Dict[str, float]:
    """
    Step 9: Hold-out neighbor reconstruction MAE.
    For each item in query set, find nearest neighbor in reference set and compute
    mean absolute error across calories, protein, carbs, and fats.
    """
    distances, indices = knn_model.kneighbors(query_features, n_neighbors=1)
    retrieved_indices = indices.flatten()

    retrieved_rows = ref_df.iloc[retrieved_indices].reset_index(drop=True)
    query_rows = query_df.reset_index(drop=True)

    cal_mae = float(np.mean(np.abs(query_rows["calories_kcal"] - retrieved_rows["calories_kcal"])))
    pro_mae = float(np.mean(np.abs(query_rows["protein_g"] - retrieved_rows["protein_g"])))
    carb_mae = float(np.mean(np.abs(query_rows["carbs_g"] - retrieved_rows["carbs_g"])))
    fat_mae = float(np.mean(np.abs(query_rows["fats_g"] - retrieved_rows["fats_g"])))

    mean_cal = float(ref_df["calories_kcal"].mean()) or 1.0
    mean_pro = float(ref_df["protein_g"].mean()) or 1.0
    mean_carb = float(ref_df["carbs_g"].mean()) or 1.0
    mean_fat = float(ref_df["fats_g"].mean()) or 1.0

    comp_mae = (
        0.40 * (cal_mae / mean_cal)
        + 0.25 * (pro_mae / mean_pro)
        + 0.20 * (carb_mae / mean_carb)
        + 0.15 * (fat_mae / mean_fat)
    )

    return {
        "calories_mae": round(cal_mae, 2),
        "protein_mae": round(pro_mae, 2),
        "carbs_mae": round(carb_mae, 2),
        "fats_mae": round(fat_mae, 2),
        "composite_mae": round(comp_mae, 4),
        "avg_neighbor_distance": round(float(np.mean(distances)), 4),
    }


def tune_hyperparameters_5fold_cv(
    ref_features: np.ndarray,
    ref_df: pd.DataFrame,
    n_neighbors_list: List[int] = [5, 10, 15, 20],
    metrics_list: List[str] = ["euclidean", "manhattan"],
    n_splits: int = 5,
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Step 8: Hyperparameter tuning via 5-Fold Cross Validation on reference set.
    Evaluates every parameter combination and reports complete comparison table.
    """
    np.random.seed(42)
    indices = np.arange(len(ref_features))
    np.random.shuffle(indices)
    folds = np.array_split(indices, n_splits)

    tuning_results = []

    for metric in metrics_list:
        for n_neigh in n_neighbors_list:
            fold_cal_maes = []
            fold_pro_maes = []
            fold_carb_maes = []
            fold_fat_maes = []
            fold_comp_maes = []
            fold_distances = []

            for i in range(n_splits):
                val_idx = folds[i]
                train_idx = np.setdiff1d(indices, val_idx)

                X_train_fold, X_val_fold = ref_features[train_idx], ref_features[val_idx]
                df_train_fold, df_val_fold = ref_df.iloc[train_idx], ref_df.iloc[val_idx]

                knn_fold = NearestNeighbors(n_neighbors=n_neigh, metric=metric)
                knn_fold.fit(X_train_fold)

                eval_metrics = compute_reconstruction_mae(
                    knn_fold, df_train_fold, df_val_fold, X_val_fold
                )

                fold_cal_maes.append(eval_metrics["calories_mae"])
                fold_pro_maes.append(eval_metrics["protein_mae"])
                fold_carb_maes.append(eval_metrics["carbs_mae"])
                fold_fat_maes.append(eval_metrics["fats_mae"])
                fold_comp_maes.append(eval_metrics["composite_mae"])
                fold_distances.append(eval_metrics["avg_neighbor_distance"])

            tuning_results.append({
                "metric": metric,
                "n_neighbors": n_neigh,
                "cv_composite_mae": round(float(np.mean(fold_comp_maes)), 4),
                "cv_cal_mae": round(float(np.mean(fold_cal_maes)), 2),
                "cv_pro_mae": round(float(np.mean(fold_pro_maes)), 2),
                "cv_carb_mae": round(float(np.mean(fold_carb_maes)), 2),
                "cv_fat_mae": round(float(np.mean(fold_fat_maes)), 2),
                "cv_avg_distance": round(float(np.mean(fold_distances)), 4),
            })

    results_df = pd.DataFrame(tuning_results)
    results_df.sort_values(by="cv_composite_mae", inplace=True)
    results_df.reset_index(drop=True, inplace=True)

    best_config = results_df.iloc[0].to_dict()
    return results_df, best_config


def evaluate_meal_weight_comparison(
    ref_df: pd.DataFrame,
    query_df: pd.DataFrame,
    weights: List[float] = [0.0, 0.30, 0.35, 0.40, 0.50],
    metric: str = "euclidean",
    n_neighbors: int = 15,
) -> pd.DataFrame:
    """Compare different meal_weight blendings in feature vector."""
    comparison = []

    for w in weights:
        X_ref, scaler, encoder, _ = engineer_features(ref_df, meal_weight=w, fit=True)
        X_query, _, _, _ = engineer_features(query_df, scaler=scaler, encoder=encoder, meal_weight=w, fit=False)

        knn = NearestNeighbors(n_neighbors=n_neighbors, metric=metric)
        knn.fit(X_ref)

        eval_res = compute_reconstruction_mae(knn, ref_df, query_df, X_query)
        comparison.append({
            "meal_weight": w,
            "composite_mae": eval_res["composite_mae"],
            "cal_mae": eval_res["calories_mae"],
            "pro_mae": eval_res["protein_mae"],
            "carb_mae": eval_res["carbs_mae"],
            "fat_mae": eval_res["fats_mae"],
        })

    comp_df = pd.DataFrame(comparison)
    return comp_df


def train_and_serialize_pipeline(
    data_path: str,
    models_dir: str,
    test_size: float = 0.20,
    random_state: int = 42,
) -> Dict[str, Any]:
    """
    Full training pipeline:
    - Step 5: Data Split (Reference 80% vs Query 20%)
    - Step 6: Model Selection (NearestNeighbors)
    - Step 8: Hyperparameter Tuning (5-fold CV)
    - Step 9: Evaluation on Hold-Out Query Set
    - Step 7: Consolidated Artifact Serialization (diet_recommender.joblib)
    """
    os.makedirs(models_dir, exist_ok=True)

    print("=" * 80)
    print("STEP 5: DATA SPLIT (REFERENCE SET 80% vs QUERY SET 20%)")
    print("=" * 80)

    raw_df = load_raw_data(data_path)
    exploded_df = explode_meal_types(raw_df)

    ref_df, query_df = train_test_split_custom(
        exploded_df,
        test_size=test_size,
        random_state=random_state,
        stratify_col="slot_meal_type",
    )

    print(f"Total Exploded Items: {len(exploded_df)}")
    print(f"Reference Catalog (80%): {len(ref_df)} items (Search Index)")
    print(f"Query Set (20%): {len(query_df)} items (Hold-Out Evaluation Set)")
    print("\nReference Slot Distribution:")
    print(ref_df["slot_meal_type"].value_counts().to_string())

    print("\n" + "=" * 80)
    print("STEP 6 & 8: MODEL SELECTION & HYPERPARAMETER TUNING (5-FOLD CV)")
    print("=" * 80)
    print("Model Family: NearestNeighbors (Unsupervised)")

    optimal_meal_weight = 0.35
    X_ref, scaler, encoder, _ = engineer_features(ref_df, meal_weight=optimal_meal_weight, fit=True)
    X_query, _, _, _ = engineer_features(query_df, scaler=scaler, encoder=encoder, meal_weight=optimal_meal_weight, fit=False)

    cv_table, best_config = tune_hyperparameters_5fold_cv(
        X_ref,
        ref_df,
        n_neighbors_list=[5, 10, 15, 20],
        metrics_list=["euclidean", "manhattan"],
        n_splits=5,
    )

    print("\n5-Fold Cross Validation Results (All Configurations Tested):")
    print(cv_table.to_string(index=False))
    print(f"\nOptimal Hyperparameters: metric='{best_config['metric']}', n_neighbors={int(best_config['n_neighbors'])}")

    print("\n" + "=" * 80)
    print("STEP 4 & 10: MEAL WEIGHT SENSITIVITY & MODEL IMPROVEMENT")
    print("=" * 80)
    weight_comp = evaluate_meal_weight_comparison(
        ref_df, query_df, weights=[0.0, 0.30, 0.35, 0.40, 0.50],
        metric=best_config["metric"], n_neighbors=int(best_config["n_neighbors"])
    )
    print("Evaluation across feature weights (Meal One-Hot Weight Beta):")
    print(weight_comp.to_string(index=False))

    print("\n" + "=" * 80)
    print("STEP 7: FINAL MODEL TRAINING & CONSOLIDATED ARTIFACT SERIALIZATION")
    print("=" * 80)

    final_knn = NearestNeighbors(
        n_neighbors=int(best_config["n_neighbors"]),
        metric=best_config["metric"],
        algorithm="auto",
        n_jobs=-1,
    )
    final_knn.fit(X_ref)

    print("\n" + "=" * 80)
    print("STEP 9: FINAL MODEL EVALUATION (HOLD-OUT QUERY SET MAE)")
    print("=" * 80)

    final_eval = compute_reconstruction_mae(final_knn, ref_df, query_df, X_query)
    print(f"Hold-Out Query Set Reconstruction MAE (N={len(query_df)} items):")
    print(f"  - Calories MAE: {final_eval['calories_mae']} kcal / 100g")
    print(f"  - Protein MAE:  {final_eval['protein_mae']} g / 100g")
    print(f"  - Carbs MAE:    {final_eval['carbs_mae']} g / 100g")
    print(f"  - Fats MAE:     {final_eval['fats_mae']} g / 100g")
    print(f"  - Composite Normalized MAE: {final_eval['composite_mae']}")
    print(f"  - Average Feature Distance: {final_eval['avg_neighbor_distance']}")

    food_metadata = {
        "catalog_df": exploded_df,
        "reference_df": ref_df,
        "food_id_lookup": raw_df.set_index("food_id").to_dict(orient="index"),
        "features_matrix": X_ref,
        "feature_columns": NUMERIC_FEATURES + ["protein_ratio"],
        "meal_weight": optimal_meal_weight,
        "best_config": best_config,
        "final_eval": final_eval,
    }

    # Consolidated Single Joblib Artifact
    bundle_path = os.path.join(models_dir, "diet_recommender.joblib")
    joblib.dump(
        {
            "knn_model": final_knn,
            "scaler": scaler,
            "encoder": encoder,
            "food_metadata": food_metadata,
        },
        bundle_path,
    )

    print("\nSaved Consolidated Artifact:")
    print(f"  - Bundle: {bundle_path} ({os.path.getsize(bundle_path)} bytes)")

    return {
        "final_knn": final_knn,
        "scaler": scaler,
        "encoder": encoder,
        "best_config": best_config,
        "final_eval": final_eval,
        "cv_table": cv_table,
    }


if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(current_dir, "..", "data", "pakistani_food_dataset_100g.csv")
    models_dir = os.path.join(current_dir, "..", "models")
    train_and_serialize_pipeline(data_path, models_dir)
