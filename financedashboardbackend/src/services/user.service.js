const mongoose = require("mongoose");
const { User } = require("../models/user");
const { ok, fail } = require("./httpResult");

async function listUsersPaginated({ page, limit }) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    User.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments({}),
  ]);
  return ok({
    data: items.map((u) => u.toSafeJSON()),
    page,
    limit,
    total,
  });
}

async function createUserByAdmin({ email, password, name, role }) {
  const existing = await User.findOne({ email });
  if (existing) {
    return fail(409, { message: "Email already registered" });
  }
  const passwordHash = await User.hashPassword(password);
  const user = await User.create({
    email,
    passwordHash,
    name,
    role,
    status: "active",
  });
  return ok({ user: user.toSafeJSON() }, 201);
}

async function updateUserById(id, updates) {
  if (!mongoose.isValidObjectId(id)) {
    return fail(400, { message: "Invalid user id" });
  }

  const { role, status, name } = updates;
  if (role === undefined && status === undefined && name === undefined) {
    return fail(400, { message: "No valid fields to update" });
  }

  const user = await User.findById(id);
  if (!user) {
    return fail(404, { message: "User not found" });
  }

  if (role !== undefined) user.role = role;
  if (status !== undefined) user.status = status;
  if (name !== undefined) user.name = name;

  await user.save();
  return ok({ user: user.toSafeJSON() });
}

module.exports = {
  listUsersPaginated,
  createUserByAdmin,
  updateUserById,
};
