"""
recommender.py: Consolidated Core ML Recommendation Engine for PoseFit.
Combines:
  1. ML Primitives (StandardScaler, OneHotEncoder, NearestNeighbors)
  2. Rule-Based Beverage Layer (BeverageManager)
  3. Constrained Portion Optimizer (PortionOptimizer)
  4. Unified Inference Engine (DietRecommender)
"""

import os
from typing import Any, Dict, List, Optional, Set, Tuple
import joblib
import numpy as np
import pandas as pd
import scipy.spatial.distance as dist

# Core Constants
NUMERIC_FEATURES = ["calories_kcal", "protein_g", "carbs_g", "fats_g"]
STANDARD_MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack", "Dessert"]

DEFAULT_SLOT_DISTRIBUTION = {
    "Breakfast": 0.25,
    "Lunch": 0.35,
    "Dinner": 0.30,
    "Snack": 0.10,
}

SLOT_TO_CATALOG_MEAL_TYPE = {
    "Breakfast": "Breakfast",
    "Lunch": "Lunch",
    "Dinner": "Dinner",
    "Snack": "Snack",
}


# =====================================================================
# SECTION 1: CUSTOM ML ALGORITHMIC PRIMITIVES
# =====================================================================

class StandardScaler:
    """Standardize features by removing mean and scaling to unit variance (z = (x - u) / s)."""

    def __init__(self):
        self.mean_ = None
        self.scale_ = None
        self.var_ = None
        self.n_features_in_ = None

    def fit(self, X: np.ndarray, y=None):
        X = np.asarray(X, dtype=np.float64)
        self.mean_ = np.mean(X, axis=0)
        self.var_ = np.var(X, axis=0)
        self.scale_ = np.sqrt(self.var_)
        self.scale_[self.scale_ == 0.0] = 1.0
        self.n_features_in_ = X.shape[1]
        return self

    def transform(self, X: np.ndarray) -> np.ndarray:
        X = np.asarray(X, dtype=np.float64)
        return (X - self.mean_) / self.scale_

    def fit_transform(self, X: np.ndarray, y=None) -> np.ndarray:
        return self.fit(X).transform(X)


class OneHotEncoder:
    """Encode categorical features as a one-hot numeric matrix."""

    def __init__(self, categories: Optional[List[List[str]]] = None):
        self.categories = categories
        self.categories_ = None

    def fit(self, X: np.ndarray, y=None):
        if self.categories is not None:
            self.categories_ = [np.array(c) for c in self.categories]
        else:
            X_arr = np.asarray(X)
            self.categories_ = [np.unique(X_arr[:, i]) for i in range(X_arr.shape[1])]
        return self

    def transform(self, X: np.ndarray) -> np.ndarray:
        X_arr = np.asarray(X)
        encoded_cols = []
        for i, cats in enumerate(self.categories_):
            col = X_arr[:, i]
            for cat in cats:
                encoded_cols.append((col == cat).astype(np.float64))
        return np.column_stack(encoded_cols)

    def fit_transform(self, X: np.ndarray, y=None) -> np.ndarray:
        return self.fit(X).transform(X)


class NearestNeighbors:
    """Unsupervised K-Nearest-Neighbors implementation in continuous macro space."""

    def __init__(
        self,
        n_neighbors: int = 5,
        metric: str = "euclidean",
        algorithm: str = "auto",
        n_jobs: int = -1,
    ):
        self.n_neighbors = n_neighbors
        metric_clean = metric.lower()
        self.metric = "cityblock" if metric_clean == "manhattan" else metric_clean
        self.algorithm = algorithm
        self.n_jobs = n_jobs
        self._fit_X = None

    def fit(self, X: np.ndarray, y=None):
        self._fit_X = np.asarray(X, dtype=np.float64)
        return self

    def kneighbors(
        self,
        X: Optional[np.ndarray] = None,
        n_neighbors: Optional[int] = None,
        return_distance: bool = True,
    ) -> Tuple[np.ndarray, np.ndarray]:
        if self._fit_X is None:
            raise ValueError("NearestNeighbors must be fitted before querying.")

        if X is None:
            X = self._fit_X
        else:
            X = np.asarray(X, dtype=np.float64)

        if n_neighbors is None:
            n_neighbors = self.n_neighbors

        n_neighbors = min(n_neighbors, len(self._fit_X))
        dists = dist.cdist(X, self._fit_X, metric=self.metric)

        sorted_indices = np.argsort(dists, axis=1)[:, :n_neighbors]
        sorted_distances = np.take_along_axis(dists, sorted_indices, axis=1)

        if return_distance:
            return sorted_distances, sorted_indices
        return sorted_indices


