import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthForm from './components/AuthForm';
import UrlDetails from './components/UrlDetails';
import Dashboard from './components/Dashboard';
import { isAuthenticated, logout } from './api/api';
import './App.css';

function App() {
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    setAuthenticated(isAuthenticated());
  }, []);

  const handleAuthSuccess = () => {
    setAuthenticated(true);
  };

  const handleLogout = () => {
    logout();
    setAuthenticated(false);
  };

  if (!authenticated) {
    return (
      <div className="App">
        <AuthForm onAuthSuccess={handleAuthSuccess} />
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>URL Analysis Tool</h1>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </header>
        
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/url/:id" element={<UrlDetails />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
