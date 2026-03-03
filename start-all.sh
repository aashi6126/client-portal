#!/bin/bash

# Start both API and Web services
# Usage: ./start-all.sh

echo "🚀 Starting Client Portal Services..."
echo ""

# Kill any existing instances
echo "🔄 Stopping any existing services..."
pkill -f "customer_api.py" 2>/dev/null
pkill -f "backup_scheduler.py" 2>/dev/null
pkill -f "react-scripts start" 2>/dev/null
# Kill anything on ports 3000 and 5000
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:5000 | xargs kill -9 2>/dev/null
sleep 2
echo "   Done."
echo ""

# Check if webapp directory exists
if [ ! -d "webapp/customer-app" ]; then
    echo "❌ Error: webapp/customer-app directory not found"
    exit 1
fi

# Start API service in background
echo "📡 Starting API service on http://127.0.0.1:5000..."
/opt/anaconda3/bin/python services/api/customer_api.py &
API_PID=$!

# Wait a moment for API to start
sleep 2

# Start backup scheduler in background
echo "💾 Starting backup scheduler (12 AM & 12 PM daily)..."
/opt/anaconda3/bin/python services/backup_scheduler.py &
BACKUP_PID=$!

# Start web app
echo "🌐 Starting web app on http://localhost:3000..."
cd webapp/customer-app
npm start &
WEB_PID=$!

# Store PIDs
echo ""
echo "✅ Services started successfully!"
echo "   API Service: http://127.0.0.1:5000 (PID: $API_PID)"
echo "   Backup Scheduler: PID $BACKUP_PID (12 AM & 12 PM)"
echo "   Web App: http://localhost:3000 (PID: $WEB_PID)"
echo ""
echo "📝 To stop services:"
echo "   kill $API_PID $BACKUP_PID $WEB_PID"
echo "   or press Ctrl+C"
echo ""

# Wait for processes
wait
