import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/Login.tsx";
import SignupPage from "./pages/Signup.tsx";
import Dashboard from "./pages/Dashboard.tsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
