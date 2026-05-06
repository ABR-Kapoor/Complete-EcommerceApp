#!/bin/bash

cd "$(dirname "$0")"

echo "🚀 Starting E-commerce App..."
echo ""
echo "📝 Setup Steps:"
echo "1. Copy .env.example to .env and fill in Supabase credentials"
echo "2. Create Supabase project at https://supabase.com"
echo "3. Enable auth, set up database schema, create storage bucket"
echo ""
echo "🔧 Starting Backend..."
cd backend
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload &
BACKEND_PID=$!

echo "⏳ Waiting 3 seconds for backend to start..."
sleep 3

echo "🔧 Starting Frontend..."
cd ../frontend
npm install 2>/dev/null || true
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Both servers running!"
echo "Frontend: http://localhost:5173"
echo "Backend: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop"
wait
