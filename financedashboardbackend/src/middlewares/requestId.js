"use strict";

const crypto = require("crypto");

const MAX_LEN = 128;

/**
 * Assigns a stable request id for logs and tracing; echoes or generates X-Request-Id.
 */
function requestId(req, res, next) {
  const incoming = req.headers["x-request-id"];
  const id =
    typeof incoming === "string" && incoming.length > 0
      ? incoming.slice(0, MAX_LEN)
      : crypto.randomUUID();
  req.requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
}

module.exports = { requestId };
