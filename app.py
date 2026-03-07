#!/usr/bin/env python3
import sys
import os
import io

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, 'backend')

os.chdir(BACKEND_DIR)
sys.path.insert(0, BACKEND_DIR)

print("Starting CoolCare PWA server...")
import uvicorn
from main import app

uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
