import { Navigate, useLocation } from "react-router-dom";

const UserPrivateRoute = ({ children }) => {
  const location = useLocation();

  const token = localStorage.getItem("pose-fit");
  const userData = localStorage.getItem("pose-fit-user");

  if (!token || !userData) {
    return <Navigate to="/user/login" replace state={{ from: location }} />;
  }

  try {
    const user = JSON.parse(userData);

    if (user?.role !== "USER") {
      if (user?.role === "ADMIN") {
        // eslint-disable-next-line react-hooks/error-boundaries
        return <Navigate to="/admin/dashboard" replace />;
      }

      if (user?.role === "PROFESSIONAL") {
        // eslint-disable-next-line react-hooks/error-boundaries
        return <Navigate to="/professional/dashboard" replace />;
      }

      // eslint-disable-next-line react-hooks/error-boundaries
      return <Navigate to="/user/login" replace state={{ from: location }} />;
    }
  } catch (error) {
    console.error("Invalid user data:", error);

    localStorage.removeItem("pose-fit");
    localStorage.removeItem("pose-fit-user");

    return <Navigate to="/user/login" replace state={{ from: location }} />;
  }

  return children;
};

export default UserPrivateRoute;
