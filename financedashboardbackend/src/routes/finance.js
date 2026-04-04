const express = require("express");
const mongoose = require("mongoose");
const { FinancialRecord, RECORD_TYPES } = require("../models/financialRecord");
const { ROLES } = require("../models/user");
const { requireAuth } = require("../middlewares/auth");
const { requireRoles } = require("../middlewares/authorize");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  parsePositiveNumber,
  parseOptionalPositiveInt,
  parseDate,
  parseOptionalDateRange,
  validateRecordType,
  validateCategory,
  validateNotes,
  collectFieldErrors,
} = require("../utils/validation");

const router = express.Router();

function recordToJSON(doc) {
  return {
    id: doc.id,
    amount: doc.amount,
    type: doc.type,
    category: doc.category,
    date: doc.date,
    notes: doc.notes,
    createdBy: doc.createdBy ? String(doc.createdBy) : undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

const readOnly = [requireAuth, requireRoles(ROLES.ANALYST, ROLES.ADMIN)];
const adminOnly = [requireAuth, requireRoles(ROLES.ADMIN)];

router.get(
  "/",
  ...readOnly,
  asyncHandler(async (req, res) => {
    const typeFilter = req.query.type;
    if (
      typeFilter !== undefined &&
      typeFilter !== "" &&
      !Object.values(RECORD_TYPES).includes(typeFilter)
    ) {
      return res.status(400).json({
        message: "Validation failed",
        details: [`type must be one of: ${Object.values(RECORD_TYPES).join(", ")}`],
      });
    }

    const categoryFilter =
      typeof req.query.category === "string" ? req.query.category.trim() : "";
    const rangeResult = parseOptionalDateRange(req.query.dateFrom, req.query.dateTo);
    if (!rangeResult.ok) {
      return res.status(400).json({ message: "Validation failed", details: [rangeResult.error] });
    }

    const pageResult = parseOptionalPositiveInt(req.query.page, "page", {
      defaultValue: 1,
      max: 10000,
    });
    const limitResult = parseOptionalPositiveInt(req.query.limit, "limit", {
      defaultValue: 20,
      max: 100,
    });
    const errs = collectFieldErrors([pageResult, limitResult]);
    if (errs) {
      return res.status(400).json({ message: "Validation failed", details: errs });
    }

    const filter = {};
    if (typeFilter) {
      filter.type = typeFilter;
    }
    if (categoryFilter) {
      filter.category = new RegExp(
        `^${categoryFilter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        "i"
      );
    }
    const { from, to } = rangeResult.value;
    if (from || to) {
      filter.date = {};
      if (from) {
        filter.date.$gte = from;
      }
      if (to) {
        filter.date.$lte = to;
      }
    }

    const page = pageResult.value;
    const limit = limitResult.value;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      FinancialRecord.find(filter).sort({ date: -1 }).skip(skip).limit(limit),
      FinancialRecord.countDocuments(filter),
    ]);

    return res.json({
      data: items.map(recordToJSON),
      page,
      limit,
      total,
    });
  })
);

router.get(
  "/:id",
  ...readOnly,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid record id" });
    }
    const doc = await FinancialRecord.findById(id);
    if (!doc) {
      return res.status(404).json({ message: "Record not found" });
    }
    return res.json({ record: recordToJSON(doc) });
  })
);

router.post(
  "/",
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const amountResult = parsePositiveNumber(req.body.amount, "amount");
    const typeResult = validateRecordType(req.body.type);
    const categoryResult = validateCategory(req.body.category);
    const dateResult = parseDate(req.body.date, "date", { required: true });
    const notesResult = validateNotes(req.body.notes);
    const errs = collectFieldErrors([
      amountResult,
      typeResult,
      categoryResult,
      dateResult,
      notesResult,
    ]);
    if (errs) {
      return res.status(400).json({ message: "Validation failed", details: errs });
    }

    const doc = await FinancialRecord.create({
      amount: amountResult.value,
      type: typeResult.value,
      category: categoryResult.value,
      date: dateResult.value,
      notes: notesResult.value,
      createdBy: req.user.id,
    });

    return res.status(201).json({ record: recordToJSON(doc) });
  })
);

router.patch(
  "/:id",
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid record id" });
    }

    const doc = await FinancialRecord.findById(id);
    if (!doc) {
      return res.status(404).json({ message: "Record not found" });
    }

    let amountResult = { ok: true, value: undefined };
    if (req.body.amount !== undefined) {
      amountResult = parsePositiveNumber(req.body.amount, "amount");
    }
    let typeResult = { ok: true, value: undefined };
    if (req.body.type !== undefined) {
      typeResult = validateRecordType(req.body.type);
    }
    let categoryResult = { ok: true, value: undefined };
    if (req.body.category !== undefined) {
      categoryResult = validateCategory(req.body.category);
    }
    let dateResult = { ok: true, value: undefined };
    if (req.body.date !== undefined) {
      dateResult = parseDate(req.body.date, "date", { required: true });
    }
    let notesResult = { ok: true, value: undefined };
    if (req.body.notes !== undefined) {
      notesResult = validateNotes(req.body.notes);
    }

    const errs = collectFieldErrors([
      amountResult,
      typeResult,
      categoryResult,
      dateResult,
      notesResult,
    ]);
    if (errs) {
      return res.status(400).json({ message: "Validation failed", details: errs });
    }

    const hasUpdate =
      amountResult.value !== undefined ||
      typeResult.value !== undefined ||
      categoryResult.value !== undefined ||
      dateResult.value !== undefined ||
      notesResult.value !== undefined;

    if (!hasUpdate) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    if (amountResult.value !== undefined) {
      doc.amount = amountResult.value;
    }
    if (typeResult.value !== undefined) {
      doc.type = typeResult.value;
    }
    if (categoryResult.value !== undefined) {
      doc.category = categoryResult.value;
    }
    if (dateResult.value !== undefined) {
      doc.date = dateResult.value;
    }
    if (notesResult.value !== undefined) {
      doc.notes = notesResult.value;
    }

    await doc.save();

    return res.json({ record: recordToJSON(doc) });
  })
);

router.delete(
  "/:id",
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid record id" });
    }
    const doc = await FinancialRecord.findByIdAndDelete(id);
    if (!doc) {
      return res.status(404).json({ message: "Record not found" });
    }
    return res.status(204).send();
  })
);

module.exports = router;
