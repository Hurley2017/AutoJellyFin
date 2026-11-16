@echo off
setlocal
echo ====================================================
echo  Starting AutoJellyFin Server
echo ====================================================

set JELLYFIN_EXE=%LOCALAPPDATA%\Programs\Jellyfin\jellyfin\jellyfin.exe

if not exist "%JELLYFIN_EXE%" (
    echo [ERROR] Jellyfin.exe not found at %JELLYFIN_EXE%
    pause
    exit /b 1
)

echo [INFO] Jellyfin executable found.
echo [INFO] Finding local IP address...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    echo [INFO] Your Hostel/LAN IP: %%a:8096
)

echo [INFO] Starting Jellyfin server...
echo [INFO] Web UI: http://localhost:8096
echo.
"%JELLYFIN_EXE%" --service
pause
