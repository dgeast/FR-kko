# 얼굴인식 AI 앱 - 시스템 설계서 (System Design)

**버전:** 1.0
**작성일:** 2026.04.24

---

## 1. 시스템 아키텍처 (System Architecture)

### 1.1 전체 시스템 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                     사용자 인터페이스 계층                      │
│  ┌─────────────────┬────────────────────┬─────────────────┐    │
│  │  데스크톱 UI   │   모바일 UI       │  웹 UI (Admin)  │    │
│  │ (Electron)    │  (Flutter/React)  │  (React)        │    │
│  └────────┬────────┴────────┬─────────┴────────┬─────────┘    │
└───────────┼─────────────────┼──────────────────┼───────────────┘
            │                 │                  │
┌───────────┼─────────────────┼──────────────────┼───────────────┐
│           ↓                 ↓                  ↓               │
│  ┌────────────────────────────────────────────────────┐       │
│  │         API 계층 (FastAPI / REST)                  │       │
│  │  ┌──────────┬──────────┬──────────┬──────────┐    │       │
│  │  │ 사용자관리│얼굴인증 │ AI대화  │ 데이터  │    │       │
│  │  │ API     │ API     │ API    │ API    │    │       │
│  │  └──────────┴──────────┴──────────┴──────────┘    │       │
│  └────────────────────────────────────────────────────┘       │
│                           ↓                                    │
│  ┌────────────────────────────────────────────────────┐       │
│  │      비즈니스 로직 계층 (Business Logic)            │       │
│  │  ┌───────────┬────────────┬────────────┐          │       │
│  │  │ 사용자 관리│ 얼굴 인증  │ AI 챗봇   │          │       │
│  │  │ 모듈      │ 모듈       │ 모듈      │          │       │
│  │  └───────────┴────────────┴────────────┘          │       │
│  └────────────────────────────────────────────────────┘       │
│                           ↓                                    │
│  ┌────────────────────────────────────────────────────┐       │
│  │       외부 서비스 통합 계층                         │       │
│  │  ┌──────────┬──────────┬──────────┐              │       │
│  │  │ OpenAI  │ OpenWthr │ NewsAPI │              │       │
│  │  │ Claude  │ API      │ API     │              │       │
│  │  └──────────┴──────────┴──────────┘              │       │
│  └────────────────────────────────────────────────────┘       │
│                           ↓                                    │
│  ┌────────────────────────────────────────────────────┐       │
│  │         데이터 계층 (Data Layer)                    │       │
│  │  ┌──────────┬──────────┬──────────┐              │       │
│  │  │ SQLite  │ Face DB │ 캐시    │              │       │
│  │  └──────────┴──────────┴──────────┘              │       │
│  └────────────────────────────────────────────────────┘       │
└────────────────────────────────────────────────────────────────┘
```

### 1.2 배포 아키텍처

```
PC/Mobile/Tablet 환경:

┌──────────────────────────────────┐
│   클라이언트 앱 (Electron/Flutter)  │
│  ┌────────────────────────────┐   │
│  │   로컬 SQLite DB          │   │
│  │   - 사용자 정보           │   │
│  │   - 얼굴 인코딩           │   │
│  │   - 대화 기록             │   │
│  └────────────────────────────┘   │
│  ┌────────────────────────────┐   │
│  │   로컬 캐시               │   │
│  │   - 날씨 정보             │   │
│  │   - 뉴스 캐시             │   │
│  └────────────────────────────┘   │
└──────────────────────────────────┘
         ↕ (HTTP/HTTPS)
┌──────────────────────────────────┐
│   백엔드 서버 (선택)             │
│   - API 게이트웨이              │
│   - 사용자 동기화               │
│   - 분석 서비스                 │
└──────────────────────────────────┘
```

---

## 2. 주요 모듈 설계 (Module Design)

### 2.1 사용자 관리 모듈 (User Management Module)

**책임:**
- 사용자 등록, 조회, 수정, 삭제
- 사용자 정보 검증
- 사용자 권한 관리

**클래스 다이어그램:**
```
┌──────────────────┐
│   UserManager    │
├──────────────────┤
│ - user_db        │
│ - validator      │
├──────────────────┤
│ + register()     │
│ + get_user()     │
│ + update_user()  │
│ + delete_user()  │
│ + list_users()   │
└──────────────────┘
        ↓
