/* backend/server.js */

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, './db/database.db');
const db = new Database(dbPath, { verbose: console.log });

const { create_table, insert_user, get_users, get_user_by_email, get_user_by_id, update_user_by_id } = require('./db/login_statements');

const app = express();

/* INFO: Enable cors for all origins */
app.use(cors());
app.use(cors({
  origin: 'http://localhost:5173',  /* Allow requests from frontend */
  methods: ['GET', 'POST', 'PUT', 'DELETE'],        /* Allow GET and POST methods */
  credentials: true                 /* Allow cookies (if necessary) */
}));

app.use(express.json());  // Parse JSON requests

// Create tables when the server starts
create_table();

// Function to generate JWT token
function generateToken(user) {
  const payload = { id: user.id, email: user.email };  // Include user ID and email in the token
  const secret = 'your_jwt_secret_key';
  const options = { expiresIn: '100h' };  // Token expiration time
  return jwt.sign(payload, secret, options);
}

// POST /register - Register a new user
app.post('/register', (req, res) => {
  const { user_name, email, password } = req.body;

  if (!user_name || !email || !password) {
    return res.status(400).json({ message: 'Full Name, Email and Password are required' });
  }

  try {
    insert_user(user_name, email, password);
    res.status(200).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error registering user', error: err.message });
  }
});

// GET /users - Retrieve all users
app.get('/users', (_, res) => {
  try {
    const users = get_users();
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching users', error: err.message });
  }
});

// POST /login - User login
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and Password are required' });
  }

  try {
    /* Find user by email from the database */
    const user = get_user_by_email(email);

    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    /* INFO: Compare plain-text passwords */
    if (user.password === password) {
      /* INFO: Generate a JWT token */
      const token = generateToken(user);
      return res.status(200).json({ message: 'Login successful', token });
    } else {
      return res.status(400).json({ message: 'Incorrect password' });
    }
  } catch (err) {
    console.error("Error during login:", err);
    return res.status(500).json({ message: 'Internal Server Error', error: err.message });
  }
});

/* INFO: Middleware to protect routes with JWT authentication */
const authenticateJWT = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];  // Get token from Authorization header

  if (!token) return res.status(403).json({ message: 'Access denied' });

  /* Verify the JWT token */
  jwt.verify(token, 'your_jwt_secret_key', (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Invalid token' });
    req.user = decoded;  /* Store decoded user info in request object */
    next();
  });
};

// GET /profile — Get current user's profile
app.get('/profile', authenticateJWT, (req, res) => {
  const user = get_user_by_id(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

// PUT /profile — Update current user's profile (name & email only)
app.put('/profile', authenticateJWT, (req, res) => {
  const user_id = req.user.id;
  const { user_name, email } = req.body;

  if (!user_name || !email) {
    return res.status(400).json({ message: 'Name and Email are required' });
  }

  const result = update_user_by_id(user_id, user_name, email);
  if (result.changes > 0) {
    const updated = get_user_by_id(user_id);
    res.json({ message: 'Profile updated', user: updated });
  } else {
    res.status(404).json({ message: 'Update failed' });
  }
});

// Start the server
app.listen(5000, () => {
  console.log('Backend server running on http://localhost:5000');
});
