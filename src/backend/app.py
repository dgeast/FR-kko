from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging
import uuid
import cv2
import numpy as np
from datetime import datetime

from config import SERVER_HOST, SERVER_PORT, DEBUG, MAX_USERS, DATABASE_URL
from database import get_db_connection, init_db
from face_engine import FaceEngine
from chat_engine import ChatEngine

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# DB 초기화
init_db()

# 엔진 초기화
face_engine = FaceEngine()
chat_engine = ChatEngine()

# FastAPI 앱
app = FastAPI(
    title="얼굴인식 AI 앱 API",
    description="MVP Prototype - Facial Recognition + AI Chat",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic 모델
class UserRegisterRequest(BaseModel):
    name: str

class ChatRequest(BaseModel):
    user_id: str
    message: str

# ==================== API ENDPOINTS ====================

@app.get("/")
async def root():
    return {"status": "running", "name": "Facial Recognition API", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

# ===== 사용자 등록 =====
@app.post("/api/users/register")
async def register_user(request: UserRegisterRequest):
    """사용자 등록"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 사용자 존재 확인
        cursor.execute("SELECT user_id FROM users WHERE name = ?", (request.name,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="User already exists")
        
        # 사용자 수 확인 (MVP: 최대 3명)
        cursor.execute("SELECT COUNT(*) FROM users")
        count = cursor.fetchone()[0]
        if count >= MAX_USERS:
            raise HTTPException(
                status_code=400,
                detail=f"Maximum {MAX_USERS} users allowed"
            )
        
        # 새 사용자 생성
        user_id = str(uuid.uuid4())
        cursor.execute(
            "INSERT INTO users (user_id, name) VALUES (?, ?)",
            (user_id, request.name)
        )
        conn.commit()
        conn.close()
        
        logger.info(f"User registered: {request.name} (ID: {user_id})")
        return {
            "user_id": user_id,
            "name": request.name,
            "status": "registered"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== 사용자 목록 =====
@app.get("/api/users")
async def list_users():
    """등록된 사용자 목록"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT user_id, name, created_at FROM users")
        users = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        return {"users": users, "count": len(users)}
    except Exception as e:
        logger.error(f"List users error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== 얼굴 등록 =====
@app.post("/api/face/register")
async def register_face(user_id: str, file: UploadFile = File(...)):
    """사용자 얼굴 등록"""
    try:
        # 이미지 읽기
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image")
        
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
        
        # DB에 저장
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 사용자 확인
        cursor.execute("SELECT name FROM users WHERE user_id = ?", (user_id,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_name = user[0]
        
        # 얼굴 데이터 저장
        face_id = str(uuid.uuid4())
        cursor.execute(
            "INSERT INTO face_data (face_id, user_id, face_encoding) VALUES (?, ?, ?)",
            (face_id, user_id, face_encoding.tobytes())
        )
        conn.commit()
        
        # 엔진에 추가
        face_engine.add_user_face(user_id, user_name, face_encoding)
        
        conn.close()
        logger.info(f"Face registered for user: {user_name}")
        
        return {
            "face_id": face_id,
            "user_id": user_id,
            "user_name": user_name,
            "status": "registered"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Face registration error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== 얼굴 인식 =====
@app.post("/api/face/recognize")
async def recognize_face(file: UploadFile = File(...)):
    """얼굴 인식"""
    try:
        # 이미지 읽기
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image")
        
        # 얼굴 인식
        results = face_engine.recognize_faces_in_image(image)
        
        return {
            "recognized": len(results) > 0,
            "count": len(results),
            "faces": [
                {
                    "user_id": r["user_id"],
                    "name": r["name"],
                    "confidence": r["confidence"],
                    "location": r["location"]
                }
                for r in results
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Recognition error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== 채팅 =====
@app.post("/api/chat")
async def chat(request: ChatRequest):
    """대화 API"""
    try:
        # 응답 생성
        response = chat_engine.get_response(request.message)
        
        # DB에 저장 (선택사항)
        conn = get_db_connection()
        cursor = conn.cursor()
        chat_id = str(uuid.uuid4())
        cursor.execute(
            "INSERT INTO chat_history (chat_id, user_id, user_message, ai_response) VALUES (?, ?, ?, ?)",
            (chat_id, request.user_id, request.message, response)
        )
        conn.commit()
        conn.close()
        
        return {
            "user_id": request.user_id,
            "user_message": request.message,
            "ai_response": response,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== 초기 데이터 로드 =====
@app.on_event("startup")
async def load_face_data():
    """앱 시작시 저장된 얼굴 데이터 로드"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT f.user_id, u.name, f.face_encoding 
            FROM face_data f 
            JOIN users u ON f.user_id = u.user_id
        """)
        
        for row in cursor.fetchall():
            user_id = row[0]
            user_name = row[1]
            face_bytes = row[2]
            face_encoding = np.frombuffer(face_bytes, dtype=np.float64)
            face_engine.add_user_face(user_id, user_name, face_encoding)
        
        conn.close()
        logger.info(f"Loaded {len(face_engine.known_encodings)} users from database")
    except Exception as e:
        logger.error(f"Error loading face data: {e}")

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app:app",
        host=SERVER_HOST,
        port=SERVER_PORT,
        reload=DEBUG
    )
