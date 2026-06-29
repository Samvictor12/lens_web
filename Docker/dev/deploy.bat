@echo off
REM Lens DEV Docker Deployment & Backup Script (Windows)
REM Run this script from inside the Docker/dev folder.

if not exist .env (
    echo Error: .env file not found in Docker/dev!
    echo Please create .env with the required environment variables.
    pause
    exit /b 1
)

:options
echo ========================================
echo Lens DEV Docker Deployment
echo ========================================
echo.
echo 1) Frontend  (build + start frontend only)
echo 2) Backend   (build + start backend only)
echo 3) Full      (build + start all services)
echo 4) Stop all services
echo 5) View logs
echo 6) Restart services
echo 7) Create Database Backup
echo 8) Restore Database from Backup`
echo 9) Create Prod build and Tar file`
echo 0) Exit`
echo.
set /p choice="Enter choice [0-9]: "

if "%choice%"=="1" goto Frontend
if "%choice%"=="2" goto Backend
if "%choice%"=="3" goto Full
if "%choice%"=="4" goto Stop
if "%choice%"=="5" goto Logs
if "%choice%"=="6" goto Restart
if "%choice%"=="7" goto CreateBackup
if "%choice%"=="8" goto RestoreBackup
if "%choice%"=="9" goto CreateProdBuild
if "%choice%"=="0" goto end
goto invalid

:Frontend
echo.
echo Building and starting frontend...
docker-compose down frontend
docker-compose up --build -d frontend
echo.
echo Frontend deployment completed!
goto options

:Backend
echo.
echo Building and starting backend...
docker-compose down backend
docker-compose up --build -d backend
echo.
echo Backend deployment completed!
goto options

:Full
echo.
echo Building and starting all services...
docker-compose down
docker-compose up --build -d
echo.
echo Full deployment completed!
echo Service URLs:
echo   - Frontend: http://localhost:6202
echo   - Backend:  http://localhost:6201
echo   - PgAdmin:  http://localhost:6204
echo   - Database: localhost:6203
goto options

:Stop
echo.
echo Stopping all services...
docker-compose down
echo Services stopped!
goto options

:Logs
echo.
echo Showing logs (Ctrl+C to exit)...
docker-compose logs -f
goto options

:Restart
echo.
echo Restarting services...
docker-compose restart
echo Services restarted!
goto options

:CreateBackup
echo.
echo ========================================
echo Creating Database Backup
echo ========================================
echo.

for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)
set mytime=%mytime: =0%

if not exist "backups" mkdir backups
set backup_file=backups\lens_dev_backup_%mydate%_%mytime%.sql

echo Creating backup: %backup_file%
docker exec -i postgres_postgres pg_dump -U postgres --data-only --column-inserts lens_project_db > "%backup_file%"

if %errorlevel% equ 0 (
    echo.
    echo Database backup created successfully!
    echo Location: %backup_file%
) else (
    echo.
    echo Backup failed! Please check if the database container is running.
)

echo.
echo Cleaning up old backups (keeping last 5)...
for /f "skip=5 delims=" %%F in ('dir /b /o-d backups\lens_dev_backup_*.sql 2^>nul') do (
    del "backups\%%F"
    echo Deleted old backup: %%F
)
echo.
pause
goto options

:RestoreBackup
setlocal enabledelayedexpansion
echo.
echo ========================================
echo Database Backup Restore
echo ========================================
echo.

if not exist "backups" (
    echo Error: Backups folder not found!
    pause
    endlocal
    goto options
)

set count=0
for %%F in (backups\*.sql) do set /a count+=1

if %count%==0 (
    echo No backup files found in the backups folder!
    pause
    endlocal
    goto options
)

echo Available backup files:
echo.
set index=0
for %%F in (backups\*.sql) do (
    set /a index+=1
    echo [!index!] %%~nxF
    set "file!index!=%%F"
)

echo.
set /p backup_choice="Enter the number of the backup file to restore [0 to cancel]: "
if "%backup_choice%"=="0" (
    endlocal
    goto options
)
if %backup_choice% LSS 1 goto invalidBackupChoice
if %backup_choice% GTR %count% goto invalidBackupChoice

call set selected_file=%%file%backup_choice%%%

echo.
echo ========================================
echo WARNING: This will overwrite existing data!
echo Selected file: %selected_file%
echo ========================================
set /p confirm="Are you sure you want to continue? (y/n): "
if /i not "%confirm%"=="y" (
    echo Restore cancelled.
    endlocal
    goto options
)

echo.
echo Clearing existing data and restoring from backup...

echo BEGIN; > temp_restore.sql
echo SET session_replication_role = 'replica'; >> temp_restore.sql
echo. >> temp_restore.sql
echo DO $$ DECLARE >> temp_restore.sql
echo     r RECORD; >> temp_restore.sql
echo BEGIN >> temp_restore.sql
echo     FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP >> temp_restore.sql
echo         EXECUTE 'TRUNCATE TABLE ' ^|^| quote_ident(r.tablename) ^|^| ' CASCADE'; >> temp_restore.sql
echo     END LOOP; >> temp_restore.sql
echo END $$; >> temp_restore.sql
echo. >> temp_restore.sql
type "%selected_file%" >> temp_restore.sql
echo. >> temp_restore.sql
echo SET session_replication_role = 'origin'; >> temp_restore.sql
echo COMMIT; >> temp_restore.sql

docker exec -i postgres_postgres psql -U postgres -d lens_project_db < temp_restore.sql

del temp_restore.sql

if %errorlevel% equ 0 (
    echo.
    echo Database restored successfully!
) else (
    echo.
    echo Restore failed! Please check the error messages above.
)

echo.
pause
endlocal
goto options

:CreateProdBuild
echo.
echo Creating production build and tar file...
pushd ..\prod
docker-compose build
docker save -o clair.tar lens-prod-backend:latest lens-prod-frontend:latest

if not exist "clair.tar" (
    echo.
    echo Production build failed! Please check the error messages above.
    pause
    popd
    goto options
) else (
    echo.
    echo Production build and tar file created successfully!
    echo Location: Docker\prod\clair.tar
)

echo Tar file copied to remote server

scp .\clair.tar root@187.127.182.76:~/Clair

echo Tar file copied to remote server completed

del .\clair.tar

popd
echo.
pause
goto options

:invalidBackupChoice
echo.
echo Invalid backup file selection!
pause
endlocal
goto options

:invalid
echo Invalid choice!
goto options

:end
echo.