# =====================================================================
# SECTION 2: RULE-BASED BEVERAGE MANAGER
# =====================================================================

STANDALONE_BEVERAGE_KEYWORDS = [
    "Doodh Patti", "Green Tea", "Black Tea", "Milk Tea", "Kahwa",
    "Black Coffee", "Milk Coffee", "Banana Milkshake", "Mango Milkshake",
    "Chocolate Milkshake", "Lassi (Sweet)", "Lassi (Salted)", "Sugarcane Juice",
    "Fresh Orange Juice", "Whole Egg + Milk Shake", "Whole Milk with Banana Shake",
    "Rooh Afza", "Tamarind Sharbat", "Doodh Soda", "Whey Protein Shake",
    "Egg White Protein Shake",
]

BEVERAGE_RULES = {
    "Breakfast": {
        "weight_loss": {
            "keywords": [
                "Black Coffee (No Sugar)", "Black Tea (No Sugar)",
                "Kahwa (Green Tea with Spices, No Sugar)", "Black Coffee (With Sugar)",
            ],
            "default_grams": 150,
        },
        "weight_gain": {
            "keywords": [
                "Banana Milkshake (Milk & Banana, No Sugar Added)",
                "Whole Milk with Banana Shake", "Whey Protein Shake (Milk-Based)",
                "Doodh Patti (Milk Tea)", "Mango Milkshake (Milk & Mango, Sweetened)",
                "Chocolate Milkshake (Sweetened)",
            ],
            "default_grams": 150,
        },
        "maintenance": {
            "keywords": [
                "Doodh Patti (Milk Tea)", "Milk Tea (With Sugar)",
                "Milk Coffee (With Sugar)", "Banana Milkshake (Milk & Banana, No Sugar Added)",
                "Fresh Orange Juice (No Sugar Added)",
            ],
            "default_grams": 150,
        },
    },
    "Snack": {
        "weight_loss": {
            "keywords": [
                "Green Tea (Plain)", "Kahwa (Green Tea with Spices, No Sugar)", "Black Tea (No Sugar)",
            ],
            "default_grams": 150,
        },
        "weight_gain": {
            "keywords": [
                "Doodh Patti (Milk Tea)", "Milk Tea (With Sugar)", "Milk Coffee (With Sugar)",
                "Doodh Soda (Milk & Soda Drink)", "Banana Milkshake (Milk & Banana, No Sugar Added)",
            ],
            "default_grams": 150,
        },
        "maintenance": {
            "keywords": [
                "Doodh Patti (Milk Tea)", "Milk Tea (With Sugar)", "Green Tea (Plain)",
                "Kahwa (Green Tea with Spices, No Sugar)", "Milk Coffee (With Sugar)",
            ],
            "default_grams": 150,
        },
    },
}


def normalize_goal_key(goal: str) -> str:
    """Normalize user goal string into weight_loss, weight_gain, or maintenance."""
    g = str(goal).strip().lower()
    if "lose" in g or "deficit" in g or "loss" in g:
        return "weight_loss"
    elif "gain" in g or "surplus" in g or "bulk" in g:
        return "weight_gain"
    else:
        return "maintenance"


def get_standalone_beverage_food_ids(catalog_df: pd.DataFrame) -> Set[int]:
    """Return set of food_ids corresponding to standalone beverage items."""
    bev_ids = set()
    for _, row in catalog_df.iterrows():
        dish_name = str(row["dish_name"]).strip()
        for kw in STANDALONE_BEVERAGE_KEYWORDS:
            if kw.lower() in dish_name.lower():
                bev_ids.add(int(row["food_id"]))
                break
    return bev_ids


