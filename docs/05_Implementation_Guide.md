# 얼굴인식 AI 앱 - 구현 가이드 (Implementation Guide)

**버전:** 1.0
**작성일:** 2026.04.24

---

## 1. 개발 환경 설정 (Development Environment Setup)

### 1.1 필수 사전 조건

```
- Python 3.9+
- Node.js 18+
- Git
- Visual Studio Code 또는 PyCharm
- Docker (선택사항)
```

### 1.2 백엔드 개발 환경 구축

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

# 4. 필수 패키지 설치
pip install -r requirements.txt
```

#### requirements.txt

```txt
# 웹 프레임워크
fastapi==0.104.1
uvicorn==0.24.0
python-multipart==0.0.6

# 얼굴 인식
opencv-python==4.8.1.78
face-recognition==1.3.5
mediapipe==0.10.5

# AI 서비스
openai==1.3.5
anthropic==0.7.1

# 데이터베이스
sqlite3
SQLAlchemy==2.0.23
alembic==1.12.1

# 외부 API
requests==2.31.0
aiohttp==3.9.1

# 데이터 처리
numpy==1.24.3
pandas==2.1.3
Pillow==10.0.1

# 암호화
cryptography==41.0.7

# 테스팅
pytest==7.4.3
pytest-asyncio==0.21.1
pytest-cov==4.1.0

# 유틸리티
python-dotenv==1.0.0
pydantic==2.5.0
logging-config==0.5.0

# 배포
gunicorn==21.2.0
```

#### 환경 설정 파일 (.env)

```bash
# .env 파일 생성
cp .env.example .env

# 내용
DATABASE_URL=sqlite:///./facial_recognition.db
LOG_LEVEL=INFO

# OpenAI
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4

# Claude
CLAUDE_API_KEY=your_key_here

# 외부 API
OPENWEATHER_API_KEY=your_key_here
NEWSAPI_KEY=your_key_here
ALPHA_VANTAGE_KEY=your_key_here

# 서버
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
DEBUG=False
```

### 1.3 프론트엔드 개발 환경 구축

#### Electron + React (데스크톱)

```bash
# 1. Node.js 프로젝트 초기화
cd src/desktop
npm init -y

# 2. 필수 패키지 설치
npm install react react-dom
npm install electron electron-builder --save-dev
npm install axios  # API 호출
npm install react-router-dom

# 3. 개발 서버 시작
npm start
```

#### Flutter (모바일)

```bash
# 1. Flutter SDK 설치 확인
flutter --version

# 2. 필수 패키지 설치
cd src/mobile
flutter pub get

# 3. 모바일 기기 연결 확인
flutter devices

# 4. 앱 실행
flutter run

# 5. iOS 빌드
flutter build ios

# 6. Android 빌드
flutter build apk
```

---

## 2. 백엔드 구현 (Backend Implementation)

### 2.1 프로젝트 구조 생성

```bash
# 디렉토리 구조
src/backend/
├── app.py                  # 메인 앱 파일
├── config.py              # 설정
├── database.py            # DB 연결
├── api/
│   ├── __init__.py
│   ├── users.py          # 사용자 API
│   ├── auth.py           # 인증 API
│   └── chat.py           # 대화 API
├── models/
│   ├── __init__.py
│   ├── user.py           # User 모델
│   ├── face.py           # FaceData 모델
│   └── chat.py           # ChatHistory 모델
├── services/
│   ├── __init__.py
│   ├── user_service.py
│   ├── face_auth_service.py
│   ├── chat_service.py
│   └── ai_provider.py
├── utils/
│   ├── __init__.py
│   ├── encryption.py     # 암호화 유틸
│   ├── validators.py     # 검증 유틸
│   └── logger.py         # 로깅 설정
└── tests/
    ├── __init__.py
    ├── test_users.py
    ├── test_auth.py
    └── test_chat.py
```

### 2.2 FastAPI 메인 앱 파일

```python
# src/backend/app.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging

from config import Settings
from database import Database
from api import users, auth, chat

# 설정
settings = Settings()
db = Database(settings.DATABASE_URL)

