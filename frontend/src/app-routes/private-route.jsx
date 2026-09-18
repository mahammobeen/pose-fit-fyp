import { Navigate, useLocation } from "react-router-dom";
import { getUserRole, getUser } from "../lib/local-storage";

const PrivateRoute = ({ children, allowedRoles = [] }) => {
  const location = useLocation();

  const role = getUserRole();
  const user = getUser();

 
  // NOT LOGGED IN
  
  if (!role) { return ( <Navigate to="/user/login" replace state={{ from: location }} /> ); }
  
  // ROLE NOT ALLOWED
  
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    if (role === "ADMIN") {
      return <Navigate to="/admin/dashboard" replace />;
    }

    if (role === "PROFESSIONAL") {
      return <Navigate to="/professional/dashboard" replace />;
    }

    if (role === "USER") {
      return <Navigate to="/user/dashboard" replace />;
    }

    return <Navigate to="/" replace />;
  }

  // PROFESSIONAL ONBOARDING

  if (role === "PROFESSIONAL") {
    const status = (user?.professionalStatus || "").toLowerCase();

    const isCompletePage =
      location.pathname === "/professional/profile/complete";

    const needsProfileCompletion =
      status === "invited" ||
      status === "pending_verification" ||
      status === "rejected";

    if (needsProfileCompletion && !isCompletePage) {
      return <Navigate to="/professional/profile/complete" replace />;
    }
  }

  return children;
};

export default PrivateRoute;
