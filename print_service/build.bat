@echo off
echo ============================================
echo  Lens Print Service - Build Script
echo ============================================
echo.

:: Install dependencies
echo [1/2] Installing Python dependencies...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: pip install failed.
    pause
    exit /b 1
)

:: Build with PyInstaller
echo.
echo [2/2] Building executable...
pyinstaller ^
    --onefile ^
    --windowed ^
    --name LensPrintService ^
    --add-data "." ^
    service.py

if %errorlevel% neq 0 (
    echo ERROR: PyInstaller build failed.
    pause
    exit /b 1
)

echo.
echo ============================================
echo  BUILD COMPLETE
echo  Output: dist\LensPrintService.exe
echo ============================================
echo.
echo Upload dist\LensPrintService.exe to your
echo static file server or cloud storage and
echo update the download URL in the Settings page.
echo.
pause
