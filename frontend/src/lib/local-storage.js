import { jwtDecode } from "jwt-decode";

export const setToken = (token) => {
  localStorage.setItem("pose-fit", token);
};

export const getToken = () => {
  return localStorage.getItem("pose-fit");
};

export const deleteToken = () => {
  return localStorage.removeItem("pose-fit");
};

export const getUser = () => {
  const token = getToken();
  if (!token) return null;

  try {
    const data = jwtDecode(token);

    if (data.userID?._doc) {
      return {
        ...data.userID._doc,
        _id: data.userID._doc._id || data.userID._doc.id,
      };
    } else {
      return {
        _id: data.userID || data.sub || data.id,
        role: data.role || "USER",
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
      };
    }
  } catch (error) {
    console.error("JWT decode error:", error);
    return null;
  }
};

export const getUserRole = () => {
  const user = getUser();
  if (!user) return null;
  return user.role || null;
};
