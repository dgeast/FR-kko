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

    // 오프라인 로컬 응답 시뮬레이션
    setTimeout(() => {
      let aiResponse = "어떤 말씀이신지 잘 모르겠어요. 다시 말씀해 주시겠어요?";
      if (userMsg.includes("안녕")) {
        aiResponse = `안녕하세요 ${user.userName}님! 오늘 하루 어떠신가요?`;
      } else if (userMsg.includes("날씨")) {
        aiResponse = "태블릿 오프라인 모드에서는 날씨 정보를 알 수 없어요.";
      } else if (userMsg.includes("이름")) {
        aiResponse = `제 이름은 하모니스 오프라인 AI입니다. 사용자님은 ${user.userName}님이시군요!`;
      } else if (userMsg.length > 5) {
        aiResponse = "흥미로운 이야기네요. 더 자세히 말씀해 주실 수 있나요?";
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: aiResponse
      }]);
      setLoading(false);
    }, 800); // 0.8초 딜레이
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
