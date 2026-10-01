# PoseFit

PoseFit is an AI-powered fitness and wellness web application that combines computer vision, machine learning, and modern web technologies to support users with their fitness, nutrition, and wellness goals. Users can calculate key health metrics, generate personalized Pakistani meal plans, perform guided workouts with real-time posture feedback and rep counting, use an AI fitness chatbot, and book sessions with certified fitness professionals.

The platform also provides separate professional and admin portals for managing profiles, availability, bookings, payments, reviews, and platform operations. Stripe handles online payments, Google Calendar creates Google Meet appointment links, and automated emails are used for verification, booking confirmation, and appointment reminders.

## 1. Project Overview

PoseFit integrates real-time computer vision, machine learning, and full-stack web technologies into a single fitness and wellness platform.

The system provides:

* Personalized health and nutrition calculations
* Pakistani food-based diet recommendations
* Real-time exercise posture detection
* Exercise rep counting and form feedback
* AI fitness chatbot
* Professional trainer and nutritionist marketplace
* Appointment booking and Stripe payments
* Google Meet integration
* Automated email notifications and reminders
* Separate User, Professional, and Admin portals

### Authentication

* **Method:** JWT token-based authentication with Bearer header

* **Verification:** 6-digit numeric OTP email verification and password reset flow

* **Roles:** Role-Based Access Control (`USER`, `PROFESSIONAL`, `ADMIN`)

### Google Services

* **Calendar & Meetings:** Google Calendar API v3 with automatic Google Meet video meeting creation

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

* **Job Scheduler:** Node-Cron for automated appointment reminders

* **Email Service:** Nodemailer with Gmail SMTP

* **File Uploads:** Multer for profile photos and professional documents

* **Security & Authentication:** Bcryptjs and JSON Web Tokens (JWT)

### Database

* **Database Engine:** MongoDB through Mongoose

### Python Services

* **Diet Recommendation Microservice:** FastAPI, Uvicorn, Pandas, NumPy, SciPy, Joblib

* **Pose Detection Microservice:** Flask, Flask-CORS, OpenCV, MediaPipe Pose, NumPy

### AI / ML

* **Computer Vision:** MediaPipe Pose with 33 body landmarks for joint angle calculation, posture analysis, and exercise rep counting

* **Nutritional Recommendation:** K-Nearest Neighbors / KDTree-based recommendation and portion optimization using a Pakistani food dataset

### Payments

* **Payment Processor:** Stripe Checkout with PKR Test Mode

* **Payouts:** Stripe Connect for professional payout onboarding

* **Payment Verification:** Stripe Webhooks through `POST /api/payment/webhook`

### External Services

* **Cloud Storage:** Cloudinary

* **AI Chatbot:** Groq API

* **Email:** Gmail SMTP

* **Video Meetings:** Google Calendar API and Google Meet

## 3. Folder Structure

* `backend/` — Express REST API, controllers, models, routes, middleware, services, utilities, and scheduled jobs

* `frontend/` — React 19 single-page application using Vite and Tailwind CSS

* `diet-service/` — FastAPI microservice for personalized diet recommendations

* `python-pose-service/` — Flask microservice using MediaPipe and OpenCV for real-time pose detection

### Backend Structure

```text
backend/
├── config/
├── controllers/
├── middleware/
├── models/
├── routes/
├── scripts/
├── services/
├── utils/
└── server.js
```

### Frontend Structure

```text
frontend/
├── public/
└── src/
    ├── app-routes/
    ├── components/
    ├── lib/
    └── pages/
        ├── admin/
        ├── professional/
        └── user/
```

### Diet Service

```text
diet-service/
├── data/
├── models/
├── src/
├── tests/
└── main.py
```

### Pose Service

```text
python-pose-service/
├── app.py
└── requirements.txt
```

## 4. Features

### User

* Account registration and email verification with a 6-digit OTP code

* Secure login using JWT authentication

* Forgot and reset password functionality

* Health and body metrics including weight, height, age, gender, activity level, and fitness goal

* Automatic calculation of BMI, BMR, TDEE, target calories, macronutrients, and recommended water intake

* Personalized 3-day Pakistani meal plan with breakfast, lunch, dinner, and snack recommendations

