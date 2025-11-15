import React, { useState, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';

import LogoutButton from '../../components/buttons/LogoutButton';
import LogoutModal from '../../components/modals/LogoutModal';

const AttendanceSystem = () => {
  const [activeTab, setActiveTab] = useState('attendance');
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [classStudents, setClassStudents] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [user, setUser] = useState(null);
  const [selectedClass, setSelectedClass] = useState('');

  const [isLogoutModelOpen, setIsLogoutModelOpen] = useState(false);

  // Get JWT token from localStorage
  const getToken = () => {
    return localStorage.getItem('token');
  };

  // Fetch current user profile
  const fetchUserProfile = async () => {
    try {
      const token = getToken();
      const response = await fetch('http://localhost:5000/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  // Fetch students list
  const fetchStudents = async () => {
    try {
      const token = getToken();
      const response = await fetch('http://localhost:5000/students', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const studentsData = await response.json();
        setStudents(studentsData);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      setMessage('Error fetching students list');
    }
  };

  // Fetch classes
  const fetchClasses = async () => {
    try {
      const token = getToken();
      const response = await fetch('http://localhost:5000/classes', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const classesData = await response.json();
        setClasses(classesData);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      setMessage('Error fetching classes');
    }
  };

  // Fetch attendance records
  const fetchAttendanceRecords = async () => {
    try {
      setLoading(true);
      const token = getToken();

      let endpoint = 'http://localhost:5000/attendance';

      // Adjust endpoint based on user role
      if (user?.role === 'teacher') {
        endpoint = 'http://localhost:5000/attendance/recorded-by-me';
      } else if (user?.role === 'student') {
        endpoint = 'http://localhost:5000/attendance/my-attendance';
      }

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const attendanceData = await response.json();
        setAttendanceRecords(attendanceData);
      } else {
        setMessage('Error fetching attendance records');
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      setMessage('Error fetching attendance records');
    } finally {
      setLoading(false);
    }
  };

  // Fetch students in class
  const fetchClassStudents = async (classId) => {
    try {
      const token = getToken();
      const response = await fetch(`http://localhost:5000/classes/${classId}/students`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const studentsData = await response.json();
        setClassStudents(studentsData);
      }
    } catch (error) {
      console.error('Error fetching class students:', error);
    }
  };

  // Fetch available students for class
  const fetchAvailableStudents = async (classId) => {
    try {
      const token = getToken();
      const response = await fetch(`http://localhost:5000/classes/${classId}/available-students`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const studentsData = await response.json();
        setAvailableStudents(studentsData);
      }
    } catch (error) {
      console.error('Error fetching available students:', error);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (user) {
      fetchClasses();
      if (user.role !== 'student') {
        fetchStudents();
      }
      fetchAttendanceRecords();
    }
  }, [user]);

  useEffect(() => {
    if (selectedClass) {
      fetchClassStudents(selectedClass);
      if (user?.role === 'admin') {
        fetchAvailableStudents(selectedClass);
      }
    }
  }, [selectedClass, user]);

  // Individual Attendance Form
  const IndividualAttendanceForm = () => {
    const initialValues = {
      studentId: '',
      status: 'present'
    };

    const validationSchema = Yup.object({
      studentId: Yup.string().required('Student is required'),
      status: Yup.string().required('Status is required')
    });

    const handleSubmit = async (values, { resetForm }) => {
      try {
        setLoading(true);
        const token = getToken();

        const response = await fetch('http://localhost:5000/attendance', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            student_id: parseInt(values.studentId),
            status: values.status
          })
        });

        const result = await response.json();

        if (response.ok) {
          setMessage('Attendance recorded successfully!');
          resetForm();
          fetchAttendanceRecords();
        } else {
          setMessage(result.message || 'Error recording attendance');
        }
      } catch (error) {
        console.error('Error submitting attendance:', error);
        setMessage('Error recording attendance');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h3 className="text-lg font-semibold mb-4">Record Individual Attendance</h3>
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting }) => (
            <Form className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 mb-1">
                  Student *
                </label>
                <Field
                  as="select"
                  id="studentId"
                  name="studentId"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  disabled={students.length === 0}
                >
                  <option value="">Select Student</option>
                  {students.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.user_name} ({student.email})
                    </option>
                  ))}
                </Field>
                <ErrorMessage name="studentId" component="div" className="text-red-500 text-xs mt-1" />
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status *
                </label>
                <Field
                  as="select"
                  id="status"
                  name="status"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                  <option value="excused">Excused</option>
                </Field>
                <ErrorMessage name="status" component="div" className="text-red-500 text-xs mt-1" />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isSubmitting || loading || students.length === 0}
                  className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Recording...' : 'Record Attendance'}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    );
  };

  // Class Attendance Form
  const ClassAttendanceForm = () => {
    const [classAttendance, setClassAttendance] = useState({});

    const handleStatusChange = (studentId, status) => {
      setClassAttendance(prev => ({
        ...prev,
        [studentId]: status
      }));
    };

    const handleClassAttendanceSubmit = async () => {
      if (!selectedClass) {
        setMessage('Please select a class first');
        return;
      }

      if (Object.keys(classAttendance).length === 0) {
        setMessage('Please mark attendance for at least one student');
        return;
      }

      try {
        setLoading(true);
        const token = getToken();

        const response = await fetch('http://localhost:5000/attendance/class', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            class_id: parseInt(selectedClass),
            status_map: classAttendance
          })
        });

        const result = await response.json();

        if (response.ok) {
          setMessage(result.message || 'Class attendance recorded successfully!');
          setClassAttendance({});
          fetchAttendanceRecords();
        } else {
          setMessage(result.message || 'Error recording class attendance');
        }
      } catch (error) {
        console.error('Error submitting class attendance:', error);
        setMessage('Error recording class attendance');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h3 className="text-lg font-semibold mb-4">Record Class Attendance</h3>

        <div className="mb-4">
          <label htmlFor="classSelect" className="block text-sm font-medium text-gray-700 mb-1">
            Select Class *
          </label>
          <select
            id="classSelect"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select a Class</option>
            {classes.map(classItem => (
              <option key={classItem.class_id} value={classItem.class_id}>
                {classItem.class_name} ({classItem.class_code})
              </option>
            ))}
          </select>
        </div>

        {selectedClass && classStudents.length > 0 && (
          <div>
            <h4 className="font-medium mb-3">Mark Attendance for Students:</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {classStudents.map(student => (
                <div key={student.id} className="flex items-center justify-between p-3 border rounded">
                  <span>{student.user_name} ({student.email})</span>
                  <select
                    value={classAttendance[student.id] || 'present'}
                    onChange={(e) => handleStatusChange(student.id, e.target.value)}
                    className="p-1 border rounded"
                  >
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                    <option value="excused">Excused</option>
                  </select>
                </div>
              ))}
            </div>
            <button
              onClick={handleClassAttendanceSubmit}
              disabled={loading}
              className="mt-4 w-full bg-green-500 text-white p-2 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400"
            >
              {loading ? 'Recording...' : 'Record Class Attendance'}
            </button>
          </div>
        )}

        {selectedClass && classStudents.length === 0 && (
          <div className="text-yellow-600 text-center py-4">
            No students enrolled in this class.
          </div>
        )}
      </div>
    );
  };

  // Class Management Component
  const ClassManagement = () => {
    const [showCreateForm, setShowCreateForm] = useState(false);

    const handleCreateClass = async (values, { resetForm }) => {
      try {
        const token = getToken();
        const response = await fetch('http://localhost:5000/classes', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(values)
        });

        const result = await response.json();

        if (response.ok) {
          setMessage('Class created successfully!');
          resetForm();
          setShowCreateForm(false);
          fetchClasses();
        } else {
          setMessage(result.message || 'Error creating class');
        }
      } catch (error) {
        console.error('Error creating class:', error);
        setMessage('Error creating class');
      }
    };

    const handleAddStudent = async (studentId) => {
      try {
        const token = getToken();
        const response = await fetch(`http://localhost:5000/classes/${selectedClass}/students`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ student_id: studentId })
        });

        const result = await response.json();

        if (response.ok) {
          setMessage('Student added to class successfully!');
          fetchClassStudents(selectedClass);
          fetchAvailableStudents(selectedClass);
        } else {
          setMessage(result.message || 'Error adding student to class');
        }
      } catch (error) {
        console.error('Error adding student:', error);
        setMessage('Error adding student to class');
      }
    };

    const handleRemoveStudent = async (studentId) => {
      try {
        const token = getToken();
        const response = await fetch(`http://localhost:5000/classes/${selectedClass}/students/${studentId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const result = await response.json();

        if (response.ok) {
          setMessage('Student removed from class successfully!');
          fetchClassStudents(selectedClass);
          fetchAvailableStudents(selectedClass);
        } else {
          setMessage(result.message || 'Error removing student from class');
        }
      } catch (error) {
        console.error('Error removing student:', error);
        setMessage('Error removing student from class');
      }
    };

    return (
      <div className="space-y-6">
        {user?.role === 'admin' && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Class Management</h3>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
              >
                {showCreateForm ? 'Cancel' : 'Create New Class'}
              </button>
            </div>

            {showCreateForm && (
              <Formik
                initialValues={{ class_name: '', class_code: '', description: '' }}
                validationSchema={Yup.object({
                  class_name: Yup.string().required('Class name is required'),
                  class_code: Yup.string().required('Class code is required')
                })}
                onSubmit={handleCreateClass}
              >
                <Form className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Class Name *</label>
                    <Field
                      type="text"
                      name="class_name"
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                    <ErrorMessage name="class_name" component="div" className="text-red-500 text-xs" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Class Code *</label>
                    <Field
                      type="text"
                      name="class_code"
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                    <ErrorMessage name="class_code" component="div" className="text-red-500 text-xs" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <Field
                      as="textarea"
                      name="description"
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600">
                      Create Class
                    </button>
                  </div>
                </Form>
              </Formik>
            )}
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Class Students</h3>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">Select a Class</option>
              {classes.map(classItem => (
                <option key={classItem.class_id} value={classItem.class_id}>
                  {classItem.class_name} ({classItem.class_code})
                </option>
              ))}
            </select>
          </div>

          {selectedClass && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Enrolled Students</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {classStudents.map(student => (
                    <div key={student.id} className="flex justify-between items-center p-3 border rounded">
                      <span>{student.user_name}</span>
                      {user?.role === 'admin' && (
                        <button
                          onClick={() => handleRemoveStudent(student.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  {classStudents.length === 0 && (
                    <div className="text-gray-500 text-center py-4">No students enrolled</div>
                  )}
                </div>
              </div>

              {user?.role === 'admin' && (
                <div>
                  <h4 className="font-medium mb-3">Available Students</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {availableStudents.map(student => (
                      <div key={student.id} className="flex justify-between items-center p-3 border rounded">
                        <span>{student.user_name}</span>
                        <button
                          onClick={() => handleAddStudent(student.id)}
                          className="text-green-600 hover:text-green-800"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                    {availableStudents.length === 0 && (
                      <div className="text-gray-500 text-center py-4">No available students</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Attendance Table Component
  const AttendanceTable = () => {
    const getStatusBadge = (status) => {
      const statusColors = {
        present: 'bg-green-100 text-green-800',
        absent: 'bg-red-100 text-red-800',
        late: 'bg-yellow-100 text-yellow-800',
        excused: 'bg-blue-100 text-blue-800'
      };
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100'}`}>
          {status}
        </span>
      );
    };

    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-semibold">
            {user?.role === 'student' ? 'My Attendance' :
              user?.role === 'teacher' ? 'Attendance Recorded by Me' :
                'All Attendance Records'}
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600">Loading attendance records...</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attendance ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student Name
                </th>
                {user?.role !== 'student' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recorded By
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recorded At
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attendanceRecords.map((record) => (
                <tr key={record.attendance_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.attendance_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.student_name}
                  </td>
                  {user?.role !== 'student' && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.pinch_name}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {getStatusBadge(record.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(record.recorded_at).toLocaleString()}
                  </td>
                </tr>
              ))}
              {attendanceRecords.length === 0 && (
                <tr>
                  <td
                    colSpan={user?.role !== 'student' ? 5 : 4}
                    className="px-6 py-8 text-center text-sm text-gray-500"
                  >
                    No attendance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  if (!user) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          Please log in to access the attendance system.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Student Attendance System</h1>
        <div className="text-sm text-gray-600">
          Logged in as: <span className="font-medium">{user.user_name}</span>
          <span className="ml-2 px-2 py-1 bg-gray-200 rounded capitalize">{user.role}</span>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>
          {message}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'attendance'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Attendance
          </button>

          {(user.role === 'teacher' || user.role === 'admin') && (
            <button
              onClick={() => setActiveTab('class-attendance')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'class-attendance'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Class Attendance
            </button>
          )}

          <button
            onClick={() => setActiveTab('classes')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'classes'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Class Management
          </button>
        </nav>
      </div>

      <LogoutModal
        isOpen={isLogoutModelOpen}
        onClose={() => setIsLogoutModelOpen(false)}
        itemName="Logout"
        itemType="Logout"
      />
      {/* Tab Content */}
      {activeTab === 'attendance' && (
        <div>
          {(user.role === 'teacher' || user.role === 'admin') && <IndividualAttendanceForm />}
          <AttendanceTable />
        </div>
      )}

      {activeTab === 'class-attendance' && (
        <div>
          {(user.role === 'teacher' || user.role === 'admin') && <ClassAttendanceForm />}
        </div>
      )}

      {activeTab === 'classes' && (
        <ClassManagement />
      )}

      <LogoutButton onClick={() => setIsLogoutModelOpen(true)} />
    </div>
  );
};

export default AttendanceSystem;
