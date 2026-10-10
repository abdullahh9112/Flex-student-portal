// ============================================================
//  Security helpers - the ONE place where vulnerable vs safe
//  behaviour lives. Every route imports from here, so the
//  examiner can see exactly what changes between modes.
// ============================================================
const crypto = require('crypto');
const { isSafe } = require('./config');

// ------------------------------------------------------------
//  HTML escaping (defence against XSS)
// ------------------------------------------------------------
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// outputText() decides whether user content is escaped before
// it reaches the HTML page.
//   SAFE mode       -> escaped  (XSS neutralised)
//   VULNERABLE mode -> raw      (XSS fires)
function outputText(str) {
  return isSafe ? escapeHtml(str) : String(str === undefined || str === null ? '' : str);
}

// ------------------------------------------------------------
//  SQL string literal quoting (defence against SQL injection)
// ------------------------------------------------------------
// In SAFE mode the app uses parameterised queries instead of
// this function, so this is only ever used by the VULNERABLE
// code paths (shown for contrast).
function quoteUnsafe(value) {
  return `'${value}'`;
}

// ------------------------------------------------------------
//  CSRF tokens (defence against CSRF)
// ------------------------------------------------------------
function makeCsrfToken() {
  return crypto.randomBytes(24).toString('hex');
}

// Returns true if the CSRF check PASSES (request may proceed).
//   SAFE mode       -> token must match the one in the session
//   VULNERABLE mode -> no check at all, always passes
function csrfOk(req) {
  if (!isSafe) return true; // vulnerable: never validated
  const sent = req.body._csrf || req.query._csrf || req.headers['x-csrf-token'];
  return !!sent && sent === req.session.csrfToken;
}

module.exports = {
  escapeHtml,
  outputText,
  quoteUnsafe,
  makeCsrfToken,
  csrfOk,
};
