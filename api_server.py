import os
# Disable TensorFlow to avoid tf-keras dependency
os.environ['TRANSFORMERS_NO_TF'] = '1'
os.environ['USE_TORCH'] = '1'

from flask import Flask, request, jsonify, send_from_directory, session
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from dotenv import load_dotenv
import sqlite3
import json
import random
from datetime import datetime, timedelta
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
# Lazy import RAG to avoid blocking server startup
# from career_rag import get_rag_instance
import numpy as np
import cv2
import base64
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO if os.environ.get('FLASK_ENV') == 'production' else logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

try:
    from tensorflow.keras.models import load_model
except ImportError:
    from keras.models import load_model

app = Flask(__name__, static_folder='.', static_url_path='')
app.secret_key = os.environ.get('SECRET_KEY', os.urandom(24).hex())
CORS(app, supports_credentials=True, origins=os.environ.get('ALLOWED_ORIGINS', '*').split(','))

# Rate limiting - prevents abuse
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

# Rate limiting - prevents abuse
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

# Google OAuth Configuration
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')
if not GOOGLE_CLIENT_ID and os.environ.get('FLASK_ENV') == 'production':
    logger.warning("GOOGLE_CLIENT_ID not set - Google OAuth will not work!")

# OTP storage (in production, consider Redis for multi-instance support)
otp_storage = {}  # Format: {email: {'otp': '12345', 'expires': datetime, 'verified': False}}

# Email configuration (Gmail SMTP)
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_ADDRESS = os.environ.get('EMAIL_ADDRESS', '')
EMAIL_PASSWORD = os.environ.get('EMAIL_PASSWORD', '')
if not EMAIL_ADDRESS and os.environ.get('FLASK_ENV') == 'production':
    logger.warning("Email credentials not set - password reset will not work!")

# Database configuration - SQLite (no installation needed!)
DB_FILE = os.environ.get('DATABASE_URL', 'career_guidance.db')

# Load emotion detection model
logger.info("Loading emotion detection model...")
try:
    # Check multiple possible locations for the model file
    model_paths = [
        'emotion_cnn_fer2013.h5',  # Root directory
        'senti_analy/emotion_cnn_fer2013.h5',  # Senti_analy folder
    ]
    
    model_path = None
    for path in model_paths:
        if os.path.exists(path):
            model_path = path
            logger.info(f"Found emotion model at: {path}")
            break
    
    if model_path:
        emotion_model = load_model(model_path, compile=False)
        emotion_labels = ['Angry', 'Disgust', 'Fear', 'Happy', 'Sad', 'Surprise', 'Neutral']
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
        
        # Verify cascade loaded
        if face_cascade.empty():
            logger.error("Face cascade failed to load")
            raise Exception("Haar cascade not found")
            
        logger.info("✅ Emotion detection model loaded successfully!")
    else:
        logger.warning("❌ Emotion model file not found in any location - emotion detection disabled")
        logger.warning(f"Searched paths: {model_paths}")
        logger.warning(f"Current directory: {os.getcwd()}")
        logger.warning(f"Files in current dir: {os.listdir('.')}")
        emotion_model = None
        emotion_labels = []
        face_cascade = None
except Exception as e:
    logger.error(f"❌ Could not load emotion model: {e}")
    import traceback
    logger.error(traceback.format_exc())
    emotion_model = None
    emotion_labels = []
    face_cascade = None

# Initialize RAG system lazily (after server starts)
logger.info("RAG system will be loaded on first use")
rag_system = None

def get_rag_system():
    """Lazy load RAG system on first use"""
    global rag_system
    if rag_system is None:
        try:
            from career_rag import get_rag_instance
            logger.info("Loading RAG system...")
            rag_system = get_rag_instance()
            logger.info("RAG system loaded successfully!")
        except Exception as e:
            logger.error(f"RAG system loading failed: {e}")
            logger.info("Using fallback recommendation system")
    return rag_system

