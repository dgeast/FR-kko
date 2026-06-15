# 얼굴인식 AI 앱 - 상세 설계서 (Detailed Design)

**버전:** 1.0
**작성일:** 2026.04.24

---

## 1. 백엔드 상세 설계 (Backend Detailed Design)

### 1.1 사용자 관리 서비스 (User Management Service)

#### 클래스 구조

```python
# models/user.py
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

@dataclass
class User:
    user_id: str                # UUID
    name: str                   # 이름 또는 가명
    email: Optional[str]        # 이메일
    created_at: datetime        # 생성 시간
    updated_at: datetime        # 수정 시간
    is_active: bool = True      # 활성화 상태
    
    def to_dict(self):
        return {
            'user_id': self.user_id,
            'name': self.name,
            'email': self.email,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'is_active': self.is_active
        }
```

#### 서비스 인터페이스

```python
# services/user_service.py
from abc import ABC, abstractmethod
from typing import List, Optional

class IUserService(ABC):
    @abstractmethod
    async def register_user(self, name: str, email: Optional[str]) -> User:
        """새로운 사용자 등록"""
        pass
    
    @abstractmethod
    async def get_user(self, user_id: str) -> Optional[User]:
        """사용자 조회"""
        pass
    
    @abstractmethod
    async def list_users(self, active_only: bool = True) -> List[User]:
        """사용자 목록 조회"""
        pass
    
    @abstractmethod
    async def update_user(self, user_id: str, **kwargs) -> User:
        """사용자 정보 수정"""
        pass
    
    @abstractmethod
    async def delete_user(self, user_id: str) -> bool:
        """사용자 삭제"""
        pass
    
    @abstractmethod
    async def validate_user_name(self, name: str) -> bool:
        """사용자 이름 중복 검사"""
        pass

class UserService(IUserService):
    def __init__(self, db_connection):
        self.db = db_connection
        self.logger = logging.getLogger(__name__)
    
    async def register_user(self, name: str, email: Optional[str] = None) -> User:
        # 1. 유효성 검사
        if not self._validate_name(name):
            raise ValueError("Invalid name format")
        
        if await self.validate_user_name(name):
            raise ValueError("User name already exists")
        
        # 2. UUID 생성
        user_id = str(uuid.uuid4())
        
        # 3. DB에 저장
        now = datetime.utcnow()
        query = """
            INSERT INTO users (user_id, name, email, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
        """
        await self.db.execute(query, (user_id, name, email, now, now))
        
        # 4. 사용자 객체 반환
        return User(
            user_id=user_id,
            name=name,
            email=email,
            created_at=now,
            updated_at=now,
            is_active=True
        )
    
    # ... 다른 메서드 구현
```

#### API 엔드포인트 (FastAPI)

```python
# api/users.py
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/api/v1/users", tags=["users"])

class UserRegisterRequest(BaseModel):
    name: str
    email: Optional[EmailStr] = None

class UserResponse(BaseModel):
    user_id: str
    name: str
    email: Optional[str]
    created_at: str
    is_active: bool

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(request: UserRegisterRequest, service: UserService = Depends()):
    try:
        user = await service.register_user(request.name, request.email)
        return UserResponse(**user.to_dict())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("", response_model=List[UserResponse])
async def list_users(service: UserService = Depends()):
    users = await service.list_users()
    return [UserResponse(**user.to_dict()) for user in users]

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, service: UserService = Depends()):
    user = await service.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(**user.to_dict())

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, request: dict, service: UserService = Depends()):
    user = await service.update_user(user_id, **request)
    return UserResponse(**user.to_dict())

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: str, service: UserService = Depends()):
    success = await service.delete_user(user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
```

---

### 1.2 얼굴 인증 서비스 (Face Authentication Service)

#### 얼굴 인식 엔진 설계

