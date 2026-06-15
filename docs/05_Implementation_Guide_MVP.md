# 얼굴인식 AI 앱 - 구현 가이드 (MVP Version)

**버전:** 2.0 (MVP Edition)  
**작성일:** 2026.04.24  
**대상:** 개발팀 (3명)  
**기간:** 3주 (21일)  
**비용:** $0 (완전 무료)  

> **MVP 목표:** 3명 얼굴 인식 + 기초 대화 프로토타입  
> 향후 확장 가능한 구조로 설계됨

---

## 1. 개발 환경 설정 (5시간)

### 1.1 필수 사전 조건

```
- Python 3.11+
- Node.js 18+ (프론트엔드)
- Git
- Visual Studio Code
- 웹캠 (얼굴 인식용)
```

### 1.2 백엔드 환경 구축 (2시간)

#### Python 가상환경 설정

```bash
# 1. 프로젝트 폴더 이동
cd facial_recognition

# 2. 가상환경 생성
python -m venv venv

# 3. 가상환경 활성화
# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

# 4. pip 업그레이드
python -m pip install --upgrade pip

# 5. MVP 패키지 설치
pip install fastapi==0.104.1 uvicorn==0.24.0
pip install opencv-python==4.8.1.78 face-recognition==1.3.5
pip install pillow numpy
pip install sqlalchemy
pip install python-dotenv
```

#### 간단한 requirements.txt (MVP 버전)

```txt
# 웹 프레임워크
fastapi==0.104.1
uvicorn==0.24.0
python-multipart==0.0.6

# 얼굴 인식
opencv-python==4.8.1.78
face-recognition==1.3.5

# 데이터 처리
numpy>=1.24.0
pillow>=10.0.0

# 데이터베이스
sqlite3
sqlalchemy>=2.0.0

# 유틸리티
python-dotenv==1.0.0
pydantic>=2.0.0

# 테스팅 (선택사항)
pytest>=7.4.0
```

#### 환경 설정 파일 (.env)

```bash
# .env 파일 생성
cat > .env << EOF
DATABASE_URL=sqlite:///facial_recognition.db
SERVER_HOST=127.0.0.1
SERVER_PORT=8000
DEBUG=True
LOG_LEVEL=INFO
MAX_USERS=3
FACE_THRESHOLD=0.6
EOF
```

### 1.3 프론트엔드 환경 구축 (2시간)

#### React 프로젝트 생성

```bash
# 1. 프론트엔드 디렉토리 생성
mkdir src/frontend
cd src/frontend

# 2. React 앱 생성
npx create-react-app .

# 3. 필수 패키지 설치
npm install axios  # API 호출
npm install react-webcam  # 웹캠
npm install react-icons  # 아이콘

# 4. 개발 서버 실행 (나중에)
# npm start
```

---

## 2. 백엔드 구현 (Week 1: 8시간)

### 2.1 프로젝트 폴더 구조 생성

```bash
mkdir -p src/backend/{api,models,services,utils,tests}

# 파일 생성
touch src/backend/app.py
touch src/backend/config.py
touch src/backend/database.py
touch src/backend/api/{__init__.py,users.py,chat.py}
touch src/backend/models/{__init__.py,user.py,chat.py}
touch src/backend/services/{__init__.py,face_engine.py,chat_engine.py}
touch src/backend/utils/{__init__.py,logger.py}
touch src/backend/tests/{__init__.py,test_face.py,test_api.py}
```

### 2.2 FastAPI 메인 앱 파일

```python
# src/backend/app.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from config import settings
from database import db
from api import users, chat

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 시작
    logger.info("Application starting...")
    await db.connect()
    yield
    # 종료
    logger.info("Application stopping...")
    await db.disconnect()

# FastAPI 앱 생성
app = FastAPI(
    title="얼굴인식 AI 앱 API",
    description="얼굴 인증 및 대화 API (MVP)",
    version="1.0.0",
    lifespan=lifespan
)

# CORS 활성화
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(users.router, prefix="/api")
app.include_router(chat.router, prefix="/api")

@app.get("/")
async def root():
    return {"name": "Facial Recognition API", "version": "1.0.0", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "database": "connected"}

# 실행
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host=settings.server_host, port=settings.server_port, reload=True)
```

