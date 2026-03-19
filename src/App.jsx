import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'

import Layout from './components/layout/Layout'
import StudentLayout from './components/student/StudentLayout'

import LandingPage from './pages/LandingPage'
import TeacherLoginPage from './pages/TeacherLoginPage'
import TeacherSignupPage from './pages/TeacherSignupPage'
import StudentLoginPage from './pages/StudentLoginPage'
import StudentSignupPage from './pages/StudentSignupPage'

import DashboardPage from './pages/DashboardPage'
import ProfilePage from './pages/ProfilePage'
import SpacePage from './pages/SpacePage'
import SpaceSettingsPage from './pages/SpaceSettingsPage'
import ContentPage from './pages/ContentPage'

import StudentDashboard from './components/student/StudentDashboard'
import JoinSpacePage from './components/student/JoinSpacePage'
import StudentSpacePage from './components/student/StudentSpacePage'
import StudentContentPage from './components/student/StudentContentPage'
import NotificationsPage from './components/student/NotificationsPage'

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-gray-400 text-sm">Loading...</div>
  </div>
)

// After login, redirect to correct dashboard based on role
function RoleRedirect() {
  const { profile, loading } = useAuth()
  if (loading) return <Spinner />
  if (!profile) return <Spinner />  // wait for profile to load
  if (profile.role === 'student') return <Navigate to="/student" replace />
  return <Navigate to="/teacher" replace />
}

// Blocks unauthenticated access
function PrivateRoute({ children, role }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/" replace />
  if (!profile) return <Spinner />  // wait for profile before checking role
  // Role check — teacher trying to access student area or vice versa
  if (role && profile.role !== role) {
    return <Navigate to={profile.role === 'student' ? '/student' : '/teacher'} replace />
  }
  return children
}

export default function App() {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />

  return (
    <Routes>
      {/* Landing — shown when not logged in */}
      <Route path="/" element={user ? <RoleRedirect /> : <LandingPage />} />

      {/* Auth pages — redirect away if already logged in */}
      <Route path="/teacher/login"  element={user ? <RoleRedirect /> : <TeacherLoginPage />} />
      <Route path="/teacher/signup" element={user ? <RoleRedirect /> : <TeacherSignupPage />} />
      <Route path="/student/login"  element={user ? <RoleRedirect /> : <StudentLoginPage />} />
      <Route path="/student/signup" element={user ? <RoleRedirect /> : <StudentSignupPage />} />

      {/* Teacher area */}
      <Route path="/teacher" element={<PrivateRoute role="teacher"><Layout /></PrivateRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="spaces/:spaceId" element={<SpacePage />} />
        <Route path="spaces/:spaceId/settings" element={<SpaceSettingsPage />} />
        <Route path="spaces/:spaceId/content/:contentId" element={<ContentPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Student area */}
      <Route path="/student" element={<PrivateRoute role="student"><StudentLayout /></PrivateRoute>}>
        <Route index element={<StudentDashboard />} />
        <Route path="join" element={<JoinSpacePage />} />
        <Route path="spaces/:spaceId" element={<StudentSpacePage />} />
        <Route path="spaces/:spaceId/content/:contentId" element={<StudentContentPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}