```python
# services/face_recognition_service.py
import cv2
import face_recognition
import numpy as np
from typing import Tuple, List, Optional

class FaceRecognitionEngine:
    """얼굴 인식 핵심 엔진"""
    
    def __init__(self, model: str = "hog"):
        """
        Args:
            model: "hog" (빠름) 또는 "cnn" (정확함)
        """
        self.model = model
        self.threshold = 0.6  # 유사도 임계값
        self.face_distance_threshold = 0.6
    
    def detect_faces(self, image: np.ndarray) -> List[Tuple[int, int, int, int]]:
        """
        이미지에서 얼굴 감지
        Returns: [(top, right, bottom, left), ...]
        """
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        face_locations = face_recognition.face_locations(rgb_image, model=self.model)
        return face_locations
    
    def encode_face(self, image: np.ndarray, face_location: Tuple) -> Optional[np.ndarray]:
        """
        얼굴을 128D 벡터로 인코딩
        Returns: 128차원 numpy 배열 또는 None
        """
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        try:
            face_encodings = face_recognition.face_encodings(
                rgb_image, 
                [face_location]
            )
            if face_encodings:
                return face_encodings[0]
        except Exception as e:
            logging.error(f"Face encoding error: {e}")
        return None
    
    def compare_faces(self, 
                     known_face_encodings: List[np.ndarray],
                     face_to_compare: np.ndarray) -> List[bool]:
        """
        알려진 얼굴들과 비교
        Returns: [True/False, ...] (유사도 > threshold)
        """
        return face_recognition.compare_faces(
            known_face_encodings,
            face_to_compare,
            tolerance=self.face_distance_threshold
        )
    
    def face_distance(self,
                     known_face_encodings: List[np.ndarray],
                     face_to_compare: np.ndarray) -> np.ndarray:
        """
        얼굴 간 거리 계산 (낮을수록 유사)
        Returns: [거리, ...] (0.0 ~ 1.0)
        """
        return face_recognition.face_distance(
            known_face_encodings,
            face_to_compare
        )

class FaceAuthenticationService:
    """얼굴 인증 서비스"""
    
    def __init__(self, db_connection, face_engine: FaceRecognitionEngine):
        self.db = db_connection
        self.engine = face_engine
        self.logger = logging.getLogger(__name__)
    
    async def register_face(self, user_id: str, images: List[np.ndarray]) -> bool:
        """
        사용자의 얼굴정보 등록 (3-5장)
        
        Args:
            user_id: 사용자 ID
            images: 얼굴 이미지 리스트
        
        Returns:
            성공 여부
        """
        if not (3 <= len(images) <= 5):
            raise ValueError("Need 3-5 face images")
        
        face_encodings = []
        
        for idx, image in enumerate(images):
            # 얼굴 감지
            faces = self.engine.detect_faces(image)
            
            if len(faces) != 1:
                raise ValueError(f"Image {idx}: Expected 1 face, found {len(faces)}")
            
            # 얼굴 인코딩
            encoding = self.engine.encode_face(image, faces[0])
            if encoding is None:
                raise ValueError(f"Image {idx}: Failed to encode face")
            
            face_encodings.append(encoding)
        
        # 평균 인코딩 계산 (더 안정적)
        avg_encoding = np.mean(face_encodings, axis=0)
        
        # DB에 저장 (암호화)
        face_id = str(uuid.uuid4())
        encrypted_encoding = self._encrypt_encoding(avg_encoding)
        
        query = """
            INSERT INTO face_data (face_id, user_id, face_encoding, capture_date)
            VALUES (?, ?, ?, ?)
        """
        await self.db.execute(
            query,
            (face_id, user_id, encrypted_encoding, datetime.utcnow())
        )
        
        self.logger.info(f"Face registered for user: {user_id}")
        return True
    
    async def authenticate(self, image: np.ndarray) -> Tuple[bool, Optional[str], float]:
        """
        얼굴 인증 수행
        
        Args:
            image: 카메라 이미지
        
        Returns:
            (인증 성공 여부, 사용자 ID, 신뢰도 점수)
        """
        # 1. 얼굴 감지
        faces = self.engine.detect_faces(image)
        
        if len(faces) == 0:
            self.logger.warning("No face detected")
            return False, None, 0.0
        
        if len(faces) > 1:
            self.logger.warning(f"Multiple faces detected: {len(faces)}")
            return False, None, 0.0
        
        # 2. 얼굴 인코딩
        face_to_compare = self.engine.encode_face(image, faces[0])
        if face_to_compare is None:
            return False, None, 0.0
        
        # 3. DB에서 모든 등록된 얼굴 로드
        all_face_encodings, user_ids = await self._load_all_face_encodings()
        
        if not all_face_encodings:
            return False, None, 0.0
        
        # 4. 거리 계산
        distances = self.engine.face_distance(all_face_encodings, face_to_compare)
        
        # 5. 최소 거리 찾기
        min_distance = np.min(distances)
        min_index = np.argmin(distances)
        
        # 신뢰도 계산 (거리가 작을수록 높음)
        confidence = 1 - min_distance
        
        # 6. 임계값 확인
        if min_distance < self.engine.threshold:
            user_id = user_ids[min_index]
            self.logger.info(f"Authentication successful: {user_id} (confidence: {confidence:.2f})")
            return True, user_id, confidence
        else:
            self.logger.warning(f"Authentication failed (min_distance: {min_distance:.2f})")
            return False, None, confidence
    
    async def _load_all_face_encodings(self) -> Tuple[List[np.ndarray], List[str]]:
        """DB에서 모든 얼굴 인코딩 로드"""
        query = "SELECT user_id, face_encoding FROM face_data WHERE user_id IN (SELECT user_id FROM users WHERE is_active = TRUE)"
        rows = await self.db.fetchall(query)
        
        encodings = []
        user_ids = []
        
        for user_id, encrypted_encoding in rows:
            encoding = self._decrypt_encoding(encrypted_encoding)
            encodings.append(encoding)
            user_ids.append(user_id)
        
        return encodings, user_ids
    
    def _encrypt_encoding(self, encoding: np.ndarray) -> bytes:
        """얼굴 인코딩 암호화"""
        # AES-256 암호화 구현
        pass
    
    def _decrypt_encoding(self, encrypted: bytes) -> np.ndarray:
        """얼굴 인코딩 복호화"""
        # AES-256 복호화 구현
        pass
```

