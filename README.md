# PoseFit

PoseFit is an AI-powered fitness and wellness web application designed to support users in achieving their health, nutrition, and exercise goals. It provides real-time computer vision pose estimation for guided workouts, an AI-driven personalized diet recommendation microservice, and a full-featured booking and consultation marketplace with certified fitness trainers and nutritionists. Through PoseFit, users can track health metrics, generate tailored diet plans, correct exercise posture with real-time rep counting, and schedule video consultations powered by Stripe payments and Google Meet.

---

## 1. Project Overview

PoseFit integrates real-time machine learning, computer vision, and modern web technologies to create a complete personal wellness platform. Users can calculate key metabolic metrics, receive automated multi-day meal plans based on Pakistani culinary datasets, and perform guided home workouts with interactive posture feedback and rep counting. Certified trainers and nutritionists can offer consultative sessions, manage availability calendars, and receive secure payouts. The platform automates payment verification with Stripe webhooks, generates Google Meet appointment links, and dispatches automated email reminders.

---

## 2. Tech Stack

### Frontend
* **Framework:** React 19 (Vite)
* **Styling:** Tailwind CSS v4
* **Routing:** React Router DOM v7
* **Icons & Notifications:** Lucide React, Sonner
* **HTTP Client:** Axios
* **Token Management:** JWT-Decode

### Backend
* **Runtime & Framework:** Node.js v22, Express.js 5
* **Database ODM:** Mongoose 9
* **Job Scheduler:** Node-Cron (automated appointment reminders)
* **Email Service:** Nodemailer (SMTP transport)
* **File Uploads:** Multer (multipart form handling for photos and documents)
* **Security & Auth:** Bcryptjs, JSON Web Tokens (JWT)

### Database
* **Database Engine:** MongoDB (via Mongoose)

### Python Services
* **Diet Recommendation Microservice:** FastAPI, Uvicorn, Scikit-learn, Pandas, NumPy, Joblib
* **Pose Detection Microservice:** Flask, Flask-CORS, OpenCV (cv2), MediaPipe Pose, NumPy

### AI / ML
* **Computer Vision:** MediaPipe 33-landmark pose tracking for joint angle computation and rep classification
* **Nutritional Recommendation:** K-Nearest Neighbors / KDTree macro-optimization algorithm trained on Pakistani food database

### Payments
* **Payment Processor:** Stripe Checkout (Session-based flow in PKR test mode)
* **Payouts:** Stripe Connect Express Onboarding for professional payouts
* **Fulfillment:** Stripe Webhooks (`POST /api/payment/webhook`) as single source of truth

### Authentication
* **Method:** JWT token-based authentication with Bearer header
* **Verification:** 6-digit numeric OTP email verification and password reset flow
* **Roles:** Role-Based Access Control (`USER`, `PROFESSIONAL`, `ADMIN`)

### Google Services
* **Calendar & Meetings:** Google Calendar API v3 with automatic Google Meet video room creation

---

## 3. Folder Structure

* `backend/` — Express REST API, controllers, models, routes, middleware, and scheduled jobs
* `frontend/` — React 19 single-page application with Vite and Tailwind CSS
* `python-service/` — FastAPI microservice delivering machine-learning diet recommendations
* `backend/controllers/user/python-pose-service/` — Flask microservice running MediaPipe for real-time video pose detection and form evaluation

---

## 4. Features

### User
* Account registration and email verification with 6-digit OTP code
* Secure login, profile tracking, and forgot/reset password workflows
* Health and body metrics intake: weight, height in cm, age, gender, activity level, fitness goal
* Automated calculation of BMI, BMR, TDEE, target calories, daily macronutrient breakdown (protein, carbs, fats), and recommended water intake
* 3-day personalized Pakistani meal plan generator with breakfast, lunch, dinner, and snack portion allocations
* Interactive AI Workout Assistant utilizing computer vision (MediaPipe) for real-time camera form analysis, rep counting, and posture feedback across Squats, Planks, Arm Raises, and Side Bends
* AI Fitness Chatbot assistant for guidance on fitness and nutrition
* Directory of approved fitness trainers and nutritionists with filterable specializations, experience levels, session fees, and ratings
* Interactive appointment booking calendar with date selection, real-time slot availability, and Stripe Checkout in PKR
* Post-session professional star ratings, review submissions, and platform feedback

### Professional
* Professional profile completion workflow (specialization, bio, years of experience, session fee in PKR, and document uploads)
* Weekly schedule and time slot availability manager
* Stripe Connect Express onboarding to configure automated bank payouts
* Dedicated dashboard with monthly earnings metrics, booking history, and upcoming client sessions
* Google Meet video links automatically attached to confirmed bookings
* Client session history and record management

