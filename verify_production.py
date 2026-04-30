#!/usr/bin/env python3
"""
Local Readiness Verification Script
Checks whether the application runs cleanly in the .venv and is ready for GitHub.
"""

import os
import sys

def check_file_exists(filename, required=True):
    """Check if a file exists"""
    exists = os.path.exists(filename)
    status = "✅" if exists else ("❌" if required else "⚠️")
    print(f"{status} {filename}")
    return exists

def check_env_example():
    """Check .env.example has required variables"""
    required_vars = ['SECRET_KEY', 'FLASK_ENV', 'GOOGLE_CLIENT_ID', 'EMAIL_ADDRESS']
    if not os.path.exists('.env.example'):
        print("❌ .env.example not found")
        return False
    
    with open('.env.example') as f:
        content = f.read()
    
    missing = [var for var in required_vars if var not in content]
    if missing:
        print(f"⚠️  .env.example missing: {', '.join(missing)}")
        return False
    
    print("✅ .env.example complete")
    return True

def check_gitignore():
    """Check .gitignore has important entries"""
    required = ['.env', '__pycache__', '*.db', 'venv/']
    if not os.path.exists('.gitignore'):
        print("❌ .gitignore not found")
        return False
    
    with open('.gitignore') as f:
        content = f.read()
    
    missing = [entry for entry in required if entry not in content]
    if missing:
        print(f"⚠️  .gitignore missing: {', '.join(missing)}")
        return False
    
    print("✅ .gitignore complete")
    return True

def main():
    print("🔍 Production Readiness Check")
    print("=" * 50)
    
    all_checks = []
    
    # Essential files
    print("\n📄 Essential Files:")
    all_checks.append(check_file_exists("api_server.py"))
    all_checks.append(check_file_exists("career_rag.py"))
    all_checks.append(check_file_exists("requirements.txt"))
    all_checks.append(check_file_exists("runtime.txt"))
    all_checks.append(check_file_exists("README.md"))
    
    # Configuration files
    print("\n⚙️  Configuration Files:")
    all_checks.append(check_env_example())
    all_checks.append(check_gitignore())
    check_file_exists(".env", required=False)
    
    # Optional local helper scripts
    print("\n🛠️  Local Helper Files:")
    check_file_exists("start.sh", required=False)
    
    # Frontend files
    print("\n🎨 Frontend Files:")
    all_checks.append(check_file_exists("html/index.html"))
    all_checks.append(check_file_exists("html/login.html"))
    check_file_exists("html/face.html")
    check_file_exists("css/index.css")
    check_file_exists("js/index.js")
    
    # Data files
    print("\n📊 Data Files:")
    check_file_exists("tiny_transformer_lm/tiny_transformer_lm/data/generated/emotional_dataset.json")
    check_file_exists("tiny_transformer_lm/tiny_transformer_lm/data/generated/reasoning_dataset.json")
    check_file_exists("tiny_transformer_lm/tiny_transformer_lm/data/generated/academic_dataset.json")
    
    # ML Models (optional but recommended)
    print("\n🤖 ML Models:")
    check_file_exists("senti_analy/emotion_cnn_fer2013.h5", required=False)
    
    # Documentation check
    print("\n📚 Documentation:")
    readme_exists = os.path.exists("README.md")
    md_files = []
    for root, dirs, files in os.walk("."):
        # Skip venv and hidden directories
        dirs[:] = [d for d in dirs if not d.startswith('.') and d != 'venv']
        for file in files:
            if file.endswith('.md') and file != 'README.md':
                md_files.append(os.path.join(root, file))
    
    if md_files:
        print(f"⚠️  Extra documentation files found (should remove):")
        for f in md_files[:5]:
            print(f"   - {f}")
    else:
        print("✅ Only README.md exists (good!)")
    
    # Final verdict
    print("\n" + "=" * 50)
    if all(all_checks):
        print("✅ READY FOR GITHUB + LOCAL RUNS!")
        print("\n📝 Next steps:")
        print("1. Create .env file from .env.example")
        print("2. Add your credentials to .env")
        print("3. Test locally: python api_server.py")
        print("4. Push to GitHub")
        return 0
    else:
        print("❌ NOT READY - Fix issues above")
        return 1

if __name__ == "__main__":
    sys.exit(main())
