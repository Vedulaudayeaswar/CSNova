# 🎓 Career Guidance AI System

An intelligent career guidance platform that combines facial emotion detection, interactive games, and AI-powered career recommendations to help students discover their ideal career path.

---

## ✨ Features

- **🔐 Multi-Auth System**: Email/Password + Google OAuth
- **😊 Emotion Detection**: Real-time facial emotion analysis using CNN
- **🎮 Interactive Games**: Emotional, Reasoning, and Academic assessment games
- **🤖 AI Career Recommendations**: RAG (Retrieval Augmented Generation) system
- **📊 Smart Matching**: Matches student profiles to 30+ career options
- **💾 SQLite Database**: No external database setup required
- **🚀 Local Ready**: Runs fully in your `.venv` with SQLite

## 🏗️ Tech Stack

### Backend

- **Flask**: Web framework
- **SQLite**: Lightweight database (built into Python)
- **ChromaDB**: Vector database for RAG system
- **TensorFlow/Keras**: Emotion detection CNN model
- **Sentence Transformers**: Text embeddings for career matching
- **Google OAuth**: Authentication

### Frontend

- **Vanilla JavaScript**: No framework dependencies
- **HTML5/CSS3**: Responsive design
- **CNN Emotion Detection**: Server-side facial analysis in Python

### ML Models

- **Emotion CNN**: Trained on FER2013 dataset
- **Tiny Transformer**: Custom language model for game generation
- **MiniLM**: Sentence embeddings for semantic search

## 🚀 Quick Start

1. **Clone the repository**

```bash
git clone <your-repo-url>
cd C$SNOVA
```

2. **Create and activate your `.venv`**

```bash
python -m venv .venv
.\.venv\Scripts\activate
```

3. **Install dependencies**

```bash
pip install -r requirements.txt
```

4. **Set up environment variables**

```bash
copy .env.example .env
```

Edit `.env` locally with your credentials if you use Google login or email reset.

5. **Run the application**

```bash
python api_server.py
```

Visit `http://localhost:5000` in your browser.

## GitHub Only Workflow

Push the project to GitHub whenever you want to share or back it up:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-repo>
git push -u origin main
```

For Google OAuth in local development, add `http://localhost:5000` as an authorized redirect URI in Google Cloud Console.

### 📧 Gmail App Password Setup

1. Enable 2-Factor Authentication on your Gmail
2. Go to Google Account → Security → App Passwords
3. Generate app password for "Mail"
4. Use this password in `EMAIL_PASSWORD` environment variable

## 🔧 Configuration

### Environment Variables

| Variable           | Description              | Required | Default              |
| ------------------ | ------------------------ | -------- | -------------------- |
| `SECRET_KEY`       | Flask session secret     | Yes      | Auto-generated       |
| `FLASK_ENV`        | Environment mode         | No       | `production`         |
| `PORT`             | Server port              | No       | `5000`               |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID   | No       | -                    |
| `EMAIL_ADDRESS`    | Gmail for password reset | No       | -                    |
| `EMAIL_PASSWORD`   | Gmail app password       | No       | -                    |
| `ALLOWED_ORIGINS`  | CORS allowed origins     | No       | `*`                  |
| `DATABASE_URL`     | SQLite database path     | No       | `career_guidance.db` |

## 📦 Project Structure

```
C$SNOVA/
├── api_server.py              # Main Flask application
├── career_rag.py              # RAG system for career matching
├── requirements.txt           # Python dependencies
├── runtime.txt                # Python version
├── .env.example               # Environment template
├── .gitignore                 # Git ignore rules
│
├── html/                      # Frontend HTML pages
│   ├── index.html
│   ├── login.html
│   ├── face.html
│   ├── game.html (emotional)
│   ├── game2.html (reasoning)
│   └── game3.html (academic)
│
├── css/                       # Stylesheets
├── js/                        # Frontend JavaScript
├── images/                    # Static images
├── sound/                     # Background music
│
├── senti_analy/              # Emotion detection system
│   ├── emotion_cnn_fer2013.h5
│   └── temporal_sentiment_webcam.py
│
└── tiny_transformer_lm/       # Custom transformer model
    └── tiny_transformer_lm/
        ├── model/
        ├── training/
        ├── inference/
        ├── data/
        └── checkpoints/
```