* AI Fitness Chatbot for fitness and nutrition-related guidance

* Real-time webcam workout analysis using MediaPipe

* Exercise posture feedback and rep counting for Squats, Plank, Arm Raise, and Side Bend

* Browse approved fitness trainers and nutritionists

* View professional specialization, experience, session fee, availability, and ratings

* Select available appointment dates and time slots

* Book 1-hour professional sessions

* Stripe Checkout payment in PKR Test Mode

* Google Meet link for confirmed sessions

* Booking confirmation and reminder emails

* Submit professional ratings and reviews after completed sessions

* Submit platform reviews and feedback

### Professional

* Admin-invited professional accounts

* Professional profile completion workflow

* Specialization, biography, experience, and session fee management

* Profile photo and credential document uploads

* Weekly availability and 1-hour time slot management

* Upcoming booking management

* Booking history

* Earnings information

* Stripe Connect onboarding for professional payouts

* Google Meet links for confirmed sessions

* Professional rating information

* Password change functionality

### Admin

* Dashboard with user, professional, booking, revenue, and commission information

* User account management

* User profile and account status management

* Professional invitation and management

* Professional application review

* Professional approval and rejection with rejection reason

* Professional directory management

* Payment records and financial information

* Payment details viewing

* Payment record soft deletion

* Stripe session and payout information

* Professional and platform review moderation

* Admin password management

## 5. Setup Instructions

### Backend

* **Prerequisites:** Node.js 20.19+ and a running MongoDB instance

* **Directory:** `cd backend`

* **Install dependencies:** `npm install`

* **Configuration:** Create a `.env` file using the Environment Variables section below

* **Seed Admin:** `npm run create-admin`

* **Run Server:** `npm start` or `npm run dev` for development with nodemon

* **Port:** Default is `4000`

### Frontend

* **Prerequisites:** Node.js 20.19+

* **Directory:** `cd frontend`

* **Install dependencies:** `npm install`

* **Configuration:** Create `.env` file with `VITE_BASE_URL` and `VITE_POSE_API_URL`

* **Run Development Server:** `npm run dev`

* **Build Production:** `npm run build`

* **Port:** Default is `5173`

### Diet Python Service

* **Prerequisites:** Python 3.10+ (Python 3.11 recommended)

* **Directory:** `cd diet-service`

* **Virtual Environment:**

  * Windows: `python -m venv venv` and `.\venv\Scripts\Activate.ps1`

  * Linux/macOS: `python3 -m venv venv` and `source venv/bin/activate`

* **Install dependencies:** `pip install -r requirements.txt`

* **Run Service:** `uvicorn main:app --host 127.0.0.1 --port 8000 --reload`

* **Port:** `8000`

### Pose Detection Service

* **Prerequisites:** Python 3.10+ with OpenCV and MediaPipe support

* **Directory:** `cd python-pose-service`

* **Virtual Environment:**

  * Windows: `python -m venv venv` and `.\venv\Scripts\Activate.ps1`

  * Linux/macOS: `python3 -m venv venv` and `source venv/bin/activate`

* **Install dependencies:** `pip install -r requirements.txt`

* **Run Service:** `python app.py`

* **Port:** `5002`

## 6. Environment Variables

### Backend (`backend/.env`)

```env
PORT=4000

FRONTEND_URL=http://localhost:5173

MONGO_URI=mongodb://localhost:27017/posefit

SECRET_KEY=your_jwt_secret_key_here

# Admin Seed
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=ChangeMe123!

# Email / Nodemailer
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_gmail_app_password

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Stripe Payments - Test Mode
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Google OAuth & Calendar
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:4000/api/google/callback
GOOGLE_TOKEN_JSON=
GOOGLE_CALENDAR_ID=primary
GOOGLE_CALENDAR_TIMEZONE=Asia/Karachi

# Chatbot
GROQ_API_KEY=

# Diet Microservice
FASTAPI_DIET_URL=http://127.0.0.1:8000
```

### Frontend (`frontend/.env`)

```env
VITE_BASE_URL=http://localhost:4000/api
VITE_POSE_API_URL=http://localhost:5002
```

