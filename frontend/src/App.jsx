import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import Board from './pages/Board';
import Services from './pages/Services';
import Projects from './pages/Projects';
import CalendarView from './pages/CalendarView';
import Reports from './pages/Reports';
import Templates from './pages/Templates';
import Vault from './pages/Vault';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, loading } = React.useContext(AuthContext);

  if (loading) return <div>Carregando...</div>;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user.role !== 'ADMIN') {
    return <Navigate to="/board" replace />;
  }

  return children;
};

function AppRoutes() {
  const { user } = React.useContext(AuthContext);

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/board" />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/board" />} />
      
      <Route path="/board" element={
        <ProtectedRoute>
          <Board />
        </ProtectedRoute>
      } />
      
      <Route path="/projects" element={
        <ProtectedRoute>
          <Projects />
        </ProtectedRoute>
      } />

      <Route path="/calendar" element={
        <ProtectedRoute>
          <CalendarView />
        </ProtectedRoute>
      } />

      <Route path="/vault" element={
        <ProtectedRoute>
          <Vault />
        </ProtectedRoute>
      } />
      
      <Route path="/admin" element={
        <ProtectedRoute requireAdmin={true}>
          <AdminDashboard />
        </ProtectedRoute>
      } />

      <Route path="/admin/services" element={
        <ProtectedRoute requireAdmin={true}>
          <Services />
        </ProtectedRoute>
      } />
      
      <Route path="/admin/reports" element={
        <ProtectedRoute requireAdmin={true}>
          <Reports />
        </ProtectedRoute>
      } />

      <Route path="/admin/templates" element={
        <ProtectedRoute requireAdmin={true}>
          <Templates />
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
