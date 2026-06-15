import React from 'react';

function Home({ onNavigate, onSettings }) {
  return (
    <div className="card">
      <h2>🎯 메뉴</h2>
      <div className="home-buttons">
        <button
          className="btn btn-primary"
          onClick={() => onNavigate('register')}
        >
          👤 사용자 등록
        </button>
        <button
          className="btn btn-primary"
          onClick={() => onNavigate('recognize')}
        >
          🔍 얼굴 인식
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => onNavigate('list')}
        >
          👥 사용자 목록
        </button>
        <button
          className="btn btn-secondary"
          onClick={onSettings}
        >
          ⚙️ 설정
        </button>
      </div>
    </div>
  );
}

export default Home;