class BeverageManager:
    """Manages goal-matched beverage selection, nutrient deduction, and rotation."""

    def __init__(self, catalog_df: pd.DataFrame):
        self.catalog_df = catalog_df.drop_duplicates(subset=["food_id"]).copy()
        self.beverage_food_ids = get_standalone_beverage_food_ids(self.catalog_df)

    def select_beverage(
        self,
        slot_name: str,
        fitness_goal: str,
        day_num: int = 1,
        already_used_food_ids: Optional[Set[int]] = None,
        exclude_food_ids: Optional[Set[int]] = None,
        random_sample: bool = False,
        rng: Optional[np.random.RandomState] = None,
    ) -> Optional[Dict[str, Any]]:
        if slot_name not in BEVERAGE_RULES:
            return None

        goal_key = normalize_goal_key(fitness_goal)
        slot_rules = BEVERAGE_RULES[slot_name].get(goal_key, BEVERAGE_RULES[slot_name]["maintenance"])
        target_keywords = slot_rules["keywords"]
        serving_grams = slot_rules["default_grams"]
        portion_mult = round(serving_grams / 100.0, 2)

        if already_used_food_ids is None:
            already_used_food_ids = set()
        if exclude_food_ids is None:
            exclude_food_ids = set()

        total_excluded = already_used_food_ids.union(exclude_food_ids)

        matching_items = []
        for kw in target_keywords:
            matches = self.catalog_df[
                self.catalog_df["dish_name"].str.contains(kw, case=False, regex=False)
            ]
            for _, row in matches.iterrows():
                item = row.to_dict()
                if item["food_id"] not in [m["food_id"] for m in matching_items]:
                    matching_items.append(item)

        if not matching_items:
            matches = self.catalog_df[self.catalog_df["food_id"].isin(self.beverage_food_ids)]
            matching_items = matches.to_dict(orient="records")

        if not matching_items:
            return None

        unused_matching = [it for it in matching_items if it["food_id"] not in total_excluded]
        candidate_pool = unused_matching if unused_matching else matching_items

        if random_sample:
            if rng is not None:
                selected_item = rng.choice(candidate_pool)
            else:
                selected_item = np.random.choice(candidate_pool)
        else:
            selected_idx = (day_num - 1) % len(candidate_pool)
            selected_item = candidate_pool[selected_idx]

        cal = round(selected_item["calories_kcal"] * portion_mult, 1)
        pro = round(selected_item["protein_g"] * portion_mult, 1)
        carb = round(selected_item["carbs_g"] * portion_mult, 1)
        fat = round(selected_item["fats_g"] * portion_mult, 1)

        return {
            "food_id": int(selected_item["food_id"]),
            "dish_name": selected_item["dish_name"],
            "portion_multiplier": float(portion_mult),
            "portion_grams": int(serving_grams),
            "calories": cal,
            "protein": pro,
            "carbs": carb,
            "fats": fat,
            "is_beverage": True,
        }


# =====================================================================
# SECTION 3: CONSTRAINED PORTION OPTIMIZER
# =====================================================================

