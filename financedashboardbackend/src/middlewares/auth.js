const jwt = require("jsonwebtoken");
const { User } = require("../models/user");

const COOKIE_NAME = "token";

function getToken(req) {
  if (req.cookies && req.cookies[COOKIE_NAME]) {
    return req.cookies[COOKIE_NAME];
  }
  const header = req.headers.authorization || "";
  const [type, value] = header.split(" ");
  if (type === "Bearer" && value) {
    return value;
  }
  return null;
}

async function requireAuth(req, res, next) {
  try {
    const token = getToken(req);
    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ message: "Server misconfiguration" });
    }
    const payload = jwt.verify(token, secret);
    const userId = payload.sub;
    if (!userId) {
      return res.status(401).json({ message: "Invalid token" });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    if (user.status !== "active") {
      return res.status(403).json({ message: "Account is inactive" });
    }
    req.user = user;
    return next();
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    return next(err);
  }
}

module.exports = {
  requireAuth,
  COOKIE_NAME,
  getToken,
};
