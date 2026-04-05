const express = require("express");
const { ROLES } = require("../models/user");
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
const {
  listUsersPaginated,
  createUserByAdmin,
  updateUserById,
} = require("../services/user.service");
const { sendServiceResult } = require("../services/httpResult");

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

    const result = await listUsersPaginated({
      page: pageResult.value,
      limit: limitResult.value,
    });
    return sendServiceResult(res, result);
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

    const result = await createUserByAdmin({
      email: emailResult.value,
      password: passwordResult.value,
      name,
      role: roleResult.value,
    });
    return sendServiceResult(res, result);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

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

    const result = await updateUserById(id, {
      role: roleResult.value,
      status: statusResult.value,
      name,
    });
    return sendServiceResult(res, result);
  })
);

module.exports = router;
