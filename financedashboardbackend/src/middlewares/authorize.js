const { ROLES } = require("../models/user");

function requireRoles(...allowed) {
  const set = new Set(allowed);
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    if (!set.has(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    return next();
  };
}

function canReadRecords(user) {
  return user.role === ROLES.ANALYST || user.role === ROLES.ADMIN;
}

function canWriteRecords(user) {
  return user.role === ROLES.ADMIN;
}

function canViewSummary(user) {
  return user.role === ROLES.VIEWER || user.role === ROLES.ANALYST || user.role === ROLES.ADMIN;
}

function canManageUsers(user) {
  return user.role === ROLES.ADMIN;
}

module.exports = {
  requireRoles,
  canReadRecords,
  canWriteRecords,
  canViewSummary,
  canManageUsers,
  ROLES,
};
