// db/attendance_statements.js
const Database = require('better-sqlite3');
const path = require('path');

/*
 * INFO: Define the database path
 */
const dbPath = path.join(__dirname, 'database.db');
const db = new Database(dbPath, { verbose: console.log });

/*
 * INFO: Define attendance table attributes
 */
const attendanceAttributes = `
  attendance_id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id    INTEGER NOT NULL,
  pinch_id      INTEGER NOT NULL,
  status        TEXT NOT NULL CHECK(status IN ('present', 'absent', 'late', 'excused')),
  recorded_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES login_users(id),
  FOREIGN KEY (pinch_id) REFERENCES login_users(id)
`;

/*
 * INFO: Function to create attendance table if it doesn't exist
 */
function create_attendance_table() {
  const sql = `
    CREATE TABLE IF NOT EXISTS attendance (
      ${attendanceAttributes}
    )
  `;
  try {
    db.prepare(sql).run();
    console.log(`[✓] Table attendance created or already exists.`);
  } catch (err) {
    console.error(`[x] Failed to create attendance table: `, err.message);
  }
}

/*
 * INFO: Function to insert a new attendance record
 */
function insert_attendance(student_id, pinch_id, status) {
  const sql = `
    INSERT INTO attendance (student_id, pinch_id, status)
    VALUES (?, ?, ?)
  `;
  try {
    const result = db.prepare(sql).run(student_id, pinch_id, status);
    console.log(`[✓] Inserted attendance record with ID: ${result.lastInsertRowid}`);
    return { success: true, id: result.lastInsertRowid };
  } catch (err) {
    console.error(`[x] Failed to insert attendance record: `, err.message);
    return { success: false, error: err.message };
  }
}

/*
 * INFO: Function to get all attendance records with user details
 */
function get_all_attendance() {
  const sql = `
    SELECT 
      a.attendance_id,
      a.student_id,
      s.user_name as student_name,
      a.pinch_id,
      p.user_name as pinch_name,
      a.status,
      a.recorded_at
    FROM attendance a
    JOIN login_users s ON a.student_id = s.id
    JOIN login_users p ON a.pinch_id = p.id
    ORDER BY a.recorded_at DESC
  `;
  try {
    const rows = db.prepare(sql).all();
    console.log(`[✓] Fetched ${rows.length} attendance records`);
    return rows;
  } catch (err) {
    console.error(`[x] Failed to fetch attendance records: `, err.message);
    return [];
  }
}

/*
 * INFO: Function to get attendance by student ID
 */
function get_attendance_by_student(student_id) {
  const sql = `
    SELECT 
      a.attendance_id,
      a.student_id,
      s.user_name as student_name,
      a.pinch_id,
      p.user_name as pinch_name,
      a.status,
      a.recorded_at
    FROM attendance a
    JOIN login_users s ON a.student_id = s.id
    JOIN login_users p ON a.pinch_id = p.id
    WHERE a.student_id = ?
    ORDER BY a.recorded_at DESC
  `;
  try {
    const rows = db.prepare(sql).all(student_id);
    return rows;
  } catch (err) {
    console.error(`[x] Failed to fetch attendance for student ${student_id}: `, err.message);
    return [];
  }
}

/*
 * INFO: Function to get attendance by pinch ID (teacher/admin who recorded)
 */
function get_attendance_by_pinch(pinch_id) {
  const sql = `
    SELECT 
      a.attendance_id,
      a.student_id,
      s.user_name as student_name,
      a.pinch_id,
      p.user_name as pinch_name,
      a.status,
      a.recorded_at
    FROM attendance a
    JOIN login_users s ON a.student_id = s.id
    JOIN login_users p ON a.pinch_id = p.id
    WHERE a.pinch_id = ?
    ORDER BY a.recorded_at DESC
  `;
  try {
    const rows = db.prepare(sql).all(pinch_id);
    return rows;
  } catch (err) {
    console.error(`[x] Failed to fetch attendance recorded by pinch ${pinch_id}: `, err.message);
    return [];
  }
}

/*
 * INFO: Function to get attendance records by date range
 */