### 2.3 설정 파일

```python
# src/backend/config.py
import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv()

class Settings(BaseSettings):
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///facial_recognition.db")
    server_host: str = os.getenv("SERVER_HOST", "127.0.0.1")
    server_port: int = int(os.getenv("SERVER_PORT", 8000))
    debug: bool = os.getenv("DEBUG", "True").lower() == "true"
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    max_users: int = int(os.getenv("MAX_USERS", 3))
    face_threshold: float = float(os.getenv("FACE_THRESHOLD", 0.6))

settings = Settings()
```

### 2.4 데이터베이스 초기화 (2 테이블만)

```python
# src/backend/database.py
import sqlite3
import logging
import os

logger = logging.getLogger(__name__)

class Database:
    def __init__(self, db_url: str):
        self.db_path = db_url.replace("sqlite:///", "")
        self.conn = None
    
    async def connect(self):
        """데이터베이스 연결 및 초기화"""
        self.conn = sqlite3.connect(self.db_path)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA foreign_keys = ON")
        await self.initialize_schema()
        logger.info(f"Database connected: {self.db_path}")
    
    async def disconnect(self):
        """데이터베이스 종료"""
        if self.conn:
            self.conn.close()
            logger.info("Database disconnected")
    
    async def initialize_schema(self):
        """MVP 데이터베이스 스키마 (2개 테이블)"""
        schema = """
        -- 사용자 테이블
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            age INTEGER,
            gender TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- 얼굴 데이터 테이블
        CREATE TABLE IF NOT EXISTS face_data (
            face_id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            face_encoding BLOB NOT NULL,
            captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_face_user_id ON face_data(user_id);
        """
        cursor = self.conn.cursor()
        cursor.executescript(schema)
        self.conn.commit()
        logger.info("Database schema initialized")
    
    def get_connection(self):
        return self.conn

# 전역 데이터베이스 인스턴스
from config import settings
db = Database(settings.database_url)
```

### 2.5 얼굴 인식 엔진 구현

```python
# src/backend/services/face_engine.py
import cv2
import face_recognition
import numpy as np
import pickle
import logging
from typing import List, Tuple, Optional

logger = logging.getLogger(__name__)

class FaceRecognitionEngine:
    def __init__(self, model: str = "hog", threshold: float = 0.6):
        self.model = model
        self.threshold = threshold
        self.known_face_encodings = []
        self.known_face_names = []
    
    def detect_faces(self, image: np.ndarray) -> List[Tuple]:
        """이미지에서 얼굴 위치 감지 (top, right, bottom, left)"""
        try:
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            face_locations = face_recognition.face_locations(
                rgb_image, model=self.model
            )
            logger.info(f"Detected {len(face_locations)} face(s)")
            return face_locations
        except Exception as e:
            logger.error(f"Face detection error: {e}")
            return []
    
    def encode_face(self, image: np.ndarray, face_location: Tuple) -> Optional[np.ndarray]:
        """얼굴을 128D 벡터로 인코딩"""
        try:
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            encodings = face_recognition.face_encodings(rgb_image, [face_location])
            return encodings[0] if encodings else None
        except Exception as e:
            logger.error(f"Face encoding error: {e}")
            return None
    
    def compare_faces(self, 
                     known_encodings: List[np.ndarray],
                     face_encoding: np.ndarray) -> Tuple[List[bool], np.ndarray]:
        """알려진 얼굴과 비교하고 거리 반환"""
        matches = face_recognition.compare_faces(
            known_encodings, face_encoding, tolerance=self.threshold
        )
        distances = face_recognition.face_distance(known_encodings, face_encoding)
        return matches, distances
    
    def recognize_faces_in_image(self, image: np.ndarray) -> List[dict]:
        """이미지에서 인식된 얼굴 목록 반환"""
        face_locations = self.detect_faces(image)
        face_encodings = []
        
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        for face_location in face_locations:
            encoding = face_recognition.face_encodings(rgb_image, [face_location])
            if encoding:
                face_encodings.append(encoding[0])
        
        results = []
        for face_encoding, face_location in zip(face_encodings, face_locations):
            matches, distances = self.compare_faces(
                self.known_face_encodings, face_encoding
            )
            
            name = "Unknown"
            confidence = 0
            
            if matches and self.known_face_names:
                best_match_index = np.argmin(distances)
                if matches[best_match_index]:
                    name = self.known_face_names[best_match_index]
                    confidence = 1 - distances[best_match_index]
            
            results.append({
                "name": name,
                "confidence": float(confidence),
                "location": face_location,
                "encoding": face_encoding.tobytes()  # 저장용
            })
        
        return results
    
    def add_user_face(self, user_name: str, face_encoding: np.ndarray):
        """사용자 얼굴 추가"""
        self.known_face_encodings.append(face_encoding)
        self.known_face_names.append(user_name)
        logger.info(f"Added face for user: {user_name}")
```

