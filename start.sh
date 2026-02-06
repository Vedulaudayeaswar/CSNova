#!/bin/bash
# Production startup script

echo "🚀 Starting Career Guidance AI System..."
echo "========================================"

# Check Python version
python --version

# Install dependencies (if needed)
echo "📦 Installing dependencies..."
pip install -q -r requirements.txt

# Set production environment
export FLASK_ENV=production

# Start the server
echo "🌐 Starting server..."
gunicorn api_server:app \
    --workers 4 \
    --threads 2 \
    --timeout 120 \
    --bind 0.0.0.0:${PORT:-5000} \
    --access-logfile - \
    --error-logfile - \
    --log-level info
