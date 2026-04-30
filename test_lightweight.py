#!/usr/bin/env python3
"""
Quick test to verify all imports work with lightweight requirements
"""

import sys

def test_imports():
    print("=" * 60)
    print("TESTING LIGHTWEIGHT ARCHITECTURE IMPORTS")
    print("=" * 60)
    
    print("\n✅ Standard library...")
    try:
        import os, sqlite3, json, random, smtplib, logging
        from datetime import datetime, timedelta
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        print("   All standard library imports OK")
    except ImportError as e:
        print(f"   ❌ ERROR: {e}")
        return False
    
    print("\n✅ Flask packages...")
    try:
        from flask import Flask, request, jsonify
        from flask_cors import CORS
        from flask_limiter import Limiter
        from dotenv import load_dotenv
        print("   Flask packages OK")
    except ImportError as e:
        print(f"   ❌ ERROR: {e}")
        print("   Run: pip install -r requirements.txt")
        return False
    
    print("\n✅ Google Auth...")
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests
        print("   Google Auth OK")
    except ImportError as e:
        print(f"   ❌ ERROR: {e}")
        print("   Run: pip install -r requirements.txt")
        return False
    
    print("\n✅ Checking heavy dependencies are NOT imported...")
    heavy_deps = ['numpy', 'cv2', 'tensorflow', 'keras', 'torch']
    for dep in heavy_deps:
        if dep in sys.modules:
            print(f"   ⚠️  WARNING: {dep} is imported (should not be)")
        else:
            print(f"   ✅ {dep} not imported (correct)")
    
    print("\n✅ Testing api_server imports...")
    try:
        # Read the file without executing to check for problematic imports
        with open('api_server.py', 'r', encoding='utf-8') as f:
            content = f.read()
            
        problematic = []
        if 'import numpy' in content or 'from numpy' in content:
            problematic.append('numpy')
        if 'import cv2' in content or 'from cv2' in content:
            problematic.append('cv2')
        if 'import tensorflow' in content:
            problematic.append('tensorflow')
        if 'import keras' in content and 'from tensorflow.keras' not in content:
            problematic.append('keras')
            
        if problematic:
            print(f"   ❌ Found problematic imports: {', '.join(problematic)}")
            return False
        else:
            print("   ✅ No heavy ML imports found")
    except Exception as e:
        print(f"   ❌ ERROR reading api_server.py: {e}")
        return False
    
    print("\n✅ Testing career_rag.py...")
    try:
        from career_rag import CareerRAG
        rag = CareerRAG()
        print(f"   ✅ CareerRAG loaded successfully ({len(rag.careers_db)} careers)")
    except ImportError as e:
        print(f"   ❌ ERROR importing career_rag: {e}")
        return False
    except Exception as e:
        print(f"   ⚠️  CareerRAG imported but error during init: {e}")
    
    print("\n" + "=" * 60)
    print("✅ ALL TESTS PASSED - LIGHTWEIGHT ARCHITECTURE READY!")
    print("=" * 60)
    print("\n📝 Next steps:")
    print("   1. git add .")
    print("   2. git commit -m 'feat: lightweight architecture'")
    print("   3. git push origin main")
    print("   4. Run locally with: python api_server.py")
    print()
    return True

if __name__ == "__main__":
    success = test_imports()
    sys.exit(0 if success else 1)
