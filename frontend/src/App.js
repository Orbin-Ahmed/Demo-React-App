import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import './App.css';

function AuthenticatedApp() {
  const { currentUser } = useAuth();

  if (currentUser) {
    return <Dashboard />;
  }

  return <AuthWrapper />;
}

function AuthWrapper() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="App">
      <header style={{ 
        backgroundColor: '#007bff', 
        color: 'white', 
        padding: '20px',
        textAlign: 'center',
        marginBottom: '20px'
      }}>
        <h1>Click Counter App</h1>
        <p>Track your clicks with real-time updates!</p>
      </header>
      
      {isLogin ? (
        <Login onToggle={() => setIsLogin(false)} />
      ) : (
        <Signup onToggle={() => setIsLogin(true)} />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}

export default App;