#### API 엔드포인트 (얼굴 인증)

```python
# api/authentication.py
from fastapi import APIRouter, File, UploadFile, HTTPException
import cv2
from io import BytesIO
from PIL import Image

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

@router.post("/register-face/{user_id}")
async def register_face(
    user_id: str,
    files: List[UploadFile] = File(...),
    service: FaceAuthenticationService = Depends()
):
    """
    사용자 얼굴정보 등록 (3-5장)
    """
    if not (3 <= len(files) <= 5):
        raise HTTPException(status_code=400, detail="Need 3-5 images")
    
    images = []
    try:
        for file in files:
            # 이미지 로드
            contents = await file.read()
            image = Image.open(BytesIO(contents))
            image_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            images.append(image_cv)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image: {str(e)}")
    
    try:
        success = await service.register_face(user_id, images)
        return {"status": "success", "message": "Face registered successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/authenticate")
async def authenticate(
    file: UploadFile = File(...),
    service: FaceAuthenticationService = Depends()
):
    """
    얼굴 인증
    """
    try:
        contents = await file.read()
        image = Image.open(BytesIO(contents))
        image_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid image")
    
    success, user_id, confidence = await service.authenticate(image_cv)
    
    if success:
        return {
            "status": "success",
            "user_id": user_id,
            "confidence": round(confidence, 4)
        }
    else:
        return {
            "status": "unregistered",
            "message": "User not recognized"
        }
```

---

### 1.3 AI 대화 서비스 (AI Chat Service)

#### AI 제공자 추상화

