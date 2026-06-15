# 🚀 얼굴인식 AI 앱 - 모바일 테스트 완성 가이드

**상태:** ✅ 샤오미 폰 테스트 가능  
**버전:** MVP 1.0  
**작성일:** 2026.04.27

---

## 🎯 5분 안에 시작하기

### Step 1: PC에서 백엔드 실행 (Terminal 1)

```bash
cd facial_recognition/src/backend
venv\Scripts\activate  # Windows
pip install -r requirements.txt  # 처음만
python app.py
```

✅ 출력: `Uvicorn running on http://0.0.0.0:8000`

### Step 2: PC에서 프론트엔드 실행 (Terminal 2)

```bash
cd facial_recognition/src/frontend
npm install  # 처음만
npm start
```

✅ 출력: `Compiled successfully!`

### Step 3: PC IP 확인 (Terminal 3)

```bash
ipconfig  # Windows
```

기억하기: `192.168.1.100` (당신의 IP)

### Step 4: 모바일에서 접속

1. 모바일 브라우저 열기
2. **`http://192.168.1.100:3000`** 입력
3. ⚙️ 설정 클릭
4. 백엔드 URL: `http://192.168.1.100:8000`
5. ✓ 연결 테스트 → **✅ 성공**

---

## 📱 기능 테스트

### Test 1: 사용자 등록

```
👤 사용자 등록
↓
이름 입력: "테스트사용자"
↓
✅ 등록되었습니다!
```

### Test 2: 얼굴 인식

```
🔍 얼굴 인식
↓
📸 촬영 및 인식 클릭
↓
웹캠에 얼굴을 보임
↓
✅ "테스트사용자" 인식됨!
```

### Test 3: AI 대화

```
💬 대화 화면
↓
메시지: "안녕하세요"
↓
AI: "안녕하세요! 반갑습니다."
↓
✅ 대화 성공!
```

### Test 4: 사용자 목록

```
👥 사용자 목록
↓
✅ "테스트사용자" 확인
↓
등록 시간 표시
```

---

## ⚙️ 시스템 구성

### 백엔드 (Port 8000)
- **프레임워크:** FastAPI
- **얼굴 인식:** MediaPipe / face_recognition
- **데이터베이스:** SQLite (로컬)
- **바인드:** `0.0.0.0` (모든 네트워크)

### 프론트엔드 (Port 3000)
- **프레임워크:** React
- **웹캠:** react-webcam
- **API 호출:** axios
- **반응형:** 모바일 최적화

### 네트워크
- **PC → 모바일:** WiFi 직접 연결
- **통신:** HTTP (HTTPS 불필요)
- **설정:** 모바일 앱에서 백엔드 URL 관리

---

## 📊 API 엔드포인트

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| POST | `/api/users/register` | 사용자 등록 |
| GET | `/api/users` | 사용자 목록 |
| POST | `/api/face/register` | 얼굴 등록 |
| POST | `/api/face/recognize` | 얼굴 인식 |
| POST | `/api/chat` | AI 대화 |

**문서:** `http://192.168.1.100:8000/docs`

---

## 🐛 일반적인 문제와 해결

| 문제 | 원인 | 해결 |
|------|------|------|
| 페이지 안 뜸 | 잘못된 IP | `ipconfig`로 재확인 |
| 백엔드 연결 안됨 | 서버 미실행 | Terminal에서 `python app.py` |
| 웹캠 작동 안함 | 권한 미설정 | Chrome 설정 → 카메라 허용 |
| 얼굴 못 인식 | 어두운 환경 | 밝은 곳에서 시도 |
| 느린 응답 | WiFi 불안정 | 라우터 근처에서 시도 |

---

## 📋 체크리스트

```
✅ PC와 모바일이 같은 WiFi 연결
✅ 백엔드 서버 실행 (0.0.0.0:8000)
✅ 프론트엔드 서버 실행 (:3000)
✅ PC IP 확인 (ipconfig)
✅ 모바일 브라우저에서 http://IP:3000 접속
✅ 설정에서 백엔드 URL 입력 (http://IP:8000)
✅ 연결 테스트 성공
✅ 사용자 등록 테스트
✅ 얼굴 인식 테스트
✅ 채팅 기능 테스트
```

---

## 🔐 주의사항

1. **로컬 네트워크만:** 같은 WiFi에서만 작동
2. **파이어월:** 포트 8000 허용 필요 (Windows)
3. **권한:** 카메라 접근 권한 필수
4. **배터리:** 모바일 저전력 모드 비활성화

---

## 🚀 다음 단계

### Phase 2 (2-3주)
- ✨ Claude/ChatGPT API 통합
- 📱 Flutter 모바일 앱
- 🌍 여러 사용자 동시 인식

### Phase 3 (3-4주)
- 🐳 Docker 컨테이너화
- ☁️ AWS 클라우드 배포
- 🔒 사용자 인증 추가

---

## 📞 빠른 참고

```bash
# 백엔드 시작
cd src/backend && venv\Scripts\activate && python app.py

# 프론트엔드 시작
cd src/frontend && npm start

# IP 확인
ipconfig | findstr IPv4

# 데이터베이스 리셋
del src/backend/facial_recognition.db

# 로그 확인
type src/backend/app.log
```

---

## 📚 전체 가이드

- **빠른 시작:** [QUICK_START.md](QUICK_START.md)
- **구현 가이드:** [05_Implementation_Guide_MVP.md](docs/05_Implementation_Guide_MVP.md)
- **모바일 테스트:** [MOBILE_TESTING_GUIDE.md](MOBILE_TESTING_GUIDE.md)
- **시스템 설계:** [design/03_System_Design.md](design/03_System_Design.md)

---

## 🎉 완성!

**축하합니다!** 이제 샤오미 폰에서 얼굴 인식 AI 앱을 테스트할 수 있습니다.

**피드백 환영:** 문제나 제안사항이 있으면 알려주세요!

---

**버전:** 1.0.0 MVP  
**최종 테스트일:** 2026.04.27  
**상태:** ✅ 운영 가능
