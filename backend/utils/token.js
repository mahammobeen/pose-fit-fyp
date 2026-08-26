const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();

const generateToken = (userId, role, extra = {}) => {
  return jwt.sign(
    {
      userId,
      role,
      ...extra,
    },
    process.env.SECRET_KEY,
    {
      expiresIn: "1d",
    }
  );
};

module.exports = generateToken;