```python
# services/ai_provider.py
from abc import ABC, abstractmethod
from typing import Optional

class IAIProvider(ABC):
    @abstractmethod
    async def generate_response(self, 
                               message: str,
                               context: Optional[dict] = None) -> str:
        """AI 응답 생성"""
        pass

class OpenAIProvider(IAIProvider):
    def __init__(self, api_key: str):
        self.client = OpenAI(api_key=api_key)
        self.model = "gpt-4"
        self.max_tokens = 500
    
    async def generate_response(self, message: str, context: Optional[dict] = None) -> str:
        try:
            messages = [{"role": "user", "content": message}]
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=self.max_tokens,
                temperature=0.7
            )
            
            return response.choices[0].message.content
        except Exception as e:
            logging.error(f"OpenAI API error: {e}")
            raise

class ClaudeProvider(IAIProvider):
    def __init__(self, api_key: str):
        self.client = Anthropic(api_key=api_key)
        self.model = "claude-3-sonnet-20240229"
    
    async def generate_response(self, message: str, context: Optional[dict] = None) -> str:
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=500,
                messages=[{"role": "user", "content": message}]
            )
            
            return response.content[0].text
        except Exception as e:
            logging.error(f"Claude API error: {e}")
            raise
```

#### 대화 서비스

```python
# services/chat_service.py
class ChatService:
    def __init__(self, db_connection, ai_provider: IAIProvider, api_service):
        self.db = db_connection
        self.ai_provider = ai_provider
        self.api_service = api_service  # 날씨, 뉴스 등
        self.logger = logging.getLogger(__name__)
    
    async def process_message(self, 
                             user_id: str,
                             message: str,
                             topic: str = "general") -> str:
        """
        사용자 메시지 처리 및 AI 응답 생성
        """
        # 1. 입력 유효성 검사
        if not message.strip():
            raise ValueError("Empty message")
        
        # 2. 주제 분석
        detected_topic = await self._classify_topic(message)
        
        # 3. 맥락 데이터 수집
        context = await self._build_context(user_id, detected_topic)
        
        # 4. AI 응답 생성
        ai_response = await self._generate_ai_response(message, context)
        
        # 5. 대화 기록 저장
        chat_id = str(uuid.uuid4())
        await self._save_chat_history(
            chat_id, user_id, message, ai_response, detected_topic
        )
        
        # 6. 응답 반환
        return ai_response
    
    async def _classify_topic(self, message: str) -> str:
        """주제 분류 (NLP)"""
        keywords = {
            'weather': ['날씨', '온도', '비', '구름', '기온'],
            'news': ['뉴스', '뉴스', '소식', '기사'],
            'stock': ['주식', '지수', '증권', '가격']
        }
        
        message_lower = message.lower()
        for topic, keywords_list in keywords.items():
            if any(kw in message_lower for kw in keywords_list):
                return topic
        
        return "general"
    
    async def _build_context(self, user_id: str, topic: str) -> dict:
        """주제별 맥락 데이터 수집"""
        context = {
            "topic": topic,
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # 인터넷 연결 확인
        if not self._is_internet_connected():
            context["offline_mode"] = True
            return context
        
        # 주제별 데이터 수집
        if topic == "weather":
            context["weather"] = await self.api_service.get_weather()
        elif topic == "news":
            context["news"] = await self.api_service.get_latest_news()
        elif topic == "stock":
            context["stocks"] = await self.api_service.get_stock_info()
        
        return context
    
    async def _generate_ai_response(self, message: str, context: dict) -> str:
        """AI 응답 생성"""
        # 프롬프트 구성
        system_prompt = self._build_system_prompt(context)
        
        full_message = f"{system_prompt}\n\n사용자 메시지: {message}"
        
        # AI 호출
        response = await self.ai_provider.generate_response(full_message, context)
        
        return response
    
    def _build_system_prompt(self, context: dict) -> str:
        """시스템 프롬프트 구성"""
        prompt = "당신은 친절한 AI 어시스턴트입니다."
        
        if "weather" in context:
            prompt += f"\n현재 날씨: {context['weather']}"
        
        if "offline_mode" in context:
            prompt += "\n현재 인터넷이 연결되지 않았습니다. 일반적인 대화만 지원합니다."
        
        return prompt
    
    async def _save_chat_history(self, chat_id: str, user_id: str, 
                                 message: str, response: str, topic: str):
        """대화 기록 저장"""
        query = """
            INSERT INTO chat_history 
            (chat_id, user_id, message, response, topic, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
        """
        await self.db.execute(
            query,
            (chat_id, user_id, message, response, topic, datetime.utcnow())
        )
    
    def _is_internet_connected(self) -> bool:
        """인터넷 연결 확인"""
        try:
            requests.get('https://www.google.com', timeout=2)
            return True
        except:
            return False
```

