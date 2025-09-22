const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Building executable...');

// Create a simple launcher script
const launcherScript = `
@echo off
echo Starting FillMyForm...
echo.
echo Opening http://localhost:3000 in your browser...
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start the server
node server.js

pause
`;

fs.writeFileSync('start.bat', launcherScript);

// Create package.json for pkg
const pkgConfig = {
  "name": "fillmyform-desktop",
  "version": "1.0.0",
  "description": "FillMyForm Desktop App",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "build": "pkg . --targets node18-win-x64 --output fillmyform.exe"
  },
  "pkg": {
    "assets": [
      "public/**/*",
      "node_modules/**/*"
    ],
    "targets": [
      "node18-win-x64"
    ],
    "outputPath": "dist"
  }
};

fs.writeFileSync('package-pkg.json', JSON.stringify(pkgConfig, null, 2));

console.log('✅ Build files created');
console.log('Run: npm install pkg -g && pkg package-pkg.json');