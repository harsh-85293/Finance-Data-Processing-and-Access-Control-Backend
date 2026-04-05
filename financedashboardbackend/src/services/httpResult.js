// Service return shape: routes call sendServiceResult.

function ok(payload, status = 200) {
  return { ok: true, status, payload };
}

function fail(status, body) {
  return { ok: false, status, body };
}

function sendServiceResult(res, result) {
  if (!result.ok) {
    return res.status(result.status).json(result.body);
  }
  if (result.status === 204) {
    return res.status(204).send();
  }
  return res.status(result.status).json(result.payload);
}

module.exports = { ok, fail, sendServiceResult };
