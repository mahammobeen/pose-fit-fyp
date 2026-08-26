// import { setToken, getToken } from "./local-storage";

// const USER_KEY = "posefit_user";

// export const setUserToken = (token) => {
//   setToken(token);
// };

// export const getUserToken = () => {
//   return getToken();
// };

// export const setUserData = (user) => {
//   localStorage.setItem(USER_KEY, JSON.stringify(user));
// };

// export const getUserData = () => {
//   try {
//     const raw = localStorage.getItem(USER_KEY);
//     return raw ? JSON.parse(raw) : null;
//   } catch {
//     return null;
//   }
// };

// export const removeUserData = () => {
//   localStorage.removeItem(USER_KEY);
// };

// export const isUserLoggedIn = () => {
//   const token = getUserToken();
//   const user = getUserData();
//   return !!token && user?.role === "USER";
// };

// export const clearUserAuth = () => {
//   deleteToken();
//   removeUserData();
// };