### 2.6 규칙 기반 채팅 엔진

```python
# src/backend/services/chat_engine.py
import random
import datetime
import logging
from typing import Tuple

logger = logging.getLogger(__name__)

class RuleBasedChatEngine:
    def __init__(self):
        self.responses = {
            # 인사
            r"(안녕|hello|hi|안녕하세요|반가워|반갑다)": [
                "안녕하세요! 반갑습니다.",
                "안녕! 어떻게 도와드릴까요?",
                "Hello! 좋은 만남이네요.",
                "Hi there! 뭘 도와드릴까요?"
            ],
            
            # 이름 묻기
            r"(너 누구|당신 누구|이름이 뭐|name)": [
                "저는 AI 어시스턴트입니다.",
                "저는 얼굴인식 AI 앱의 대화 시스템입니다.",
                "My name is AI Assistant!",
                "저를 Harmony라고 생각하셔도 됩니다."
            ],
            
            # 시간
            r"(지금 몇 시|what time|현재 시간|시간이)": [
                f"지금은 {datetime.datetime.now().strftime('%H:%M')}입니다.",
                f"현재 시간: {datetime.datetime.now().strftime('%H:%M:%S')}",
                f"It's {datetime.datetime.now().strftime('%I:%M %p')}"
            ],
            
            # 날씨
            r"(날씨|weather|비|맑음)": [
                "날씨는 맑은 편입니다.",
                "오늘은 따뜻한 날씨네요.",
                "The weather is nice today!",
                "구름이 조금 있지만 괜찮습니다."
            ],
            
            # 감사
            r"(고마워|감사|thank|thanks|thanks you)": [
                "도움이 되어서 다행입니다!",
                "천만에요!",
                "You're welcome!",
                "기꺼이 도와드립니다."
            ],
            
            # 작별
            r"(안녕|bye|goodbye|끝|종료)": [
                "안녕하세요! 다음에 또 뵙겠습니다.",
                "See you soon!",
                "좋은 하루 되세요!",
                "Goodbye! Have a nice day!"
            ],
            
            # 기분
            r"(어때|어떻게|how|잘 지내|기분)": [
                "저는 AI라 기분이라는 게 없지만, 당신의 기분이 괜찮길 바랍니다!",
                "I'm doing great, thanks for asking!",
                "좋은 하루 보내고 있습니다!",
                "Happy to chat with you!"
            ],
            
            # 도움말
            r"(도움|help|뭘 할 수|기능)": [
                "저는 당신의 얼굴을 인식하고, 기본적인 대화를 할 수 있습니다.",
                "I can recognize your face and have a conversation with you.",
                "얼굴 인식, 시간, 날씨 등에 대해 얘기할 수 있어요.",
                "You can ask me about time, weather, and general questions!"
            ],
        }
    
    def get_response(self, user_message: str) -> str:
        """사용자 메시지에 대한 응답 반환"""
        import re
        
        user_message_lower = user_message.lower()
        
        for pattern, responses in self.responses.items():
            if re.search(pattern, user_message_lower):
                return random.choice(responses)
        
        # 기본 응답
        default_responses = [
            "흥미로운 질문이네요. 다시 물어봐 주시겠어요?",
            "잠깐, 다시 말씀해 주실 수 있을까요?",
            "Sorry, I didn't understand that. Can you rephrase?",
            "좋은 질문입니다. 더 자세히 설명해 주시겠어요?"
        ]
        
        return random.choice(default_responses)
```

### 2.7 API 엔드포인트 (3개)