### Admin
* Comprehensive analytics dashboard (total revenue, platform commission, active user counts, professional metrics)
* User account management (listing, profile detail inspection, status updates, account removal)
* Professional application review center (credential inspection, verification meeting assignment, approval, or rejection with reason)
* Professional directory management (create, view, and remove professionals)
* Global financial ledger (view payment records, Stripe session IDs, transfer IDs, commission cuts, and payout status)
* Moderation center for professional reviews and platform feedback
* Secure admin password management

---

## 5. Setup Instructions

### Backend
* **Prerequisites:** Node.js v18+ (tested on v22.19.0) and running MongoDB instance
* **Directory:** `cd backend`
* **Install dependencies:** `npm install`
* **Configuration:** Create `.env` file (see Environment Variables section below)
* **Optional Seed Admin:** `npm run create-admin`
* **Run Server:** `npm start` (or `npm run dev` for development with nodemon)
* **Port:** Default is `4000`

### Frontend
* **Prerequisites:** Node.js v18+
* **Directory:** `cd frontend`
* **Install dependencies:** `npm install`
* **Configuration:** Create `.env` file with `VITE_BASE_URL`
* **Run Development Server:** `npm run dev`
* **Build Production:** `npm run build`
* **Port:** Default is `5173` (Vite)

### Diet Python Service
* **Prerequisites:** Python 3.10+ (tested on Python 3.11.9)
* **Directory:** `cd python-service`
* **Virtual Environment:**
  * Windows: `python -m venv venv` and `.\venv\Scripts\Activate.ps1`
  * Linux/macOS: `python3 -m venv venv` and `source venv/bin/activate`
* **Install dependencies:** `pip install -r requirements.txt`
* **Run Service:** `uvicorn main:app --reload --port 8000`
* **Port:** `8000`

### Pose Detection Service
* **Prerequisites:** Python 3.10+ with OpenCV and MediaPipe support
* **Directory:** `cd backend/controllers/user/python-pose-service`
* **Virtual Environment:**
  * Windows: `python -m venv venv311` and `.\venv311\Scripts\Activate.ps1`
  * Linux/macOS: `python3 -m venv venv311` and `source venv311/bin/activate`
* **Install dependencies:** `pip install -r requirements.txt`
* **Run Service:** `python app.py`
* **Port:** `5000`

---

## 6. Environment Variables

### Backend (`backend/.env`)
```env
PORT=4000
FRONTEND_URL=http://localhost:5173
MONGO_URI=mongodb://localhost:27017/posefit
SECRET_KEY=your_jwt_secret_key_here

# Email / Nodemailer
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password_here

# Stripe Payments (Test Mode)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret

# Google OAuth & Calendar Integration
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:4000/api/google/callback
GOOGLE_CALENDAR_ID=primary
GOOGLE_CALENDAR_TIMEZONE=Asia/Karachi

# Microservices
FASTAPI_DIET_URL=http://127.0.0.1:8000
```

### Frontend (`frontend/.env`)
```env
VITE_BASE_URL=http://localhost:4000/api
```

---

## 7. API Structure

The backend exposes RESTful endpoints with the `/api` route prefix:

* `/api/auth` — User registration, login, email verification OTP, password reset, and professional onboarding
* `/api/user` — Public professional listings, health metrics calculation, diet plan generation, and AI chatbot
* `/api/professional` — Professional dashboard metrics, profile management, booking management, weekly availability, and earnings
* `/api/payment` — Stripe checkout session initiation, session verification polling, professional booked slots lookup, Stripe Connect onboarding, and payment logs
* `/api/reviews` — Platform and professional review submissions, rating summaries, pending rating lookups, and review moderation
* `/api/admin` — Admin analytics, user list management, professional application approvals/rejections, and payment ledger
* `/api/upload` — Multipart file uploads for profile photos and credential documents
* `/api/google` — Google OAuth flow for calendar and meet session integration

---

## 8. Known Limitations / TODOs

* **Camera / Pose Stream:** Pose detection runs locally over HTTP via Flask; client webcam frames are analyzed on port 5000. For production deployment, WebRTC streaming or client-side MediaPipe WASM is recommended.
* **Google Meet OAuth Storage:** Google OAuth tokens are saved in a local file (`backend/google-token.json`). An initial administrative authorization at `/api/google/auth` is required before calendar events can be created.
* **Stripe Test Mode:** Payments and Stripe Connect Express transfers are configured for test mode using PKR currency. Real bank transfers require live Stripe keys and verified merchant setup.
* **Scheduler Heartbeat:** Appointment reminder emails run on a 1-minute cron check (`* * * * *`) on the main Express process. In high-traffic multi-instance environments, this should be offloaded to a dedicated worker queue (e.g., BullMQ with Redis).

---

# ⚠️ Known Issues / Conflicts

