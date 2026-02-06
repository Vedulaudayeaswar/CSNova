#!/usr/bin/env python3
"""
Google OAuth Setup Verification Script
Run this to check if everything is configured correctly
"""

import os
import sys
import sqlite3

def check_dependencies():
    """Check if required packages are installed"""
    print("🔍 Checking Python dependencies...")
    required = ['flask', 'flask_cors', 'google.auth', 'google.oauth2']
    missing = []
    
    for package in required:
        try:
            __import__(package.replace('.', '_') if '.' in package else package)
            print(f"  ✓ {package}")
        except ImportError:
            print(f"  ✗ {package} - MISSING")
            missing.append(package)
    
    if missing:
        print("\n⚠️  Install missing packages:")
        print("   pip install -r requirements.txt\n")
        return False
    
    print("✓ All dependencies installed\n")
    return True


def check_api_server():
    """Check if api_server.py has Google OAuth configured"""
    print("🔍 Checking api_server.py configuration...")
    
    if not os.path.exists('api_server.py'):
        print("  ✗ api_server.py not found\n")
        return False
    
    with open('api_server.py', 'r', encoding='utf-8') as f:
        content = f.read()
    
    checks = {
        'google.oauth2 import': 'from google.oauth2 import id_token' in content,
        'Google Client ID': 'GOOGLE_CLIENT_ID' in content,
        '/api/auth/google': '@app.route(\'/api/auth/google\'' in content,
        '/api/auth/logout': '@app.route(\'/api/auth/logout\'' in content,
        '/api/auth/check': '@app.route(\'/api/auth/check\'' in content,
    }
    
    all_ok = True
    for check, status in checks.items():
        if status:
            print(f"  ✓ {check}")
        else:
            print(f"  ✗ {check} - NOT FOUND")
            all_ok = False
    
    if 'YOUR_GOOGLE_CLIENT_ID_HERE' in content:
        print("\n  ⚠️  WARNING: Client ID not updated in api_server.py")
        print("     Find: GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID_HERE'")
        print("     Replace with your actual Client ID\n")
        all_ok = False
    
    if all_ok:
        print("✓ api_server.py configured correctly\n")
    else:
        print("✗ api_server.py needs updates\n")
    
    return all_ok


def check_login_html():
    """Check if login.html has Google Sign-In button"""
    print("🔍 Checking html/login.html...")
    
    file_path = os.path.join('html', 'login.html')
    if not os.path.exists(file_path):
        print("  ✗ html/login.html not found\n")
        return False
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    checks = {
        'Google SDK': 'accounts.google.com/gsi/client' in content,
        'Google button': 'g_id_signin' in content,
        'Callback function': 'handleGoogleSignIn' in content,
    }
    
    all_ok = True
    for check, status in checks.items():
        if status:
            print(f"  ✓ {check}")
        else:
            print(f"  ✗ {check} - NOT FOUND")
            all_ok = False
    
    if 'YOUR_GOOGLE_CLIENT_ID_HERE' in content:
        print("\n  ⚠️  WARNING: Client ID not updated in login.html")
        print("     Find: data-client_id=\"YOUR_GOOGLE_CLIENT_ID_HERE...")
        print("     Replace with your actual Client ID\n")
        all_ok = False
    
    if all_ok:
        print("✓ login.html configured correctly\n")
    else:
        print("✗ login.html needs updates\n")
    
    return all_ok


def check_login_js():
    """Check if login.js has Google OAuth handler"""
    print("🔍 Checking js/login.js...")
    
    file_path = os.path.join('js', 'login.js')
    if not os.path.exists(file_path):
        print("  ✗ js/login.js not found\n")
        return False
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    checks = {
        'handleGoogleSignIn': 'handleGoogleSignIn' in content,
        'Google auth API call': '/api/auth/google' in content,
        'checkAuthentication': 'checkAuthentication' in content,
    }
    
    all_ok = True
    for check, status in checks.items():
        if status:
            print(f"  ✓ {check}")
        else:
            print(f"  ✗ {check} - NOT FOUND")
            all_ok = False
    
    if all_ok:
        print("✓ login.js configured correctly\n")
    else:
        print("✗ login.js needs updates\n")
    
    return all_ok


def check_database():
    """Check database schema"""
    print("🔍 Checking database...")
    
    if not os.path.exists('career_guidance.db'):
        print("  ⚠️  Database not found (will be created on first run)\n")
        return True
    
    try:
        conn = sqlite3.connect('career_guidance.db')
        cur = conn.cursor()
        
        # Check if users table exists
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        users_table = cur.fetchone()
        
        if users_table:
            print("  ✓ users table exists")
            
            # Check columns
            cur.execute("PRAGMA table_info(users)")
            columns = [row[1] for row in cur.fetchall()]
            
            required_columns = ['user_id', 'google_id', 'email', 'name', 'picture_url']
            missing_columns = [col for col in required_columns if col not in columns]
            
            if missing_columns:
                print(f"  ✗ Missing columns: {', '.join(missing_columns)}")
                print("  ⚠️  Delete database and restart server to recreate")
                conn.close()
                return False
            else:
                print("  ✓ All required columns present")
                
                # Check for existing users
                cur.execute("SELECT COUNT(*) FROM users")
                user_count = cur.fetchone()[0]
                print(f"  ℹ️  Current users: {user_count}")
        else:
            print("  ✗ users table not found")
            print("  ⚠️  Delete database and restart server to create table")
            conn.close()
            return False
        
        conn.close()
        print("✓ Database schema correct\n")
        return True
        
    except Exception as e:
        print(f"  ✗ Database error: {e}\n")
        return False


def main():
    print("=" * 60)
    print("  Google OAuth Setup Verification")
    print("=" * 60)
    print()
    
    results = {
        'Dependencies': check_dependencies(),
        'API Server': check_api_server(),
        'Login HTML': check_login_html(),
        'Login JS': check_login_js(),
        'Database': check_database(),
    }
    
    print("=" * 60)
    print("  Summary")
    print("=" * 60)
    
    for component, status in results.items():
        symbol = "✓" if status else "✗"
        print(f"  {symbol} {component}")
    
    print()
    
    if all(results.values()):
        print("🎉 All checks passed! You're ready to use Google OAuth.")
        print()
        print("Next steps:")
        print("  1. Make sure you have a Google Client ID")
        print("  2. Update YOUR_GOOGLE_CLIENT_ID_HERE in files")
        print("  3. Run: python api_server.py")
        print("  4. Visit: http://localhost:5000/html/login.html")
        print()
        return 0
    else:
        print("⚠️  Some checks failed. Please fix the issues above.")
        print()
        print("For help, see:")
        print("  • GOOGLE_AUTH_QUICKSTART.md")
        print("  • GOOGLE_AUTH_SETUP.md")
        print()
        return 1


if __name__ == '__main__':
    sys.exit(main())
