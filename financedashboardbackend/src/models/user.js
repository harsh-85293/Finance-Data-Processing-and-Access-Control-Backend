const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const ROLES = Object.freeze({
  VIEWER: "viewer",
  ANALYST: "analyst",
  ADMIN: "admin",
});

const STATUSES = Object.freeze({
  ACTIVE: "active",
  INACTIVE: "inactive",
});

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, trim: true, default: "" },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.VIEWER,
    },
    status: {
      type: String,
      enum: Object.values(STATUSES),
      default: STATUSES.ACTIVE,
    },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.statics.hashPassword = async function hashPassword(plain) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this.id,
    email: this.email,
    name: this.name,
    role: this.role,
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = {
  User: mongoose.model("User", userSchema),
  ROLES,
  STATUSES,
};
