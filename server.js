require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB setup
let db;

async function connectToDatabase() {
  try {
    const client = new MongoClient(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    db = client.db('main');
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  }
}

connectToDatabase();

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
  res.sendFile(__dirname + '/views/login.html');
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt:', { username, password });

  if (!db) {
    console.error('Database not connected');
    return res.status(500).send('Database not connected');
  }

  try {
    const user = await db.collection('users').findOne({ username });

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
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/todo', checkAuth, (req, res) => {
  res.sendFile(__dirname + '/views/todo.html');
});

app.post('/add', checkAuth, async (req, res) => {
  const { task } = req.body;
  const userId = req.session.user._id;

  if (!db) {
    console.error('Database not connected');
    return res.status(500).send('Database not connected');
  }

  try {
    await db.collection('todos').insertOne({ userId, task, completed: false });
    res.redirect('/todo');
  } catch (err) {
    console.error('Error inserting todo:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/todos', checkAuth, async (req, res) => {
  const userId = req.session.user._id;

  if (!db) {
    console.error('Database not connected');
    return res.status(500).send('Database not connected');
  }

  try {
    const todos = await db.collection('todos').find({ userId }).toArray();
    res.json(todos);
  } catch (err) {
    console.error('Error fetching todos:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/toggle', checkAuth, async (req, res) => {
  const { id, completed } = req.body;

  if (!db) {
    console.error('Database not connected');
    return res.status(500).send('Database not connected');
  }

  try {
    await db.collection('todos').updateOne(
      { _id: new ObjectId(id) },
      { $set: { completed: !!completed } }
    );
    res.sendStatus(200);
  } catch (err) {
    console.error('Error updating todo:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