---

## 2. 프론트엔드 상세 설계 (Frontend Detailed Design)

### 2.1 데스크톱 앱 (Electron + React)

#### 컴포넌트 구조

```
src/desktop/
├── components/
│   ├── common/
│   │   ├── Button.jsx
│   │   ├── Modal.jsx
│   │   └── Loading.jsx
│   ├── auth/
│   │   ├── FaceCamera.jsx         # 카메라 뷰
│   │   ├── AuthenticationResult.jsx
│   │   └── FaceRegistration.jsx    # 얼굴 등록
│   ├── user/
│   │   ├── UserManagement.jsx
│   │   ├── UserList.jsx
│   │   └── UserForm.jsx
│   └── chat/
│       ├── ChatWindow.jsx
│       ├── MessageInput.jsx
│       ├── ChatHistory.jsx
│       └── TopicSelector.jsx
├── pages/
│   ├── HomePage.jsx
│   ├── AuthPage.jsx
│   ├── ChatPage.jsx
│   └── AdminPage.jsx
├── hooks/
│   ├── useCamera.js              # 카메라 처리
│   ├── useFaceAuth.js            # 얼굴 인증 로직
│   └── useChat.js                # 대화 로직
├── services/
│   ├── api.js                    # API 호출
│   ├── faceRecognition.js        # face-api.js 사용
│   └── storage.js                # 로컬 저장소
└── utils/
    ├── validators.js
    └── formatters.js
```

#### FaceCamera 컴포넌트

```jsx
// components/auth/FaceCamera.jsx
import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';

const FaceCamera = ({ onFaceDetected, onFaceCapture }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [detections, setDetections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    loadModels();
    startCamera();
  }, []);
  
  const loadModels = async () => {
    // face-api 모델 로드
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
      faceapi.nets.faceRecognitionNet.loadFromUri('/models')
    ]);
    setIsLoading(false);
  };
  
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });
      videoRef.current.srcObject = stream;
      videoRef.current.play();
    } catch (error) {
      console.error('Camera error:', error);
    }
  };
  
  const detectFaces = async () => {
    if (!videoRef.current) return;
    
    const detections = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();
    
    setDetections(detections);
    
    if (detections) {
      onFaceDetected(true);
      drawFaceBox(detections);
    } else {
      onFaceDetected(false);
    }
  };
  
  const captureFace = () => {
    if (canvasRef.current && videoRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, 640, 480);
      const imageData = canvasRef.current.toDataURL('image/jpeg');
      onFaceCapture(imageData);
    }
  };
  
  useEffect(() => {
    const interval = setInterval(detectFaces, 100);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="face-camera">
      {isLoading && <p>Loading models...</p>}
      <video 
        ref={videoRef} 
        width="640" 
        height="480"
        style={{ border: '2px solid #ccc' }}
      />
      <canvas 
        ref={canvasRef} 
        width="640" 
        height="480"
        style={{ display: 'none' }}
      />
      {detections && (
        <button onClick={captureFace} className="btn-capture">
          사진 캡처
        </button>
      )}
    </div>
  );
};

export default FaceCamera;
```

#### ChatWindow 컴포넌트

