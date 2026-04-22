import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Header } from "./components/Header";
import { LoginPage } from "./pages/LoginPage";
import { StudentPage } from "./pages/StudentPage";
import { ChatPage } from "./pages/ChatPage";
import { TeacherDashboard } from "./pages/TeacherDashboard";

function Shell() {
  const { currentUser } = useAuth();

  return (
    <div className="app-shell">
      {currentUser && <Header />}
      <main className="app-main">
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/student"
            element={
              <ProtectedRoute role="student">
                <StudentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/chat"
            element={
              <ProtectedRoute role="student">
                <ChatPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/teacher"
            element={
              <ProtectedRoute role="teacher">
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="*"
            element={
              currentUser ? (
                <Navigate to={`/${currentUser.role}`} replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </AuthProvider>
  );
}