class PortionOptimizer:
    """Constrained portion grid search solver [0.5x, 3.0x] with single-dish preference."""

    def __init__(
        self,
        min_multiplier: float = 0.5,
        max_multiplier: float = 3.0,
        step_multiplier: float = 0.1,
        weight_cal: float = 0.40,
        weight_pro: float = 0.25,
        weight_carb: float = 0.20,
        weight_fat: float = 0.15,
        single_dish_threshold: float = 0.18,
    ):
        self.min_multiplier = min_multiplier
        self.max_multiplier = max_multiplier
        self.step_multiplier = step_multiplier
        self.weight_cal = weight_cal
        self.weight_pro = weight_pro
        self.weight_carb = weight_carb
        self.weight_fat = weight_fat
        self.single_dish_threshold = single_dish_threshold

        self.multipliers = np.arange(
            min_multiplier, max_multiplier + step_multiplier / 2, step_multiplier
        ).round(2)

    def calculate_loss(
        self,
        actual_cal: float,
        actual_pro: float,
        actual_carb: float,
        actual_fat: float,
        target_cal: float,
        target_pro: float,
        target_carb: float,
        target_fat: float,
    ) -> float:
        """Compute weighted percentage macro loss."""
        cal_err = abs(actual_cal - target_cal) / max(target_cal, 1.0)
        pro_err = abs(actual_pro - target_pro) / max(target_pro, 1.0)
        carb_err = abs(actual_carb - target_carb) / max(target_carb, 1.0)
        fat_err = abs(actual_fat - target_fat) / max(target_fat, 1.0)

        total_loss = (
            (self.weight_cal * cal_err)
            + (self.weight_pro * pro_err)
            + (self.weight_carb * carb_err)
            + (self.weight_fat * fat_err)
        )
        return float(total_loss)

    def optimize_meal_slot(
        self,
        candidate_items: List[Dict[str, Any]],
        target_cal: float,
        target_pro: float,
        target_carb: float,
        target_fat: float,
        allow_two_dish_combos: bool = False,
        max_candidates: int = 40,
        random_sample: bool = False,
        rng: Optional[np.random.RandomState] = None,
        debug_trace: bool = False,
    ) -> Dict[str, Any]:
        if not candidate_items:
            raise ValueError("No candidate food items provided to PortionOptimizer.")

        candidates = candidate_items[:max_candidates]
        single_dish_plans = []
        trace_logs = []

        for dish in candidates:
            c_cal = dish["calories_kcal"]
            c_pro = dish["protein_g"]
            c_carb = dish["carbs_g"]
            c_fat = dish["fats_g"]

            best_m_for_dish = None
            best_loss_for_dish = float("inf")
            best_plan_for_dish = None

            for m in self.multipliers:
                a_cal = c_cal * m
                a_pro = c_pro * m
                a_carb = c_carb * m
                a_fat = c_fat * m

                loss = self.calculate_loss(
                    a_cal, a_pro, a_carb, a_fat,
                    target_cal, target_pro, target_carb, target_fat
                )

                if loss < best_loss_for_dish:
                    best_loss_for_dish = loss
                    best_m_for_dish = m
                    best_plan_for_dish = {
                        "items": [
                            {
                                "food_id": int(dish["food_id"]),
                                "dish_name": dish["dish_name"],
                                "portion_multiplier": float(m),
                                "portion_grams": int(round(m * 100)),
                                "calories": round(a_cal, 1),
                                "protein": round(a_pro, 1),
                                "carbs": round(a_carb, 1),
                                "fats": round(a_fat, 1),
                            }
                        ],
                        "total_calories": round(a_cal, 1),
                        "total_protein": round(a_pro, 1),
                        "total_carbs": round(a_carb, 1),
                        "total_fats": round(a_fat, 1),
                        "target_calories": round(target_cal, 1),
                        "target_protein": round(target_pro, 1),
                        "target_carbs": round(target_carb, 1),
                        "target_fats": round(target_fat, 1),
                        "weighted_loss": round(loss, 4),
                        "calorie_error_pct": round(abs(a_cal - target_cal) / max(target_cal, 1.0) * 100, 2),
                    }

            if best_plan_for_dish is not None:
                single_dish_plans.append(best_plan_for_dish)
                if debug_trace and len(trace_logs) < 10:
                    trace_logs.append(
                        f"Candidate '{dish['dish_name']}': Best mult={best_m_for_dish}x ({int(best_m_for_dish*100)}g) -> "
                        f"{best_plan_for_dish['total_calories']} kcal, {best_plan_for_dish['total_protein']}g P, "
                        f"Loss={best_loss_for_dish:.4f}, CalErr={best_plan_for_dish['calorie_error_pct']}%"
                    )

        if debug_trace and trace_logs:
            print(f"[PORTION OPTIMIZER TRACE] Target: {target_cal:.1f} kcal, {target_pro:.1f}g P, {target_carb:.1f}g C, {target_fat:.1f}g F")
            for t in trace_logs:
                print(f"  * {t}")

        single_dish_plans.sort(key=lambda x: x["weighted_loss"])
        best_single = single_dish_plans[0]

        is_single_good = (
            best_single["weighted_loss"] <= self.single_dish_threshold
            or best_single["calorie_error_pct"] <= 15.0
            or not allow_two_dish_combos
            or len(candidates) < 2
        )

        if is_single_good:
            return self._sample_or_best(single_dish_plans, random_sample, rng)

        # Fallback to two-dish combinations
        two_dish_mults = np.array([0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5])
        pair_candidates = candidates[:12]
        num_cand = len(pair_candidates)
        two_dish_plans = []

        for i in range(num_cand):
            d1 = pair_candidates[i]
            c1_cal, c1_pro, c1_carb, c1_fat = (
                d1["calories_kcal"], d1["protein_g"], d1["carbs_g"], d1["fats_g"]
            )

            for j in range(i + 1, num_cand):
                d2 = pair_candidates[j]
                if d1["food_id"] == d2["food_id"]:
                    continue

                c2_cal, c2_pro, c2_carb, c2_fat = (
                    d2["calories_kcal"], d2["protein_g"], d2["carbs_g"], d2["fats_g"]
                )

                for m1 in two_dish_mults:
                    for m2 in two_dish_mults:
                        if (m1 + m2) * 100 > 450:
                            continue

                        a_cal = (c1_cal * m1) + (c2_cal * m2)
                        a_pro = (c1_pro * m1) + (c2_pro * m2)
                        a_carb = (c1_carb * m1) + (c2_carb * m2)
                        a_fat = (c1_fat * m1) + (c2_fat * m2)

                        loss = self.calculate_loss(
                            a_cal, a_pro, a_carb, a_fat,
                            target_cal, target_pro, target_carb, target_fat
                        )

                        two_dish_plans.append({
                            "items": [
                                {
                                    "food_id": int(d1["food_id"]),
                                    "dish_name": d1["dish_name"],
                                    "portion_multiplier": float(m1),
                                    "portion_grams": int(round(m1 * 100)),
                                    "calories": round(c1_cal * m1, 1),
                                    "protein": round(c1_pro * m1, 1),
                                    "carbs": round(c1_carb * m1, 1),
                                    "fats": round(c1_fat * m1, 1),
                                },
                                {
                                    "food_id": int(d2["food_id"]),
                                    "dish_name": d2["dish_name"],
                                    "portion_multiplier": float(m2),
                                    "portion_grams": int(round(m2 * 100)),
                                    "calories": round(c2_cal * m2, 1),
                                    "protein": round(c2_pro * m2, 1),
                                    "carbs": round(c2_carb * m2, 1),
                                    "fats": round(c2_fat * m2, 1),
                                },
                            ],
                            "total_calories": round(a_cal, 1),
                            "total_protein": round(a_pro, 1),
                            "total_carbs": round(a_carb, 1),
                            "total_fats": round(a_fat, 1),
                            "target_calories": round(target_cal, 1),
                            "target_protein": round(target_pro, 1),
                            "target_carbs": round(target_carb, 1),
                            "target_fats": round(target_fat, 1),
                            "weighted_loss": round(loss, 4),
                            "calorie_error_pct": round(abs(a_cal - target_cal) / max(target_cal, 1.0) * 100, 2),
                        })

        if two_dish_plans:
            two_dish_plans.sort(key=lambda x: x["weighted_loss"])
            best_two = two_dish_plans[0]
            if best_two["weighted_loss"] < (best_single["weighted_loss"] * 0.75):
                return self._sample_or_best(two_dish_plans, random_sample, rng)

        return self._sample_or_best(single_dish_plans, random_sample, rng)

    def _sample_or_best(
        self,
        sorted_plans: List[Dict[str, Any]],
        random_sample: bool = False,
        rng: Optional[np.random.RandomState] = None,
    ) -> Dict[str, Any]:
        if not sorted_plans:
            raise ValueError("No plans available to select.")

        if not random_sample or len(sorted_plans) == 1:
            return sorted_plans[0]

        best_loss = sorted_plans[0]["weighted_loss"]
        eligible = [
            p for p in sorted_plans
            if p["weighted_loss"] <= max(best_loss * 1.25, 0.15) and p["calorie_error_pct"] <= 18.0
        ]

        if not eligible:
            eligible = sorted_plans[:min(3, len(sorted_plans))]

        top_k = eligible[:min(5, len(eligible))]

        if rng is not None:
            chosen_idx = rng.choice(len(top_k))
        else:
            chosen_idx = np.random.choice(len(top_k))

        return top_k[chosen_idx]