```jsx
// components/chat/ChatWindow.jsx
import React, { useState, useRef, useEffect } from 'react';
import { ChatService } from '../../services/api';

const ChatWindow = ({ userId }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [topic, setTopic] = useState('general');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    // 사용자 메시지 표시
    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: inputMessage,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    
    // AI 응답 요청
    setIsLoading(true);
    try {
      const response = await ChatService.sendMessage(
        userId,
        inputMessage,
        topic
      );
      
      const aiMessage = {
        id: Date.now() + 1,
        sender: 'ai',
        text: response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        sender: 'ai',
        text: '죄송합니다. 오류가 발생했습니다.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="chat-window">
      <div className="topic-selector">
        {['general', 'weather', 'news', 'stock'].map(t => (
          <button
            key={t}
            className={`topic-btn ${topic === t ? 'active' : ''}`}
            onClick={() => setTopic(t)}
          >
            {t}
          </button>
        ))}
      </div>
      
      <div className="messages">
        {messages.map(msg => (
          <div key={msg.id} className={`message ${msg.sender}`}>
            <p>{msg.text}</p>
            <span className="timestamp">
              {msg.timestamp.toLocaleTimeString()}
            </span>
          </div>
        ))}
        {isLoading && <div className="message ai">입력 중...</div>}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="input-area">
        <input
          type="text"
          value={inputMessage}
          onChange={e => setInputMessage(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
          placeholder="메시지를 입력하세요..."
        />
        <button onClick={handleSendMessage} disabled={isLoading}>
          전송
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;
```

---

### 2.2 모바일 앱 (Flutter)

#### 화면 구조

```
lib/screens/
├── splash_screen.dart         # 시작 화면
├── home_screen.dart           # 홈 화면
├── auth_screen.dart           # 인증 화면
├── registration_screen.dart   # 등록 화면
├── chat_screen.dart           # 대화 화면
└── user_management_screen.dart # 사용자 관리 (Admin)
```

#### 인증 화면 (Flutter)

```dart
// lib/screens/auth_screen.dart
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';

class AuthScreen extends StatefulWidget {
  @override
  _AuthScreenState createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  late CameraController _cameraController;
  final FaceDetector _faceDetector = FaceDetector(
    options: FaceDetectorOptions(
      enableLandmarks: true,
      enableContours: true,
      enableClassification: true,
    ),
  );
  
  bool _isDetecting = false;
  String _detectionStatus = '얼굴을 카메라에 맞춰주세요';
  
  @override
  void initState() {
    super.initState();
    _initializeCamera();
  }
  
  Future<void> _initializeCamera() async {
    final cameras = await availableCameras();
    _cameraController = CameraController(
      cameras[0],
      ResolutionPreset.medium,
    );
    
    await _cameraController.initialize();
    _startDetection();
  }
  
  void _startDetection() {
    _cameraController.startImageStream((CameraImage image) async {
      if (_isDetecting) return;
      _isDetecting = true;
      
      try {
        final inputImage = InputImage.fromBytes(
          bytes: image.planes[0].bytes,
          metadata: InputImageMetadata(
            size: Size(image.width.toDouble(), image.height.toDouble()),
            rotation: InputImageRotation.rotation0deg,
            format: InputImageFormat.nv21,
            bytesPerRow: image.planes[0].bytesPerRow,
          ),
        );
        
        final faces = await _faceDetector.processImage(inputImage);
        
        setState(() {
          if (faces.isEmpty) {
            _detectionStatus = '얼굴이 감지되지 않습니다';
          } else if (faces.length > 1) {
            _detectionStatus = '한 명씩 인증해주세요';
          } else {
            _detectionStatus = '✓ 얼굴이 감지되었습니다';
          }
        });
      } finally {
        _isDetecting = false;
      }
    });
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('얼굴 인증')),
      body: Column(
        children: [
          Expanded(
            child: CameraPreview(_cameraController),
          ),
          Padding(
            padding: EdgeInsets.all(16),
            child: Column(
              children: [
                Text(
                  _detectionStatus,
                  style: TextStyle(fontSize: 16),
                ),
                SizedBox(height: 16),
                ElevatedButton(
                  onPressed: _authenticateFace,
                  child: Text('인증'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
  
  Future<void> _authenticateFace() async {
    // 얼굴 인증 API 호출
  }
  
  @override
  void dispose() {
    _cameraController.dispose();
    _faceDetector.close();
    super.dispose();
  }
}
```

---

## 3. 데이터베이스 상세 설계 (Database Detailed Design)

### 3.1 전체 스키마

