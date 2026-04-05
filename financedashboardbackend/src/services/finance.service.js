const mongoose = require("mongoose");
const { FinancialRecord, RECORD_TYPES } = require("../models/financialRecord");
const { ok, fail } = require("./httpResult");
const { toRecordJSON } = require("../mappers/financialRecord.mapper");
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

/** Only non–soft-deleted rows (missing or null `deletedAt`). */
function activeRecordFilter(base = {}) {
  return { ...base, deletedAt: null };
}

function buildListFilter({ typeFilter, categoryFilter, rangeResult }) {
  const filter = {};
  if (typeFilter) {
    filter.type = typeFilter;
  }
  if (categoryFilter) {
    filter.category = new RegExp(`^${categoryFilter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
  }
  const { from, to } = rangeResult.value;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = from;
    if (to) filter.date.$lte = to;
  }
  return filter;
}

async function listRecords(query) {
  const typeFilter = query.type;
  if (
    typeFilter !== undefined &&
    typeFilter !== "" &&
    !Object.values(RECORD_TYPES).includes(typeFilter)
  ) {
    return fail(400, {
      message: "Validation failed",
      details: [`type must be one of: ${Object.values(RECORD_TYPES).join(", ")}`],
    });
  }

  const categoryFilter = typeof query.category === "string" ? query.category.trim() : "";
  const rangeResult = parseOptionalDateRange(query.dateFrom, query.dateTo);
  if (!rangeResult.ok) {
    return fail(400, { message: "Validation failed", details: [rangeResult.error] });
  }

  const pageResult = parseOptionalPositiveInt(query.page, "page", {
    defaultValue: 1,
    max: 10000,
  });
  const limitResult = parseOptionalPositiveInt(query.limit, "limit", {
    defaultValue: 20,
    max: 100,
  });
  const errs = collectFieldErrors([pageResult, limitResult]);
  if (errs) {
    return fail(400, { message: "Validation failed", details: errs });
  }

  const filter = activeRecordFilter(buildListFilter({ typeFilter, categoryFilter, rangeResult }));
  const page = pageResult.value;
  const limit = limitResult.value;
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    FinancialRecord.find(filter).sort({ date: -1 }).skip(skip).limit(limit),
    FinancialRecord.countDocuments(filter),
  ]);

  return ok({
    data: items.map(toRecordJSON),
    page,
    limit,
    total,
  });
}

async function getRecordById(id) {
  if (!mongoose.isValidObjectId(id)) {
    return fail(400, { message: "Invalid record id" });
  }
  const doc = await FinancialRecord.findOne(activeRecordFilter({ _id: id }));
  if (!doc) {
    return fail(404, { message: "Record not found" });
  }
  return ok({ record: toRecordJSON(doc) });
}

async function createRecord(body, createdByUserId) {
  const amountResult = parsePositiveNumber(body.amount, "amount");
  const typeResult = validateRecordType(body.type);
  const categoryResult = validateCategory(body.category);
  const dateResult = parseDate(body.date, "date", { required: true });
  const notesResult = validateNotes(body.notes);
  const errs = collectFieldErrors([
    amountResult,
    typeResult,
    categoryResult,
    dateResult,
    notesResult,
  ]);
  if (errs) {
    return fail(400, { message: "Validation failed", details: errs });
  }

  const doc = await FinancialRecord.create({
    amount: amountResult.value,
    type: typeResult.value,
    category: categoryResult.value,
    date: dateResult.value,
    notes: notesResult.value,
    createdBy: createdByUserId,
  });

  return ok({ record: toRecordJSON(doc) }, 201);
}

async function updateRecord(id, body) {
  if (!mongoose.isValidObjectId(id)) {
    return fail(400, { message: "Invalid record id" });
  }

  const doc = await FinancialRecord.findOne(activeRecordFilter({ _id: id }));
  if (!doc) {
    return fail(404, { message: "Record not found" });
  }

  let amountResult = { ok: true, value: undefined };
  if (body.amount !== undefined) {
    amountResult = parsePositiveNumber(body.amount, "amount");
  }
  let typeResult = { ok: true, value: undefined };
  if (body.type !== undefined) {
    typeResult = validateRecordType(body.type);
  }
  let categoryResult = { ok: true, value: undefined };
  if (body.category !== undefined) {
    categoryResult = validateCategory(body.category);
  }
  let dateResult = { ok: true, value: undefined };
  if (body.date !== undefined) {
    dateResult = parseDate(body.date, "date", { required: true });
  }
  let notesResult = { ok: true, value: undefined };
  if (body.notes !== undefined) {
    notesResult = validateNotes(body.notes);
  }

  const errs = collectFieldErrors([
    amountResult,
    typeResult,
    categoryResult,
    dateResult,
    notesResult,
  ]);
  if (errs) {
    return fail(400, { message: "Validation failed", details: errs });
  }

  const hasUpdate =
    amountResult.value !== undefined ||
    typeResult.value !== undefined ||
    categoryResult.value !== undefined ||
    dateResult.value !== undefined ||
    notesResult.value !== undefined;

  if (!hasUpdate) {
    return fail(400, { message: "No valid fields to update" });
  }

  if (amountResult.value !== undefined) doc.amount = amountResult.value;
  if (typeResult.value !== undefined) doc.type = typeResult.value;
  if (categoryResult.value !== undefined) doc.category = categoryResult.value;
  if (dateResult.value !== undefined) doc.date = dateResult.value;
  if (notesResult.value !== undefined) doc.notes = notesResult.value;

  await doc.save();
  return ok({ record: toRecordJSON(doc) });
}

async function deleteRecord(id) {
  if (!mongoose.isValidObjectId(id)) {
    return fail(400, { message: "Invalid record id" });
  }
  const doc = await FinancialRecord.findOneAndUpdate(
    activeRecordFilter({ _id: id }),
    { $set: { deletedAt: new Date() } },
    { new: false }
  );
  if (!doc) {
    return fail(404, { message: "Record not found" });
  }
  return ok({ message: "Deleted data successfully" }, 200);
}

module.exports = {
  listRecords,
  getRecordById,
  createRecord,
  updateRecord,
  deleteRecord,
};
