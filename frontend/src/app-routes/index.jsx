import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

// ==================== USER PAGES ====================
import LandingPage from "../pages/user/LandingPage";
import UserLogin from "../pages/user/UserLogin";
import UserRegister from "../pages/user/UserRegister";

import UserDashboard from "../pages/user/UserDashboard";
import Chatbot from "../pages/user/Chatbot";
import DietPlan from "../pages/user/Dietplan";
import PostureDetection from "../pages/user/Workout";
import BrowseProfessionals from "../pages/user/BrowseProfessionals";
import ProfessionalDetails from "../pages/user/ProfessionalDetails";
import UserReviews from "../pages/user/UserReviews";

// ==================== USER ROUTE ====================
import UserPrivateRoute from "./user-private-route";

// ==================== ADMIN PAGES ====================
import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminUsers from "../pages/admin/AdminUsers";
import AdminProfessionals from "../pages/admin/AdminProfessionals";
import AdminProfessionalRequests from "../pages/admin/AdminProfessionalRequests";
import AdminPayments from "../pages/admin/AdminPayments";
import AdminReviews from "../pages/admin/AdminReviews";
import AdminSettings from "../pages/admin/AdminSettings";

// ==================== PROFESSIONAL PAGES ====================
import ProfessionalDashboard from "../pages/professional/ProfessionalDashboard";
import ProfessionalProfileSettings from "../pages/professional/ProfessionalProfileSettings";
import ProfessionalBookings from "../pages/professional/ProfessionalBookings";
import ProfessionalAvailability from "../pages/professional/ProfessionalAvailability";
import ProfessionalEarnings from "../pages/professional/ProfessionalEarnings";
import CompleteProfessionalProfile from "../pages/professional/CompleteProfessionalProfile";

// ==================== GENERAL PRIVATE ROUTE ====================
import PrivateRoute from "./private-route";
import ForgotPassword from "../pages/user/ForgotPassword";
import ResetPassword from "../pages/user/ResetPassword";
import WorkoutSession from "../pages/user/WorkoutSession";
import GuestProfessionals from "../pages/user/GuestProfessional";

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* =====================================================
            LANDING PAGE
        ===================================================== */}

        <Route path="/" element={<LandingPage />} />

        {/* =====================================================
            USER AUTH
        ===================================================== */}

        <Route path="/user/login" element={<UserLogin />} />

        <Route path="/user/register" element={<UserRegister />} />

        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/guest-professional" element={<GuestProfessionals />} />

        {/* =====================================================
            USER PROTECTED ROUTES
        ===================================================== */}

        <Route
          path="/user/dashboard"
          element={
            <UserPrivateRoute>
              <UserDashboard />
            </UserPrivateRoute>
          }
        />

        <Route
          path="/user/chatbot"
          element={
            <UserPrivateRoute>
              <Chatbot />
            </UserPrivateRoute>
          }
        />

        <Route
          path="/user/dietplan"
          element={
            <UserPrivateRoute>
              <DietPlan />
            </UserPrivateRoute>
          }
        />

        <Route
          path="/user/review"
          element={
            <UserPrivateRoute>
              <UserReviews />
            </UserPrivateRoute>
          }
        />

        <Route
          path="/user/workout"
          element={
            <UserPrivateRoute>
              <PostureDetection />
            </UserPrivateRoute>
          }
        />
        <Route
          path="/user/workout/session/:exerciseId"
          element={
            <UserPrivateRoute>
              <WorkoutSession />
            </UserPrivateRoute>
          }
        />

        {/* =====================================================
            BROWSE PROFESSIONALS
        ===================================================== */}

        <Route
          path="/user/professionals"
          element={
            <UserPrivateRoute>
              <BrowseProfessionals />
            </UserPrivateRoute>
          }
        />

        {/* =====================================================
            PROFESSIONAL DETAILS
        ===================================================== */}

        <Route
          path="/user/professionals/:id"
          element={
            <UserPrivateRoute>
              <ProfessionalDetails />
            </UserPrivateRoute>
          }
        />

        <Route
          path="/user/reviews"
          element={
            <UserPrivateRoute>
              <UserReviews />
            </UserPrivateRoute>
          }
        />

        {/* =====================================================
            ADMIN ROUTES
        ===================================================== */}

        <Route
          path="/admin/dashboard"
          element={
            <PrivateRoute allowedRoles={["ADMIN"]}>
              <AdminDashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/admin/users"
          element={
            <PrivateRoute allowedRoles={["ADMIN"]}>
              <AdminUsers />
            </PrivateRoute>
          }
        />

        <Route
          path="/admin/professionals"
          element={
            <PrivateRoute allowedRoles={["ADMIN"]}>
              <AdminProfessionals />
            </PrivateRoute>
          }
        />

        <Route
          path="/admin/requests"
          element={
            <PrivateRoute allowedRoles={["ADMIN"]}>
              <AdminProfessionalRequests />
            </PrivateRoute>
          }
        />

        <Route
          path="/admin/payments"
          element={
            <PrivateRoute allowedRoles={["ADMIN"]}>
              <AdminPayments />
            </PrivateRoute>
          }
        />

        <Route
          path="/admin/reviews"
          element={
            <PrivateRoute allowedRoles={["ADMIN"]}>
              <AdminReviews />
            </PrivateRoute>
          }
        />

        <Route
          path="/admin/settings"
          element={
            <PrivateRoute allowedRoles={["ADMIN"]}>
              <AdminSettings />
            </PrivateRoute>
          }
        />

        {/* =====================================================
            PROFESSIONAL ONBOARDING
        ===================================================== */}

        <Route
          path="/professional/profile/complete"
          element={
            <PrivateRoute allowedRoles={["PROFESSIONAL"]}>
              <CompleteProfessionalProfile />
            </PrivateRoute>
          }
        />

        {/* =====================================================
            PROFESSIONAL ROUTES
        ===================================================== */}

        <Route
          path="/professional/dashboard"
          element={
            <PrivateRoute allowedRoles={["PROFESSIONAL"]}>
              <ProfessionalDashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/professional/profile"
          element={
            <PrivateRoute allowedRoles={["PROFESSIONAL"]}>
              <ProfessionalProfileSettings />
            </PrivateRoute>
          }
        />

        <Route
          path="/professional/bookings"
          element={
            <PrivateRoute allowedRoles={["PROFESSIONAL"]}>
              <ProfessionalBookings />
            </PrivateRoute>
          }
        />

        <Route
          path="/professional/availability"
          element={
            <PrivateRoute allowedRoles={["PROFESSIONAL"]}>
              <ProfessionalAvailability />
            </PrivateRoute>
          }
        />

        <Route
          path="/professional/earnings"
          element={
            <PrivateRoute allowedRoles={["PROFESSIONAL"]}>
              <ProfessionalEarnings />
            </PrivateRoute>
          }
        />

        {/* =====================================================
            FALLBACK
        ===================================================== */}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