```sql
-- 사용자 테이블
CREATE TABLE users (
    user_id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    email TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    CHECK (length(name) >= 1 AND length(name) <= 50)
);

-- 얼굴정보 테이블
CREATE TABLE face_data (
    face_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    face_encoding BLOB NOT NULL,  -- AES-256 암호화된 벡터
    capture_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    image_path TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CHECK (length(face_encoding) > 0)
);

-- 대화 기록 테이블
CREATE TABLE chat_history (
    chat_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    topic TEXT NOT NULL DEFAULT 'general',
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CHECK (topic IN ('weather', 'news', 'stock', 'general'))
);

-- 세션 로그 테이블
CREATE TABLE session_log (
    session_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    login_time TIMESTAMP NOT NULL,
    logout_time TIMESTAMP,
    duration_seconds INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 인덱스
CREATE INDEX idx_users_name ON users(name);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_face_user_id ON face_data(user_id);
CREATE INDEX idx_chat_user_id ON chat_history(user_id);
CREATE INDEX idx_chat_timestamp ON chat_history(timestamp DESC);
CREATE INDEX idx_session_user_id ON session_log(user_id);
CREATE INDEX idx_session_login_time ON session_log(login_time DESC);
```

---

## 4. 에러 처리 및 로깅 (Error Handling & Logging)

### 4.1 에러 분류

```python
# exceptions.py
class AppException(Exception):
    """기본 앱 예외"""
    pass

class ValidationError(AppException):
    """입력 유효성 검사 오류"""
    code = 4001
    
class UserNotFoundError(AppException):
    """사용자 미존재"""
    code = 4041

class FaceRecognitionError(AppException):
    """얼굴 인식 오류"""
    code = 5001

class AIServiceError(AppException):
    """AI 서비스 오류"""
    code = 5002

class DatabaseError(AppException):
    """데이터베이스 오류"""
    code = 5003

class ExternalAPIError(AppException):
    """외부 API 오류"""
    code = 5004
```

### 4.2 로깅 설정

```python
# logging_config.py
import logging
from logging.handlers import RotatingFileHandler

def setup_logging():
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # 파일 핸들러
    file_handler = RotatingFileHandler(
        'logs/app.log',
        maxBytes=10485760,  # 10MB
        backupCount=10
    )
    file_handler.setFormatter(formatter)
    
    # 콘솔 핸들러
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    
    # 루트 로거 설정
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    root_logger.addHandler(file_handler)
    root_logger.addHandler(console_handler)
```

---

## 5. 테스트 전략 (Testing Strategy)

### 5.1 단위 테스트 (Unit Tests)

```python
# tests/test_user_service.py
import pytest
from unittest.mock import Mock, patch
from services.user_service import UserService

class TestUserService:
    @pytest.fixture
    def service(self):
        mock_db = Mock()
        return UserService(mock_db)
    
    @pytest.mark.asyncio
    async def test_register_user_success(self, service):
        """사용자 등록 성공"""
        result = await service.register_user("홍길동", "hong@example.com")
        
        assert result.name == "홍길동"
        assert result.email == "hong@example.com"
        assert result.is_active == True
    
    @pytest.mark.asyncio
    async def test_register_user_duplicate_name(self, service):
        """중복 이름 등록 실패"""
        with pytest.raises(ValueError):
            await service.register_user("홍길동")
            await service.register_user("홍길동")
```

### 5.2 통합 테스트 (Integration Tests)

```python
# tests/test_face_auth_integration.py
import pytest
import cv2
import numpy as np

class TestFaceAuthIntegration:
    @pytest.fixture
    def setup(self):
        # 테스트 환경 설정
        pass
    
    @pytest.mark.asyncio
    async def test_face_registration_and_auth(self):
        """얼굴 등록 및 인증 통합 테스트"""
        # 테스트 이미지 로드
        test_images = load_test_images()
        
        # 등록
        user_id = await auth_service.register_face(test_images)
        
        # 인증
        success, result_user_id, confidence = await auth_service.authenticate(test_images[0])
        
        assert success == True
        assert result_user_id == user_id
        assert confidence > 0.95
```

---

**문서 변경 이력:**
- v1.0 (2026.04.24): 초안 작성
