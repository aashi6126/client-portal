#!/bin/bash

# Start both API and Web services
# Usage: ./start-all.sh

echo "🚀 Starting Client Portal Services..."
echo ""

# Check if webapp directory exists
if [ ! -d "webapp/customer-app" ]; then
    echo "❌ Error: webapp/customer-app directory not found"
    exit 1
fi

# Start API service in background
echo "📡 Starting API service on http://127.0.0.1:5000..."
python3 services/api/customer_api.py &
API_PID=$!

# Wait a moment for API to start
sleep 2

# Start web app
echo "🌐 Starting web app on http://localhost:3000..."
cd webapp/customer-app
npm start &
WEB_PID=$!

# Store PIDs
echo ""
echo "✅ Services started successfully!"
echo "   API Service: http://127.0.0.1:5000 (PID: $API_PID)"
echo "   Web App: http://localhost:3000 (PID: $WEB_PID)"
echo ""
echo "📝 To stop services:"
echo "   kill $API_PID $WEB_PID"
echo "   or press Ctrl+C"
echo ""

# Wait for processes
wait
