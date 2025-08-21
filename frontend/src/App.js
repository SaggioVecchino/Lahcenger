import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useAuth } from "./AuthContext";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";

function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            <UnProtectedRoute>
              <Login />
            </UnProtectedRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <UnProtectedRoute>
              <Signup />
            </UnProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user != null ? children : <Navigate to="/login" />;
}

function UnProtectedRoute({ children }) {
  const { user } = useAuth();
  return user == null ? children : <Navigate to="/" />;
}

export default App;
