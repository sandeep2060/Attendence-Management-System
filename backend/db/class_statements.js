// db/class_statements.js
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new Database(dbPath, { verbose: console.log });

/*
 * INFO: Define classes table attributes
 */
const classAttributes = `
  class_id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_name TEXT NOT NULL,
  class_code TEXT UNIQUE NOT NULL,
  description TEXT,
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES login_users(id)
`;

/*
 * INFO: Define student_classes table for many-to-many relationship
 */
const studentClassAttributes = `
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  class_id INTEGER NOT NULL,
  enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES login_users(id),
  FOREIGN KEY (class_id) REFERENCES classes(class_id),
  UNIQUE(student_id, class_id)
`;

/*
 * INFO: Create classes table
 */
function create_classes_table() {
  const sql = `CREATE TABLE IF NOT EXISTS classes (${classAttributes})`;
  try {
    db.prepare(sql).run();
    console.log(`[✓] Table classes created or already exists.`);
  } catch (err) {
    console.error(`[x] Failed to create classes table: `, err.message);
  }
}

/*
 * INFO: Create student_classes table
 */
function create_student_classes_table() {
  const sql = `CREATE TABLE IF NOT EXISTS student_classes (${studentClassAttributes})`;
  try {
    db.prepare(sql).run();
    console.log(`[✓] Table student_classes created or already exists.`);
  } catch (err) {
    console.error(`[x] Failed to create student_classes table: `, err.message);
  }
}

/*
 * INFO: Function to create a new class
 */
function create_class(class_name, class_code, description, created_by) {
  const sql = `
    INSERT INTO classes (class_name, class_code, description, created_by)
    VALUES (?, ?, ?, ?)
  `;
  try {
    const result = db.prepare(sql).run(class_name, class_code, description, created_by);
    console.log(`[✓] Created class with ID: ${result.lastInsertRowid}`);
    return { success: true, class_id: result.lastInsertRowid };
  } catch (err) {
    console.error(`[x] Failed to create class: `, err.message);
    return { success: false, error: err.message };
  }
}

/*
 * INFO: Function to get all classes
 */
function get_all_classes() {
  const sql = `
    SELECT 
      c.*,
      u.user_name as created_by_name
    FROM classes c
    JOIN login_users u ON c.created_by = u.id
    ORDER BY c.class_name
  `;
  try {
    const rows = db.prepare(sql).all();
    return rows;
  } catch (err) {
    console.error(`[x] Failed to fetch classes: `, err.message);
    return [];
  }
}

/*
 * INFO: Function to get class by ID
 */
function get_class_by_id(class_id) {
  const sql = `
    SELECT 
      c.*,
      u.user_name as created_by_name
    FROM classes c
    JOIN login_users u ON c.created_by = u.id
    WHERE c.class_id = ?
  `;
  try {
    const row = db.prepare(sql).get(class_id);
    return row;
  } catch (err) {
    console.error(`[x] Failed to fetch class: `, err.message);
    return null;
  }
}

/*
 * INFO: Function to update class
 */
function update_class(class_id, class_name, class_code, description) {
  const sql = `
    UPDATE classes 
    SET class_name = ?, class_code = ?, description = ?
    WHERE class_id = ?
  `;
  try {
    const result = db.prepare(sql).run(class_name, class_code, description, class_id);
    return { changes: result.changes };
  } catch (err) {
    console.error(`[x] Failed to update class: `, err.message);
    return { changes: 0, error: err.message };
  }
}

/*
 * INFO: Function to delete class
 */
function delete_class(class_id) {
  const sql = `DELETE FROM classes WHERE class_id = ?`;
  try {
    const result = db.prepare(sql).run(class_id);
    return { changes: result.changes };
  } catch (err) {
    console.error(`[x] Failed to delete class: `, err.message);
    return { changes: 0, error: err.message };
  }
}

/*
 * INFO: Function to add student to class
 */
function add_student_to_class(student_id, class_id) {
  const sql = `
    INSERT INTO student_classes (student_id, class_id)
    VALUES (?, ?)
  `;
  try {
    const result = db.prepare(sql).run(student_id, class_id);
    console.log(`[✓] Added student ${student_id} to class ${class_id}`);
    return { success: true, id: result.lastInsertRowid };
  } catch (err) {
    console.error(`[x] Failed to add student to class: `, err.message);
    return { success: false, error: err.message };
  }
}

/*
 * INFO: Function to remove student from class
 */
function remove_student_from_class(student_id, class_id) {
  const sql = `
    DELETE FROM student_classes 
    WHERE student_id = ? AND class_id = ?
  `;
  try {
    const result = db.prepare(sql).run(student_id, class_id);
    return { changes: result.changes };
  } catch (err) {
    console.error(`[x] Failed to remove student from class: `, err.message);
    return { changes: 0, error: err.message };
  }
}

/*
 * INFO: Function to get students in a class
 */
function get_students_in_class(class_id) {
  const sql = `
    SELECT 
      u.id,
      u.user_name,
      u.email,
      u.role,
      sc.enrolled_at
    FROM login_users u
    JOIN student_classes sc ON u.id = sc.student_id
    WHERE sc.class_id = ? AND u.role = 'student'
    ORDER BY u.user_name
  `;
  try {
    const rows = db.prepare(sql).all(class_id);
    return rows;
  } catch (err) {
    console.error(`[x] Failed to fetch students in class: `, err.message);
    return [];
  }
}

/*
 * INFO: Function to get classes for a student
 */
function get_classes_for_student(student_id) {
  const sql = `
    SELECT 
      c.class_id,
      c.class_name,
      c.class_code,
      c.description,
      sc.enrolled_at
    FROM classes c
    JOIN student_classes sc ON c.class_id = sc.class_id
    WHERE sc.student_id = ?
    ORDER BY c.class_name
  `;
  try {
    const rows = db.prepare(sql).all(student_id);
    return rows;
  } catch (err) {
    console.error(`[x] Failed to fetch classes for student: `, err.message);
    return [];
  }
}

/*
 * INFO: Function to get available students (not in class)
 */
function get_available_students_for_class(class_id) {
  const sql = `
    SELECT 
      u.id,
      u.user_name,
      u.email
    FROM login_users u
    WHERE u.role = 'student'
    AND u.id NOT IN (
      SELECT student_id 
      FROM student_classes 
      WHERE class_id = ?
    )
    ORDER BY u.user_name
  `;
  try {
    const rows = db.prepare(sql).all(class_id);
    return rows;
  } catch (err) {
    console.error(`[x] Failed to fetch available students: `, err.message);
    return [];
  }
}

/*
 * INFO: Function to get all students (for admin)
 */
function get_all_students() {
  const sql = `
    SELECT 
      id,
      user_name,
      email,
      created_at
    FROM login_users
    WHERE role = 'student'
    ORDER BY user_name
  `;
  try {
    const rows = db.prepare(sql).all();
    return rows;
  } catch (err) {
    console.error(`[x] Failed to fetch all students: `, err.message);
    return [];
  }
}

module.exports = {
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
};
