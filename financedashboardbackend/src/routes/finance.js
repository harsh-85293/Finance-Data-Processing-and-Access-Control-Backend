const express = require("express");
const { ROLES } = require("../models/user");
const { requireAuth } = require("../middlewares/auth");
const { requireRoles } = require("../middlewares/authorize");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  listRecords,
  getRecordById,
  createRecord,
  updateRecord,
  deleteRecord,
} = require("../services/finance.service");
const { sendServiceResult } = require("../services/httpResult");

const router = express.Router();

const readOnly = [requireAuth, requireRoles(ROLES.ANALYST, ROLES.ADMIN)];
const adminOnly = [requireAuth, requireRoles(ROLES.ADMIN)];

router.get(
  "/",
  ...readOnly,
  asyncHandler(async (req, res) => {
    const result = await listRecords(req.query);
    return sendServiceResult(res, result);
  })
);

router.get(
  "/:id",
  ...readOnly,
  asyncHandler(async (req, res) => {
    const result = await getRecordById(req.params.id);
    return sendServiceResult(res, result);
  })
);

router.post(
  "/",
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const result = await createRecord(req.body, req.user.id);
    return sendServiceResult(res, result);
  })
);

router.patch(
  "/:id",
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const result = await updateRecord(req.params.id, req.body);
    return sendServiceResult(res, result);
  })
);

router.delete(
  "/:id",
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const result = await deleteRecord(req.params.id);
    return sendServiceResult(res, result);
  })
);

module.exports = router;
