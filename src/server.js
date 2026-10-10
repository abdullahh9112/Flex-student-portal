// ============================================================
//  Flex Student Portal - main server
// ============================================================
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');

const config = require('./config');
const { makeCsrfToken, outputText } = require('./security');

const app = express();

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Static assets (css / client-side js)
app.use('/static', express.static(path.join(__dirname, 'public')));

// Sessions. In SAFE mode we also harden the cookie
// (httpOnly + sameSite) which helps against CSRF and
// cookie theft; in VULNERABLE mode those protections are off.
app.use(
  session({
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: config.isSafe,                 // vulnerable: JS can read cookie
      sameSite: config.isSafe ? 'lax' : false, // vulnerable: cross-site requests send cookie
    },
  })
);

// Make common values available to every view + ensure a
// CSRF token exists for the logged-in session.
app.use((req, res, next) => {
  if (!req.session.csrfToken) req.session.csrfToken = makeCsrfToken();
  res.locals.MODE = config.MODE;
  res.locals.isVulnerable = config.isVulnerable;
  res.locals.isSafe = config.isSafe;
  res.locals.csrfToken = req.session.csrfToken;
  res.locals.currentUser = req.session.user || null;
  res.locals.outputText = outputText; // available in all views
  next();
});

// Routes
app.use('/', require('./routes/auth'));
app.use('/', require('./routes/portal'));

// 404
app.use((req, res) => {
  res.status(404).render('error', { message: 'Page not found (404).' });
});

app.listen(config.PORT, () => {
  const banner =
    config.isVulnerable
      ? '*** VULNERABLE VERSION - all attacks are LIVE ***'
      : '*** SAFE VERSION - all attacks are BLOCKED ***';
  console.log('\n================================================');
  console.log('   Flex Student Portal');
  console.log(`   ${banner}`);
  console.log(`   Mode:  ${config.MODE.toUpperCase()}`);
  console.log(`   URL:   http://localhost:${config.PORT}`);
  console.log('   Demo accounts: abdullah / 1234  |  afifa / afifa@');
  console.log('================================================\n');
});
