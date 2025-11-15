/* backend/server.js */

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, './db/database.db');
const db = new Database(dbPath, { verbose: console.log });

const { create_table, insert_user, get_users, get_user_by_email, get_user_by_id, update_user_by_id } = require('./db/login_statements');
const {
  create_attendance_table,
  insert_attendance,
  get_all_attendance,
  get_attendance_by_student,
  get_attendance_by_pinch,
  get_attendance_by_date_range,
  update_attendance,
  delete_attendance,
  get_attendance_stats
} = require('./db/attendance_statements');

const {
  create_classes_table,
  create_student_classes_table,
  create_class,
  get_all_classes,
  get_class_by_id,
  update_class,
  delete_class,
  add_student_to_class,
  remove_student_from_class,
  get_students_in_class,
  get_classes_for_student,
  get_available_students_for_class,
  get_all_students
} = require('./db/class_statements');

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
create_attendance_table();
create_classes_table();
create_student_classes_table();

// Function to generate JWT token
function generateToken(user) {
  const payload = { id: user.id, email: user.email };  // Include user ID and email in the token
  const secret = 'your_jwt_secret_key';
  const options = { expiresIn: '100h' };  // Token expiration time
  return jwt.sign(payload, secret, options);
}

// POST /register - Register a new user
app.post('/register', (req, res) => {
  const { user_name, email, role, password } = req.body;

  if (!user_name || !email || !role || !password) {
    return res.status(400).json({ message: 'Full Name, Email and Password are required' });
  }

  try {
    insert_user(user_name, email, role, password);
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
  const token = req.header('Authorization')?.split(' ')[1];

  if (!token) return res.status(403).json({ message: 'Access denied' });

  jwt.verify(token, 'your_jwt_secret_key', (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Invalid token' });
    req.user = decoded;
    next();
  });
};

/* INFO: Middleware to check if user has required role */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
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
  const { user_name, email, role } = req.body;

  if (!user_name || !email || !role) {
    return res.status(400).json({ message: 'Name and Email are required' });
  }

  const result = update_user_by_id(user_id, user_name, email, role);
  if (result.changes > 0) {
    const updated = get_user_by_id(user_id);
    res.json({ message: 'Profile updated', user: updated });
  } else {
    res.status(404).json({ message: 'Update failed' });
  }
});

// ==================== ATTENDANCE ROUTES ====================

