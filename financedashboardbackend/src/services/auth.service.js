const { User, ROLES } = require("../models/user");
const { signUserToken } = require("../utils/token");
const { ok, fail } = require("./httpResult");

/**
 * Registration business rules: first user → admin, else viewer; role in body is never applied.
 */
async function registerUser({ email, password, name }, bodyHasRoleField) {
  const existing = await User.findOne({ email });
  if (existing) {
    return fail(409, { message: "Email already registered" });
  }

  const count = await User.countDocuments();
  const role = count === 0 ? ROLES.ADMIN : ROLES.VIEWER;

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({
    email,
    passwordHash,
    name,
    role,
    status: "active",
  });

  const token = signUserToken(user.id);
  const payload = {
    user: user.toSafeJSON(),
    token,
  };
  if (bodyHasRoleField) {
    payload.notice =
      "role is ignored on /auth/register (first user becomes admin; everyone else is viewer). To create an admin or analyst, use POST /api/users while logged in as an admin.";
  }
  return ok(payload, 201);
}

async function loginUser({ email, password }) {
  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user) {
    return fail(401, { message: "Invalid credentials" });
  }
  const passwordOk = await user.comparePassword(password);
  if (!passwordOk) {
    return fail(401, { message: "Invalid credentials" });
  }
  if (user.status !== "active") {
    return fail(403, { message: "Account is inactive" });
  }

  const token = signUserToken(user.id);
  return ok({ user: user.toSafeJSON(), token });
}

module.exports = {
  registerUser,
  loginUser,
};
