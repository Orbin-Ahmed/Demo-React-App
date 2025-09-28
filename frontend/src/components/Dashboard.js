import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import io from 'socket.io-client';

export default function Dashboard() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const { currentUser, logout } = useAuth();

  useEffect(() => {
    if (!currentUser) return;

    // Initialize WebSocket connection
    const newSocket = io('http://localhost:3001'); // Backend URL
    setSocket(newSocket);

    // Listen for real-time count updates
    newSocket.on('countUpdated', (data) => {
      if (data.userId === currentUser.uid) {
        setCount(data.count);
      }
    });

    // Listen to Firestore changes for this user's document
    const userDocRef = doc(db, 'userCounts', currentUser.uid);
    
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        setCount(doc.data().count || 0);
      } else {
        setCount(0);
      }
      setLoading(false);
    });

    // Cleanup
    return () => {
      unsubscribe();
      newSocket.close();
    };
  }, [currentUser]);

  const handleButtonClick = async () => {
    if (!currentUser) return;

    try {
      const userDocRef = doc(db, 'userCounts', currentUser.uid);
      const newCount = count + 1;
      
      // Update Firestore
      await setDoc(userDocRef, {
        count: newCount,
        userId: currentUser.uid,
        email: currentUser.email,
        lastUpdated: new Date().toISOString()
      });

      // Emit to backend for real-time updates and caching
      if (socket) {
        socket.emit('buttonClick', {
          userId: currentUser.uid,
          count: newCount
        });
      }

    } catch (error) {
      console.error('Error updating count:', error);
    }
  };

  const handleLogout = async () => {
    try {
      if (socket) {
        socket.close();
      }
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <div>
          <h2>Welcome!</h2>
          <p style={{ color: '#666' }}>{currentUser.email}</p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: '8px 16px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </div>

      <div style={{ 
        textAlign: 'center', 
        padding: '40px',
        border: '2px solid #e0e0e0',
        borderRadius: '8px',
        backgroundColor: '#f8f9fa'
      }}>
        <h1 style={{ fontSize: '3rem', margin: '0 0 20px 0', color: '#007bff' }}>
          {count}
        </h1>
        <p style={{ fontSize: '1.2rem', marginBottom: '30px', color: '#666' }}>
          Your click count
        </p>
        
        <button
          onClick={handleButtonClick}
          style={{
            padding: '15px 30px',
            fontSize: '1.1rem',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            transition: 'transform 0.1s'
          }}
          onMouseDown={(e) => e.target.style.transform = 'scale(0.95)'}
          onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
        >
          Click Me! 🚀
        </button>
      </div>

      <div style={{ 
        marginTop: '20px', 
        padding: '15px',
        backgroundColor: '#e9ecef',
        borderRadius: '4px',
        fontSize: '0.9rem',
        color: '#666'
      }}>
        <p>💡 Your clicks are saved automatically and sync in real-time!</p>
      </div>
    </div>
  );
}