def get_db_connection():
    """Thread-safe database connection"""
    conn = sqlite3.connect(DB_FILE, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_database():
    """Initialize SQLite database with schema"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Create tables
    cur.executescript('''
        DROP TABLE IF EXISTS career_recommendations;
        DROP TABLE IF EXISTS game_answers;
        DROP TABLE IF EXISTS user_sessions;
        DROP TABLE IF EXISTS users;
        
        CREATE TABLE users (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            google_id TEXT UNIQUE,
            email TEXT UNIQUE NOT NULL,
            username TEXT,
            password TEXT,
            name TEXT,
            picture_url TEXT,
            auth_type TEXT DEFAULT 'email',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE user_sessions (
            session_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            user_name TEXT,
            face_emotion TEXT,
            face_confidence REAL,
            face_analysis_data TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        );
        
        CREATE TABLE game_answers (
            answer_id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER,
            game_type TEXT NOT NULL,
            question_id INTEGER NOT NULL,
            question_text TEXT NOT NULL,
            selected_option INTEGER NOT NULL,
            option_text TEXT NOT NULL,
            option_effects TEXT,
            answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES user_sessions(session_id) ON DELETE CASCADE
        );
        
        CREATE TABLE career_recommendations (
            recommendation_id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER,
            recommended_career TEXT NOT NULL,
            career_description TEXT,
            confidence_score REAL,
            emotional_score TEXT,
            reasoning_score TEXT,
            academic_score TEXT,
            career_path TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES user_sessions(session_id) ON DELETE CASCADE
        );
        
        CREATE INDEX IF NOT EXISTS idx_game_answers_session ON game_answers(session_id);
        CREATE INDEX IF NOT EXISTS idx_game_answers_game_type ON game_answers(game_type);
        CREATE INDEX IF NOT EXISTS idx_sessions_created ON user_sessions(created_at);
    ''')
    
    conn.commit()
    conn.close()
    logger.info("Database initialized successfully!")

# Initialize database on startup
if not os.path.exists(DB_FILE):
    logger.info("Creating new database...")
    init_database()
else:
    logger.info(f"Using existing database: {DB_FILE}")

# Load datasets
with open('tiny_transformer_lm/tiny_transformer_lm/data/generated/emotional_dataset.json', 'r') as f:
    emotional_questions = json.load(f)

with open('tiny_transformer_lm/tiny_transformer_lm/data/generated/reasoning_dataset.json', 'r') as f:
    reasoning_questions = json.load(f)

with open('tiny_transformer_lm/tiny_transformer_lm/data/generated/academic_dataset.json', 'r') as f:
    academic_questions = json.load(f)

# Career database with detailed paths for 10th/12th students
CAREER_DATABASE = {
    # ========== SCIENCE STREAM CAREERS ==========
    "Science Stream (PCM - Physics, Chemistry, Math)": {
        "emotional_profile": {"curiosity": "high", "stress": "high"},
        "reasoning_profile": {"logic": "high", "analysis": "high"},
        "academic_profile": {"physics": "high", "chemistry": "high", "mathematics": "high"},
        "path": "✅ CHOOSE THIS STREAM IF:\n- You love solving math problems\n- Physics and Chemistry interest you\n- Want to become Engineer/Scientist\n\n📚 WHAT TO DO:\n1. Focus on Math, Physics, Chemistry\n2. Practice JEE/NEET preparation\n3. Join coaching classes if needed\n4. After 12th: Engineering/Medical/BSc\n\n🎯 CAREERS: Engineer, Doctor, Scientist, Pilot, Architect"
    },
    "Science Stream (PCB - Physics, Chemistry, Biology)": {
        "emotional_profile": {"empathy": "high", "confidence": "high", "stress": "high"},
        "reasoning_profile": {"analysis": "high", "decision": "high"},
        "academic_profile": {"biology": "high", "chemistry": "high", "physics": "medium"},
        "path": "✅ CHOOSE THIS STREAM IF:\n- Biology fascinates you\n- You want to help people (medical field)\n- Interest in life sciences\n\n📚 WHAT TO DO:\n1. Focus on Biology, Chemistry, Physics\n2. Prepare for NEET (medical entrance)\n3. Study human body, diseases, plants\n4. After 12th: MBBS/BDS/Pharmacy/Nursing/BSc\n\n🎯 CAREERS: Doctor, Dentist, Pharmacist, Nurse, Biotechnologist"
    },
    "Commerce Stream": {
        "emotional_profile": {"confidence": "high", "risk": "medium"},
        "reasoning_profile": {"analysis": "high", "decision": "high", "efficiency": "high"},
        "academic_profile": {"mathematics": "medium", "exam_focus": "high"},
        "path": "✅ CHOOSE THIS STREAM IF:\n- You like business and money matters\n- Math calculations don't scare you\n- Want career in business/finance\n\n📚 WHAT TO DO:\n1. Study Accounts, Economics, Business Studies\n2. Learn basic Excel and computer skills\n3. Understand stock market basics\n4. After 12th: BCom/BBA/CA/CS\n\n🎯 CAREERS: Chartered Accountant, Businessman, Banker, Finance Manager"
    },
    "Arts/Humanities Stream": {
        "emotional_profile": {"empathy": "high", "curiosity": "high"},
        "reasoning_profile": {"analysis": "medium", "decision": "medium"},
        "academic_profile": {"exam_focus": "medium"},
        "path": "✅ CHOOSE THIS STREAM IF:\n- You love reading, writing, history\n- Creative and artistic mind\n- Social issues interest you\n\n📚 WHAT TO DO:\n1. Study History, Political Science, Psychology\n2. Develop communication skills\n3. Read newspapers and current affairs\n4. After 12th: BA/Law/Journalism/Design\n\n🎯 CAREERS: Lawyer, Journalist, Teacher, Psychologist, Civil Services"
    },
    
    # ========== SPECIFIC CAREER OPTIONS ==========
    "Software Engineer": {
        "emotional_profile": {"stress": "high", "confidence": "high", "curiosity": "high"},
        "reasoning_profile": {"logic": "high", "analysis": "high", "abstraction": "high"},
        "academic_profile": {"computer_science": "high", "mathematics": "high"},
        "path": "👨‍💻 FOR 10th/12th STUDENTS:\n\n🎓 AFTER 10th:\n- Choose Science (PCM) or Commerce with Computer Science\n\n🎓 AFTER 12th:\n1. Take JEE exam for IIT/NIT\n2. Or join private engineering college\n3. Study: BTech Computer Science (4 years)\n\n💻 SKILLS TO LEARN NOW:\n- Start coding: Python, Java\n- Make small projects\n- Learn from YouTube/Udemy\n\n💰 SALARY: ₹3-15 Lakhs per year (fresher)\n🏢 COMPANIES: Google, Microsoft, TCS, Infosys"
    },
    "Data Scientist": {
        "emotional_profile": {"confidence": "high", "curiosity": "high"},
        "reasoning_profile": {"analysis": "high", "prediction": "high", "logic": "high"},
        "academic_profile": {"mathematics": "high", "computer_science": "high"},
        "path": "📊 FOR 10th/12th STUDENTS:\n\n🎓 AFTER 10th:\n- Choose Science (PCM) - Math is MUST\n\n🎓 AFTER 12th:\n1. BTech Computer Science OR BSc Statistics\n2. Learn Python programming\n3. Study data analysis and statistics\n\n💻 SKILLS TO LEARN NOW:\n- Excel (basic data analysis)\n- Python basics\n- Statistics and probability\n\n💰 SALARY: ₹4-20 Lakhs per year\n🏢 COMPANIES: Amazon, Flipkart, Analytics firms"
    },
    "Medical Doctor (MBBS)": {
        "emotional_profile": {"empathy": "high", "stress": "high", "confidence": "high"},
        "reasoning_profile": {"analysis": "high", "decision": "high"},
        "academic_profile": {"biology": "high", "chemistry": "high"},
        "path": "👨‍⚕️ FOR 10th/12th STUDENTS:\n\n🎓 AFTER 10th:\n- MUST choose Science with PCB (Physics, Chemistry, Biology)\n\n🎓 AFTER 12th:\n1. Crack NEET exam (medical entrance)\n2. Get into MBBS (5.5 years)\n3. Then internship (1 year)\n4. Become Doctor!\n\n📚 PREPARATION:\n- Focus heavily on Biology\n- Join NEET coaching in 11th\n- Practice previous year papers\n\n💰 SALARY: ₹6-50 Lakhs per year\n🏢 WHERE: Hospitals, Private practice, Research"
    },
    "Chartered Accountant (CA)": {
        "emotional_profile": {"confidence": "high", "stress": "high"},
        "reasoning_profile": {"analysis": "high", "decision": "high", "efficiency": "high"},
        "academic_profile": {"mathematics": "medium", "exam_focus": "high"},
        "path": "💼 FOR 10th/12th STUDENTS:\n\n🎓 AFTER 10th:\n- Commerce stream is best\n- But Science students can also do CA!\n\n🎓 AFTER 12th:\n1. Register for CA Foundation\n2. Clear CA Intermediate\n3. Articleship (3 years training)\n4. Clear CA Final\n5. Become Chartered Accountant!\n\n📚 WHAT TO STUDY:\n- Accounts, Taxation, Auditing\n- Business laws\n- Financial management\n\n💰 SALARY: ₹6-25 Lakhs per year\n🏢 WHERE: CA firms, Companies, Own practice"
    },
    "Civil Services (IAS/IPS)": {
        "emotional_profile": {"confidence": "high", "empathy": "high", "stress": "high"},
        "reasoning_profile": {"analysis": "high", "decision": "high", "logic": "high"},
        "academic_profile": {"exam_focus": "high"},
        "path": "🎖️ FOR 10th/12th STUDENTS:\n\n🎓 AFTER 10th:\n- ANY stream works! (Science/Commerce/Arts)\n- Arts/Humanities gives slight advantage\n\n🎓 AFTER 12th:\n1. Complete ANY graduation (BA/BSc/BCom)\n2. Start UPSC preparation from 2nd/3rd year\n3. Clear UPSC exam (3 stages)\n4. Become IAS/IPS officer!\n\n📚 WHAT TO STUDY NOW:\n- Read newspapers daily\n- Current affairs\n- History, Geography, Polity\n- General knowledge\n\n💰 SALARY: ₹56,000 - ₹2.5 Lakhs per month\n🏢 WHERE: Government administration"
    },
    "Mechanical Engineer": {
        "emotional_profile": {"curiosity": "high", "risk": "medium"},
        "reasoning_profile": {"analysis": "high", "efficiency": "high", "constraint": "high"},
        "academic_profile": {"physics": "high", "mathematics": "high"},
        "path": "⚙️ FOR 10th/12th STUDENTS:\n\n🎓 AFTER 10th:\n- MUST choose Science with PCM\n\n🎓 AFTER 12th:\n1. Give JEE exam\n2. BTech Mechanical Engineering (4 years)\n3. Learn CAD, design software\n4. Do internships\n\n💻 SKILLS TO LEARN:\n- Physics concepts (mechanics, thermodynamics)\n- Basic design thinking\n- AutoCAD software\n\n💰 SALARY: ₹3-12 Lakhs per year\n🏢 COMPANIES: TATA, L&T, Automobile companies"
    },
    "Teacher/Professor": {
        "emotional_profile": {"empathy": "high", "confidence": "high", "stress": "medium"},
        "reasoning_profile": {"decision": "medium", "analysis": "medium"},
        "academic_profile": {"exam_focus": "high"},
        "path": "👨‍🏫 FOR 10th/12th STUDENTS:\n\n🎓 AFTER 10th:\n- Choose stream based on subject you want to teach\n- Science teacher → Science stream\n- Commerce teacher → Commerce\n\n🎓 AFTER 12th:\n1. Graduate in your subject (BA/BSc/BCom)\n2. Do BEd (Bachelor of Education - 2 years)\n3. Or for college professor: Do MA/MSc + NET exam\n\n📚 SKILLS NEEDED:\n- Good communication\n- Patience\n- Subject knowledge\n- Love for teaching\n\n💰 SALARY: ₹3-10 Lakhs per year\n🏢 WHERE: Schools, Colleges, Coaching centers"
    },
    "Lawyer": {
        "emotional_profile": {"confidence": "high", "empathy": "medium", "risk": "medium"},
        "reasoning_profile": {"logic": "high", "decision": "high", "analysis": "high"},
        "academic_profile": {"exam_focus": "high"},
        "path": "⚖️ FOR 10th/12th STUDENTS:\n\n🎓 AFTER 10th:\n- Arts/Humanities is traditional choice\n- BUT any stream can become lawyer!\n\n🎓 AFTER 12th:\n1. Give CLAT exam (law entrance)\n2. Study LLB (3 years) or integrated BA LLB (5 years)\n3. Clear Bar Council exam\n4. Start practicing!\n\n📚 SKILLS TO LEARN:\n- Reading and comprehension\n- Debate and public speaking\n- Current affairs and laws\n- English communication\n\n💰 SALARY: ₹3-50 Lakhs per year (varies widely)\n🏢 WHERE: Courts, Law firms, Corporate legal"
    },
    "Digital Marketing/Content Creator": {
        "emotional_profile": {"curiosity": "high", "confidence": "high", "risk": "medium"},
        "reasoning_profile": {"analysis": "medium", "decision": "medium"},
        "academic_profile": {"computer_science": "medium"},
        "path": "📱 FOR 10th/12th STUDENTS:\n\n🎓 AFTER 10th:\n- ANY stream works!\n- Commerce/Arts preferred but not necessary\n\n🎓 AFTER 12th:\n1. ANY graduation (BBA/Mass Comm/BCom)\n2. Learn digital marketing online\n3. Start your own blog/YouTube/Instagram\n4. Get certified (Google, Facebook courses)\n\n💻 SKILLS TO START NOW:\n- Create social media content\n- Learn basic video editing\n- Writing skills\n- Understand Instagram/YouTube\n\n💰 SALARY: ₹2-15 Lakhs per year\n🏢 WHERE: Agencies, Freelance, Own business"
    },
    "Graphic Designer/Animator": {
        "emotional_profile": {"curiosity": "high", "confidence": "medium"},
        "reasoning_profile": {"analysis": "medium", "abstraction": "high"},
        "academic_profile": {"exam_focus": "low"},
        "path": "🎨 FOR 10th/12th STUDENTS:\n\n🎓 AFTER 10th:\n- Commerce or Arts recommended\n- Science students can also pursue!\n\n🎓 AFTER 12th:\n1. Diploma/Degree in Graphic Design (3 years)\n2. Or BSc Animation\n3. Or learn online (Udemy, YouTube)\n4. Build portfolio of your work\n\n💻 SKILLS TO START NOW:\n- Learn Photoshop, Illustrator\n- Practice designing posters\n- Watch design tutorials\n- Create social media graphics\n\n💰 SALARY: ₹2-10 Lakhs per year\n🏢 WHERE: Agencies, Freelance, Movie studios"
    },
    "Business/Entrepreneur": {
        "emotional_profile": {"confidence": "high", "risk": "high", "curiosity": "high"},
        "reasoning_profile": {"decision": "high", "analysis": "high", "efficiency": "high"},
        "academic_profile": {"mathematics": "medium"},
        "path": "💼 FOR 10th/12th STUDENTS:\n\n🎓 AFTER 10th:\n- Commerce is best choice\n- But ANY stream can do business!\n\n🎓 AFTER 12th:\n1. BBA or BCom (business knowledge)\n2. Or start business directly!\n3. Learn from successful entrepreneurs\n4. Start small, grow big\n\n💡 SKILLS TO START NOW:\n- Identify problems around you\n- Think of business solutions\n- Save money to invest\n- Learn basics of marketing\n- Understand profit/loss\n\n💰 INCOME: Unlimited potential!\n🏢 WHERE: Own business, Startups"
    }
}

# ========== GOOGLE OAUTH ROUTES ==========

@app.route('/api/auth/google', methods=['POST'])
def google_auth():
    """Verify Google OAuth token and create/update user in database"""
    try:
        token = request.json.get('token')
        
        if not token:
            return jsonify({'error': 'No token provided'}), 400
        
        # Verify the Google token
        try:
            idinfo = id_token.verify_oauth2_token(
                token, 
                google_requests.Request(), 
                GOOGLE_CLIENT_ID,
                clock_skew_in_seconds=60  # Allow 60 seconds clock skew tolerance
            )
        except ValueError as ve:
            print(f"Token verification failed: {ve}")
            return jsonify({'error': 'Invalid token', 'details': str(ve)}), 401
        
        # Extract user information from the token
        google_id = idinfo.get('sub')
        email = idinfo.get('email')
        name = idinfo.get('name', '')
        picture = idinfo.get('picture', '')
        
        if not google_id or not email:
            return jsonify({'error': 'Invalid token data'}), 401
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Check if user already exists
        cur.execute("SELECT user_id, name, email, picture_url FROM users WHERE google_id = ?", (google_id,))
        user = cur.fetchone()
        
        if user:
            # Update last_login
            cur.execute("""
                UPDATE users 
                SET last_login = CURRENT_TIMESTAMP,
                    name = ?,
                    picture_url = ?
                WHERE google_id = ?
            """, (name, picture, google_id))
            user_id = user['user_id']
        else:
            # Create new user with auth_type
            cur.execute("""
                INSERT INTO users (google_id, email, name, picture_url, auth_type)
                VALUES (?, ?, ?, ?, 'google')
            """, (google_id, email, name, picture))
            user_id = cur.lastrowid
        
        conn.commit()
        
        # Get updated user data
        cur.execute("SELECT user_id, google_id, email, name, picture_url FROM users WHERE user_id = ?", (user_id,))
        user_data = dict(cur.fetchone())
        
        cur.close()
        conn.close()
        
        # Store user info in session
        session['user_id'] = user_id
        session['user_email'] = email
        
        return jsonify({
            'success': True,
            'user': user_data,
            'message': 'Authentication successful'
        })
        
    except ValueError as e:
        # Invalid token - this is the most common error
        print(f"ERROR: Google token verification failed: {str(e)}")
        print(f"   Client ID used: {GOOGLE_CLIENT_ID}")
        return jsonify({
            'success': False,
            'error': 'Invalid token',
            'details': 'Token verification failed. Please try signing in again.',
            'debug': str(e)
        }), 401
    except Exception as e:
        print(f"ERROR: Google authentication error: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Authentication failed',
            'details': str(e)
        }), 500


@app.route('/api/auth/config', methods=['GET'])
def get_auth_config():
    """Provide OAuth configuration for frontend"""
    return jsonify({
        'client_id': GOOGLE_CLIENT_ID,
        'has_google_auth': bool(GOOGLE_CLIENT_ID)
    })


@app.route('/api/auth/logout', methods=['POST'])
def logout():
    """Logout user by clearing session"""
    session.clear()
    return jsonify({'success': True, 'message': 'Logged out successfully'})


@app.route('/api/auth/check', methods=['GET'])
def check_auth():
    """Check if user is authenticated"""
    if 'user_id' in session:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT user_id, email, name, picture_url FROM users WHERE user_id = ?", (session['user_id'],))
        user = cur.fetchone()
        cur.close()
        conn.close()
        
        if user:
            return jsonify({'authenticated': True, 'user': dict(user)})
    
    return jsonify({'authenticated': False})


# ========== EMAIL/PASSWORD AUTHENTICATION ROUTES ==========

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new user with email and password"""
    try:
        data = request.json
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        
        if not all([username, email, password]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Check if email already exists
        cur.execute("SELECT user_id FROM users WHERE email = ?", (email,))
        if cur.fetchone():
            cur.close()
            conn.close()
            return jsonify({'error': 'Email already registered'}), 400
        
        # Insert new user (password stored as-is for simplicity - in production use hashing!)
        cur.execute("""
            INSERT INTO users (username, email, password, name, auth_type)
            VALUES (?, ?, ?, ?, 'email')
        """, (username, email, password, username))
        
        user_id = cur.lastrowid
        conn.commit()
        
        # Get user data
        cur.execute("SELECT user_id, email, username, name FROM users WHERE user_id = ?", (user_id,))
        user_data = dict(cur.fetchone())
        
        cur.close()
        conn.close()
        
        # Store in session
        session['user_id'] = user_id
        session['user_email'] = email
        
        return jsonify({
            'success': True,
            'user': user_data,
            'message': 'Account created successfully'
        })
        
    except Exception as e:
        return jsonify({'error': 'Registration failed', 'details': str(e)}), 500


@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login user with email and password"""
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')
        
        if not all([email, password]):
            return jsonify({'error': 'Missing email or password'}), 400
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Find user by email
        cur.execute("""
            SELECT user_id, email, username, name, password, auth_type 
            FROM users 
            WHERE email = ? AND auth_type = 'email'
        """, (email,))
        
        user = cur.fetchone()
        
        if not user:
            cur.close()
            conn.close()
            return jsonify({'error': 'Account not found'}), 404
        
        # Check password (in production, use password hashing!)
        if user['password'] != password:
            cur.close()
            conn.close()
            return jsonify({'error': 'Incorrect password'}), 401
        
        # Update last login
        cur.execute("""
            UPDATE users 
            SET last_login = CURRENT_TIMESTAMP
            WHERE user_id = ?
        """, (user['user_id'],))
        conn.commit()
        
        # Get updated user data
        user_data = {
            'user_id': user['user_id'],
            'email': user['email'],
            'username': user['username'],
            'name': user['name']
        }
        
        cur.close()
        conn.close()
        
        # Store in session
        session['user_id'] = user['user_id']
        session['user_email'] = user['email']
        
        return jsonify({
            'success': True,
            'user': user_data,
            'message': 'Login successful'
        })
        
    except Exception as e:
        return jsonify({'error': 'Login failed', 'details': str(e)}), 500


# ========== FORGOT PASSWORD ROUTES ==========

def send_otp_email(to_email, otp):
    """Send OTP to user's email"""
    try:
        # Create email message
        msg = MIMEMultipart()
        msg['From'] = EMAIL_ADDRESS
        msg['To'] = to_email
        msg['Subject'] = 'C$SNOVA - Password Reset OTP'
        
        # Email body
        body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
                <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h2 style="color: #4facfe;">C$SNOVA Password Reset</h2>
                    <p style="font-size: 16px; color: #333;">Hello,</p>
                    <p style="font-size: 16px; color: #333;">You requested to reset your password. Use the OTP below to proceed:</p>
                    <div style="background-color: #f0f8ff; padding: 20px; margin: 20px 0; text-align: center; border-radius: 5px;">
                        <h1 style="color: #4facfe; font-size: 36px; margin: 0; letter-spacing: 5px;">{otp}</h1>
                    </div>
                    <p style="font-size: 14px; color: #666;">This OTP will expire in 10 minutes.</p>
                    <p style="font-size: 14px; color: #666;">If you didn't request this, please ignore this email.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #999; text-align: center;">© 2026 C$SNOVA Career Guidance System</p>
                </div>
            </body>
        </html>
        """
        
        msg.attach(MIMEText(body, 'html'))
        
        # Send email
        server = smtplib.SMTP(EMAIL_HOST, EMAIL_PORT)
        server.starttls()
        server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
        server.send_message(msg)
        server.quit()
        
        return True
    except Exception as e:
        print(f"Email sending error: {e}")
        return False


@app.route('/api/auth/forgot-password', methods=['POST'])
def forgot_password():
    """Send OTP to user's email for password reset"""
    try:
        data = request.json
        email = data.get('email')
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Check if email exists
        cur.execute("SELECT user_id, username FROM users WHERE email = ? AND auth_type = 'email'", (email,))
        user = cur.fetchone()
        
        cur.close()
        conn.close()
        
        if not user:
            return jsonify({'error': 'No account found with this email'}), 404
        
        # Generate 5-digit OTP
        otp = ''.join([str(random.randint(0, 9)) for _ in range(5)])
        
        # Store OTP with expiration (10 minutes)
        otp_storage[email] = {
            'otp': otp,
            'expires': datetime.now() + timedelta(minutes=10),
            'verified': False
        }
        
        # Send OTP via email
        email_sent = send_otp_email(email, otp)
        
        if email_sent:
            return jsonify({
                'success': True,
                'message': 'OTP sent to your email'
            })
        else:
            # For development/testing: return OTP in response if email fails
            return jsonify({
                'success': True,
                'message': 'OTP sent (dev mode)',
                'otp': otp  # Remove this in production!
            })
        
    except Exception as e:
        return jsonify({'error': 'Failed to send OTP', 'details': str(e)}), 500


@app.route('/api/auth/verify-otp', methods=['POST'])
def verify_otp():
    """Verify the OTP entered by user"""
    try:
        data = request.json
        email = data.get('email')
        otp = data.get('otp')
        
        if not all([email, otp]):
            return jsonify({'error': 'Email and OTP are required'}), 400
        
        # Check if OTP exists for this email
        if email not in otp_storage:
            return jsonify({'error': 'No OTP found for this email'}), 404
        
        stored_data = otp_storage[email]
        
        # Check if OTP expired
        if datetime.now() > stored_data['expires']:
            del otp_storage[email]
            return jsonify({'error': 'OTP has expired'}), 400
        
        # Verify OTP
        if stored_data['otp'] != otp:
            return jsonify({'error': 'Invalid OTP'}), 401
        
        # Mark as verified
        otp_storage[email]['verified'] = True
        
        return jsonify({
            'success': True,
            'message': 'OTP verified successfully'
        })
        
    except Exception as e:
        return jsonify({'error': 'OTP verification failed', 'details': str(e)}), 500


@app.route('/api/auth/reset-password', methods=['POST'])
def reset_password():
    """Reset user password after OTP verification"""
    try:
        data = request.json
        email = data.get('email')
        new_password = data.get('new_password')
        
        if not all([email, new_password]):
            return jsonify({'error': 'Email and new password are required'}), 400
        
        # Check if OTP was verified
        if email not in otp_storage or not otp_storage[email].get('verified'):
            return jsonify({'error': 'OTP not verified'}), 403
        
        # Check if OTP expired
        if datetime.now() > otp_storage[email]['expires']:
            del otp_storage[email]
            return jsonify({'error': 'OTP has expired'}), 400
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Update password
        cur.execute("""
            UPDATE users 
            SET password = ?
            WHERE email = ? AND auth_type = 'email'
        """, (new_password, email))
        
        if cur.rowcount == 0:
            cur.close()
            conn.close()
            return jsonify({'error': 'User not found'}), 404
        
        conn.commit()
        cur.close()
        conn.close()
        
        # Clear OTP from storage
        del otp_storage[email]
        
        return jsonify({
            'success': True,
            'message': 'Password reset successfully'
        })
        
    except Exception as e:
        return jsonify({'error': 'Password reset failed', 'details': str(e)}), 500


# ========== SESSION ROUTES ==========

@app.route('/api/session/create', methods=['POST'])
def create_session():
    """Create a new user session with face analysis data"""
    data = request.json
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("""
        INSERT INTO user_sessions (user_name, face_emotion, face_confidence, face_analysis_data)
        VALUES (?, ?, ?, ?)
    """, (data.get('userName'), data.get('faceEmotion'), 
          data.get('faceConfidence'), json.dumps(data.get('faceAnalysisData', {}))))
    
    session_id = cur.lastrowid
    conn.commit()
    cur.close()
    conn.close()
    
    return jsonify({'sessionId': session_id})

@app.route('/api/questions/<game_type>', methods=['GET'])
def get_questions(game_type):
    """Get random questions for a specific game type"""
    count = int(request.args.get('count', 10))
    
    if game_type == 'emotional':
        questions = random.sample(emotional_questions, min(count, len(emotional_questions)))
    elif game_type == 'reasoning':
        questions = random.sample(reasoning_questions, min(count, len(reasoning_questions)))
    elif game_type == 'academic':
        questions = random.sample(academic_questions, min(count, len(academic_questions)))
    else:
        return jsonify({'error': 'Invalid game type'}), 400
    
    return jsonify({'questions': questions})

@app.route('/api/answer/submit', methods=['POST'])
def submit_answer():
    """Submit an answer to a question"""
    data = request.json
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("""
        INSERT INTO game_answers 
        (session_id, game_type, question_id, question_text, selected_option, option_text, option_effects)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (data['sessionId'], data['gameType'], data['questionId'], 
          data['questionText'], data['selectedOption'], data['optionText'], 
          json.dumps(data.get('optionEffects', {}))))
    
    conn.commit()
    cur.close()
    conn.close()
    
    return jsonify({'success': True})

@app.route('/api/career/recommend/<int:session_id>', methods=['POST'])
def recommend_career(session_id):
    """Generate career recommendation based on all collected data using RAG"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Get session data
        cur.execute("SELECT * FROM user_sessions WHERE session_id = ?", (session_id,))
        session_row = cur.fetchone()
        
        if not session_row:
            return jsonify({'error': 'Session not found', 'career': 'Unknown', 'description': 'Session not found'}), 404
        
        session = dict(session_row)
        
        # Get all answers
        cur.execute("""
            SELECT game_type, option_effects 
            FROM game_answers 
            WHERE session_id = ?
        """, (session_id,))
        answers = [dict(row) for row in cur.fetchall()]
        
        # Aggregate scores
        emotional_scores = {"stress": 0, "confidence": 0, "empathy": 0, "risk": 0, "curiosity": 0}
        reasoning_scores = {"logic": 0, "analysis": 0, "decision": 0, "risk_reasoning": 0, 
                            "constraint": 0, "prediction": 0, "efficiency": 0, "abstraction": 0}
        academic_scores = {"physics": 0, "chemistry": 0, "biology": 0, "mathematics": 0, 
                           "computer_science": 0, "electronics": 0, "environment": 0, 
                           "exam_focus": 0, "career_awareness": 0}
        
        for answer in answers:
            effects = json.loads(answer['option_effects']) if answer['option_effects'] else {}
            if answer['game_type'] == 'emotional':
                for key, value in effects.items():
                    if key in emotional_scores:
                        emotional_scores[key] += value
            elif answer['game_type'] == 'reasoning':
                for key, value in effects.items():
                    if key in reasoning_scores:
                        reasoning_scores[key] += value
            elif answer['game_type'] == 'academic':
                for key, value in effects.items():
                    if key in academic_scores:
                        academic_scores[key] += value
        
        # Factor in face emotion
        face_emotion = session['face_emotion'].lower() if session['face_emotion'] else 'neutral'
        if face_emotion in ['stressed', 'anxious']:
            emotional_scores['stress'] -= 5
        elif face_emotion in ['sad', 'depressed']:
            emotional_scores['confidence'] -= 3
        elif face_emotion in ['happy', 'joyful']:
            emotional_scores['confidence'] += 3
        
        print(f"\n[RAG] Career Recommendation for Session {session_id}")
        print(f"Emotional: {emotional_scores}")
        print(f"Reasoning: {reasoning_scores}")
        print(f"Academic: {academic_scores}")
        
        # Try RAG-based recommendation first
        career_matches = []
        top_career = None
        
        # Lazy load RAG system on first use
        current_rag = get_rag_system()
        
        if current_rag:
            try:
                # Convert scores to profile format for RAG
                emotional_profile = {k: ('high' if v >= 3 else 'medium' if v >= 1 else 'low') 
                                    for k, v in emotional_scores.items()}
                reasoning_profile = {k: ('high' if v >= 3 else 'medium' if v >= 1 else 'low') 
                                    for k, v in reasoning_scores.items()}
                academic_profile = {k: ('high' if v >= 3 else 'medium' if v >= 1 else 'low') 
                                   for k, v in academic_scores.items()}
                
                user_profile = {
                    'emotional_profile': emotional_profile,
                    'reasoning_profile': reasoning_profile,
                    'academic_profile': academic_profile
                }
                
                # Get RAG recommendations
                rag_recommendations = current_rag.get_career_recommendations(user_profile, top_k=5)

                
                print(f"[RAG] Found {len(rag_recommendations)} recommendations")
                
                if rag_recommendations:
                    for i, rec in enumerate(rag_recommendations, 1):
                        print(f"  {i}. {rec['career_name']} (Match: {rec.get('match_score', 'N/A')}%)")
                        career_matches.append({
                            'career': rec['career_name'],
                            'score': rec.get('match_score', 80),
                            'path': rec['student_guidance'],
                            'education': rec['education_path'],
                            'salary': rec['salary_range'],
                            'category': rec['category']
                        })
                    
                    top_career = career_matches[0]
            except Exception as e:
                print(f"[RAG] Error: {e}. Falling back to traditional method.")
                rag_system_failed = True
        
        # Fallback to traditional recommendation if RAG fails
        if not top_career:
            print("[Traditional] Using fallback recommendation system")
            for career, profile in CAREER_DATABASE.items():
                score = 0
                details = []
                
                # Emotional match
                for key, level in profile['emotional_profile'].items():
                    if key in emotional_scores:
                        if level == 'high' and emotional_scores[key] >= 3:
                            score += 5
                        elif level == 'medium' and emotional_scores[key] >= 1:
                            score += 3
                
                # Reasoning match
                for key, level in profile['reasoning_profile'].items():
                    if key in reasoning_scores:
                        if level == 'high' and reasoning_scores[key] >= 3:
                            score += 5
                        elif level == 'medium' and reasoning_scores[key] >= 1:
                            score += 3
                
                # Academic match
                for key, level in profile['academic_profile'].items():
                    if key in academic_scores:
                        if level == 'high' and academic_scores[key] >= 3:
                            score += 5
                        elif level == 'medium' and academic_scores[key] >= 1:
                            score += 3
                
                # Engagement bonus
                if len(answers) >= 25:
                    score += 5
                elif len(answers) >= 15:
                    score += 3
                
                career_matches.append({
                    'career': career,
                    'score': score,
                    'path': profile['path']
                })
            
            career_matches.sort(key=lambda x: x['score'], reverse=True)
            top_career = career_matches[0]
        
        print(f"\n[Final] Recommended: {top_career['career']} (Score: {top_career.get('score', 'N/A')})")
        
        # Save recommendation
        cur.execute("""
            INSERT INTO career_recommendations 
            (session_id, recommended_career, career_description, confidence_score, 
             emotional_score, reasoning_score, academic_score, career_path)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (session_id, top_career['career'], 
              f"Based on your profile analysis, {top_career['career']} is an excellent match for you!",
              top_career.get('score', 80),
              json.dumps(emotional_scores), json.dumps(reasoning_scores), json.dumps(academic_scores),
              top_career['path']))
        
        # Update session as completed
        cur.execute("""
            UPDATE user_sessions SET completed_at = ? WHERE session_id = ?
        """, (datetime.now().isoformat(), session_id))
        
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({
            'career': top_career['career'],
            'recommendedCareer': top_career['career'],
            'description': f"Based on your profile, {top_career['career']} is a great fit for you! {top_career['path']}",
            'confidenceScore': top_career.get('score', 80),
            'careerPath': top_career['path'],
            'emotionalScores': emotional_scores,
            'reasoningScores': reasoning_scores,
            'academicScores': academic_scores,
            'allMatches': career_matches[:5],  # Top 5 matches
            'recommendation_method': 'RAG' if get_rag_system() and len(career_matches) > 0 and 'match_score' in career_matches[0] else 'Traditional'
        })
    except Exception as e:
        print(f"Error in career recommendation: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': str(e),
            'career': 'Error occurred',
            'description': 'Unable to generate recommendation. Please try again.'
        }), 500

@app.route('/api/session/<int:session_id>/summary', methods=['GET'])
def get_session_summary(session_id):
    """Get complete session summary"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT us.*, cr.recommended_career, cr.career_path, cr.confidence_score
        FROM user_sessions us
        LEFT JOIN career_recommendations cr ON us.session_id = cr.session_id
        WHERE us.session_id = ?
    """, (session_id,))
    
    result = cur.fetchone()
    cur.close()
    conn.close()
    
    if result:
        # Convert tuple to dictionary
        columns = [description[0] for description in cur.description]
        result_dict = dict(zip(columns, result))
        return jsonify(result_dict)
    else:
        return jsonify({})

# ============================================================================
# FRONTEND ROUTES - Serve HTML/CSS/JS files
# ============================================================================

# Health check endpoint for Render
@app.route('/health')
def health_check():
    """Health check endpoint for monitoring"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'emotion_model_loaded': emotion_model is not None,
        'rag_system_loaded': get_rag_system() is not None
    })

@app.route('/')
def index():
    """Serve the main index page"""
    return send_from_directory('html', 'index.html')

@app.route('/html/<path:path>')
def serve_html(path):
    """Serve HTML files"""
    return send_from_directory('html', path)

@app.route('/css/<path:path>')
def serve_css(path):
    """Serve CSS files"""
    return send_from_directory('css', path)

@app.route('/js/<path:path>')
def serve_js(path):
    """Serve JavaScript files"""
    return send_from_directory('js', path)

@app.route('/images/<path:path>')
def serve_images(path):
    """Serve image files"""
    return send_from_directory('images', path)

# ========== RAG CAREER SEARCH ENDPOINTS ==========

@app.route('/api/career/search', methods=['POST'])
def search_careers():
    """Search careers using RAG vector database"""
    try:
        data = request.json
        query = data.get('query', '')
        
        if not query:
            return jsonify({'error': 'Query is required'}), 400
        
        if not rag_system:
            return jsonify({'error': 'RAG system not available'}), 503
        
        results = rag_system.search_careers_by_text(query, top_k=5)
        
        return jsonify({
            'success': True,
            'query': query,
            'results': results,
            'count': len(results)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/career/explore', methods=['GET'])
def explore_careers():
    """Get all career categories and basic info from RAG"""
    try:
        if not rag_system:
            return jsonify({'error': 'RAG system not available'}), 503
        
        # Get sample careers from different categories
        categories = ['Technology', 'Healthcare', 'Creative', 'Finance', 'Engineering', 'Education']
        career_samples = []
        
        for category in categories:
            results = rag_system.search_careers_by_text(f"careers in {category}", top_k=2)
            career_samples.extend(results)
        
        return jsonify({
            'success': True,
            'categories': categories,
            'sample_careers': career_samples
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/emotion/detect', methods=['POST'])
@limiter.limit("30 per minute")
def detect_emotion():
    """Detect emotion from webcam frame using trained CNN model"""
    try:
        if not emotion_model or not face_cascade:
            logger.error("Emotion detection requested but model not loaded")
            return jsonify({
                'error': 'Emotion detection model not available', 
                'details': 'Model file not found on server. Please contact administrator.'
            }), 503
        
        data = request.get_json()
        image_data = data.get('image')
        
        if not image_data:
            return jsonify({'error': 'No image provided'}), 400
        
        # Decode base64 image
        try:
            image_data = image_data.split(',')[1] if ',' in image_data else image_data
            image_bytes = base64.b64decode(image_data)
            nparr = np.frombuffer(image_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        except Exception as decode_error:
            logger.error(f"Image decoding error: {decode_error}")
            return jsonify({'error': 'Failed to decode image'}), 400
        
        if frame is None:
            return jsonify({'error': 'Invalid image data'}), 400
        
        # Aggressively resize images to reduce processing time
        max_dimension = 640  # Balanced size
        height, width = frame.shape[:2]
        if max(height, width) > max_dimension:
            scale = max_dimension / max(height, width)
            new_width = int(width * scale)
            new_height = int(height * scale)
            frame = cv2.resize(frame, (new_width, new_height), interpolation=cv2.INTER_LINEAR)
        
        # Convert to grayscale
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Apply histogram equalization for better face detection
        gray = cv2.equalizeHist(gray)
        
        # Detect faces with relaxed parameters for better detection
        faces = face_cascade.detectMultiScale(
            gray, 
            scaleFactor=1.1,  # More sensitive
            minNeighbors=3,   # Lower threshold
            minSize=(20, 20), # Allow smaller faces
            flags=cv2.CASCADE_SCALE_IMAGE
        )
        
        if len(faces) == 0:
            return jsonify({
                'success': True,
                'face_detected': False,
                'emotion': None,
                'probabilities': {}
            })
        
        # Process first face
        x, y, w, h = faces[0]
        face = gray[y:y+h, x:x+w]
        face = cv2.resize(face, (48, 48), interpolation=cv2.INTER_AREA)
        face = face.astype('float32') / 255.0
        face = np.reshape(face, (1, 48, 48, 1))
        
        # Predict emotions with explicit configuration
        probs = emotion_model.predict(
            face, 
            verbose=0, 
            batch_size=1
        )[0]
        
        # Create probability dictionary - only top 3 to reduce response size
        sorted_indices = np.argsort(probs)[::-1]
        probabilities = {emotion_labels[i]: float(probs[i]) for i in sorted_indices[:3]}
        
        # Get dominant emotion
        dominant_idx = np.argmax(probs)
        dominant_emotion = emotion_labels[dominant_idx]
        confidence = float(probs[dominant_idx])
        
        return jsonify({
            'success': True,
            'face_detected': True,
            'emotion': dominant_emotion,
            'confidence': confidence,
            'probabilities': probabilities,
            'face_location': {'x': int(x), 'y': int(y), 'width': int(w), 'height': int(h)}
        })
        
    except Exception as e:
        logger.error(f"Error in emotion detection: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Internal server error processing emotion detection'}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug_mode = os.environ.get('FLASK_ENV') == 'development'
    logger.info(f"Starting server on port {port} (debug={debug_mode})")
    app.run(debug=debug_mode, host='0.0.0.0', port=port)
