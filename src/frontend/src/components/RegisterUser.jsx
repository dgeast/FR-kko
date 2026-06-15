import React, { useState } from 'react';
import axios from 'axios';

function RegisterUser({ onSuccess, onBack, backendUrl }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!name.trim()) {
      setError('이름을 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${backendUrl}/api/users/register`, { name });
      alert(`${name}님이 등록되었습니다! 이제 얼굴을 등록하세요.`);
      onSuccess(response.data.user_id, response.data.name);
    } catch (err) {
      setError(err.response?.data?.detail || '등록 실패. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>👤 사용자 등록</h2>

      {error && <div className="error">{error}</div>}

      <div className="form-group">
        <label>이름</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="이름을 입력하세요"
          onKeyPress={(e) => e.key === 'Enter' && handleRegister()}
          disabled={loading}
        />
      </div>

      <div className="button-group">
        <button
          className={`btn btn-primary ${loading ? 'disabled' : ''}`}
          onClick={handleRegister}
          disabled={loading}
        >
          {loading ? '등록 중...' : '등록하기'}
        </button>
        <button
          className="btn btn-back"
          onClick={onBack}
          disabled={loading}
        >
          뒤로
        </button>
      </div>
    </div>
  );
}

export default RegisterUser;
