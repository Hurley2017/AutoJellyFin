@echo off
echo ====================================================
echo  AutoJellyFin - Windows Firewall Configuration
echo ====================================================
echo.
echo Adding firewall rules to allow hostel & LAN devices to connect to Jellyfin...
echo (Must be run as Administrator)
echo.

netsh advfirewall firewall add rule name="Jellyfin Server (HTTP 8096)" dir=in action=allow protocol=TCP localport=8096
netsh advfirewall firewall add rule name="Jellyfin Discovery (UDP 7359)" dir=in action=allow protocol=UDP localport=7359

echo.
echo Firewall rules added successfully!
pause
