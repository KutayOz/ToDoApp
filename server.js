const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

// SQLite setup
const db = new sqlite3.Database(':memory:');

db.serialize(() => {
  db.run("CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, password TEXT)");
  const stmt = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)");
  const hashedPassword = bcrypt.hashSync('adminpassword', 10); // Change 'adminpassword' to your desired password
  stmt.run('admin', hashedPassword);
  stmt.finalize();
});

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
}));

// Middleware to protect routes
function checkAuth(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
}

// Routes
app.get('/', checkAuth, (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/login', (req, res) => {
  res.sendFile(__dirname + '/public/login.html');
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (user && bcrypt.compareSync(password, user.password)) {
      req.session.user = user;
      res.redirect('/');
    } else {
      res.redirect('/login');
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
