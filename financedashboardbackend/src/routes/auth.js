const express = require("express");
const { requireAuth } = require("../middlewares/auth");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  validateEmail,
  validatePassword,
  collectFieldErrors,
} = require("../utils/validation");
const { setAuthCookie, clearAuthCookie } = require("../utils/token");
const { registerUser, loginUser } = require("../services/auth.service");
const { sendServiceResult } = require("../services/httpResult");

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

    const bodyHasRoleField =
      req.body.role !== undefined && req.body.role !== null && req.body.role !== "";

    const result = await registerUser(
      {
        email: emailResult.value,
        password: passwordResult.value,
        name,
      },
      bodyHasRoleField
    );

    if (!result.ok) {
      return res.status(result.status).json(result.body);
    }

    const { token, ...json } = result.payload;
    setAuthCookie(res, token);
    return res.status(result.status).json(json);
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

    const result = await loginUser({
      email: emailResult.value,
      password: passwordResult.value,
    });

    if (!result.ok) {
      return res.status(result.status).json(result.body);
    }

    const { token, ...json } = result.payload;
    setAuthCookie(res, token);
    return res.json(json);
  })
);

router.post("/logout", (req, res) => {
  clearAuthCookie(res);
  return res.status(200).json({
    message: "Logged out successfully",
  });
});

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    return res.json({ user: req.user.toSafeJSON() });
  })
);

module.exports = router;
