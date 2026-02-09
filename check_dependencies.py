#!/usr/bin/env python3
"""
Check all dependencies and imports for the C$SNOVA project
"""

import sys
import importlib

def check_package(package_name, import_name=None):
    """Check if a package is installed"""
    if import_name is None:
        import_name = package_name
    
    try:
        importlib.import_module(import_name)
        print(f"✅ {package_name:30s} - INSTALLED")
        return True
    except ImportError as e:
        print(f"❌ {package_name:30s} - MISSING ({e})")
        return False

def main():
    print("=" * 70)
    print("DEPENDENCY CHECK FOR C$SNOVA")
    print("=" * 70)
    
    # Standard library (always available)
    print("\n📦 STANDARD LIBRARY:")
    standard_libs = [
        ("os", "os"),
        ("sqlite3", "sqlite3"),
        ("json", "json"),
        ("random", "random"),
        ("datetime", "datetime"),
        ("base64", "base64"),
        ("smtplib", "smtplib"),
        ("logging", "logging"),
        ("email", "email"),
    ]
    
    for name, import_name in standard_libs:
        check_package(name, import_name)
    
    # Required packages from requirements.txt
    print("\n📦 REQUIRED PACKAGES:")
    required_packages = [
        ("Flask", "flask"),
        ("Flask-CORS", "flask_cors"),
        ("gunicorn", "gunicorn"),
        ("Flask-Limiter", "flask_limiter"),
        ("python-dotenv", "dotenv"),
        ("google-auth", "google.auth"),
        ("google-auth-oauthlib", "google_auth_oauthlib"),
        ("numpy", "numpy"),
        ("opencv-python-headless", "cv2"),
        ("tensorflow", "tensorflow"),
        ("keras", "keras"),
    ]
    
    missing = []
    for name, import_name in required_packages:
        if not check_package(name, import_name):
            missing.append(name)
    
    # Check specific imports used in api_server.py
    print("\n🔍 CHECKING SPECIFIC IMPORTS:")
    specific_checks = [
        ("google.oauth2.id_token", "google.oauth2.id_token"),
        ("google.auth.transport.requests", "google.auth.transport.requests"),
        ("tensorflow.keras.models", "tensorflow.keras.models"),
    ]
    
    for name, import_name in specific_checks:
        check_package(name, import_name)
    
    # Check if model files exist
    print("\n📁 CHECKING MODEL FILES:")
    import os
    model_files = [
        "emotion_cnn_fer2013.h5",
        "senti_analy/emotion_cnn_fer2013.h5"
    ]
    
    for model_file in model_files:
        if os.path.exists(model_file):
            size_mb = os.path.getsize(model_file) / (1024 * 1024)
            print(f"✅ {model_file:40s} - FOUND ({size_mb:.2f} MB)")
        else:
            print(f"❌ {model_file:40s} - NOT FOUND")
    
    # Check cascade file
    try:
        import cv2
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        cascade = cv2.CascadeClassifier(cascade_path)
        if not cascade.empty():
            print(f"✅ {'Haar Cascade':40s} - LOADED")
        else:
            print(f"❌ {'Haar Cascade':40s} - FAILED TO LOAD")
    except Exception as e:
        print(f"❌ {'Haar Cascade':40s} - ERROR: {e}")
    
    # Summary
    print("\n" + "=" * 70)
    if missing:
        print(f"❌ MISSING PACKAGES: {', '.join(missing)}")
        print("\nRun: pip install -r requirements.txt")
        return 1
    else:
        print("✅ ALL DEPENDENCIES INSTALLED!")
        print("\nReady to deploy!")
        return 0

if __name__ == "__main__":
    sys.exit(main())
