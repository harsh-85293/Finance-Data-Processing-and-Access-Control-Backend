const express = require("express");
const { User, ROLES } = require("../models/user");
const { requireAuth } = require("../middlewares/auth");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  validateEmail,
  validatePassword,
  collectFieldErrors,
} = require("../utils/validation");
const { signUserToken, setAuthCookie, clearAuthCookie } = require("../utils/token");

const router = express.Router();

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const emailResult = validateEmail(req.body.email);
    const passwordResult = validatePassword(req.body.password);
    const name =
      typeof req.body.name === "string" ? req.body.name.trim().slice(0, 120) : "";
    const errs = collectFieldErrors([emailResult, passwordResult]);
    if (errs) {
      return res.status(400).json({ message: "Validation failed", details: errs });
    }

    const existing = await User.findOne({ email: emailResult.value });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const count = await User.countDocuments();
    const role = count === 0 ? ROLES.ADMIN : ROLES.VIEWER;

    const passwordHash = await User.hashPassword(passwordResult.value);
    const user = await User.create({
      email: emailResult.value,
      passwordHash,
      name,
      role,
      status: "active",
    });

    const token = signUserToken(user.id);
    setAuthCookie(res, token);

    return res.status(201).json({ user: user.toSafeJSON() });
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const emailResult = validateEmail(req.body.email);
    const passwordResult = validatePassword(req.body.password);
    const errs = collectFieldErrors([emailResult, passwordResult]);
    if (errs) {
      return res.status(400).json({ message: "Validation failed", details: errs });
    }

    const user = await User.findOne({ email: emailResult.value }).select(
      "+passwordHash"
    );
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const ok = await user.comparePassword(passwordResult.value);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    if (user.status !== "active") {
      return res.status(403).json({ message: "Account is inactive" });
    }

    const token = signUserToken(user.id);
    setAuthCookie(res, token);

    return res.json({ user: user.toSafeJSON() });
  })
);

router.post("/logout", (req, res) => {
  clearAuthCookie(res);
  return res.status(204).send();
});

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    return res.json({ user: req.user.toSafeJSON() });
  })
);

module.exports = router;
