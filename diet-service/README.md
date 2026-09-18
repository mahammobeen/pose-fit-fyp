# PoseFit Diet Plan Recommendation Microservice

ML-powered content-based recommendation engine for the **PoseFit** MERN + FastAPI fitness platform.

## Architecture Overview
- **Problem Formulation**: Unsupervised Continuous Nearest Neighbor Retrieval ($k$-NN) paired with Constrained Multi-Objective Portion Optimization.
- **Dataset**: 495 Authentic Pakistani Food Catalog Items (100g nutrient basis).
- **Core Algorithms**:
  - `sklearn.neighbors.NearestNeighbors` for continuous 5D macronutrient feature vector retrieval.
  - Greedy Multi-Objective Portion Optimizer for single dishes & complementary 2-dish pairings ($50\text{g}$ to $300\text{g}$).
  - Multi-day variety tracker with sliding-window item rotation.

---

## Directory Structure
```
python-service/
├── data/
│   └── pakistani_food_dataset_100g.csv   # 495 Pakistani food items (100g basis)
├── models/                               # Serialized model artifacts (.joblib)
│   ├── knn_model.joblib                  # Trained NearestNeighbors model
│   ├── scaler.joblib                     # StandardScaler for numeric features
│   ├── meal_encoder.joblib               # OneHotEncoder for meal slots
│   └── food_metadata.joblib              # Food catalog & lookup dictionary
├── src/
│   ├── __init__.py
│   ├── data_pipeline.py                  # Cleaning, Atwater check, explosion, feature engineering
│   ├── train.py                          # Reference/Query split, 5-fold CV tuning, training, serialization
│   ├── optimizer.py                      # Constrained greedy portion & multi-dish optimizer
│   └── recommend.py                      # Meal slot filtering, KNN retrieval, variety penalty, plan generator
├── tests/
│   ├── __init__.py
│   ├── test_pipeline.py                  # Unit and integration tests for data pipeline
│   ├── test_recommendation.py            # End-to-end evaluation on 3 sample fitness profiles
│   └── test_api.py                       # FastAPI endpoint test client
├── main.py                               # FastAPI application entry point
├── requirements.txt                      # Pinned Python dependencies
└── README.md                             # Service documentation
```

---

## Execution & Usage

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Run Data Pipeline & Model Training
```bash
python src/data_pipeline.py
python src/train.py
```

### 3. Run Test Suite
```bash
pytest tests/ -v
python tests/test_recommendation.py
```

### 4. Start the FastAPI Microservice
```bash
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
Interactive Swagger API documentation available at: `http://127.0.0.1:8000/docs`

---

## API Contract

### POST `/generate-diet-plan`
**Request Body**:
```json
{
  "target_calories": 2000.0,
  "protein_g": 150.0,
  "carbs_g": 200.0,
  "fats_g": 65.0,
  "fitness_goal": "lose weight",
  "days": 7
}
```

**Response**:
```json
{
  "status": "success",
  "fitness_goal": "lose weight",
  "days_count": 7,
  "target_daily_calories": 2000.0,
  "target_daily_macros": {
    "protein_g": 150.0,
    "carbs_g": 200.0,
    "fats_g": 65.0
  },
  "plan_days": [
    {
      "day": 1,
      "meals": {
        "breakfast": { ... },
        "morning_snack": { ... },
        "lunch": { ... },
        "evening_snack": { ... },
        "dinner": { ... }
      },
      "daily_totals": {
        "calories": 1994.5,
        "protein_g": 148.2,
        "carbs_g": 202.1,
        "fats_g": 63.8
      },
      "target_totals": {
        "calories": 2000.0,
        "protein_g": 150.0,
        "carbs_g": 200.0,
        "fats_g": 65.0
      },
      "error_percentages": {
        "calories_error_pct": 0.28,
        "protein_error_pct": 1.20,
        "carbs_error_pct": 1.05,
        "fats_error_pct": 1.85
      }
    }
  ]
}
```
