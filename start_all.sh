#!/bin/bash
# EdTech Platform - Barcha panellarni alohida ishga tushirish va brauzerda ochish skripti

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "🚀 EdTech Platform ishga tushirilmoqda..."

# 1. Backend serverni tekshirish va ishga tushirish (Port 5001)
if ! lsof -i :5001 > /dev/null 2>&1; then
    echo "⚡ Backend server (port 5001) ishga tushirilmoqda..."
    (cd "$DIR/backend" && nohup node server.js > "$DIR/backend.log" 2>&1 &)
    sleep 2
else
    echo "✅ Backend server allaqachon ishlab turibdi (port 5001)."
fi

# 2. Frontend portlarini ishga tushirish (5173, 5174, 5175, 5176)
if ! lsof -i :5173 > /dev/null 2>&1; then
    echo "⚡ Admin paneli (port 5173) ishga tushirilmoqda..."
    (cd "$DIR/frontend" && nohup npm run dev:admin > /dev/null 2>&1 &)
fi

if ! lsof -i :5174 > /dev/null 2>&1; then
    echo "⚡ O'qituvchi paneli (port 5174) ishga tushirilmoqda..."
    (cd "$DIR/frontend" && nohup npm run dev:teacher > /dev/null 2>&1 &)
fi

if ! lsof -i :5175 > /dev/null 2>&1; then
    echo "⚡ O'quvchi paneli (port 5175) ishga tushirilmoqda..."
    (cd "$DIR/frontend" && nohup npm run dev:student > /dev/null 2>&1 &)
fi

if ! lsof -i :5176 > /dev/null 2>&1; then
    echo "⚡ Rahbariyat paneli (port 5176) ishga tushirilmoqda..."
    (cd "$DIR/frontend" && nohup npm run dev:management > /dev/null 2>&1 &)
fi

echo "⏳ Serverlar tayyorlanmoqda (3 soniya)..."
sleep 3

# 3. Brauzerda har bir panelni alohida ochish
echo "🌐 Panellar brauzerda alohida ochilmoqda..."
open "http://localhost:5173/?role=admin"
sleep 0.5
open "http://localhost:5174/?role=teacher"
sleep 0.5
open "http://localhost:5175/?role=student"
sleep 0.5
open "http://localhost:5176/?role=management"

echo "✨ Barcha 4 ta panel brauzerda muvaffaqiyatli ochildi!"
echo "👑 Admin:      http://localhost:5173 (Safarmurod)"
echo "👨‍🏫 O'qituvchi:  http://localhost:5174 (teacher)"
echo "🎓 O'quvchi:    http://localhost:5175 (student)"
echo "📊 Rahbariyat:  http://localhost:5176 (management_director)"
