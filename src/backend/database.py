import sqlite3
import os
import logging
from config import DATABASE_URL

logger = logging.getLogger(__name__)

DB_PATH = DATABASE_URL.replace("sqlite:///", "")

def get_db_connection():
    """데이터베이스 연결"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    """데이터베이스 초기화"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 사용자 테이블
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # 얼굴 데이터 테이블
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS face_data (
        face_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        face_encoding BLOB NOT NULL,
        captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    )
    """)
    
    # 채팅 히스토리
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chat_history (
        chat_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        user_message TEXT NOT NULL,
        ai_response TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    )
    """)
    
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_face_user_id ON face_data(user_id)")
    
    conn.commit()
    conn.close()
    logger.info(f"Database initialized at {DB_PATH}")

# 앱 시작시 DB 초기화
if not os.path.exists(DB_PATH):
    init_db()
