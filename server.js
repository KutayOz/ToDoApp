require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { MongoClient, ObjectId } = require('mongodb');
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;


const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB setup
const client = new MongoClient(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
let db;

client.connect(err => {
  if (err) {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  }
  db = client.db('main');
  console.log('Connected to MongoDB');
});

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
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
app.get('/', (req, res) => {
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  res.sendFile(__dirname + '/public/login.html');
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt:', { username, password });

  db.collection('users').findOne({}, (err, user) => {
    if (err) {
      console.error('Error fetching user:', err);
      return res.status(500).send('Internal Server Error');
    }

    if (!user) {
      console.log('User not found:', username);
      return res.redirect('/login');
    }

    const isPasswordMatch = bcrypt.compare(password, user.password);
    console.log('Password match:', isPasswordMatch);

    if (isPasswordMatch) {
      req.session.user = user;
      res.redirect('/todo');
    } else {
      res.redirect('/login');
    }
  });
});


app.get('/todo', checkAuth, (req, res) => {
  res.sendFile(__dirname + '/public/todo.html');
});

app.post('/add', checkAuth, (req, res) => {
  const { task } = req.body;
  const userId = req.session.user._id;
  db.collection('todos').insertOne({ userId, task, completed: false }, (err, result) => {
    if (err) {
      return console.error(err.message);
    }
    res.redirect('/todo');
  });
});

app.get('/todos', checkAuth, (req, res) => {
  const userId = req.session.user._id;
  db.collection('todos').find({ userId }).toArray((err, todos) => {
    if (err) {
      throw err;
    }
    res.json(todos);
  });
});

app.post('/toggle', checkAuth, (req, res) => {
  const { id, completed } = req.body;
  db.collection('todos').updateOne(
    { _id: ObjectId(id) },
    { $set: { completed: !!completed } },
    (err) => {
      if (err) {
        return console.error(err.message);
      }
      res.sendStatus(200);
    }
  );
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
