import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { MessengerPage } from './pages/MessengerPage';
import { AdminPage } from './pages/AdminPage';
import { WorldBrainPage } from './pages/WorldBrainPage';
import { AGICompanionPage } from './pages/AGICompanionPage';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <div className="min-h-screen bg-[#FAFBFC]">
            <Toaster position="top-right" />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/messenger" element={
                <ProtectedRoute>
                  <MessengerPage />
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute requireAdmin>
                  <AdminPage />
                </ProtectedRoute>
              } />
              <Route path="/worldbrain" element={
                <ProtectedRoute>
                  <WorldBrainPage />
                </ProtectedRoute>
              } />
              <Route path="/agi" element={
                <ProtectedRoute>
                  <AGICompanionPage />
                </ProtectedRoute>
              } />
              <Route path="/" element={
                <ProtectedRoute>
                  <MessengerPage />
                </ProtectedRoute>
              } />
            </Routes>
          </div>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;