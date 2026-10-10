// ============================================================
//  Portal routes (require login): dashboard, courses, grades,
//  profile, search, wall, DOM-xss demo
// ============================================================
//  Vulnerabilities demonstrated here:
//   - Reflected XSS   : /search?q=...
//   - Stored XSS      : /wall  (posts saved to DB, shown to all)
//   - DOM-based XSS   : /welcome  (client JS reads location.hash)
//   - SQL Injection   : /search  (intermediate + advanced)
// ============================================================
const express = require('express');
const router = express.Router();

const { isVulnerable } = require('../config');
const { db, rawAll } = require('../db/connection');
const { csrfOk } = require('../security');

// Guard: must be logged in
function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

// ---------- Dashboard ----------
router.get('/dashboard', requireLogin, (req, res) => {
  const u = req.session.user;
  const courseCount = db
    .prepare('SELECT COUNT(*) AS c FROM enrollments WHERE user_id = ?')
    .get(u.id).c;
  const gradeRows = db
    .prepare('SELECT COUNT(*) AS c FROM grades WHERE user_id = ?')
    .get(u.id).c;
  res.render('dashboard', { courseCount, gradeRows });
});

// ---------- My Courses ----------
router.get('/courses', requireLogin, (req, res) => {
  const u = req.session.user;
  const courses = db
    .prepare(
      `SELECT c.code, c.title, c.credits, c.instructor
         FROM courses c
         JOIN enrollments e ON e.course_id = c.id
        WHERE e.user_id = ?
        ORDER BY c.code`
    )
    .all(u.id);
  res.render('courses', { courses });
});

// ---------- My Grades ----------
router.get('/grades', requireLogin, (req, res) => {
  const u = req.session.user;
  const grades = db
    .prepare(
      `SELECT c.code, c.title, g.grade, g.marks
         FROM grades g
         JOIN courses c ON c.id = g.course_id
        WHERE g.user_id = ?
        ORDER BY c.code`
    )
    .all(u.id);
  res.render('grades', { grades });
});

// ---------- Profile (CSRF-protected change password form lives here) ----------
router.get('/profile', requireLogin, (req, res) => {
  const full = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
  res.render('profile', { user: full });
});

// ============================================================
//  SEARCH  ->  Reflected XSS  +  SQL Injection (intermediate/advanced)
// ============================================================
// Students search the course catalogue by title. The query
// string is (a) reflected back into the page and (b) placed
// into a SQL WHERE clause.
router.get('/search', requireLogin, (req, res) => {
  const q = req.query.q;

  // If no search yet, just show the empty form.
  if (q === undefined) {
    return res.render('search', { q: null, results: null, error: null, columns: null });
  }

  let results = [];
  let columns = null;
  let error = null;

  if (isVulnerable) {
    // -------- VULNERABLE: query text built by concatenation --------
    //
    //  Normal use:        q = Database
    //
    //  INTERMEDIATE SQLi (boolean inference) - note the trailing
    //  " -- " comment which removes the query's closing %' :
    //     q = %' OR '1'='1' --       -> returns ALL courses (always true)
    //     q = %' AND '1'='2' --      -> returns NOTHING (always false)
    //     (compare the two responses to infer true/false)
    //
    //  ADVANCED SQLi (UNION attack chain):
    //   1) find column count:
    //        q = x' ORDER BY 4 --      (works)  vs  ORDER BY 5 -- (errors)
    //   2) enumerate tables (sqlite's information_schema = sqlite_master):
    //        q = x' UNION SELECT name, type, 3, 4 FROM sqlite_master WHERE type='table' --
    //   3) enumerate columns of users table (read its CREATE statement):
    //        q = x' UNION SELECT sql, '2', '3', '4' FROM sqlite_master WHERE name='users' --
    //   4) dump the loot (usernames + passwords):
    //        q = x' UNION SELECT username, password, role, secret_ssn FROM users --
    const sql =
      `SELECT code, title, credits, instructor ` +
      `FROM courses WHERE title LIKE '%${q}%'`;
    console.log('[SEARCH SQL]', sql);
    try {
      results = rawAll(sql);
      if (results.length > 0) columns = Object.keys(results[0]);
    } catch (e) {
      error = 'SQL error: ' + e.message; // error-based injection feedback
    }
  } else {
    // -------- SAFE: parameterised query, fixed column list --------
    results = db
      .prepare(
        `SELECT code, title, credits, instructor
           FROM courses WHERE title LIKE ?`
      )
      .all(`%${q}%`);
    if (results.length > 0) columns = Object.keys(results[0]);
  }

  res.render('search', { q, results, error, columns });
});

// ============================================================
//  CLASS WALL  ->  Stored XSS
// ============================================================
router.get('/wall', requireLogin, (req, res) => {
  const posts = db
    .prepare('SELECT * FROM wall_posts ORDER BY id DESC')
    .all();
  res.render('wall', { posts });
});

router.post('/wall', requireLogin, (req, res) => {
  // Posting is a state-changing action, so in SAFE mode it is
  // also CSRF-protected.
  if (!csrfOk(req)) {
    return res.status(403).render('error', {
      message: 'CSRF validation failed on wall post. Request rejected.',
    });
  }

  const body = req.body.body || '';
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ');

  // The raw body is stored either way. The XSS difference is at
  // OUTPUT time (see views/wall.ejs using outputText()), which
  // is the correct place to defend against stored XSS.
  db.prepare(
    'INSERT INTO wall_posts (user_id, author, body, created_at) VALUES (?, ?, ?, ?)'
  ).run(req.session.user.id, req.session.user.full_name, body, now);

  res.redirect('/wall');
});

// ============================================================
//  WELCOME  ->  DOM-based XSS
// ============================================================
// This page is deliberately interesting: the server sends a
// static page, and CLIENT-side JavaScript reads location.hash
// and writes it into the DOM. The server never sees the
// payload, so the vulnerability is purely client-side.
//
//   Attack:  /welcome#<img src=x onerror=alert('DOM-XSS')>
//
// The safe/vulnerable switch is passed to the client so the
// script knows whether to use innerHTML (unsafe) or
// textContent (safe).
router.get('/welcome', requireLogin, (req, res) => {
  res.render('welcome');
});

module.exports = router;
