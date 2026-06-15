import React, { useState } from 'react';
import axios from 'axios';

function Settings({ backendUrl, setBackendUrl, onBack }) {
  const [newUrl, setNewUrl] = useState(backendUrl);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState('');

  const handleTest = async () => {
    setTesting(true);
    setError('');
    setTestResult(null);

    try {
      const response = await axios.get(`${newUrl}/health`, { timeout: 5000 });
      setTestResult('✅ 백엔드 연결 성공!');
      setBackendUrl(newUrl);
      setTimeout(() => {
        alert('설정이 저장되었습니다.');
        onBack();
      }, 1000);
    } catch (err) {
      setError('❌ 연결 실패: ' + (err.message || '백엔드를 확인해주세요.'));
    } finally {
      setTesting(false);
    }
  };

  const handleDefault = () => {
    setNewUrl('http://localhost:8000');
  };

  const getLocalIP = () => {
    // 모바일에서 자동 감지를 위한 힌트
    setNewUrl('http://192.168.1.100:8000');
  };

  return (
    <div className="card">
      <h2>⚙️ 설정</h2>

      <div className="form-group">
        <label>백엔드 서버 URL</label>
        <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '10px' }}>
          현재: {backendUrl}
        </p>
        <input
          type="text"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder="http://192.168.x.x:8000"
          style={{ marginBottom: '10px' }}
        />
        <p style={{ fontSize: '0.85em', color: '#999', marginBottom: '15px' }}>
          💡 팁: PC의 IP 주소를 입력하세요. (예: http://192.168.1.100:8000)
        </p>
      </div>

      {error && <div className="error">{error}</div>}
      {testResult && <div className="success">{testResult}</div>}

      <div className="button-group">
        <button
          className={`btn btn-primary ${testing ? 'disabled' : ''}`}
          onClick={handleTest}
          disabled={testing}
        >
          {testing ? '연결 중...' : '✓ 연결 테스트'}
        </button>
        <button
          className="btn btn-secondary"
          onClick={handleDefault}
          disabled={testing}
        >
          기본값
        </button>
        <button
          className="btn btn-secondary"
          onClick={getLocalIP}
          disabled={testing}
        >
          로컬 IP
        </button>
      </div>

      <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #ddd' }} />

      <h3 style={{ fontSize: '1.1em', marginBottom: '15px' }}>📱 모바일 접속 가이드</h3>
      <div style={{ background: '#f0f0f0', padding: '15px', borderRadius: '8px', fontSize: '0.9em', lineHeight: '1.6' }}>
        <p><strong>1. PC와 모바일을 같은 WiFi에 연결</strong></p>
        <p><strong>2. PC에서 백엔드 서버 실행</strong></p>
        <p><code style={{ background: '#fff', padding: '2px 4px', borderRadius: '3px' }}>python app.py</code></p>
        <p><strong>3. Windows: 명령프롬프트에서 ipconfig 실행</strong></p>
        <p style={{ marginLeft: '20px' }}>👉 IPv4 주소 확인 (예: 192.168.1.100)</p>
        <p><strong>4. 모바일 브라우저에서 접속</strong></p>
        <p style={{ marginLeft: '20px' }}>👉 http://PC주소:3000</p>
        <p><strong>5. 백엔드 URL 설정</strong></p>
        <p style={{ marginLeft: '20px' }}>👉 http://PC주소:8000</p>
      </div>

      <div className="button-group" style={{ marginTop: '20px' }}>
        <button className="btn btn-back" onClick={onBack} style={{ width: '100%' }}>
          뒤로
        </button>
      </div>
    </div>
  );
}

export default Settings;
