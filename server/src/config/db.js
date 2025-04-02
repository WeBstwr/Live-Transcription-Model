require('dotenv').config();
const { Client } = require('pg');

console.log("DATABASE_URL:", process.env.DATABASE_URL);

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

client.connect(err => {
  if (err) {
    console.error('❌ Database connection error', err.stack);
  } else {
    console.log('✅ Database connected successfully!');
  }
});

module.exports = client;
