const express = require("express");
const { requireAuth } = require("../middlewares/auth");
const { asyncHandler } = require("../utils/asyncHandler");
const { getSummary } = require("../services/dashboard.service");
const { sendServiceResult } = require("../services/httpResult");

const router = express.Router();

router.use(requireAuth);

router.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const result = await getSummary(req.query);
    return sendServiceResult(res, result);
  })
);

module.exports = router;
