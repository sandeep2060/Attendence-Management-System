/* src/components/Signup.jsx (Updated) */
import { useEffect, useState, useRef } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { Link, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import "./login.css";

const Signup = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      // Redirect to dashboard if already logged in
      navigate('/dashboard');
    }
  }, [navigate]);

  const initialValues = {
    user: "",
    email: "",
    role: "",
    password: "",
  };

  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [selectedValue, setSelectedValue] = useState(initialValues.role || ""); // Set initial value
  const [searchTerm, setSearchTerm] = useState("");

  const role = [
    "admin",
    "teacher",
    "student"
  ];

  const handleRoleSelect = (value, setFieldValue) => {
    setSelectedValue(value);  // Set the selected category (main category)
    setFieldValue('role', value);  // Set the selected category in Formik
    setIsRoleOpen(false);  // Close the category dropdown
    setSearchTerm('');  // Clear the search term
  };

  const validationSchema = Yup.object({
    user: Yup.string()
      .required("Full Name is required")
      .min(4, "Full Name must be at least 4 characters")
      .max(40, "Full Name cannot exceed 40 characters"),
    email: Yup.string()
      .email("Invalid email format")
      .required("Email is required"),
    role: Yup.string()
      .required("Role is required"),
    password: Yup.string()
      .required("Password is required")
      .min(6, "Password must be at least 6 characters"),
  });

  const onSubmit = async (values, { setSubmitting }) => {
    try {
      const result = await register(values.user, values.email, values.role, values.password);

      if (result.success) {
        toast.loading("Registering...!");
        setTimeout(() => toast.success("Registration successfully."), 400);
        setTimeout(() => navigate('/'), 1000); // Redirect to login after registration
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Error registering user: " + (error.response?.data?.message || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="bg-blue-50 h-screen flex items-center justify-center">
        <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl">
          {/* Logo Section */}
          <Link className="flex gap-1.5 items-center my-5">
            <div className='rounded-full h-8 w-8 flex items-center justify-center
             bg-gradient-to-r from-blue-500 to-purple-500'>
              <span className='text-white font-bold text-sm'>Ea</span>
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">
              AttendEase
            </span>
          </Link>

          {/* Signup Header */}
          <h2 className="text-2xl font-bold text-gray-800 ">Sign Up</h2>
          <p className="text-gray-600 text-sm mb-6 ">Create an account to get started</p>

          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={onSubmit}
          >
            {({ isSubmitting, setFieldValue }) => (
              <Form>
                {/* Full Name Field */}
                <div className="mb-4">
                  <label htmlFor="user" className="block text-sm font-medium text-gray-700">Full Name</label>
                  <Field
                    type="text"
                    id="user"
                    name="user"
                    placeholder="Enter your full name"
                    className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <ErrorMessage
                    name="user"
                    component="div"
                    className="text-red-500 text-sm mt-1"
                  />
                </div>

                {/* Email Field */}
                <div className="mb-4">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                  <Field
                    type="email"
                    id="email"
                    name="email"
                    placeholder="Enter your email"
                    className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <ErrorMessage
                    name="email"
                    component="div"
                    className="text-red-500 text-sm mt-1"
                  />
                </div>

                <div className="mb-5">
                  <label className="block text-lg font-medium text-gray-700">
                    Role<span className="text-red-500">*</span>
                  </label>
                  <div className="relative" ref={dropdownRef}>
                    <div
                      className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 cursor-pointer bg-white"
                      onClick={() => {
                        setIsRoleOpen(!isRoleOpen);
                        if (!isRoleOpen) setSearchTerm(''); // Clear search when opening
                      }}
                    >
                      {selectedValue || "Select role..."}
                    </div>
                    {isRoleOpen && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                        {/* Search input */}
                        <input
                          type="text"
                          placeholder="Search role..."
                          className="w-full px-3 py-2 border-b border-gray-200 focus:outline-none"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <div className="max-h-48 overflow-y-auto">
                          {role
                            .filter((cat) =>
                              cat.toLowerCase().includes(searchTerm.toLowerCase())
                            )
                            .map((roleItem) => (
                              <div
                                key={roleItem}
                                className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                onClick={() => handleRoleSelect(roleItem, setFieldValue)}
                              >
                                {roleItem}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <ErrorMessage name="role" component="div" className="text-red-500 text-sm mt-1" />
                </div>

                {/* Password Field */}
                <div className="mb-6">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                  <Field
                    type="password"
                    id="password"
                    name="password"
                    placeholder="Enter your password"
                    className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <ErrorMessage
                    name="password"
                    component="div"
                    className="text-red-500 text-sm mt-1"
                  />
                </div>

                {/* Register Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-2 px-4 rounded-md hover:from-blue-700 hover:to-purple-700 transition duration-300"
                >
                  {isSubmitting ? 'Registering...' : 'Register'}
                </button>
              </Form>
            )}
          </Formik>

          {/* Login Link */}
          <p className="text-center text-sm mt-4 text-gray-600">
            Already have an account?
            <Link to="/" className="text-blue-500 hover:text-blue-700"> Login</Link>
          </p>

          {/* Toast Notifications */}
          <ToastContainer />
        </div>
      </div>
    </>
  );
};

export default Signup;
