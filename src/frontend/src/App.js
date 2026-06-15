import React, { useState, useEffect } from 'react';
import Home from './components/Home';
import RegisterUser from './components/RegisterUser';
import FaceCapture from './components/FaceCapture';
import Chat from './components/Chat';
import UserList from './components/UserList';
import Settings from './components/Settings';

function App() {
  const [screen, setScreen] = useState('home');
  const [currentUser, setCurrentUser] = useState(null);
  const [backendUrl, setBackendUrl] = useState(
    localStorage.getItem('backendUrl') || 'http://localhost:8000'
  );

  useEffect(() => {
    // 백엔드 URL 저장
    localStorage.setItem('backendUrl', backendUrl);
    // 전역 설정
    window.API_URL = backendUrl;
  }, [backendUrl]);

  const handleRegisterSuccess = (userId, userName) => {
    setCurrentUser({ userId, userName });
    setScreen('chat');
  };

  const handleRecognizeSuccess = (userId, userName) => {
    setCurrentUser({ userId, userName });
    setScreen('chat');
  };

  const handleBack = () => {
    setCurrentUser(null);
    setScreen('home');
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🎭 얼굴인식 AI</h1>
        <p>모바일 테스트 버전</p>
        <small style={{ opacity: 0.7, marginTop: '5px' }}>
          {backendUrl}
        </small>
      </header>

      <main className="main">
        {screen === 'home' && (
          <Home 
            onNavigate={setScreen} 
            onSettings={() => setScreen('settings')}
          />
        )}

        {screen === 'register' && (
          <RegisterUser
            onSuccess={handleRegisterSuccess}
            onBack={handleBack}
            backendUrl={backendUrl}
          />
        )}

        {screen === 'recognize' && (
          <FaceCapture
            onSuccess={handleRecognizeSuccess}
            onBack={handleBack}
            backendUrl={backendUrl}
          />
        )}

        {screen === 'chat' && currentUser && (
          <Chat
            user={currentUser}
            onBack={handleBack}
            backendUrl={backendUrl}
          />
        )}

        {screen === 'list' && (
          <UserList 
            onBack={handleBack}
            backendUrl={backendUrl}
          />
        )}

        {screen === 'settings' && (
          <Settings 
            backendUrl={backendUrl}
            setBackendUrl={setBackendUrl}
            onBack={() => setScreen('home')}
          />
        )}
      </main>
    </div>
  );
}

export default App;
