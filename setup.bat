@echo off
REM Video Downloader Setup Script for Windows

echo.
echo 🎥 Video Downloader - Setup Script
echo ====================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js not found!
    echo Please install Node.js from: https://nodejs.org/
    echo Then run this script again.
    pause
    exit /b 1
)
echo ✅ Node.js is installed

REM Check if Python is installed
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Python not found!
    echo Please install Python from: https://www.python.org/
    echo Then run this script again.
    pause
    exit /b 1
)
echo ✅ Python is installed

REM Check if yt-dlp is installed
yt-dlp --version >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo 📦 Installing yt-dlp...
    python -m pip install yt-dlp
)
echo ✅ yt-dlp is installed

REM Install npm dependencies
echo.
echo 📦 Installing npm dependencies...
call npm install

REM Done
echo.
echo ✅ Setup complete!
echo.
echo To start the server, run:
echo   npm start
echo.
echo Then open: http://localhost:3000
echo.
pause