┌──────────────────┐
│   User Entity    │
├──────────────────┤
│ - user_id        │
│ - name           │
│ - email          │
│ - created_at     │
│ - is_active      │
└──────────────────┘
```

**인터페이스:**
```python
class UserManager:
    def register(name: str, email: str) -> User
    def get_user(user_id: str) -> User
    def update_user(user_id: str, **kwargs) -> User
    def delete_user(user_id: str) -> bool
    def list_users() -> List[User]
```

### 2.2 얼굴 인증 모듈 (Face Authentication Module)

**책임:**
- 얼굴 감지 및 특성 추출
- 얼굴 비교 및 인식
- 인증 결과 반환

**기술 스택:**
- **얼굴 감지:** MediaPipe / OpenCV
- **특성 추출:** face_recognition 라이브러리
- **거리 계산:** Euclidean Distance
- **임계값:** 0.6 (유사도 >= 0.6 인증 성공)

**클래스 다이어그램:**
```
┌──────────────────────────┐
│  FaceAuthenticator       │
├──────────────────────────┤
│ - face_detector          │
│ - encoder                │
│ - face_db                │
├──────────────────────────┤
│ + detect_face()          │
│ + encode_face()          │
│ + compare_faces()        │
│ + authenticate()         │
│ + save_face_data()       │
└──────────────────────────┘
```

**프로세스 흐름:**
```
1. 카메라 입력 (30fps)
   ↓
2. MediaPipe로 얼굴 감지 (좌표, 68개 포인트)
   ↓
3. face_recognition으로 특성 추출 (128D vector)
   ↓
4. 저장된 모든 얼굴과 비교
   ↓
5. Euclidean Distance 계산
   ↓
6. 임계값(0.6) 비교
   ↓
7. 인증 결과 반환
```

### 2.3 AI 대화 모듈 (AI Chat Module)

**책임:**
- 사용자 메시지 처리
- AI 응답 생성
- 외부 API 통합
- 대화 기록 저장

**클래스 다이어그램:**
```
┌─────────────────────┐
│   ChatManager       │
├─────────────────────┤
│ - ai_provider       │
│ - api_service       │
│ - chat_db           │
├─────────────────────┤
│ + process_message() │
│ + get_context()     │
│ + save_history()    │
│ + get_history()     │
└─────────────────────┘
        ↓
┌──────────────────────────┐
│  AIProvider (Interface)  │
├──────────────────────────┤
│ + generate_response()    │
└──────────────────────────┘
        ↑
        ├─ OpenAIProvider
        ├─ ClaudeProvider
        └─ LlamaProvider
```

**외부 서비스 통합:**

| 서비스 | 목적 | API | 응답시간 |
|-------|------|-----|---------|
| OpenAI/Claude | AI 응답 생성 | text-davinci-003 | < 2초 |
| OpenWeather | 날씨 정보 | Current Weather | < 1초 |
| NewsAPI | 뉴스 정보 | Top Headlines | < 1.5초 |
| Alpha Vantage | 증권 정보 | Quote | < 1초 |

---

## 3. 데이터베이스 설계 (Database Design)

### 3.1 데이터베이스 스키마

**테이블: Users**
```sql
CREATE TABLE users (
    user_id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    email TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);
