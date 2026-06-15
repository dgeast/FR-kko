import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///facial_recognition.db")
# 모바일 테스트: 0.0.0.0으로 모든 네트워크 인터페이스에서 수신
SERVER_HOST = os.getenv("SERVER_HOST", "0.0.0.0")
SERVER_PORT = int(os.getenv("SERVER_PORT", 8000))
DEBUG = os.getenv("DEBUG", "True").lower() == "true"
MAX_USERS = int(os.getenv("MAX_USERS", 3))
FACE_THRESHOLD = float(os.getenv("FACE_THRESHOLD", 0.6))
