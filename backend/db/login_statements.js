// backend/db/login_statements.js

const Database = require('better-sqlite3');
const path = require('path');

/*
 * INFO: Define the database path
 */
const dbPath = path.join(__dirname, 'database.db');
const db = new Database(dbPath, { verbose: console.log });

/*
 * INFO: Define table attributes and create table if not exists
 */
const attributes = `
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_name  TEXT NOT NULL,
  email      TEXT NOT NULL,
  role       TEXT NOT NULL,
  password   TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
`;

/*
 * INFO: Function to create table if it doesn't exist
 */
function create_table() {
  const sql = `
    CREATE TABLE IF NOT EXISTS login_users (
      ${attributes}
    )
  `;
  try {
    db.prepare(sql).run();
    console.log(`[✓] Table login_users created or already exists.`);
  } catch (err) {
    console.error(`[x] Failed to create table: `, err.message);
  }
}

/*
 * INFO: Function to insert a new user into the table
 */
function insert_user(user_name, email, role, password) {
  const sql = `
    INSERT INTO login_users (user_name, email, role, password)
    VALUES (?, ?, ?, ?)
  `;
  try {
    const result = db.prepare(sql).run(user_name, email, role, password);
    console.log(`[✓] Inserted user with ID: ${result.lastInsertRowid}`);
  } catch (err) {
    console.error(`[x] Failed to insert user: `, err.message);
  }
}

/*
 * INFO: Function to get all users from the table
 */
function get_users() {
  const sql = `SELECT * FROM login_users`;
  try {
    const rows = db.prepare(sql).all();
    console.log(`[✓] All users: `, rows);
    return rows;
  } catch (err) {
    console.error(`[x] Failed to fetch users: `, err.message);
  }
}

function get_user_by_email(email) {
  return db.prepare(`SELECT * FROM login_users WHERE email = ?`).get(email);
}

function get_user_by_id(id) {
  return db.prepare(`SELECT id, user_name, email, role, created_at FROM login_users WHERE id = ?`).get(id);
}

function update_user_by_id(id, user_name, email, role) {
  const sql = `UPDATE login_users SET user_name = ?, email = ?, role = ?, WHERE id = ?`;
  const result = db.prepare(sql).run(user_name, email, role, id);
  return { changes: result.changes };
}

// Exporting functions
module.exports = { create_table, insert_user, get_users, get_user_by_email, get_user_by_id, update_user_by_id };
