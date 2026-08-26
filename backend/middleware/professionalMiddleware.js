const professionalMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (req.user.role !== "PROFESSIONAL") {
    return res.status(403).json({
      success: false,
      message: "Access restricted to professionals only",
    });
  }

  next();
};

module.exports = professionalMiddleware;