function get_attendance_by_date_range(start_date, end_date) {
  const sql = `
    SELECT 
      a.attendance_id,
      a.student_id,
      s.user_name as student_name,
      a.pinch_id,
      p.user_name as pinch_name,
      a.status,
      a.recorded_at
    FROM attendance a
    JOIN login_users s ON a.student_id = s.id
    JOIN login_users p ON a.pinch_id = p.id
    WHERE DATE(a.recorded_at) BETWEEN DATE(?) AND DATE(?)
    ORDER BY a.recorded_at DESC
  `;
  try {
    const rows = db.prepare(sql).all(start_date, end_date);
    return rows;
  } catch (err) {
    console.error(`[x] Failed to fetch attendance by date range: `, err.message);
    return [];
  }
}

/*
 * INFO: Function to update attendance status
 */
function update_attendance(attendance_id, status, pinch_id) {
  const sql = `
    UPDATE attendance 
    SET status = ?, pinch_id = ?, recorded_at = CURRENT_TIMESTAMP
    WHERE attendance_id = ?
  `;
  try {
    const result = db.prepare(sql).run(status, pinch_id, attendance_id);
    return { changes: result.changes };
  } catch (err) {
    console.error(`[x] Failed to update attendance record: `, err.message);
    return { changes: 0, error: err.message };
  }
}

/*
 * INFO: Function to delete attendance record
 */
function delete_attendance(attendance_id) {
  const sql = `DELETE FROM attendance WHERE attendance_id = ?`;
  try {
    const result = db.prepare(sql).run(attendance_id);
    return { changes: result.changes };
  } catch (err) {
    console.error(`[x] Failed to delete attendance record: `, err.message);
    return { changes: 0, error: err.message };
  }
}

/*
 * INFO: Function to get attendance statistics
 */
function get_attendance_stats(student_id = null) {
  let sql = `
    SELECT 
      status,
      COUNT(*) as count
    FROM attendance
  `;

  const params = [];

  if (student_id) {
    sql += ` WHERE student_id = ?`;
    params.push(student_id);
  }

  sql += ` GROUP BY status`;

  try {
    const rows = db.prepare(sql).all(...params);
    return rows;
  } catch (err) {
    console.error(`[x] Failed to fetch attendance statistics: `, err.message);
    return [];
  }
}

/*
 * INFO: Function to get attendance by class
 */
function get_attendance_by_class(class_id) {
  const sql = `
    SELECT 
      a.attendance_id,
      a.student_id,
      s.user_name as student_name,
      a.pinch_id,
      p.user_name as pinch_name,
      a.status,
      a.recorded_at
    FROM attendance a
    JOIN login_users s ON a.student_id = s.id
    JOIN login_users p ON a.pinch_id = p.id
    JOIN student_classes sc ON s.id = sc.student_id
    WHERE sc.class_id = ?
    ORDER BY a.recorded_at DESC
  `;
  try {
    const rows = db.prepare(sql).all(class_id);
    return rows;
  } catch (err) {
    console.error(`[x] Failed to fetch attendance for class ${class_id}: `, err.message);
    return [];
  }
}

/*
 * INFO: Function to record attendance for entire class
 */
function insert_class_attendance(class_id, pinch_id, status_map) {
  const insertSql = `
    INSERT INTO attendance (student_id, pinch_id, status)
    VALUES (?, ?, ?)
  `;

  const getStudentsSql = `
    SELECT student_id FROM student_classes WHERE class_id = ?
  `;

  try {
    const students = db.prepare(getStudentsSql).all(class_id);
    const insertStmt = db.prepare(insertSql);

    let successCount = 0;
    let errorCount = 0;

    students.forEach(student => {
      const status = status_map[student.student_id] || 'absent'; // Default to absent if not specified
      try {
        insertStmt.run(student.student_id, pinch_id, status);
        successCount++;
      } catch (err) {
        console.error(`[x] Failed to insert attendance for student ${student.student_id}:`, err.message);
        errorCount++;
      }
    });

    return {
      success: true,
      total: students.length,
      successCount,
      errorCount
    };
  } catch (err) {
    console.error(`[x] Failed to record class attendance:`, err.message);
    return { success: false, error: err.message };
  }
}

// Exporting functions
module.exports = {
  create_attendance_table,
  insert_attendance,
  get_all_attendance,
  get_attendance_by_student,
  get_attendance_by_pinch,
  get_attendance_by_date_range,
  update_attendance,
  delete_attendance,
  get_attendance_stats,
  get_attendance_by_class,
  insert_class_attendance
};
