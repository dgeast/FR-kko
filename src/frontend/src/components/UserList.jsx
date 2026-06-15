import React, { useState, useEffect } from 'react';
import axios from 'axios';

function UserList({ onBack, backendUrl }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/users`);
      setUsers(response.data.users);
      setError('');
    } catch (err) {
      setError('사용자 목록 불러오기 실패: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>👥 등록된 사용자</h2>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="loading">로딩 중...</div>
      ) : users.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#999' }}>
          등록된 사용자가 없습니다.
        </p>
      ) : (
        <table className="user-table">
          <thead>
            <tr>
              <th>이름</th>
              <th>등록일</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.user_id}>
                <td>{user.name}</td>
                <td>{new Date(user.created_at).toLocaleString('ko-KR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button className="btn btn-back" onClick={onBack} style={{ width: '100%', marginTop: '20px' }}>
        뒤로
      </button>
    </div>
  );
}

export default UserList;
