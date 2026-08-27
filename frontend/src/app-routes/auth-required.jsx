
import { getToken } from "../lib/local-storage";
import { Navigate, Outlet, useLocation } from "react-router-dom";

export const AuthRequired = () => {
  const token = getToken();
  const location = useLocation();

  // NOT LOGGED IN

  if (!token) {
    return (
      <Navigate
        to="/user/login"
        replace
        state={{ from: location }}
      />
    );
  }

  return <Outlet />;
};

