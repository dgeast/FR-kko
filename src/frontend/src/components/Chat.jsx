import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

function Chat({ user, onBack, backendUrl }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `${user.userName}님 반갑습니다! 뭔가 도와드릴 게 있나요?` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const response = await axios.post(`${backendUrl}/api/chat`, {
        user_id: user.userId,
        message: userMsg
      });

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.data.ai_response
      }]);
    } catch (err) {
      alert('메시지 전송 실패: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card chat-container">
      <h2>💬 {user.userName}님과의 대화</h2>

      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message message-${msg.role}`}>
            {msg.content}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="메시지를 입력하세요..."
          disabled={loading}
        />
        <button
          className={`btn btn-primary ${loading ? 'disabled' : ''}`}
          onClick={sendMessage}
          disabled={loading}
          style={{ minWidth: '100px' }}
        >
          {loading ? '전송 중...' : '전송'}
        </button>
      </div>

      <button className="btn btn-back" onClick={onBack}>
        로그아웃
      </button>
    </div>
  );
}

export default Chat;
