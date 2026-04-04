const express = require("express");
const mongoose = require("mongoose");
const { User, ROLES } = require("../models/user");
const { requireAuth } = require("../middlewares/auth");
const { requireRoles } = require("../middlewares/authorize");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  validateEmail,
  validatePassword,
  validateRole,
  validateStatus,
  parseOptionalPositiveInt,
  collectFieldErrors,
} = require("../utils/validation");

const router = express.Router();

router.use(requireAuth, requireRoles(ROLES.ADMIN));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const pageResult = parseOptionalPositiveInt(req.query.page, "page", {
      defaultValue: 1,
      max: 1000,
    });
    const limitResult = parseOptionalPositiveInt(req.query.limit, "limit", {
      defaultValue: 20,
      max: 100,
    });
    const errs = collectFieldErrors([pageResult, limitResult]);
    if (errs) {
      return res.status(400).json({ message: "Validation failed", details: errs });
    }
    const page = pageResult.value;
    const limit = limitResult.value;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      User.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments({}),
    ]);

    return res.json({
      data: items.map((u) => u.toSafeJSON()),
      page,
      limit,
      total,
    });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const emailResult = validateEmail(req.body.email);
    const passwordResult = validatePassword(req.body.password);
    const roleResult = validateRole(req.body.role, { required: true });
    const name =
      typeof req.body.name === "string" ? req.body.name.trim().slice(0, 120) : "";
    const errs = collectFieldErrors([emailResult, passwordResult, roleResult]);
    if (errs) {
      return res.status(400).json({ message: "Validation failed", details: errs });
    }

    const existing = await User.findOne({ email: emailResult.value });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const passwordHash = await User.hashPassword(passwordResult.value);
    const user = await User.create({
      email: emailResult.value,
      passwordHash,
      name,
      role: roleResult.value,
      status: "active",
    });

    return res.status(201).json({ user: user.toSafeJSON() });
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const roleResult = validateRole(req.body.role, { required: false });
    const statusResult = validateStatus(req.body.status, { required: false });
    let name;
    if (req.body.name !== undefined) {
      if (typeof req.body.name !== "string") {
        return res.status(400).json({ message: "name must be a string" });
      }
      name = req.body.name.trim().slice(0, 120);
    }

    const errs = collectFieldErrors([roleResult, statusResult]);
    if (errs) {
      return res.status(400).json({ message: "Validation failed", details: errs });
    }

    if (
      roleResult.value === undefined &&
      statusResult.value === undefined &&
      name === undefined
    ) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (roleResult.value !== undefined) {
      user.role = roleResult.value;
    }
    if (statusResult.value !== undefined) {
      user.status = statusResult.value;
    }
    if (name !== undefined) {
      user.name = name;
    }

    await user.save();

    return res.json({ user: user.toSafeJSON() });
  })
);

module.exports = router;
