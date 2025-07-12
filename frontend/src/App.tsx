import React, { useState, useEffect, useRef } from 'react';
import UrlTable, { UrlTableRef } from './components/UrlTable';
import UrlForm from './components/UrlForm';
import AuthForm from './components/AuthForm';
import { UrlData, isAuthenticated, logout } from './api/api';
import './App.css';

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const urlTableRef = useRef<UrlTableRef>(null);

  useEffect(() => {
    setAuthenticated(isAuthenticated());
  }, []);

  const handleUrlAdded = (newUrl: UrlData) => {
    setTimeout(() => {
      if (urlTableRef.current) {
        setRefreshKey(prev => prev + 1);
        urlTableRef.current.refresh();
      }
    }, 5000);
  };

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
    <div className="App">
      <header className="App-header">
        <h1>URL Analysis Tool</h1>
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </header>
      
      <div className="main-content">
        <UrlForm onUrlAdded={handleUrlAdded} />
        <UrlTable key={refreshKey} ref={urlTableRef} />
      </div>
    </div>
  );
}

export default App;
