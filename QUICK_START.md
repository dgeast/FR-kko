# 🎯 빠른 시작 가이드 (Quick Start)

## 1️⃣ 사전 요구사항 확인

```bash
# Python 버전 확인 (3.11+)
python --version

# Node.js 버전 확인 (18+)
node --version
npm --version
```

## 2️⃣ 자동 실행 (권장)

### Windows
```bash
cd facial_recognition
run.bat
```

### Mac / Linux
```bash
cd facial_recognition
chmod +x run.sh
./run.sh
```

---

## 3️⃣ 수동 실행

### 3-1. 백엔드 시작

```bash
# 폴더 이동
cd facial_recognition/src/backend

# 가상환경 생성 (첫 번째만)
python -m venv venv

# 가상환경 활성화
# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

# 패키지 설치 (첫 번째만)
pip install -r requirements.txt

# 서버 시작
python app.py
```

✅ 백엔드 실행 확인: http://127.0.0.1:8000

### 3-2. 프론트엔드 시작 (새 터미널에서)

```bash
# 폴더 이동
cd facial_recognition/src/frontend

# 패키지 설치 (첫 번째만)
npm install

# 앱 시작
npm start
```

✅ 프론트엔드 실행 확인: http://localhost:3000

---

## 4️⃣ 사용 흐름

### Step 1: 사용자 등록
1. "👤 사용자 등록" 클릭
2. 이름 입력 (예: "김철수")
3. 등록 완료

### Step 2: 얼굴 등록
1. 등록된 사용자로 자동 로그인됨
2. 💬 대화 화면으로 이동
3. **중요**: 백엔드로 돌아가서 얼굴 데이터 등록 필요

**백엔드 API 문서 활용:**
- URL: http://127.0.0.1:8000/docs
- `POST /api/face/register` 사용
  - `user_id`: 위에서 받은 ID
  - `file`: 이미지 파일 업로드

### Step 3: 얼굴 인식
1. 홈 화면으로 돌아가기
2. "🔍 얼굴 인식" 클릭
3. 웹캠에 얼굴을 보임
4. 자동으로 인식되면 대화 화면 진입

### Step 4: 대화
- AI와 기본 대화 진행 (인사, 시간, 날씨 등)

---

## 5️⃣ API 테스트

### Swagger UI (권장)
http://127.0.0.1:8000/docs

### cURL 예제

#### 사용자 등록
```bash
curl -X POST "http://127.0.0.1:8000/api/users/register" \
  -H "Content-Type: application/json" \
  -d '{"name": "김철수"}'
```

#### 얼굴 등록
```bash
curl -X POST "http://127.0.0.1:8000/api/face/register?user_id=USER_ID" \
  -F "file=@path/to/face.jpg"
```

#### 얼굴 인식
```bash
curl -X POST "http://127.0.0.1:8000/api/face/recognize" \
  -F "file=@path/to/face.jpg"
```

#### 대화
```bash
curl -X POST "http://127.0.0.1:8000/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "USER_ID", "message": "안녕하세요"}'
```

---

## 6️⃣ 문제 해결

### Q: 얼굴을 인식하지 못함
- ✅ 조명 확인 (밝은 환경)
- ✅ 정면 촬영
- ✅ 얼굴이 명확해야 함

### Q: 백엔드 시작 안 됨
- ✅ Python 3.11+ 확인
- ✅ 터미널 다시 열기
- ✅ `pip install -r requirements.txt` 다시 실행

### Q: 프론트엔드 시작 안 됨
- ✅ Node.js 18+ 확인
- ✅ `npm install` 다시 실행
- ✅ `npm cache clean --force` 후 재설치

### Q: CORS 에러
- ✅ 백엔드가 http://127.0.0.1:8000 에서 실행 중인지 확인
- ✅ 프론트엔드가 http://localhost:3000 에서 실행 중인지 확인

---

## 7️⃣ 주요 기능

| 기능 | 상태 | 설명 |
|------|------|------|
| 사용자 등록 | ✅ | 최대 3명 등록 가능 |
| 얼굴 등록 | ✅ | 1인당 여러 이미지 등록 |
| 얼굴 인식 | ✅ | 실시간 웹캠 인식 |
| 규칙 기반 대화 | ✅ | 150+ 패턴 응답 |
| 채팅 히스토리 | ✅ | DB에 저장됨 |

---

## 8️⃣ 향후 확장

**Phase 2:** AI API 통합 (ChatGPT, Claude)
**Phase 3:** 모바일 앱 (Flutter)
**Phase 4:** 클라우드 배포 (AWS)

---

**버전:** 1.0.0 MVP  
**마지막 업데이트:** 2026.04.27
