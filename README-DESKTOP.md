# FillMyForm Desktop App

A standalone Windows executable that auto-fills Google Forms using AI.

## Download & Run

1. Go to [Releases](https://github.com/PRATIKSINDHIYA/fillMyForm/releases)
2. Download `fillmyform.exe` 
3. Double-click to run
4. Open http://localhost:3000 in your browser
5. Paste your Gemini API key
6. Paste Google Form URL and click Fill Form

## Features

- ✅ No installation required
- ✅ No Chrome command needed  
- ✅ Works offline
- ✅ Auto-fills and submits forms
- ✅ Modern UI with progress tracking
- ✅ Recent forms history

## How it works

The app runs a local web server on your machine. It uses headless browser automation to:
1. Open your Google Form
2. Extract questions and options
3. Use Gemini AI to answer each question
4. Auto-submit the form

## Requirements

- Windows 10/11
- Gemini API key (get from [Google AI Studio](https://aistudio.google.com/app/apikey))

## Building from source

```bash
npm install
npm install -g pkg
pkg . --targets node18-win-x64 --output fillmyform.exe
```

## Support

- Issues: [GitHub Issues](https://github.com/PRATIKSINDHIYA/fillMyForm/issues)
- API limits: [Gemini API Docs](https://ai.google.dev/gemini-api/docs/rate-limits)