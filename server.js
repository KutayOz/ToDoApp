const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');
const util = require('util');

if (typeof TextEncoder === 'undefined') {
  global.TextEncoder = util.TextEncoder;
}

if (typeof TextDecoder === 'undefined') {
  global.TextDecoder = util.TextDecoder;
}

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const SESSION_SECRET = process.env.SESSION_SECRET;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}));

const client = new MongoClient(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
let db;

client.connect(err => {
  if (err) {
    console.error('Failed to connect to the database:', err);
    process.exit(1);
  }
  db = client.db('todos');
  console.log('Connected to MongoDB');
});

app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/todo');
  }
  res.render('login');
});

app.get('/todo', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/');
  }
  db.collection('todos').find().toArray((err, todos) => {
    if (err) {
      console.error('Error fetching todos:', err);
      return res.status(500).send('Internal Server Error');
    }
    res.render('index', { todos });
  });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt:', { username, password });

  db.collection('users').findOne({username}, (err, user) => {
    if (err) {
      console.error('Error fetching user:', err);
      return res.status(500).send('Internal Server Error');
    }

    if (!user) {
      console.log('User not found:', username);
      return res.redirect('/');
    }

    const isPasswordMatch = bcrypt.compare(password, user.password);
    console.log('Password match:', isPasswordMatch);

    if (isPasswordMatch) {
      req.session.user = user;
      res.redirect('/todo');
    } else {
      res.redirect('/');
    }
  });
});

app.post('/addTodo', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/');
  }

  const { item } = req.body;
  db.collection('todos').insertOne({ item }, (err, result) => {
    if (err) {
      console.error('Error adding todo:', err);
      return res.status(500).send('Internal Server Error');
    }
    res.redirect('/todo');
  });
});

app.post('/deleteTodo', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/');
  }

  const { id } = req.body;
  db.collection('todos').deleteOne({ _id: new MongoClient.ObjectID(id) }, (err, result) => {
    if (err) {
      console.error('Error deleting todo:', err);
      return res.status(500).send('Internal Server Error');
    }
    res.redirect('/todo');
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