```

**테이블: FaceData**
```sql
CREATE TABLE face_data (
    face_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    face_encoding BLOB NOT NULL,  -- 128D vector (encrypted)
    capture_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    image_path TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
```

**테이블: ChatHistory**
```sql
CREATE TABLE chat_history (
    chat_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    topic TEXT,  -- 'weather', 'news', 'stock', 'general'
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
```

**테이블: SessionLog**
```sql
CREATE TABLE session_log (
    session_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    login_time TIMESTAMP,
    logout_time TIMESTAMP,
    duration INTEGER,  -- 초 단위
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
```

### 3.2 인덱스 설계
```sql
CREATE INDEX idx_users_name ON users(name);
CREATE INDEX idx_face_data_user_id ON face_data(user_id);
CREATE INDEX idx_chat_history_user_id ON chat_history(user_id);
CREATE INDEX idx_chat_history_timestamp ON chat_history(timestamp DESC);
CREATE INDEX idx_session_log_user_id ON session_log(user_id);
```

### 3.3 데이터 암호화

| 항목 | 암호화 방식 | 키 저장소 |
|-----|-----------|---------|
| 얼굴정보 (face_encoding) | AES-256 | 시스템 키체인 |
| 민감정보 (email 등) | AES-128 | 로컬 설정 파일 |

---

## 4. API 설계 (API Design)

### 4.1 REST API 엔드포인트

#### 사용자 관리
```
POST   /api/v1/users/register          - 사용자 등록
GET    /api/v1/users                    - 사용자 목록
GET    /api/v1/users/{user_id}          - 사용자 조회
PUT    /api/v1/users/{user_id}          - 사용자 수정
DELETE /api/v1/users/{user_id}          - 사용자 삭제
```

#### 얼굴 인증
```
POST   /api/v1/auth/register-face      - 얼굴정보 등록
POST   /api/v1/auth/authenticate       - 얼굴 인증
GET    /api/v1/auth/status             - 인증 상태 확인
```

#### AI 대화
```
POST   /api/v1/chat/message            - 메시지 전송
GET    /api/v1/chat/history            - 대화 기록 조회
DELETE /api/v1/chat/history/{chat_id}  - 대화 기록 삭제
```

### 4.2 API 요청/응답 예제

**사용자 등록 요청:**
```json
POST /api/v1/users/register
{
  "name": "김철수",
  "email": "kim@example.com"
}

응답 (성공):
{
  "status": "success",
  "user_id": "usr_123456",
  "message": "사용자가 등록되었습니다"
}
```

**얼굴 인증 요청:**
```json
POST /api/v1/auth/authenticate
{
  "face_image": "<base64_encoded_image>"
}

응답 (성공):
{
  "status": "success",
  "user_id": "usr_123456",
  "name": "김철수",
  "confidence": 0.98
}

응답 (실패):
{
  "status": "unregistered",
  "message": "등록되지 않은 사용자입니다"
}
```

**메시지 전송 요청:**
```json
POST /api/v1/chat/message
{
  "user_id": "usr_123456",
  "message": "내일 날씨 어때?",
  "topic": "weather"
}

응답:
{
  "status": "success",
  "chat_id": "chat_789",
  "response": "내일 서울의 날씨는 맑고...",
  "timestamp": "2026-04-24T10:30:00Z"
}
```

---

## 5. 보안 아키텍처 (Security Architecture)

### 5.1 보안 계층

```
┌─────────────────────────────────┐
│   입력 유효성 검증              │
├─────────────────────────────────┤
│   인증/인가                     │
├─────────────────────────────────┤
│   암호화 (전송 & 저장)          │
├─────────────────────────────────┤
│   접근 제어                     │
├─────────────────────────────────┤
│   감사 로그                     │
└─────────────────────────────────┘
```

### 5.2 데이터 보호

**전송 중 보호:**
- HTTPS/TLS 1.3 사용
- API 통신 암호화

**저장 시 보호:**
- 얼굴정보: AES-256 암호화
- 민감정보: AES-128 암호화
- 개인정보: 해싱 처리

### 5.3 접근 제어

```
Role-Based Access Control (RBAC):

┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Admin      │    │   User       │    │   Guest      │
├──────────────┤    ├──────────────┤    ├──────────────┤
│- 모든 권한   │    │- 자신의      │    │- 읽기만     │
│- 사용자관리  │    │  정보 관리   │    │- 인증       │
│- 시스템설정  │    │- 대화        │    │- 제한적     │
│- 감사        │    │- 기록 조회   │    │  액세스     │
└──────────────┘    └──────────────┘    └──────────────┘
```

---

## 6. 성능 최적화 전략 (Performance Optimization)

### 6.1 캐싱 전략

```
┌─────────────────────────────────┐
│   1단계: 메모리 캐시             │
│   - 사용자 정보 (TTL: 1시간)     │
│   - 세션 데이터 (TTL: 30분)      │
├─────────────────────────────────┤
│   2단계: 로컬 DB 캐시            │
│   - 날씨 정보 (TTL: 10분)        │
│   - 뉴스 정보 (TTL: 30분)        │
├─────────────────────────────────┤
│   3단계: 외부 API                │
│   - 필요 시에만 호출             │
└─────────────────────────────────┘
```

### 6.2 얼굴 인식 최적화

- **해상도:** 480p (빠른 처리)
- **프레임 스킵:** 5프레임마다 처리 (성능 향상)
- **배치 처리:** 여러 얼굴 동시 처리
- **GPU 가속:** CUDA 사용 (가능한 경우)

### 6.3 데이터베이스 최적화

- 인덱스 활용
- 연결 풀링 (Connection Pooling)
- 쿼리 최적화
- 주기적인 VACUUM (SQLite)

---

## 7. 확장성 설계 (Scalability Design)

### 7.1 현재 구조 (Phase 1)

```
단일 기기 로컬 앱
- 최대 20명 사용자
- 로컬 SQLite DB
- 카메라 + API 통합
```

### 7.2 향후 확장 (Phase 2-3)

```
클라우드 동기화
- Firebase / AWS 연동
- 멀티 기기 지원
- 클라우드 백업

마이크로서비스
- 사용자 서비스
- 인증 서비스
- 채팅 서비스
- 분석 서비스
```

---

## 8. 개발 환경 구조 (Development Environment)

### 8.1 디렉토리 구조

```
facial_recognition/
├── docs/                     # 문서
│   ├── 01_PRD.md
│   ├── 02_SRS.md
│   ├── 03_System_Design.md
│   └── 04_Detailed_Design.md
├── design/                   # 설계 산출물
│   ├── database_schema.sql
│   ├── api_spec.yaml
│   └── ui_mockups/
├── src/                      # 소스 코드
│   ├── backend/
│   │   ├── api/
│   │   ├── models/
│   │   ├── services/
│   │   └── utils/
│   ├── desktop/
│   │   ├── components/
│   │   ├── pages/
│   │   └── utils/
│   └── mobile/
│       ├── lib/
│       ├── screens/
│       └── services/
├── tests/                    # 테스트
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── config/                   # 설정 파일
│   ├── development.yaml
│   ├── testing.yaml
│   └── production.yaml
├── requirements.txt          # Python 의존성
├── package.json              # Node.js 의존성
└── README.md
```

### 8.2 기술 스택 선정

| 계층 | 기술 | 버전 | 사유 |
|-----|------|------|------|
| 백엔드 | FastAPI | 0.104+ | 빠른 성능, 자동 문서화 |
| 얼굴인식 | MediaPipe | 0.10+ | 최신, 크로스플랫폼 |
| 데이터베이스 | SQLite | 3.40+ | 로컬 저장, 배포 용이 |
| 데스크톱 | Electron | 26+ | 크로스플랫폼 |
| 모바일 | Flutter | 3.16+ | 빠른 개발, 성능 |
| 테스팅 | pytest | 7.4+ | Python 표준 |

---

## 9. 배포 전략 (Deployment Strategy)

### 9.1 빌드 아티팩트

```
Desktop:
- facial_recognition-1.0.0-win.exe
- facial_recognition-1.0.0-mac.dmg
- facial_recognition-1.0.0-linux.deb

Mobile:
- facial_recognition-1.0.0.apk (Android)
- facial_recognition-1.0.0.ipa (iOS)
```

### 9.2 배포 프로세스

```
1. 개발 환경 테스트
   ↓
2. 스테이징 배포
   ↓
3. QA 테스트
   ↓
4. 프로덕션 배포
   ↓
5. 모니터링 & 로깅
```

---

## 10. 모니터링 & 로깅 (Monitoring & Logging)

### 10.1 로깅 레벨

```
DEBUG   - 개발용 상세 정보
INFO    - 일반적인 운영 정보
WARNING - 경고 메시지
ERROR   - 오류
CRITICAL - 심각한 오류
```

### 10.2 모니터링 메트릭

| 메트릭 | 목표 | 임계값 |
|-------|------|-------|
| 응답시간 | < 1초 | > 2초 시 알림 |
| API 에러율 | < 0.1% | > 1% 시 알림 |
| 메모리 사용 | < 500MB | > 800MB 시 알림 |
| CPU 사용 | < 50% | > 80% 시 알림 |

---

**문서 변경 이력:**
- v1.0 (2026.04.24): 초안 작성