## 🎮 How It Works

1. **User Registration/Login**: Email/password or Google OAuth
2. **Face Emotion Scan**: CNN analyzes facial expressions (7 emotions)
3. **Game Assessment**: Three interactive games test:
   - Emotional intelligence
   - Logical reasoning
   - Academic interests
4. **AI Analysis**: RAG system processes:
   - Emotion profile
   - Game responses
   - Academic strengths
5. **Career Match**: Returns top career recommendations with:
   - Detailed career paths
   - Education requirements
   - Salary expectations
   - Skills needed

## 🔒 Security Features

- ✅ **No Hardcoded Secrets**: All credentials use environment variables
- ✅ **Dynamic Client ID Loading**: Google OAuth ID loaded from backend API
- ✅ **Rate Limiting**: 50 requests/hour per IP to prevent abuse
- ✅ **CORS Protection**: Configurable allowed origins
- ✅ **Environment-based Configuration**: Secrets in `.env` (never committed)
- ✅ **SQL Injection Prevention**: Parameterized queries
- ✅ **Secure Session Management**: Flask sessions with secret key
- ✅ **Password Hashing**: Secure password storage
- ✅ **OTP-based Password Reset**: Time-limited one-time passwords
- ✅ **`.gitignore` Protection**: `.env` file never pushed to GitHub

### 🔐 Credential Safety

Your Google Client ID and other secrets are **NOT in the code**:

1. ❌ **Removed** from [html/login.html](html/login.html) (was hardcoded)
2. ✅ **Backend API** serves it via `/api/auth/config`
3. ✅ **JavaScript** dynamically loads it on page load
4. ✅ **Environment variables** in `.env` (git-ignored)

**Before deploying to GitHub:**

```bash
# Make sure .env is in .gitignore (already done ✅)
grep "^.env$" .gitignore

# Never commit .env - only commit .env.example
git add .
git commit -m "Production ready - no secrets exposed"
```

## 📊 Local Performance

The app is designed to run locally in `.venv` with SQLite and the bundled CNN model.

**What it handles well:**

- Multiple browser tabs on a local machine
- Fast startup after the first TensorFlow load
- SQLite-backed session and recommendation storage

**What to expect:**

- First model load can take a few seconds
- Chrome/Edge work best for camera access
- Performance depends on your local CPU and RAM

## 🧪 Testing

```bash
# Test local server
curl http://localhost:5000/health

# Expected response:
{
  "status": "healthy",
  "emotion_model_loaded": true,
  "rag_system_loaded": true
}
```

## 🐛 Troubleshooting

### Model Loading Issues

- Ensure `emotion_cnn_fer2013.h5` is in `senti_analy/` folder
- Model file is ~100MB, may need Git LFS for GitHub

### Database Issues

- SQLite creates `career_guidance.db` automatically
- Back up the database file if you want to preserve local history

### Cold Start Delay

- TensorFlow may take a few seconds to initialize on first request
- The first emotion scan can be slower than the rest

### CORS Errors

- Set `ALLOWED_ORIGINS` to your frontend domain
- Use comma-separated list for multiple origins

## 🤝 Contributing

This is a production-ready system. To contribute:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Support

For issues or questions:

- Open GitHub issue
- Contact: [vedulaudayeaswar2004@gmail.com]

## 🙏 Acknowledgments

- FER2013 dataset for emotion detection
- Sentence Transformers by UKPLab
- ChromaDB for vector storage
- GitHub for source control and sharing

---

**Made with ❤️ for helping students find their perfect career**
