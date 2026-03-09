@echo off
echo ========================================
echo   Cloudflare Tunnel Setup - Auto Mode
echo ========================================
echo.

cd /d "%~dp0"

echo [1/5] กำลังสร้าง Tunnel...
echo.
cloudflared-windows-amd64.exe tunnel create jijibot

echo.
echo [2/5] สร้าง Config...
echo.
(
echo tunnel: jijibot
echo credentials-file: C:\Users\mamip\.cloudflared\credentials.json
echo.
echo ingress:
echo   - service: http://localhost:5000
echo     default: true
) > cloudflared.yml

echo.
echo [3/5] กำลังรัน Tunnel...
echo.
echo ========================================
echo   กรุณาดู URL ที่แสดงด้านล่าง
echo   (จะขึ้นแบบนี้: https://jijibot.trycloudflare.com)
echo ========================================
echo.

cloudflared-windows-amd64.exe tunnel run jijibot

pause