```python
# src/backend/api/users.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import db
import uuid
import logging

router = APIRouter(tags=["users"])
logger = logging.getLogger(__name__)

class UserRegister(BaseModel):
    name: str
    age: int = None
    gender: str = None

@router.post("/users/register")
async def register_user(user_data: UserRegister):
    """사용자 등록 API"""
    try:
        # 사용자 존재 여부 확인
        conn = db.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT user_id FROM users WHERE name = ?", (user_data.name,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="User already exists")
        
        # 사용자 수 확인 (MVP: 최대 3명)
        from config import settings
        cursor.execute("SELECT COUNT(*) FROM users")
        count = cursor.fetchone()[0]
        if count >= settings.max_users:
            raise HTTPException(
                status_code=400, 
                detail=f"Maximum {settings.max_users} users allowed in MVP"
            )
        
        # 새 사용자 생성
        user_id = str(uuid.uuid4())
        cursor.execute(
            "INSERT INTO users (user_id, name, age, gender) VALUES (?, ?, ?, ?)",
            (user_id, user_data.name, user_data.age, user_data.gender)
        )
        conn.commit()
        
        logger.info(f"User registered: {user_data.name}")
        return {"user_id": user_id, "name": user_data.name, "status": "registered"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/users")
async def list_users():
    """등록된 사용자 목록"""
    try:
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT user_id, name, age, gender FROM users")
        users = [dict(row) for row in cursor.fetchall()]
        return {"users": users, "count": len(users)}
    except Exception as e:
        logger.error(f"List users error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

```python
# src/backend/api/chat.py
from fastapi import APIRouter, HTTPException, File, UploadFile
from pydantic import BaseModel
from database import db
from services.face_engine import FaceRecognitionEngine
from services.chat_engine import RuleBasedChatEngine
import cv2
import numpy as np
import logging
import uuid

router = APIRouter(tags=["chat"])
logger = logging.getLogger(__name__)

# 엔진 초기화
face_engine = FaceRecognitionEngine()
chat_engine = RuleBasedChatEngine()

class ChatRequest(BaseModel):
    user_id: str
    message: str

@router.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """채팅 API"""
    try:
        response = chat_engine.get_response(request.message)
        return {
            "user_id": request.user_id,
            "message": request.message,
            "response": response,
            "timestamp": str(datetime.datetime.now())
        }
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/face/recognize")
async def recognize_face(file: UploadFile = File(...)):
    """얼굴 인식 API"""
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # 얼굴 인식
        results = face_engine.recognize_faces_in_image(image)
        
        return {
            "recognized": len(results) > 0,
            "faces": [
                {
                    "name": r["name"],
                    "confidence": r["confidence"],
                    "location": r["location"]
                }
                for r in results
            ]
        }
    except Exception as e:
        logger.error(f"Recognition error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/face/register")
