// ============================================================
//  Database setup + seed data
// ============================================================
// Creates flex.db (SQLite) with realistic student-portal data:
//   users, courses, enrollments, grades, wall_posts
//
// Passwords are stored in PLAINTEXT on purpose - this is a
// teaching project and the "advanced SQL injection" exercise
// extracts usernames + passwords from the users table.
// ============================================================

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'flex.db');

function seed() {
  const db = new Database(DB_PATH);

  // Fresh start every time we seed
  db.exec(`
    DROP TABLE IF EXISTS wall_posts;
    DROP TABLE IF EXISTS grades;
    DROP TABLE IF EXISTS enrollments;
    DROP TABLE IF EXISTS courses;
    DROP TABLE IF EXISTS users;
  `);

  db.exec(`
    CREATE TABLE users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      username   TEXT UNIQUE NOT NULL,
      password   TEXT NOT NULL,
      full_name  TEXT NOT NULL,
      role       TEXT NOT NULL DEFAULT 'student',  -- student | admin
      email      TEXT,
      secret_ssn TEXT                               -- "sensitive" data for SQLi demo
    );

    CREATE TABLE courses (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      code      TEXT NOT NULL,
      title     TEXT NOT NULL,
      credits   INTEGER NOT NULL,
      instructor TEXT NOT NULL
    );

    CREATE TABLE enrollments (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id   INTEGER NOT NULL,
      course_id INTEGER NOT NULL
    );

    CREATE TABLE grades (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id   INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      grade     TEXT NOT NULL,
      marks     INTEGER NOT NULL
    );

    CREATE TABLE wall_posts (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      author     TEXT NOT NULL,
      body       TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // ---- Users ----
  const insertUser = db.prepare(
    `INSERT INTO users (username, password, full_name, role, email, secret_ssn)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const users = [
    ['admin',   'SuperSecret@123', 'System Administrator', 'admin',   'admin@flex.edu',  '00000-0000001'],
    ['abdullah','1234',            'Abdullah',             'student', 'abdullah@flex.edu', '35201-1234567'],
    ['ayesha',  'ayesha@pass',     'Afifa',                'student', 'ayesha@flex.edu', '35202-7654321'],
    ['bilal',   'bilalPwd99',      'Bilal Ahmed',          'student', 'bilal@flex.edu',  '35203-1112223'],
    ['sara',    'saraSecure1',     'Sara Malik',           'student', 'sara@flex.edu',   '35204-4445556'],
    ['afifa',   'afifa@',          'Afifa',                'student', 'afifa@flex.edu',  '35205-2223334'],
  ];
  users.forEach((u) => insertUser.run(...u));

  // ---- Courses ----
  const insertCourse = db.prepare(
    `INSERT INTO courses (code, title, credits, instructor) VALUES (?, ?, ?, ?)`
  );
  const courses = [
    ['CS-3001', 'Information Security',       3, 'Dr. Imran Shafi'],
    ['CS-2005', 'Database Systems',           4, 'Ms. Hina Tariq'],
    ['CS-3010', 'Web Engineering',            3, 'Mr. Usman Ali'],
    ['CS-2001', 'Data Structures',            4, 'Dr. Nabeel Khan'],
    ['MT-2001', 'Linear Algebra',             3, 'Dr. Saima Riaz'],
  ];
  courses.forEach((c) => insertCourse.run(...c));

  // ---- Enrollments (abdullah = user 2) ----
  const insertEnroll = db.prepare(
    `INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)`
  );
  const enrollments = [
    [2, 1], [2, 2], [2, 3], [2, 4],
    [3, 1], [3, 3], [3, 5],
    [4, 2], [4, 4],
  ];
  enrollments.forEach((e) => insertEnroll.run(...e));

  // ---- Grades ----
  const insertGrade = db.prepare(
    `INSERT INTO grades (user_id, course_id, grade, marks) VALUES (?, ?, ?, ?)`
  );
  const grades = [
    [2, 1, 'A',  88],
    [2, 2, 'A-', 83],
    [2, 3, 'B+', 79],
    [2, 4, 'A',  90],
    [3, 1, 'B',  74],
    [3, 3, 'A',  91],
  ];
  grades.forEach((g) => insertGrade.run(...g));

  // ---- Wall posts (the "stored" area for Stored XSS) ----
  const insertPost = db.prepare(
    `INSERT INTO wall_posts (user_id, author, body, created_at) VALUES (?, ?, ?, ?)`
  );
  insertPost.run(2, 'Abdullah', 'Welcome to the Flex class wall! Post your questions here.', '2026-09-01 10:00');
  insertPost.run(3, 'Afifa',  'Does anyone have notes for the Database Systems midterm?', '2026-09-02 14:30');

  db.close();
  console.log(`[seed] Database created at ${DB_PATH}`);
  console.log(`[seed] Logins -> abdullah / 1234   |   afifa / afifa@`);
}

// Run directly:  node src/db/seed.js
if (require.main === module) {
  seed();
}

module.exports = { seed, DB_PATH };
