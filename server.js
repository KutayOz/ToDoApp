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
  const hashedPassword = bcrypt.hashSync('dil@Kutay04052024', 20); // Change 'adminpassword' to your desired password
  stmt.run('dilakuta', hashedPassword);
  stmt.finalize();

  db.run("CREATE TABLE todos (id INTEGER PRIMARY KEY, task TEXT, completed INTEGER DEFAULT 0)");
});

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
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

app.post('/add', checkAuth, (req, res) => {
  const { task } = req.body;
  db.run("INSERT INTO todos (task) VALUES (?)", [task], (err) => {
    if (err) {
      return console.error(err.message);
    }
    res.redirect('/');
  });
});

app.get('/todos', checkAuth, (req, res) => {
  db.all("SELECT * FROM todos", [], (err, rows) => {
    if (err) {
      throw err;
    }
    res.json(rows);
  });
});

app.post('/toggle', checkAuth, (req, res) => {
  const { id, completed } = req.body;
  db.run("UPDATE todos SET completed = ? WHERE id = ?", [completed, id], (err) => {
    if (err) {
      return console.error(err.message);
    }
    res.sendStatus(200);
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
