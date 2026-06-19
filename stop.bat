@echo off
:: 한글 인코딩 설정 (UTF-8)
chcp 65001 > nul
echo ==========================================
echo 얼굴인식 AI 앱 - 서버 종료 스크립트
echo ==========================================

:: 백엔드 서버 (포트 8000) 종료 프로세스
echo [1/2] 백엔드 서버(포트 8000) 상태 확인 및 종료 중...
powershell -ExecutionPolicy Bypass -Command "$b = (Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue).OwningProcess; if ($b) { Stop-Process -Id $b -Force; Write-Host '=> 백엔드 서버(PID: '$b')가 정상적으로 종료되었습니다.' -ForegroundColor Green } else { Write-Host '=> 실행 중인 백엔드 서버를 찾지 못했습니다.' -ForegroundColor Yellow }"

echo.

:: 프론트엔드 서버 (포트 3000) 종료 프로세스
echo [2/2] 프론트엔드 서버(포트 3000) 상태 확인 및 종료 중...
powershell -ExecutionPolicy Bypass -Command "$f = (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess; if ($f) { Stop-Process -Id $f -Force; Write-Host '=> 프론트엔드 서버(PID: '$f')가 정상적으로 종료되었습니다.' -ForegroundColor Green } else { Write-Host '=> 실행 중인 프론트엔드 서버를 찾지 못했습니다.' -ForegroundColor Yellow }"

echo ==========================================
echo 종료 작업이 완료되었습니다.
echo ==========================================
pause
