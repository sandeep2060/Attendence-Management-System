import React from "react";
import { Route, Routes, BrowserRouter } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/protected/Dashboard";
import Profile from "./pages/protected/Profile";
import Error404 from "./pages/Error404"
import ProtectedRoute from "./components/ProtectedRoute"

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<Error404 />} />
          <Route path="/" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App;
