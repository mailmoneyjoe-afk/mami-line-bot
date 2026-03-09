@echo off
echo ========================================
echo   Jiji Bot - Start All Services
echo ========================================
echo.
echo [1/2] กำลังเริ่ม Bot Server...
echo.

start "Bot Server" cmd /k "python C:\Users\mamip\.openclaw\workspace\line_bot\bot.py"

timeout /t 5 /nobreak >nul

echo [2/2] กำลังเริ่ม Tunnel (URL คงที่)...
echo.

start "Tunnel" cmd /k "lt --port 5000 --subdomain jijibot"

echo.
echo ========================================
echo   กรุณารอสักครู่...
echo ========================================
echo.
echo เมื่อเสร็จ จะได้ URL แบบ:
echo   https://jijibot.loca.lt
echo.
echo กรุณาตั้ง Webhook ที่ LINE Developer Console:
echo   URL: https://jijibot.loca.lt/callback
echo.
pause
