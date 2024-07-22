const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const username = "dilakuta"; // your username
const password = "04052024"; // your password

async function updatePassword() {
  const client = new MongoClient(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    await client.connect();
    const db = client.db('todos');
    const usersCollection = db.collection('users');

    const hashedPassword = bcrypt.hashSync(password, 10);

    await usersCollection.updateOne({ username }, { $set: { password: hashedPassword } });
    console.log("Password updated successfully.");
  } catch (error) {
    console.error("Error updating password:", error);
  } finally {
    await client.close();
  }
}

updatePassword();
