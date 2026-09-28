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

const validateProfessionalProfile = (data) => {
  const {
    firstName,
    lastName,
    bio,
    specialization,
    experience,
    sessionFee,
  } = data;

  if (firstName !== undefined) {
    const error = validateName(firstName, "First name");
    if (error) return error;
  }

  if (lastName !== undefined) {
    const error = validateName(lastName, "Last name");
    if (error) return error;
  }

  if (bio !== undefined) {
    if (typeof bio !== "string") {
      return "Bio must be text";
    }

    if (bio.trim().length > 1000) {
      return "Bio must not exceed 1000 characters";
    }
  }

  if (specialization !== undefined) {
    if (typeof specialization !== "string") {
      return "Specialization must be text";
    }

    if (specialization.trim().length > 100) {
      return "Specialization must not exceed 100 characters";
    }
  }

  if (experience !== undefined) {
    const value = Number(experience);

    if (!Number.isFinite(value) || value < 0) {
      return "Experience must be a valid non-negative number";
    }
  }

  if (sessionFee !== undefined) {
    const value = Number(sessionFee);

    if (!Number.isFinite(value) || value < 0) {
      return "Session fee must be a valid non-negative number";
    }
  }

  return null;
};

module.exports = {
  validateProfessionalProfile,
};