### 1. Duplicate Implementations
* **Public Professionals Endpoint:** `backend/routes/user/userRoutes.js` previously defined duplicate routes `GET /professionals` and `GET /public-professionals`. The frontend calls `GET /user/public-professionals`. The redundant `GET /professionals` route was safely removed during cleanup.
* **Admin Reviews Endpoint:** `backend/routes/review/reviewRoutes.js` registered both `GET /admin` and `GET /admin/all`. The frontend component `AdminReviews.jsx` uses `/reviews/admin`. The duplicate `GET /admin/all` was safely removed.
* **Auth State Helpers:** `frontend/src/lib/user-auth.js` contained an old, 100% commented-out authentication helper that conflicted with active helpers in `frontend/src/lib/local-storage.js`. It was safely removed.
* **Unused Utility:** `frontend/src/lib/utils.js` exported a `cn()` helper referencing `clsx` and `tailwind-merge` that was never imported or used across the React components. It was safely removed.
* **Unused Route Wrapper:** `frontend/src/app-routes/auth-required.jsx` was an unreferenced route guard superseded by `private-route.jsx` and `user-private-route.jsx`. It was safely removed.

### 2. Unmounted / Unreachable Routes
* **Root Review POST Route:** `POST /api/reviews/` in `reviewRoutes.js` is functionally duplicate to `POST /api/reviews/professional` and `POST /api/reviews/platform`. The frontend specifically calls the dedicated endpoints.
* **Unlinked Payment Endpoints:** `GET /api/payment/:id` and `DELETE /api/payment/professional/payments/:id` exist on the payment router, but the current professional UI displays bookings from `GET /api/professional/bookings` and does not provide an in-app payment deletion button.
* **Specific Payment Review Lookup:** `GET /api/reviews/payment/:paymentId` is registered on the backend, but the frontend checks user reviews collectively via `GET /api/reviews/my-reviews`.

### 3. Unused Database Fields
* **`UserModel.credentialDocs[].fileUrl`:** Holds relative paths like `/uploads/documents/...`. In some components, file paths are reconstructed using base URL concatenation.
* **`UserModel.bankDetails`:** Legacy field originally storing raw bank title and account details, now superseded by automated `stripeAccountId` for Stripe Connect Express onboarding.
* **`PaymentModel.adminDeleted` & `PaymentModel.professionalDeleted`:** Soft-delete boolean flags defined on payments; current deletion endpoints set these flags, while UI filters primarily by status.
* **`UserMetrics.dietPref`:** Schema includes `dietPref` with `veg`/`non-veg` enum, but the current ML recommendation model optimizes strictly by macronutrient targets rather than filtering by dietary preference flags.

### 4. Frontend / Backend Mismatches
* **Auth Token vs User Object Storage:** `user-private-route.jsx` checks both `localStorage.getItem("pose-fit")` and `localStorage.getItem("pose-fit-user")`, whereas `local-storage.js` decodes the token dynamically with `jwt-decode`. Both keys are populated at login, but unifying around the decoded JWT avoids potential cache divergence.
* **Height Units:** `UserMetrics` model stores height strictly in centimeters (`cm`), but some legacy form labels in frontend onboarding mention feet/inches before client-side conversion.

### 5. Naming Inconsistencies
* **Professional Status Casing:** Backend schemas and controllers support both lowercase (`"approved"`, `"pending_verification"`, `"rejected"`) and uppercase (`"APPROVED"`, `"PENDING"`, `"REJECTED"`). Code uses `$in` queries to handle both, but standardizing to lowercase is recommended.
* **Currency Formatting:** Database and Stripe records store lowercase `"pkr"`, while frontend components format display values with `"Rs."`.
* **Session ID Naming:** Checkout session identifier is represented as `session_id` in URL query parameters and `stripeSessionId` in MongoDB.

### 6. Hardcoded Configuration
* **Backend Server Fallback:** `backend/server.js` hardcodes fallback CORS origin `http://localhost:5173`.
* **FastAPI Service URL:** `backend/services/fastapiDietService.js` falls back to `http://127.0.0.1:8000`.
* **Pose Detection Service URL:** `frontend/src/pages/user/WorkoutSession.jsx` connects directly to `http://127.0.0.1:5000/video_feed`. This should be moved to an environment variable `VITE_POSE_SERVICE_URL`.
* **Default Admin Seed:** `backend/scripts/createAdmin.js` contains hardcoded credentials (`admin@posefit.com` / `admin@123`) intended strictly for local development initialization.

### 7. Security Concerns
* **Sensitive Token File:** `backend/google-token.json` stores Google OAuth refresh and access tokens locally. It must remain excluded from Git version control via `.gitignore`.
* **Rate Limiting:** Authentication (`/api/auth/login`, `/api/auth/register`), chatbot (`/api/user/chatbot`), and webhook (`/api/payment/webhook`) routes currently lack Express rate-limiting middleware (`express-rate-limit`), leaving them susceptible to brute-force or denial-of-service attempts.
* **Meeting Link Visibility:** Google Meet links are generated through administrative credentials and saved in `PaymentModel.meetingLink`. Both user and professional receive access upon payment completion. Ensure proper authorization checks remain on any route returning payment objects.\n