Do not commit `.env` files or API keys to Git.

## 7. API Structure

The backend exposes RESTful endpoints using the `/api` route prefix.

### Authentication

* `/api/auth` — User registration, login, email verification, password reset, and professional onboarding

### User

* `/api/user` — Public professional listings, user metrics, diet plans, and AI chatbot

### Professional

* `/api/professional` — Professional dashboard, profile, password, bookings, availability, and earnings

### Payments

* `/api/payment` — Stripe Checkout, payment verification, booked slots, Stripe Connect, payment records, and Stripe webhook

### Reviews

* `/api/reviews` — Professional reviews, platform reviews, ratings, pending ratings, and review moderation

### Admin

* `/api/admin` — Dashboard statistics, analytics, user management, professional management, professional approvals, and payment management

### Upload

* `/api/upload` — Profile photo and professional document uploads

### Google

* `/api/google` — Google OAuth and Calendar integration

### Main Payment Endpoints

```text
POST   /api/payment/create
POST   /api/payment/cancel
GET    /api/payment/verify-session
GET    /api/payment/booked-slots/:id
GET    /api/payment/my-payments
POST   /api/payment/webhook

POST   /api/payment/stripe-connect/onboard
GET    /api/payment/stripe-connect/status
GET    /api/payment/stripe-connect/dashboard-link

GET    /api/payment/admin/payments
DELETE /api/payment/admin/payments/:id
```

## 8. Known Limitations / TODOs

* **Camera / Pose Stream:** Pose detection currently runs as a separate Flask service and receives webcam frames from the frontend. A more optimized streaming or client-side approach can be considered for large-scale production use.

* **Google Meet OAuth Storage:** Google Calendar requires an initial OAuth authorization. Google access and refresh tokens must be stored securely and should not be committed to Git.

* **Stripe Test Mode:** Payments and Stripe Connect payouts currently use Stripe Test Mode with PKR. Live payments require Stripe live-mode configuration and account verification.

* **Scheduler:** Appointment reminder emails run through a 1-minute Node-Cron job in the Express backend. A dedicated background job system could be used for a large production deployment.

* **Chatbot Session Storage:** Chatbot conversation history is currently maintained in server memory and is not designed for persistent multi-instance production use.

# known Issues / Conflicts

### 1. Legacy Code Removed During Cleanup

The following unused or duplicate implementations were removed during project cleanup:

* Duplicate public professional route

* Duplicate admin review route

* Old commented authentication helper

* Unused frontend `utils.js`

* Unused authentication route wrapper

These files and routes are no longer part of the active system.

### 2. Legacy / Unused Database Fields

Some legacy fields may still exist in database schemas for compatibility:

* `UserModel.bankDetails` — Legacy payment/bank information, with Stripe Connect now used for professional payouts

* `PaymentModel.adminDeleted` and `PaymentModel.professionalDeleted` — Used for soft deletion of payment records

* `UserMetrics.dietPref` — Stored as part of the metrics schema but is not currently used as a filtering condition by the recommendation system

### 3. Naming and Configuration Notes

* Professional status values should preferably remain standardized to the currently used lowercase values such as `approved`, `pending_verification`, and `rejected`.

* Currency values are stored as PKR and displayed as `Rs.` in the frontend.

* Stripe Checkout session IDs are stored using `stripeSessionId` in the database.

### 4. Security Notes

* **Google Token:** `backend/google-token.json`, if generated during Google authorization, must not be committed to Git.

* **Environment Variables:** Stripe keys, Google credentials, Gmail App Passwords, Groq API keys, Cloudinary credentials, MongoDB credentials, and JWT secrets must remain in environment variables.

* **Authentication:** Protected routes should verify the authenticated user's role and identity before returning user-specific information.

### 5. Production Considerations

* Add rate limiting to authentication and other public API endpoints before production deployment.

* Use secure token expiry and storage for password reset and email verification flows.

* Restrict CORS origins in production.

* Use a dedicated job queue if the reminder system needs to support multiple backend instances.

* Use secure persistent storage for Google OAuth tokens in a production environment.


## License

This project is developed for academic/FYP purposes.

The backend package uses the ISC license.
