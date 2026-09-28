const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const NAME_REGEX = /^[A-Za-z][A-Za-z\s'.-]{1,49}$/;

const validateName = (name, label) => {
  if (typeof name !== "string" || !name.trim()) {
    return `${label} is required`;
  }

  const value = name.trim();

  if (value.length < 2 || value.length > 50) {
    return `${label} must be between 2 and 50 characters`;
  }

  if (!NAME_REGEX.test(value)) {
    return `${label} can only contain letters, spaces, apostrophes, dots and hyphens`;
  }

  return null;
};

const validateEmail = (email) => {
  if (typeof email !== "string" || !email.trim()) {
    return "Email is required";
  }

  const value = email.trim();

  if (value.length > 254) {
    return "Email is too long";
  }

  if (!EMAIL_REGEX.test(value)) {
    return "Please enter a valid email address";
  }

  return null;
};

const validatePassword = (password) => {
  if (!password) {
    return "Password is required";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters long";
  }

  if (password.length > 64) {
    return "Password must not be more than 64 characters long";
  }

  if (password.includes(" ")) {
    return "Password must not contain spaces";
  }

  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter";
  }

  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter";
  }

  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number";
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must contain at least one special character";
  }

  return null;
};

const validateOtp = (code) => {
  if (!code) {
    return "Verification code is required";
  }

  if (!/^\d{6}$/.test(String(code))) {
    return "Verification code must be 6 digits";
  }

  return null;
};

module.exports = {
  validateName,
  validateEmail,
  validatePassword,
  validateOtp,
};