# =====================================================================
# SECTION 4: UNIFIED DIET RECOMMENDER INFERENCE ENGINE
# =====================================================================

class DietRecommender:
    """High-level recommendation engine orchestrating KNN retrieval, beverages, and portion optimization."""

    def __init__(self, models_dir: Optional[str] = None):
        if models_dir is None:
            models_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "models")

        self.models_dir = models_dir
        self.knn_model = None
        self.scaler = None
        self.encoder = None
        self.food_metadata = None
        self.optimizer = PortionOptimizer()
        self.beverage_mgr: Optional[BeverageManager] = None
        self.standalone_bev_ids: Set[int] = set()
        self._load_artifacts()

    def _load_artifacts(self):
        """Load model artifacts from consolidated diet_recommender.joblib file."""
        consolidated_path = os.path.join(self.models_dir, "diet_recommender.joblib")

        if os.path.exists(consolidated_path):
            bundle = joblib.load(consolidated_path)
            self.knn_model = bundle["knn_model"]
            self.scaler = bundle["scaler"]
            self.encoder = bundle["encoder"]
            self.food_metadata = bundle["food_metadata"]
        else:
            # Fallback to individual artifact files if present
            model_path = os.path.join(self.models_dir, "knn_model.joblib")
            scaler_path = os.path.join(self.models_dir, "scaler.joblib")
            encoder_path = os.path.join(self.models_dir, "meal_encoder.joblib")
            metadata_path = os.path.join(self.models_dir, "food_metadata.joblib")

            if not (os.path.exists(model_path) and os.path.exists(scaler_path) and os.path.exists(metadata_path)):
                raise FileNotFoundError(
                    f"Model artifacts missing in {self.models_dir}. Please run train.py first."
                )

            self.knn_model = joblib.load(model_path)
            self.scaler = joblib.load(scaler_path)
            self.encoder = joblib.load(encoder_path)
            self.food_metadata = joblib.load(metadata_path)

        self.catalog_df = self.food_metadata["catalog_df"]
        self.ref_df = self.food_metadata["reference_df"]
        self.food_lookup = self.food_metadata["food_id_lookup"]
        self.meal_weight = self.food_metadata.get("meal_weight", 0.35)

        self.beverage_mgr = BeverageManager(self.catalog_df)
        self.standalone_bev_ids = get_standalone_beverage_food_ids(self.catalog_df)

    def retrieve_candidates(
        self,
        target_cal: float,
        target_pro: float,
        target_carb: float,
        target_fat: float,
        catalog_meal_type: str,
        n_candidates: int = 50,
        already_used_food_ids: Optional[Set[int]] = None,
        exclude_food_ids: Optional[Set[int]] = None,
        debug_log: bool = False,
    ) -> List[Dict[str, Any]]:
        if already_used_food_ids is None:
            already_used_food_ids = set()
        if exclude_food_ids is None:
            exclude_food_ids = set()

        total_excluded_ids = already_used_food_ids.union(exclude_food_ids).union(self.standalone_bev_ids)

        target_pro_ratio = (target_pro * 4.0) / max(target_cal, 1.0)
        target_pro_ratio = min(max(target_pro_ratio, 0.0), 1.0)

        density_factor = max(1.0, target_cal / 200.0)

        query_numeric = np.array([[
            target_cal / density_factor,
            target_pro / density_factor,
            target_carb / density_factor,
            target_fat / density_factor,
            target_pro_ratio,
        ]])

        scaled_query_num = self.scaler.transform(query_numeric)
        encoded_meal = self.encoder.transform([[catalog_meal_type]]) * self.meal_weight
        query_vector = np.hstack([scaled_query_num, encoded_meal])

        if debug_log:
            print(f"[DEBUG KNN QUERY] Slot: {catalog_meal_type} | Target: {target_cal:.1f} kcal, {target_pro:.1f}g P, {target_carb:.1f}g C, {target_fat:.1f}g F")
            print(f"  * Query Numeric (100g basis): [Cal={query_numeric[0,0]:.1f}, Pro={query_numeric[0,1]:.1f}, Carb={query_numeric[0,2]:.1f}, Fat={query_numeric[0,3]:.1f}, ProRatio={query_numeric[0,4]:.4f}]")
            print(f"  * Scaled Feature Vector: {np.round(query_vector.flatten(), 4).tolist()}")

        k_retrieve = min(n_candidates * 2, len(self.ref_df))
        distances, indices = self.knn_model.kneighbors(query_vector, n_neighbors=k_retrieve)

        retrieved_df = self.ref_df.iloc[indices.flatten()].copy()
        retrieved_df["knn_distance"] = distances.flatten()

        slot_matched_df = retrieved_df[retrieved_df["slot_meal_type"] == catalog_meal_type]
        if len(slot_matched_df) < 15:
            full_slot_df = self.catalog_df[self.catalog_df["slot_meal_type"] == catalog_meal_type]
            candidates_df = pd.concat([slot_matched_df, full_slot_df]).drop_duplicates(subset=["food_id"])
        else:
            candidates_df = slot_matched_df.drop_duplicates(subset=["food_id"])

        candidate_items = candidates_df.to_dict(orient="records")
        unused_candidates = [d for d in candidate_items if d["food_id"] not in total_excluded_ids]

        if len(unused_candidates) >= 5:
            return unused_candidates
        elif unused_candidates:
            fallback = [d for d in candidate_items if d["food_id"] not in self.standalone_bev_ids]
            return unused_candidates + [d for d in fallback if d["food_id"] not in [u["food_id"] for u in unused_candidates]]
        else:
            fallback = [d for d in candidate_items if d["food_id"] not in self.standalone_bev_ids]
            return fallback if fallback else candidate_items

    def recommend_slot(
        self,
        slot_name: str,
        target_cal: float,
        target_pro: float,
        target_carb: float,
        target_fat: float,
        fitness_goal: str = "maintain weight",
        day_num: int = 1,
        already_used_food_ids: Optional[Set[int]] = None,
        exclude_food_ids: Optional[Set[int]] = None,
        random_sample: bool = False,
        rng: Optional[np.random.RandomState] = None,
        debug_trace: bool = False,
    ) -> Dict[str, Any]:
        if already_used_food_ids is None:
            already_used_food_ids = set()
        if exclude_food_ids is None:
            exclude_food_ids = set()

        assigned_beverage = None
        main_target_cal = target_cal
        main_target_pro = target_pro
        main_target_carb = target_carb
        main_target_fat = target_fat

        if slot_name in ["Breakfast", "Snack"]:
            assigned_beverage = self.beverage_mgr.select_beverage(
                slot_name=slot_name,
                fitness_goal=fitness_goal,
                day_num=day_num,
                already_used_food_ids=already_used_food_ids,
                exclude_food_ids=exclude_food_ids,
                random_sample=random_sample,
                rng=rng,
            )

            if assigned_beverage:
                main_target_cal = max(target_cal - assigned_beverage["calories"], 40.0)
                main_target_pro = max(target_pro - assigned_beverage["protein"], 0.0)
                main_target_carb = max(target_carb - assigned_beverage["carbs"], 0.0)
                main_target_fat = max(target_fat - assigned_beverage["fats"], 0.0)

        catalog_meal_type = SLOT_TO_CATALOG_MEAL_TYPE.get(slot_name, "Lunch")
        candidates = self.retrieve_candidates(
            target_cal=main_target_cal,
            target_pro=main_target_pro,
            target_carb=main_target_carb,
            target_fat=main_target_fat,
            catalog_meal_type=catalog_meal_type,
            n_candidates=50,
            already_used_food_ids=already_used_food_ids,
            exclude_food_ids=exclude_food_ids,
            debug_log=debug_trace,
        )

        allow_two_dishes = slot_name in ["Lunch", "Dinner"]

        optimized_main = self.optimizer.optimize_meal_slot(
            candidate_items=candidates,
            target_cal=main_target_cal,
            target_pro=main_target_pro,
            target_carb=main_target_carb,
            target_fat=main_target_fat,
            allow_two_dish_combos=allow_two_dishes,
            max_candidates=35,
            random_sample=random_sample,
            rng=rng,
            debug_trace=debug_trace,
        )

        all_items = list(optimized_main["items"])
        if assigned_beverage is not None:
            all_items.append({
                "food_id": assigned_beverage["food_id"],
                "dish_name": assigned_beverage["dish_name"],
                "portion_multiplier": assigned_beverage["portion_multiplier"],
                "portion_grams": assigned_beverage["portion_grams"],
                "calories": assigned_beverage["calories"],
                "protein": assigned_beverage["protein"],
                "carbs": assigned_beverage["carbs"],
                "fats": assigned_beverage["fats"],
            })

        total_cal = round(sum(it["calories"] for it in all_items), 1)
        total_pro = round(sum(it["protein"] for it in all_items), 1)
        total_carb = round(sum(it["carbs"] for it in all_items), 1)
        total_fat = round(sum(it["fats"] for it in all_items), 1)

        slot_loss = self.optimizer.calculate_loss(
            total_cal, total_pro, total_carb, total_fat,
            target_cal, target_pro, target_carb, target_fat
        )

        return {
            "slot_name": slot_name,
            "items": all_items,
            "total_calories": total_cal,
            "total_protein": total_pro,
            "total_carbs": total_carb,
            "total_fats": total_fat,
            "target_calories": round(target_cal, 1),
            "target_protein": round(target_pro, 1),
            "target_carbs": round(target_carb, 1),
            "target_fats": round(target_fat, 1),
            "weighted_loss": round(slot_loss, 4),
            "calorie_error_pct": round(abs(total_cal - target_cal) / max(target_cal, 1.0) * 100, 2),
        }

    def generate_plan(
        self,
        target_calories: float,
        protein_g: float,
        carbs_g: float,
        fats_g: float,
        fitness_goal: str = "maintain weight",
        days: int = 3,
        exclude_food_ids: Optional[List[int]] = None,
        random_seed: Optional[int] = None,
        debug_trace: bool = False,
    ) -> Dict[str, Any]:
        if days < 1 or days > 30:
            raise ValueError("Days parameter must be between 1 and 30.")

        rng = np.random.RandomState(random_seed) if random_seed is not None else None
        random_sample = True
        exclude_set = set(exclude_food_ids) if exclude_food_ids else set()

        if debug_trace:
            print("\n" + "=" * 80)
            print(f"[DEBUG INCOMING REQUEST] Target: {target_calories:.1f} kcal | {protein_g:.1f}g P | {carbs_g:.1f}g C | {fats_g:.1f}g F | Goal: '{fitness_goal}' | Days: {days}")
            if exclude_set:
                print(f"[DEBUG EXCLUDE FOOD IDS]: {list(exclude_set)}")
            print("=" * 80)

        plan_days = []
        overall_used_ids = set()

        for day_num in range(1, days + 1):
            day_meals = {}
            day_cal = 0.0
            day_pro = 0.0
            day_carb = 0.0
            day_fat = 0.0

            recent_used_ids = set(overall_used_ids)

            for slot_name, pct in DEFAULT_SLOT_DISTRIBUTION.items():
                slot_target_cal = target_calories * pct
                slot_target_pro = protein_g * pct
                slot_target_carb = carbs_g * pct
                slot_target_fat = fats_g * pct

                slot_result = self.recommend_slot(
                    slot_name=slot_name,
                    target_cal=slot_target_cal,
                    target_pro=slot_target_pro,
                    target_carb=slot_target_carb,
                    target_fat=slot_target_fat,
                    fitness_goal=fitness_goal,
                    day_num=day_num,
                    already_used_food_ids=recent_used_ids,
                    exclude_food_ids=exclude_set,
                    random_sample=random_sample,
                    rng=rng,
                    debug_trace=debug_trace,
                )

                for item in slot_result["items"]:
                    overall_used_ids.add(int(item["food_id"]))
                    recent_used_ids.add(int(item["food_id"]))

                day_meals[slot_name.lower().replace(" ", "_")] = slot_result
                day_cal += slot_result["total_calories"]
                day_pro += slot_result["total_protein"]
                day_carb += slot_result["total_carbs"]
                day_fat += slot_result["total_fats"]

            if debug_trace:
                print(f"[DEBUG VARIETY TRACKING] Used Food IDs after Day {day_num}: {sorted(list(overall_used_ids))}")

            cal_err_pct = round(abs(day_cal - target_calories) / max(target_calories, 1.0) * 100, 2)
            pro_err_pct = round(abs(day_pro - protein_g) / max(protein_g, 1.0) * 100, 2)
            carb_err_pct = round(abs(day_carb - carbs_g) / max(carbs_g, 1.0) * 100, 2)
            fat_err_pct = round(abs(day_fat - fats_g) / max(fats_g, 1.0) * 100, 2)

            plan_days.append({
                "day": day_num,
                "meals": day_meals,
                "daily_totals": {
                    "calories": round(day_cal, 1),
                    "protein_g": round(day_pro, 1),
                    "carbs_g": round(day_carb, 1),
                    "fats_g": round(day_fat, 1),
                },
                "target_totals": {
                    "calories": round(target_calories, 1),
                    "protein_g": round(protein_g, 1),
                    "carbs_g": round(carbs_g, 1),
                    "fats_g": round(fats_g, 1),
                },
                "error_percentages": {
                    "calories_error_pct": cal_err_pct,
                    "protein_error_pct": pro_err_pct,
                    "carbs_error_pct": carb_err_pct,
                    "fats_error_pct": fat_err_pct,
                },
            })

        return {
            "status": "success",
            "fitness_goal": fitness_goal,
            "days_count": days,
            "target_daily_calories": round(target_calories, 1),
            "target_daily_macros": {
                "protein_g": round(protein_g, 1),
                "carbs_g": round(carbs_g, 1),
                "fats_g": round(fats_g, 1),
            },
            "plan_days": plan_days,
        }
