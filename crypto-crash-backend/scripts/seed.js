require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const Round = require('../src/models/Round');
const Transaction = require('../src/models/Transaction');

async function seed() {
  try {
    await connectDB();

    // Clear existing data (optional)
    await User.deleteMany();
    await Round.deleteMany();
    await Transaction.deleteMany();

    // Inserting sample users
    const users = await User.insertMany([
      { username: 'alice', wallet: { BTC: 1.0, ETH: 5.0 } },
      { username: 'bob',   wallet: { BTC: 0.5, ETH: 2.0 } },
      { username: 'carol', wallet: { BTC: 2.0, ETH: 10.0 } },
      { username: 'jeffry', wallet: { BTC: 4.0, ETH: 8.0 } },
      { username: 'Vans', wallet: { BTC: 3.0, ETH: 7.0 } },
    ]);

    console.log('Created users:');
    users.forEach(u => {
      console.log(` • ${u.username}: ${u._id}`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();