async def register_face(user_id: str, file: UploadFile = File(...)):
    """사용자 얼굴 등록 API"""
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # 얼굴 감지
        face_locations = face_engine.detect_faces(image)
        if not face_locations:
            raise HTTPException(status_code=400, detail="No face detected")
        if len(face_locations) > 1:
            raise HTTPException(status_code=400, detail="Multiple faces detected")
        
        # 얼굴 인코딩
        face_encoding = face_engine.encode_face(image, face_locations[0])
        if face_encoding is None:
            raise HTTPException(status_code=400, detail="Failed to encode face")
        
        # DB 저장
        conn = db.get_connection()
        cursor = conn.cursor()
        
        face_id = str(uuid.uuid4())
        cursor.execute(
            "INSERT INTO face_data (face_id, user_id, face_encoding) VALUES (?, ?, ?)",
            (face_id, user_id, face_encoding.tobytes())
        )
        conn.commit()
        
        # 엔진에 추가
        cursor.execute("SELECT name FROM users WHERE user_id = ?", (user_id,))
        user = cursor.fetchone()
        if user:
            face_engine.add_user_face(user[0], face_encoding)
        
        logger.info(f"Face registered for user: {user_id}")
        return {"face_id": face_id, "status": "registered"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Face registration error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

---

## 3. 프론트엔드 구현 (Week 2: 8시간)

### 3.1 React 핵심 컴포넌트

#### 홈 페이지 (App.js)

```jsx
// src/frontend/src/App.js
import React, { useState } from 'react';
import './App.css';
import UserRegister from './components/UserRegister';
import FaceCapture from './components/FaceCapture';
import ChatWindow from './components/ChatWindow';
import UserList from './components/UserList';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [mode, setMode] = useState('home'); // 'home', 'register', 'recognize', 'chat'

  return (
    <div className="app">
      <header className="header">
        <h1>🎭 얼굴 인식 AI 앱</h1>
        <p>MVP Version - Facial Recognition + AI Chat</p>
      </header>

      <main className="main">
        {mode === 'home' && (
          <div className="home">
            <div className="button-group">
              <button onClick={() => setMode('register')} className="btn-primary">
                👤 사용자 등록
              </button>
              <button onClick={() => setMode('recognize')} className="btn-primary">
                🔍 얼굴 인식
              </button>
              <button onClick={() => setMode('list')} className="btn-secondary">
                👥 사용자 목록
              </button>
            </div>
          </div>
        )}

        {mode === 'register' && (
          <UserRegister
            onSuccess={(userId) => {
              setCurrentUser(userId);
              setMode('chat');
            }}
            onBack={() => setMode('home')}
          />
        )}

        {mode === 'recognize' && (
          <FaceCapture
            onRecognized={(user) => {
              setCurrentUser(user);
              setMode('chat');
            }}
            onBack={() => setMode('home')}
          />
        )}

        {mode === 'chat' && currentUser && (
          <ChatWindow
            userId={currentUser}
            onBack={() => {
              setCurrentUser(null);
              setMode('home');
            }}
          />
        )}

        {mode === 'list' && (
          <UserList onBack={() => setMode('home')} />
        )}
      </main>
    </div>
  );
}

export default App;
```

#### 사용자 등록 컴포넌트

```jsx
// src/frontend/src/components/UserRegister.jsx
import React, { useState } from 'react';
import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000/api';

function UserRegister({ onSuccess, onBack }) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!name) {
      setError('이름을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/users/register`, {
        name,
        age: age ? parseInt(age) : null,
        gender: gender || null
      });
      
      alert(`${name}님이 등록되었습니다!`);
      onSuccess(response.data.user_id);
    } catch (err) {
      setError(err.response?.data?.detail || '등록 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>👤 사용자 등록</h2>
      <div className="form-group">
        <label>이름 *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="이름을 입력하세요"
        />
      </div>

      <div className="form-group">
        <label>나이</label>
        <input
          type="number"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          placeholder="나이"
        />
      </div>

      <div className="form-group">
        <label>성별</label>
        <select value={gender} onChange={(e) => setGender(e.target.value)}>
          <option value="">선택</option>
          <option value="M">남자</option>
          <option value="F">여자</option>
        </select>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="button-group">
        <button onClick={handleRegister} disabled={loading} className="btn-primary">
          {loading ? '등록 중...' : '등록하기'}
        </button>
        <button onClick={onBack} className="btn-secondary">뒤로</button>
      </div>
    </div>
  );
}

export default UserRegister;
```

#### 얼굴 인식 컴포넌트 (웹캠)

```jsx
// src/frontend/src/components/FaceCapture.jsx
import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000/api';

