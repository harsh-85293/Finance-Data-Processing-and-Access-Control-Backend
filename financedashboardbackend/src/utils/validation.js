const { ROLES, STATUSES } = require("../models/user");
const { RECORD_TYPES } = require("../models/financialRecord");

const ALLOWED_ROLES = new Set(Object.values(ROLES));
const ALLOWED_STATUSES = new Set(Object.values(STATUSES));
const ALLOWED_RECORD_TYPES = new Set(Object.values(RECORD_TYPES));

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function parsePositiveNumber(value, field) {
  if (value === undefined || value === null || value === "") {
    return { ok: false, error: `${field} is required` };
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    return { ok: false, error: `${field} must be a positive number` };
  }
  return { ok: true, value: n };
}

function parseOptionalPositiveInt(value, field, { defaultValue, max } = {}) {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: defaultValue };
  }
  const n = parseInt(String(value), 10);
  if (!Number.isFinite(n) || n < 1) {
    return { ok: false, error: `${field} must be a positive integer` };
  }
  if (max != null && n > max) {
    return { ok: false, error: `${field} must be at most ${max}` };
  }
  return { ok: true, value: n };
}

function parseDate(value, field, { required = true } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) {
      return { ok: false, error: `${field} is required` };
    }
    return { ok: true, value: undefined };
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) {
    return { ok: false, error: `${field} must be a valid date` };
  }
  return { ok: true, value: d };
}

function parseOptionalDateRange(fromRaw, toRaw) {
  const fromResult = parseDate(fromRaw, "dateFrom", { required: false });
  if (!fromResult.ok) {
    return fromResult;
  }
  const toResult = parseDate(toRaw, "dateTo", { required: false });
  if (!toResult.ok) {
    return toResult;
  }
  const from = fromResult.value;
  const to = toResult.value;
  if (from && to && from > to) {
    return { ok: false, error: "dateFrom must be before or equal to dateTo" };
  }
  return { ok: true, value: { from, to } };
}

function validateEmail(email) {
  if (!isNonEmptyString(email)) {
    return { ok: false, error: "email is required" };
  }
  const trimmed = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { ok: false, error: "email must be valid" };
  }
  return { ok: true, value: trimmed };
}

function validatePassword(password) {
  if (!isNonEmptyString(password)) {
    return { ok: false, error: "password is required" };
  }
  if (password.length < 8) {
    return { ok: false, error: "password must be at least 8 characters" };
  }
  return { ok: true, value: password };
}

function validateRole(role, { required } = {}) {
  if (role === undefined || role === null || role === "") {
    if (required) {
      return { ok: false, error: "role is required" };
    }
    return { ok: true, value: undefined };
  }
  const normalized =
    typeof role === "string" ? role.trim().toLowerCase() : role;
  if (!ALLOWED_ROLES.has(normalized)) {
    return {
      ok: false,
      error: `role must be one of: ${Array.from(ALLOWED_ROLES).join(", ")}`,
    };
  }
  return { ok: true, value: normalized };
}

function validateStatus(status, { required } = {}) {
  if (status === undefined || status === null || status === "") {
    if (required) {
      return { ok: false, error: "status is required" };
    }
    return { ok: true, value: undefined };
  }
  if (!ALLOWED_STATUSES.has(status)) {
    return {
      ok: false,
      error: `status must be one of: ${Array.from(ALLOWED_STATUSES).join(", ")}`,
    };
  }
  return { ok: true, value: status };
}

function validateRecordType(type) {
  if (!isNonEmptyString(type)) {
    return { ok: false, error: "type is required" };
  }
  if (!ALLOWED_RECORD_TYPES.has(type)) {
    return {
      ok: false,
      error: `type must be one of: ${Array.from(ALLOWED_RECORD_TYPES).join(", ")}`,
    };
  }
  return { ok: true, value: type };
}

function validateCategory(category) {
  if (!isNonEmptyString(category)) {
    return { ok: false, error: "category is required" };
  }
  const trimmed = category.trim();
  if (trimmed.length > 120) {
    return { ok: false, error: "category must be 120 characters or less" };
  }
  return { ok: true, value: trimmed };
}

function validateNotes(notes) {
  if (notes === undefined || notes === null) {
    return { ok: true, value: "" };
  }
  if (typeof notes !== "string") {
    return { ok: false, error: "notes must be a string" };
  }
  if (notes.length > 2000) {
    return { ok: false, error: "notes must be 2000 characters or less" };
  }
  return { ok: true, value: notes };
}

function validateTrendGranularity(value) {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: "month" };
  }
  if (value === "month" || value === "week") {
    return { ok: true, value };
  }
  return { ok: false, error: "trend must be 'month' or 'week'" };
}

function collectFieldErrors(results) {
  const errors = [];
  for (const r of results) {
    if (!r.ok) {
      errors.push(r.error);
    }
  }
  if (errors.length === 0) {
    return null;
  }
  return errors;
}

module.exports = {
  ALLOWED_ROLES,
  ALLOWED_STATUSES,
  ALLOWED_RECORD_TYPES,
  isNonEmptyString,
  parsePositiveNumber,
  parseOptionalPositiveInt,
  parseDate,
  parseOptionalDateRange,
  validateEmail,
  validatePassword,
  validateRole,
  validateStatus,
  validateRecordType,
  validateCategory,
  validateNotes,
  validateTrendGranularity,
  collectFieldErrors,
};
