import os
from typing import Dict, List, Optional, Any
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from src.recommender import DietRecommender

app = FastAPI(
    title="PoseFit Diet Plan Recommendation Service",
    description="ML-powered content-based dietary recommendation engine using unsupervised KNN, rule-based beverage layering, and portion optimization.",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

recommender: Optional[DietRecommender] = None

def get_recommender() -> DietRecommender:

    global recommender
    if recommender is None:
        models_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
        recommender = DietRecommender(models_dir=models_dir)
    return recommender

@app.on_event("startup")
def startup_event():

    try:
        get_recommender()
        print("PoseFit Diet Recommender loaded and ready.")
    except Exception as e:
        print(f"Warning: Could not pre-load model artifacts at startup: {e}")

class DietPlanRequest(BaseModel):
    target_calories: float = Field(
        ...,
        description="Daily calorie target (kcal)",
        gt=500.0,
        lt=7000.0,
        example=2000.0,
    )
    protein_g: float = Field(
        ...,
        description="Daily protein target (grams)",
        gt=10.0,
        lt=500.0,
        example=150.0,
    )
    carbs_g: float = Field(
        ...,
        description="Daily carbohydrates target (grams)",
        gt=10.0,
        lt=800.0,
        example=200.0,
    )
    fats_g: float = Field(
        ...,
        description="Daily fats target (grams)",
        gt=5.0,
        lt=300.0,
        example=65.0,
    )
    fitness_goal: str = Field(
        default="maintain weight",
        description="User fitness goal (e.g. lose weight, maintain weight, gain weight)",
        example="lose weight",
    )
    days: int = Field(
        default=3,
        description="Number of days for diet plan (1 to 30)",
        ge=1,
        le=30,
        example=3,
    )
    exclude_food_ids: Optional[List[int]] = Field(
        default=None,
        description="Optional list of food IDs to explicitly exclude during single-slot regeneration",
        example=[85, 292],
    )
    random_seed: Optional[int] = Field(
        default=None,
        description="Optional random seed for deterministic test reproducibility",
        example=42,
    )

    @field_validator("fitness_goal")
    def sanitize_fitness_goal(cls, v: str) -> str:
        v_clean = v.strip().lower()
        if not v_clean:
            return "maintain weight"
        return v_clean

class MealItemSchema(BaseModel):
    food_id: int
    dish_name: str
    portion_multiplier: float
    portion_grams: int
    calories: float
    protein: float
    carbs: float
    fats: float

class MealSlotSchema(BaseModel):
    slot_name: str
    items: List[MealItemSchema]
    total_calories: float
    total_protein: float
    total_carbs: float
    total_fats: float
    target_calories: float
    target_protein: float
    target_carbs: float
    target_fats: float
    weighted_loss: float
    calorie_error_pct: float

class DailyTotalsSchema(BaseModel):
    calories: float
    protein_g: float
    carbs_g: float
    fats_g: float

class DailyErrorPercentagesSchema(BaseModel):
    calories_error_pct: float
    protein_error_pct: float
    carbs_error_pct: float
    fats_error_pct: float

class DayPlanSchema(BaseModel):
    day: int
    meals: Dict[str, Any]
    daily_totals: DailyTotalsSchema
    target_totals: DailyTotalsSchema
    error_percentages: DailyErrorPercentagesSchema

class DietPlanResponse(BaseModel):
    status: str
    fitness_goal: str
    days_count: int
    target_daily_calories: float
    target_daily_macros: Dict[str, float]
    plan_days: List[DayPlanSchema]

class HealthResponse(BaseModel):
    status: str
    service: str
    model_loaded: bool
    version: str

@app.get("/", tags=["Health"])
@app.get("/health", response_model=HealthResponse, tags=["Health"])
def health_check():

    is_loaded = recommender is not None and recommender.knn_model is not None
    return {
        "status": "healthy",
        "service": "PoseFit Diet Plan Recommendation Microservice",
        "model_loaded": is_loaded,
        "version": "1.1.0",
    }

@app.post(
    "/generate-diet-plan",
    response_model=DietPlanResponse,
    status_code=status.HTTP_200_OK,
    tags=["Recommendation"],
    summary="Generate multi-day personalized Pakistani meal plan",
)
def generate_diet_plan(req: DietPlanRequest):

    print("\n" + "=" * 80)
    print(f"[FASTAPI ENDPOINT RECEIVED REQUEST]")
    print(f"  * target_calories : {req.target_calories} kcal")
    print(f"  * protein_g       : {req.protein_g} g")
    print(f"  * carbs_g         : {req.carbs_g} g")
    print(f"  * fats_g          : {req.fats_g} g")
    print(f"  * fitness_goal    : '{req.fitness_goal}'")
    print(f"  * days            : {req.days}")
    print(f"  * exclude_food_ids: {req.exclude_food_ids}")
    print(f"  * random_seed     : {req.random_seed}")
    print("=" * 80)

    try:
        rec_engine = get_recommender()
        plan = rec_engine.generate_plan(
            target_calories=req.target_calories,
            protein_g=req.protein_g,
            carbs_g=req.carbs_g,
            fats_g=req.fats_g,
            fitness_goal=req.fitness_goal,
            days=req.days,
            exclude_food_ids=req.exclude_food_ids,
            random_seed=req.random_seed,
            debug_trace=True,
        )
        return plan
    except FileNotFoundError as fnf_err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Model artifacts not found: {str(fnf_err)}",
        )
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid request parameters: {str(val_err)}",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate diet plan: {str(exc)}",
        )

if __name__ == "__main__":
    import uvicorn
    import os

    port = int(os.environ.get("PORT", 8000))

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port
    )