function FaceCapture({ onRecognized, onBack }) {
  const webcamRef = useRef(null);
  const [recognizing, setRecognizing] = useState(false);
  const [result, setResult] = useState(null);

  const capture = useCallback(async () => {
    if (!webcamRef.current) return;

    setRecognizing(true);
    try {
      const imageSrc = webcamRef.current.getScreenshot();
      const blob = await fetch(imageSrc).then(res => res.blob());
      
      const formData = new FormData();
      formData.append('file', blob, 'face.jpg');

      const response = await axios.post(`${API_URL}/face/recognize`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setResult(response.data);

      if (response.data.recognized && response.data.faces.length > 0) {
        // 첫 번째 인식된 얼굴
        const face = response.data.faces[0];
        if (face.confidence > 0.6) {  // 70% 이상 신뢰도
          alert(`인식되었습니다: ${face.name}`);
          onRecognized(face.name);
        }
      }
    } catch (err) {
      alert('얼굴 인식 실패: ' + err.message);
    } finally {
      setRecognizing(false);
    }
  }, [onRecognized]);

  return (
    <div className="card">
      <h2>🔍 얼굴 인식</h2>
      <Webcam
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        width={400}
        height={300}
      />
      
      <div className="button-group">
        <button onClick={capture} disabled={recognizing} className="btn-primary">
          {recognizing ? '인식 중...' : '촬영 및 인식'}
        </button>
        <button onClick={onBack} className="btn-secondary">뒤로</button>
      </div>

      {result && (
        <div className="result">
          <p>인식된 얼굴: {result.faces.map(f => `${f.name} (${(f.confidence * 100).toFixed(1)}%)`).join(', ')}</p>
        </div>
      )}
    </div>
  );
}

export default FaceCapture;
```

#### 채팅 컴포넌트

```jsx
// src/frontend/src/components/ChatWindow.jsx
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000/api';

function ChatWindow({ userId, onBack }) {
  const [messages, setMessages] = useState([]);
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
      const response = await axios.post(`${API_URL}/chat`, {
        user_id: userId,
        message: userMsg
      });

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.data.response
      }]);
    } catch (err) {
      alert('메시지 전송 실패: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card chat-container">
      <h2>💬 대화</h2>
      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
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
        <button onClick={sendMessage} disabled={loading} className="btn-primary">
          {loading ? '전송 중...' : '전송'}
        </button>
      </div>

      <button onClick={onBack} className="btn-secondary">
        로그아웃
      </button>
    </div>
  );
}

export default ChatWindow;
```

#### 사용자 목록 컴포넌트

```jsx
// src/frontend/src/components/UserList.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000/api';

