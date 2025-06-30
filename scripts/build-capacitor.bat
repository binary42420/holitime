@echo off

REM Build script for Capacitor
echo Building for Capacitor...

REM Set environment variable for Capacitor build
set CAPACITOR_BUILD=true

REM Install dependencies with legacy peer deps
echo Installing dependencies...
npm ci --legacy-peer-deps

REM Build the Next.js app for static export
echo Building Next.js app...
npm run build:capacitor

REM Sync with Capacitor
echo Syncing with Capacitor...
npx cap sync

echo Capacitor build complete!
echo You can now run:
echo   npx cap run android
echo   npx cap run ios
