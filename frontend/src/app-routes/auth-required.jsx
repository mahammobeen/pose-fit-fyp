import { getToken } from "../lib/local-storage";
import { Navigate, Outlet, useLocation } from "react-router-dom";

export const AuthRequired = () => {
  const token = getToken();
  const location = useLocation();

  if (!token) {
    if (location.pathname.startsWith("/admin")) {
      return <Navigate to="/admin/login" replace state={{ from: location }} />;
    }

    if (location.pathname.startsWith("/professional")) {
      return (
        <Navigate to="/professional/login" replace state={{ from: location }} />
      );
    }

    if (location.pathname.startsWith("/user")) {
      return <Navigate to="/user/login" replace state={{ from: location }} />;
    }

    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
