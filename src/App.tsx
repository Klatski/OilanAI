import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProgressProvider } from "./context/ProgressContext";
import { QuarterProvider } from "./context/QuarterContext";
import { LanguageProvider } from "./context/LanguageContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Header } from "./components/Header";
import { OfflineBanner } from "./components/OfflineBanner";
import { AchievementWatcher } from "./components/AchievementWatcher";
import { LoginPage } from "./pages/LoginPage";
import { SubjectPickerPage } from "./pages/SubjectPickerPage";
import { StudentPage } from "./pages/StudentPage";
import { ChatPage } from "./pages/ChatPage";
import { CardGamePage } from "./pages/CardGamePage";
import { TeacherDashboard } from "./pages/TeacherDashboard";
import { ScenarioEditorPage } from "./pages/ScenarioEditorPage";
import { ProfilePage } from "./pages/ProfilePage";

function Shell() {
  const { currentUser } = useAuth();

  return (
    <div className="app-shell">
      <OfflineBanner />
      {currentUser?.role === "student" && <AchievementWatcher />}
      {currentUser && <Header />}
      <main className="app-main">
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/student"
            element={
              <ProtectedRoute role="student">
                <SubjectPickerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/subject/:subjectId"
            element={
              <ProtectedRoute role="student">
                <StudentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/profile"
            element={
              <ProtectedRoute role="student">
                <ProfilePage />
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
            path="/student/subject/:subjectId/game"
            element={
              <ProtectedRoute role="student">
                <CardGamePage />
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
            path="/teacher/scenarios"
            element={
              <ProtectedRoute role="teacher">
                <ScenarioEditorPage />
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
    <LanguageProvider>
      <AuthProvider>
        <QuarterProvider>
          <ProgressProvider>
            <BrowserRouter>
              <Shell />
            </BrowserRouter>
          </ProgressProvider>
        </QuarterProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
