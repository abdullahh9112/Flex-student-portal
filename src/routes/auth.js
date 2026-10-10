// ============================================================
//  Auth routes: login, logout, change-password
// ============================================================
//  Vulnerabilities demonstrated here:
//   - SQL Injection (EASY): login bypass via ' OR '1'='1
//   - CSRF: change-password has no token in vulnerable mode
// ============================================================
const express = require('express');
const router = express.Router();

const { isVulnerable, isSafe } = require('../config');
const { db, rawGet } = require('../db/connection');
const { csrfOk, outputText } = require('../security');

// ---------- Login page ----------
router.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.redirect('/login');
});

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('login', { error: null, info: req.query.info || null });
});

// ---------- Login submit ----------
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  let user = null;

  if (isVulnerable) {
    // -------- VULNERABLE: string-concatenated SQL --------
    // The username/password go straight into the query text.
    //
    //  Attack (EASY SQLi - login bypass):
    //     username:  admin' --
    //     password:  anything
    //  or
    //     username:  ' OR '1'='1
    //     password:  ' OR '1'='1
    const sql =
      `SELECT * FROM users ` +
      `WHERE username = '${username}' AND password = '${password}'`;
    console.log('[LOGIN SQL]', sql);
    try {
      user = rawGet(sql);
    } catch (e) {
      // Show the DB error back to the user - leaks info, which
      // is itself useful for error-based injection practice.
      return res.render('login', {
        error: 'SQL error: ' + e.message,
        info: null,
      });
    }
  } else {
    // -------- SAFE: parameterised query --------
    user = db
      .prepare('SELECT * FROM users WHERE username = ? AND password = ?')
      .get(username, password);
  }

  if (!user) {
    return res.render('login', { error: 'Invalid username or password.', info: null });
  }

  req.session.user = {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    role: user.role,
    email: user.email,
  };
  res.redirect('/dashboard');
});

// ---------- Logout ----------
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login?info=You have been logged out.'));
});

// ---------- Change password (CSRF target) ----------
router.post('/change-password', (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  // SAFE mode validates a CSRF token; VULNERABLE mode does not.
  if (!csrfOk(req)) {
    return res.status(403).render('error', {
      message: 'CSRF validation failed: missing or invalid token. Request rejected.',
    });
  }

  const newPassword = req.body.newPassword;
  if (!newPassword) {
    return res.status(400).render('error', { message: 'New password is required.' });
  }

  db.prepare('UPDATE users SET password = ? WHERE id = ?')
    .run(newPassword, req.session.user.id);

  // Silent CSRF: don't show a confirmation. Just send the victim
  // to their normal dashboard so the attack is invisible.
  res.redirect('/dashboard');
});

module.exports = router;