// POST /attendance - Record new attendance (Teachers/Admins only)
app.post('/attendance', authenticateJWT, requireRole(['teacher', 'admin']), (req, res) => {
  const { student_id, status } = req.body;
  const pinch_id = req.user.id; // The user recording the attendance

  if (!student_id || !status) {
    return res.status(400).json({ message: 'Student ID and status are required' });
  }

  if (!['present', 'absent', 'late', 'excused'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status. Must be: present, absent, late, or excused' });
  }

  try {
    const result = insert_attendance(student_id, pinch_id, status);
    if (result.success) {
      res.status(201).json({
        message: 'Attendance recorded successfully',
        attendance_id: result.id
      });
    } else {
      res.status(500).json({ message: 'Failed to record attendance', error: result.error });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error recording attendance', error: err.message });
  }
});

// GET /attendance - Get all attendance records (Admins only)
app.get('/attendance', authenticateJWT, requireRole(['admin']), (req, res) => {
  try {
    const attendance = get_all_attendance();
    res.status(200).json(attendance);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching attendance records', error: err.message });
  }
});

// GET /attendance/student/:id - Get attendance for specific student
app.get('/attendance/student/:id', authenticateJWT, (req, res) => {
  const student_id = parseInt(req.params.id);

  // Students can only view their own attendance, teachers/admins can view any
  if (req.user.role === 'student' && req.user.id !== student_id) {
    return res.status(403).json({ message: 'Access denied' });
  }

  try {
    const attendance = get_attendance_by_student(student_id);
    res.status(200).json(attendance);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching student attendance', error: err.message });
  }
});

// GET /attendance/my-attendance - Get current user's attendance
app.get('/attendance/my-attendance', authenticateJWT, (req, res) => {
  try {
    const attendance = get_attendance_by_student(req.user.id);
    res.status(200).json(attendance);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching your attendance', error: err.message });
  }
});

// GET /attendance/recorded-by-me - Get attendance recorded by current user
app.get('/attendance/recorded-by-me', authenticateJWT, requireRole(['teacher', 'admin']), (req, res) => {
  try {
    const attendance = get_attendance_by_pinch(req.user.id);
    res.status(200).json(attendance);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching recorded attendance', error: err.message });
  }
});

// GET /attendance/date-range - Get attendance by date range
app.get('/attendance/date-range', authenticateJWT, (req, res) => {
  const { start_date, end_date } = req.query;

  if (!start_date || !end_date) {
    return res.status(400).json({ message: 'Start date and end date are required' });
  }

  try {
    const attendance = get_attendance_by_date_range(start_date, end_date);
    res.status(200).json(attendance);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching attendance by date range', error: err.message });
  }
});

// PUT /attendance/:id - Update attendance record
app.put('/attendance/:id', authenticateJWT, requireRole(['teacher', 'admin']), (req, res) => {
  const attendance_id = parseInt(req.params.id);
  const { status } = req.body;
  const pinch_id = req.user.id;

  if (!status) {
    return res.status(400).json({ message: 'Status is required' });
  }

  if (!['present', 'absent', 'late', 'excused'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  try {
    const result = update_attendance(attendance_id, status, pinch_id);
    if (result.changes > 0) {
      res.status(200).json({ message: 'Attendance updated successfully' });
    } else {
      res.status(404).json({ message: 'Attendance record not found' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error updating attendance', error: err.message });
  }
});

// DELETE /attendance/:id - Delete attendance record (Admin only)
app.delete('/attendance/:id', authenticateJWT, requireRole(['admin']), (req, res) => {
  const attendance_id = parseInt(req.params.id);

  try {
    const result = delete_attendance(attendance_id);
    if (result.changes > 0) {
      res.status(200).json({ message: 'Attendance record deleted successfully' });
    } else {
      res.status(404).json({ message: 'Attendance record not found' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error deleting attendance record', error: err.message });
  }
});

// GET /attendance/stats - Get attendance statistics
app.get('/attendance/stats', authenticateJWT, (req, res) => {
  const { student_id } = req.query;

  // Students can only view their own stats
  if (student_id && req.user.role === 'student' && req.user.id !== parseInt(student_id)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  const idToUse = student_id || (req.user.role === 'student' ? req.user.id : null);

  try {
    const stats = get_attendance_stats(idToUse);
    res.status(200).json(stats);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching attendance statistics', error: err.message });
  }
});

// ==================== CLASS MANAGEMENT ROUTES ====================

// POST /classes - Create a new class (Admin only)
app.post('/classes', authenticateJWT, requireRole(['admin']), (req, res) => {
  const { class_name, class_code, description } = req.body;
  const created_by = req.user.id;

  if (!class_name || !class_code) {
    return res.status(400).json({ message: 'Class name and code are required' });
  }

  try {
    const result = create_class(class_name, class_code, description, created_by);
    if (result.success) {
      res.status(201).json({
        message: 'Class created successfully',
        class_id: result.class_id
      });
    } else {
      res.status(400).json({ message: 'Failed to create class', error: result.error });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error creating class', error: err.message });
  }
});

// GET /classes - Get all classes
app.get('/classes', authenticateJWT, (req, res) => {
  try {
    const classes = get_all_classes();
    res.status(200).json(classes);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching classes', error: err.message });
  }
});

// GET /classes/:id - Get specific class
app.get('/classes/:id', authenticateJWT, (req, res) => {
  const class_id = parseInt(req.params.id);

  try {
    const classData = get_class_by_id(class_id);
    if (classData) {
      res.status(200).json(classData);
    } else {
      res.status(404).json({ message: 'Class not found' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error fetching class', error: err.message });
  }
});

// PUT /classes/:id - Update class (Admin only)
app.put('/classes/:id', authenticateJWT, requireRole(['admin']), (req, res) => {
  const class_id = parseInt(req.params.id);
  const { class_name, class_code, description } = req.body;

  if (!class_name || !class_code) {
    return res.status(400).json({ message: 'Class name and code are required' });
  }

  try {
    const result = update_class(class_id, class_name, class_code, description);
    if (result.changes > 0) {
      res.status(200).json({ message: 'Class updated successfully' });
    } else {
      res.status(404).json({ message: 'Class not found' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error updating class', error: err.message });
  }
});

// DELETE /classes/:id - Delete class (Admin only)
app.delete('/classes/:id', authenticateJWT, requireRole(['admin']), (req, res) => {
  const class_id = parseInt(req.params.id);

  try {
    const result = delete_class(class_id);
    if (result.changes > 0) {
      res.status(200).json({ message: 'Class deleted successfully' });
    } else {
      res.status(404).json({ message: 'Class not found' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error deleting class', error: err.message });
  }
});

// GET /students - Get all students (Admin/Teacher only)
app.get('/students', authenticateJWT, requireRole(['admin', 'teacher']), (req, res) => {
  try {
    const students = get_all_students();
    res.status(200).json(students);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching students', error: err.message });
  }
});

// POST /classes/:id/students - Add student to class (Admin only)
app.post('/classes/:id/students', authenticateJWT, requireRole(['admin']), (req, res) => {
  const class_id = parseInt(req.params.id);
  const { student_id } = req.body;

  if (!student_id) {
    return res.status(400).json({ message: 'Student ID is required' });
  }

  try {
    const result = add_student_to_class(student_id, class_id);
    if (result.success) {
      res.status(201).json({ message: 'Student added to class successfully' });
    } else {
      res.status(400).json({ message: 'Failed to add student to class', error: result.error });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error adding student to class', error: err.message });
  }
});

// DELETE /classes/:classId/students/:studentId - Remove student from class (Admin only)
app.delete('/classes/:classId/students/:studentId', authenticateJWT, requireRole(['admin']), (req, res) => {
  const class_id = parseInt(req.params.classId);
  const student_id = parseInt(req.params.studentId);

  try {
    const result = remove_student_from_class(student_id, class_id);
    if (result.changes > 0) {
      res.status(200).json({ message: 'Student removed from class successfully' });
    } else {
      res.status(404).json({ message: 'Student not found in class' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error removing student from class', error: err.message });
  }
});

// GET /classes/:id/students - Get students in a class
app.get('/classes/:id/students', authenticateJWT, (req, res) => {
  const class_id = parseInt(req.params.id);

  try {
    const students = get_students_in_class(class_id);
    res.status(200).json(students);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching students in class', error: err.message });
  }
});

// GET /classes/:id/available-students - Get students not in class (Admin only)
app.get('/classes/:id/available-students', authenticateJWT, requireRole(['admin']), (req, res) => {
  const class_id = parseInt(req.params.id);

  try {
    const students = get_available_students_for_class(class_id);
    res.status(200).json(students);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching available students', error: err.message });
  }
});

// GET /my-classes - Get current student's classes
app.get('/my-classes', authenticateJWT, (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(400).json({ message: 'This endpoint is for students only' });
  }

  try {
    const classes = get_classes_for_student(req.user.id);
    res.status(200).json(classes);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching your classes', error: err.message });
  }
});

// ==================== ENHANCED ATTENDANCE ROUTES ====================

// POST /attendance/class - Record attendance for entire class
app.post('/attendance/class', authenticateJWT, requireRole(['teacher', 'admin']), (req, res) => {
  const { class_id, status_map } = req.body;
  const pinch_id = req.user.id;

  if (!class_id || !status_map) {
    return res.status(400).json({ message: 'Class ID and status map are required' });
  }

  try {
    const result = insert_class_attendance(class_id, pinch_id, status_map);
    if (result.success) {
      res.status(201).json({
        message: `Class attendance recorded successfully (${result.successCount}/${result.total} students)`,
        details: result
      });
    } else {
      res.status(500).json({ message: 'Failed to record class attendance', error: result.error });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error recording class attendance', error: err.message });
  }
});

// GET /attendance/class/:id - Get attendance for a specific class
app.get('/attendance/class/:id', authenticateJWT, (req, res) => {
  const class_id = parseInt(req.params.id);

  try {
    const attendance = get_attendance_by_class(class_id);
    res.status(200).json(attendance);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching class attendance', error: err.message });
  }
});

// Start the server
app.listen(5000, () => {
  console.log('Backend server running on http://localhost:5000');
});