# 로깅
logging.basicConfig(level=settings.LOG_LEVEL)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작/종료 처리"""
    # 시작
    logger.info("Application starting...")
    await db.connect()
    
    yield
    
    # 종료
    logger.info("Application shutting down...")
    await db.disconnect()

# FastAPI 앱 생성
app = FastAPI(
    title="얼굴인식 AI 앱 API",
    description="얼굴 인증 및 AI 대화 API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS 미들웨어
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(users.router)
app.include_router(auth.router)
app.include_router(chat.router)

@app.get("/")
async def root():
    """헬스 체크"""
    return {
        "name": "Facial Recognition AI App",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    """상태 확인"""
    db_status = await db.health_check()
    return {
        "status": "healthy" if db_status else "unhealthy",
        "database": "connected" if db_status else "disconnected"
    }

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """전역 예외 처리"""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app:app",
        host=settings.SERVER_HOST,
        port=settings.SERVER_PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )
```

### 2.3 데이터베이스 초기화

```python
# src/backend/database.py
import sqlite3
import asyncio
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class Database:
    def __init__(self, db_url: str):
        self.db_url = db_url
        self.conn: Optional[sqlite3.Connection] = None
    
    async def connect(self):
        """데이터베이스 연결"""
        loop = asyncio.get_event_loop()
        self.conn = await loop.run_in_executor(
            None, 
            sqlite3.connect, 
            self.db_url
        )
        
        # 외래키 제약 활성화
        self.conn.execute("PRAGMA foreign_keys = ON")
        
        await self.initialize_schema()
        logger.info("Database connected and initialized")
    
    async def disconnect(self):
        """데이터베이스 연결 해제"""
        if self.conn:
            self.conn.close()
            logger.info("Database disconnected")
    
    async def initialize_schema(self):
        """데이터베이스 스키마 초기화"""
        schema_sql = """
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            email TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN NOT NULL DEFAULT 1,
            CHECK (length(name) >= 1 AND length(name) <= 50)
        );
        
        CREATE TABLE IF NOT EXISTS face_data (
            face_id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            face_encoding BLOB NOT NULL,
            capture_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            image_path TEXT,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        );
        
        CREATE TABLE IF NOT EXISTS chat_history (
            chat_id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            message TEXT NOT NULL,
            response TEXT NOT NULL,
            topic TEXT NOT NULL DEFAULT 'general',
            timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
            CHECK (topic IN ('weather', 'news', 'stock', 'general'))
        );
        
        CREATE TABLE IF NOT EXISTS session_log (
            session_id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            login_time TIMESTAMP NOT NULL,
            logout_time TIMESTAMP,
            duration_seconds INTEGER,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        );
        
        -- 인덱스 생성
        CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
        CREATE INDEX IF NOT EXISTS idx_face_user_id ON face_data(user_id);
        CREATE INDEX IF NOT EXISTS idx_chat_user_id ON chat_history(user_id);
        CREATE INDEX IF NOT EXISTS idx_chat_timestamp ON chat_history(timestamp DESC);
        """
        
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, lambda: self.conn.executescript(schema_sql))
        self.conn.commit()
        logger.info("Database schema initialized")
    
    async def health_check(self) -> bool:
        """데이터베이스 상태 확인"""
        try:
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: self.conn.execute("SELECT 1").fetchone()
            )
            return result is not None
        except Exception:
            return False
```

---

## 3. 얼굴 인식 구현 (Face Recognition Implementation)

### 3.1 얼굴 인식 서비스 구현

```python
# src/backend/services/face_auth_service.py
import cv2
import face_recognition
import numpy as np
from typing import List, Tuple, Optional
import logging
import uuid
from datetime import datetime
from cryptography.fernet import Fernet

logger = logging.getLogger(__name__)

class FaceRecognitionEngine:
    def __init__(self, model: str = "hog", threshold: float = 0.6):
        self.model = model
        self.threshold = threshold
        self.logger = logging.getLogger(__name__)
    
    def detect_faces(self, image: np.ndarray) -> List[Tuple]:
        """이미지에서 얼굴 감지"""
        try:
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            faces = face_recognition.face_locations(rgb_image, model=self.model)
            self.logger.info(f"Detected {len(faces)} face(s)")
            return faces
        except Exception as e:
            self.logger.error(f"Face detection error: {e}")
            raise
    
    def encode_face(self, image: np.ndarray, face_location: Tuple) -> Optional[np.ndarray]:
        """얼굴을 벡터로 인코딩"""
        try:
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            encodings = face_recognition.face_encodings(rgb_image, [face_location])
            
            if encodings:
                return encodings[0]
            return None
        except Exception as e:
            self.logger.error(f"Face encoding error: {e}")
            return None
    
    def compare_faces(self, 
                     known_encodings: List[np.ndarray],
                     face_encoding: np.ndarray) -> List[bool]:
        """얼굴 비교"""
        return face_recognition.compare_faces(
            known_encodings,
            face_encoding,
            tolerance=self.threshold
        )
    
    def face_distance(self,
                     known_encodings: List[np.ndarray],
                     face_encoding: np.ndarray) -> np.ndarray:
        """얼굴 간 거리 계산"""
        return face_recognition.face_distance(known_encodings, face_encoding)

class FaceAuthenticationService:
    def __init__(self, db, engine: FaceRecognitionEngine, encryption_key: str):
        self.db = db
        self.engine = engine
        self.cipher = Fernet(encryption_key.encode())
        self.logger = logging.getLogger(__name__)
    
    async def register_faces(self, 
                            user_id: str, 
                            images: List[np.ndarray]) -> bool:
        """사용자 얼굴정보 등록"""
        if not (3 <= len(images) <= 5):
            raise ValueError(f"Need 3-5 images, got {len(images)}")
        
        encodings = []
        
        for idx, image in enumerate(images):
            faces = self.engine.detect_faces(image)
            
            if len(faces) != 1:
                raise ValueError(
                    f"Image {idx}: Expected 1 face, found {len(faces)}"
                )
            
            encoding = self.engine.encode_face(image, faces[0])
            if encoding is None:
                raise ValueError(f"Image {idx}: Failed to encode")
            
            encodings.append(encoding)
        
        # 평균 인코딩
        avg_encoding = np.mean(encodings, axis=0)
        
        # 암호화
        encrypted = self._encrypt_encoding(avg_encoding)
        
        # DB 저장
        face_id = str(uuid.uuid4())
        query = """
            INSERT INTO face_data (face_id, user_id, face_encoding, capture_date)
            VALUES (?, ?, ?, ?)
        """
        
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: self.db.conn.execute(
                query,
                (face_id, user_id, encrypted, datetime.utcnow())
            )
        )
        self.db.conn.commit()
        
        self.logger.info(f"Face registered for user: {user_id}")
        return True
    
    async def authenticate(self, image: np.ndarray) -> Tuple[bool, Optional[str], float]:
        """얼굴 인증"""
        # 얼굴 감지
        faces = self.engine.detect_faces(image)
        
        if len(faces) == 0:
            self.logger.warning("No face detected")
            return False, None, 0.0
        
        if len(faces) > 1:
            self.logger.warning(f"Multiple faces detected: {len(faces)}")
            return False, None, 0.0
        
        # 인코딩
        face_encoding = self.engine.encode_face(image, faces[0])
        if face_encoding is None:
            return False, None, 0.0
        
        # DB 로드
        encodings, user_ids = await self._load_all_encodings()
        
        if not encodings:
            return False, None, 0.0
        
        # 비교
        distances = self.engine.face_distance(encodings, face_encoding)
        min_distance = np.min(distances)
        min_index = np.argmin(distances)
        confidence = 1 - min_distance
        
        if min_distance < self.engine.threshold:
            user_id = user_ids[min_index]
            self.logger.info(f"Auth success: {user_id} (conf: {confidence:.2f})")
            return True, user_id, confidence
        else:
            self.logger.warning(f"Auth failed (distance: {min_distance:.2f})")
            return False, None, confidence
    
    async def _load_all_encodings(self) -> Tuple[List[np.ndarray], List[str]]:
        """DB에서 모든 얼굴 로드"""
        query = """
            SELECT fd.user_id, fd.face_encoding
            FROM face_data fd
            JOIN users u ON fd.user_id = u.user_id
            WHERE u.is_active = 1
        """
        
        loop = asyncio.get_event_loop()
        rows = await loop.run_in_executor(
            None,
            lambda: self.db.conn.execute(query).fetchall()
        )
        
        encodings = []
        user_ids = []
        
        for user_id, encrypted in rows:
            encoding = self._decrypt_encoding(encrypted)
            encodings.append(encoding)
            user_ids.append(user_id)
        
        return encodings, user_ids
    
    def _encrypt_encoding(self, encoding: np.ndarray) -> bytes:
        """인코딩 암호화"""
        data = encoding.tobytes()
        encrypted = self.cipher.encrypt(data)
        return encrypted
    
    def _decrypt_encoding(self, encrypted: bytes) -> np.ndarray:
        """인코딩 복호화"""
        data = self.cipher.decrypt(encrypted)
        encoding = np.frombuffer(data, dtype=np.float64)
        return encoding
```

---

## 4. AI 통합 구현 (AI Integration Implementation)

### 4.1 AI 제공자 구현

```python
# src/backend/services/ai_provider.py
from abc import ABC, abstractmethod
from typing import Optional
import logging
from openai import OpenAI
from anthropic import Anthropic

logger = logging.getLogger(__name__)

class AIProvider(ABC):
    @abstractmethod
    async def generate_response(self, message: str, context: Optional[dict] = None) -> str:
        """AI 응답 생성"""
        pass

class OpenAIProvider(AIProvider):
    def __init__(self, api_key: str, model: str = "gpt-4"):
        self.client = OpenAI(api_key=api_key)
        self.model = model
        self.max_tokens = 500
    
    async def generate_response(self, message: str, context: Optional[dict] = None) -> str:
        try:
            system_prompt = self._build_system_prompt(context)
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message}
                ],
                max_tokens=self.max_tokens,
                temperature=0.7
            )
            
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"OpenAI error: {e}")
            raise
    
    def _build_system_prompt(self, context: Optional[dict]) -> str:
        prompt = "당신은 친절한 AI 어시스턴트입니다."
        
        if context and "weather" in context:
            prompt += f"\n현재 날씨: {context['weather']}"
        
        if context and context.get("offline_mode"):
            prompt += "\n현재 인터넷이 연결되지 않았습니다. 일반적인 대화만 지원합니다."
        
        return prompt

class ClaudeProvider(AIProvider):
    def __init__(self, api_key: str, model: str = "claude-3-sonnet-20240229"):
        self.client = Anthropic(api_key=api_key)
        self.model = model
    
    async def generate_response(self, message: str, context: Optional[dict] = None) -> str:
        try:
            system_prompt = self._build_system_prompt(context)
            
            response = self.client.messages.create(
                model=self.model,
                max_tokens=500,
                system=system_prompt,
                messages=[{"role": "user", "content": message}]
            )
            
            return response.content[0].text
        except Exception as e:
            logger.error(f"Claude error: {e}")
            raise
    
    def _build_system_prompt(self, context: Optional[dict]) -> str:
        prompt = "당신은 친절한 AI 어시스턴트입니다."
        
        if context and "weather" in context:
            prompt += f"\n현재 날씨: {context['weather']}"
        
        if context and context.get("offline_mode"):
            prompt += "\n현재 인터넷이 연결되지 않았습니다."
        
        return prompt
```

---

## 5. 배포 (Deployment)

### 5.1 Docker 배포

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

# 시스템 패키지
RUN apt-get update && apt-get install -y \
    libsm6 libxext6 libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# Python 패키지
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 애플리케이션 코드
COPY src/backend .

# 포트
EXPOSE 8000

# 시작 명령
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=sqlite:///./facial_recognition.db
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - CLAUDE_API_KEY=${CLAUDE_API_KEY}
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    restart: unless-stopped

volumes:
  data:
  logs:
```

### 5.2 배포 명령어

```bash
# Docker 빌드
docker build -t facial-recognition:1.0 .

# Docker 실행
docker run -p 8000:8000 -e OPENAI_API_KEY=your_key facial-recognition:1.0

# Docker Compose 실행
docker-compose up -d
```

---

## 6. 테스트 실행 (Running Tests)

```bash
# 전체 테스트 실행
pytest tests/

# 테스트 커버리지 확인
pytest tests/ --cov=src --cov-report=html

# 특정 테스트 실행
pytest tests/test_users.py -v

# 로그 출력 포함 테스트
pytest tests/ -v -s
```

---

## 7. 실행 및 확인 (Running & Verification)

```bash
# 1. 백엔드 시작
cd src/backend
python app.py

# 2. API 문서 확인
http://localhost:8000/docs

# 3. 헬스 체크
curl http://localhost:8000/health

# 4. 데스크톱 앱 시작
cd src/desktop
npm start

# 5. 모바일 앱 실행
cd src/mobile
flutter run
```

---

**문서 변경 이력:**
- v1.0 (2026.04.24): 초안 작성