function UserList({ onBack }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/users`);
      setUsers(response.data.users);
    } catch (err) {
      alert('사용자 목록 불러오기 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>👥 등록된 사용자</h2>
      
      {loading ? (
        <p>로딩 중...</p>
      ) : users.length === 0 ? (
        <p>등록된 사용자가 없습니다.</p>
      ) : (
        <table className="user-table">
          <thead>
            <tr>
              <th>이름</th>
              <th>나이</th>
              <th>성별</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.user_id}>
                <td>{user.name}</td>
                <td>{user.age || '-'}</td>
                <td>{user.gender || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button onClick={onBack} className="btn-secondary">뒤로</button>
    </div>
  );
}

export default UserList;
```

### 3.2 CSS 스타일링

```css
/* src/frontend/src/App.css */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.header {
  background: rgba(0, 0, 0, 0.2);
  color: white;
  padding: 20px;
  text-align: center;
  backdrop-filter: blur(10px);
}

.header h1 {
  font-size: 2.5em;
  margin-bottom: 5px;
}

.main {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 20px;
}

.card {
  background: white;
  border-radius: 15px;
  padding: 30px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 500px;
  width: 100%;
}

.card h2 {
  color: #333;
  margin-bottom: 20px;
  font-size: 1.8em;
}

.home {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-top: 20px;
}

.btn-primary, .btn-secondary {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 1.1em;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 600;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5568d3;
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: #e0e0e0;
  color: #333;
}

.btn-secondary:hover {
  background: #d0d0d0;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 1em;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 10px rgba(102, 126, 234, 0.2);
}

.error {
  background: #fee;
  color: #c00;
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 15px;
}

.result {
  background: #efe;
  color: #060;
  padding: 10px;
  border-radius: 5px;
  margin-top: 15px;
}

.chat-container {
  display: flex;
  flex-direction: column;
  height: 600px;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 15px;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 8px;
}

.message {
  margin-bottom: 10px;
  padding: 10px 15px;
  border-radius: 8px;
  max-width: 80%;
}

.message.user {
  background: #667eea;
  color: white;
  align-self: flex-end;
  margin-left: auto;
  text-align: right;
}

.message.assistant {
  background: #e8e8e8;
  color: #333;
  align-self: flex-start;
}

.chat-input {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.chat-input input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 1em;
}

.user-table {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
}

.user-table th,
.user-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.user-table th {
  background: #f5f5f5;
  font-weight: 600;
  color: #333;
}

.user-table tr:hover {
  background: #f9f9f9;
}
```

---

## 4. 통합 및 테스트 (Week 3: 5시간)

### 4.1 백엔드 시작하기

```bash
# 백엔드 폴더에서
cd src/backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt

# 데이터베이스 초기화
python -c "
import asyncio
from database import db

async def init():
    await db.connect()
    await db.disconnect()

asyncio.run(init())
"

# 서버 실행
python app.py
# http://127.0.0.1:8000 에서 실행됨
```

### 4.2 프론트엔드 시작하기

```bash
# 프론트엔드 폴더에서
cd src/frontend
npm install
npm start
# http://localhost:3000 에서 실행됨
```

### 4.3 기능 테스트 체크리스트

```
- [ ] 백엔드 서버 시작
- [ ] 프론트엔드 앱 시작
- [ ] API 문서 확인 (http://127.0.0.1:8000/docs)
- [ ] 사용자 등록 테스트
- [ ] 얼굴 등록 테스트 (각 사용자당 1-3장)
- [ ] 얼굴 인식 테스트
- [ ] 채팅 기능 테스트
- [ ] 여러 사용자로 통합 테스트
- [ ] 3명 이상 등록 제한 테스트
```

---

## 5. 배포 및 운영 (Local Development)

### 5.1 로컬 실행 스크립트

#### Windows용 `run.bat`

```batch
@echo off
echo Starting Facial Recognition MVP...

REM 백엔드 시작
cd src\backend
echo Starting backend server...
start cmd /k "venv\Scripts\activate && python app.py"

REM 프론트엔드 시작
cd ..\frontend
echo Starting frontend server...
start cmd /k "npm start"

echo Both servers starting...
echo Backend: http://127.0.0.1:8000
echo Frontend: http://localhost:3000
```

#### Mac/Linux용 `run.sh`

```bash
#!/bin/bash

echo "Starting Facial Recognition MVP..."

# 백엔드 시작
cd src/backend
echo "Starting backend server..."
source venv/bin/activate
python app.py &

# 프론트엔드 시작
cd ../frontend
echo "Starting frontend server..."
npm start

echo "Both servers running!"
echo "Backend: http://127.0.0.1:8000"
echo "Frontend: http://localhost:3000"
```

### 5.2 문제 해결

**얼굴을 인식하지 못하는 경우:**
- 조명 확인 (충분히 밝은 환경 필요)
- 얼굴이 카메라에 정면으로 있는지 확인
- `config.py`의 `FACE_THRESHOLD` 값 낮춰보기 (예: 0.5)

**API 연결 실패:**
- 백엔드 서버가 실행 중인지 확인
- 방화벽 설정 확인
- CORS 설정 확인 (App.py에서 모든 오리진 허용)

**데이터베이스 에러:**
- `facial_recognition.db` 파일 삭제 후 재시작
- Python 버전 확인 (3.11+ 권장)

---

## 6. 향후 확장 (Phase 2-3)

### Phase 2 (1-2주): AI 통합

```
- [ ] OpenAI/Claude API 연동
- [ ] 모바일 앱 (Flutter) 개발
- [ ] 다중 얼굴 인식 (3명 이상)
- [ ] 외부 API (날씨, 뉴스) 통합
- [ ] 사용자 맞춤 설정
```

### Phase 3 (2-3주): 프로덕션

```
- [ ] Docker 컨테이너화
- [ ] AWS/클라우드 배포
- [ ] 데이터베이스 업그레이드 (4 테이블)
- [ ] 로그인/인증 추가
- [ ] 채팅 히스토리 저장
```

---

## 7. 참고 자료

### 중요 라이브러리 문서

- **FastAPI**: https://fastapi.tiangolo.com/
- **face_recognition**: https://github.com/ageitgey/face_recognition
- **OpenCV**: https://docs.opencv.org/
- **React**: https://react.dev/
- **React Webcam**: https://github.com/mozmorris/react-webcam

### 개발 커맨드

```bash
# 백엔드 테스트
pytest src/backend/tests/

# 프론트엔드 테스트
npm test

# 데이터베이스 조회
sqlite3 facial_recognition.db ".schema"

# 로그 확인
tail -f backend.log
```

---

**작성자:** 개발팀  
**최종 수정:** 2026.04.24  
**버전:** 2.0 (MVP)