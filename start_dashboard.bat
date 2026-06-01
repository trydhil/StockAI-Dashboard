@echo off
echo Starting StockAI Dashboard...
cd /d C:\Users\ASUS\kerja\StockAI-Dashboard\backend
start "StockAI Backend" cmd /k "node server.js"
echo Backend started at http://localhost:3000
echo Open browser: http://localhost:3000
