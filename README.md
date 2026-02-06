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
- **🚀 Production Ready**: Configured for Render deployment

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
- **Face API**: Real-time emotion detection

### ML Models

- **Emotion CNN**: Trained on FER2013 dataset
- **Tiny Transformer**: Custom language model for game generation
- **MiniLM**: Sentence embeddings for semantic search

## 🚀 Quick Start

### Local Development

1. **Clone the repository**

```bash
git clone <your-repo-url>
cd C$SNOVA
```

2. **Create virtual environment**

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**

```bash
pip install -r requirements.txt
```

4. **Set up environment variables**

```bash
cp .env.example .env
# Edit .env with your credentials
```

5. **Run the application**

```bash
python api_server.py
```

Visit `http://localhost:5000` in your browser.

## 🌐 Deploy to Render

### Prerequisites

- GitHub account
- Render account (free tier available)
- Google OAuth credentials (optional)
- Gmail app password (optional, for password reset)

### Deployment Steps

1. **Push to GitHub**

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-repo>
git push -u origin main
```

2. **Create Web Service on Render**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Name**: `career-guidance-ai`
     - **Environment**: `Python 3`
     - **Build Command**: `pip install -r requirements.txt`
     - **Start Command**: (leave blank, uses Procfile)
     - **Instance Type**: Free

3. **Set Environment Variables** on Render:

```
SECRET_KEY=<generate-random-32-char-string>
FLASK_ENV=production
GOOGLE_CLIENT_ID=<your-google-client-id>
EMAIL_ADDRESS=<your-gmail@gmail.com>
EMAIL_PASSWORD=<your-gmail-app-password>
ALLOWED_ORIGINS=https://your-app.onrender.com
```

4. **Deploy**
   - Click "Create Web Service"
   - Render will automatically deploy from your GitHub repo
   - Wait for build to complete (~5-10 minutes)
   - Your app will be live at: `https://your-app.onrender.com`

### 📝 Getting Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `https://your-app.onrender.com`
   - `http://localhost:5000` (for local testing)
6. Copy Client ID and set in environment variables

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
├── Procfile                   # Render deployment config
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

## 📊 Scalability & Multi-User Support

### ✅ YES - Render Can Handle Multiple Users!

Your app is production-ready and configured to handle concurrent users:

**How It Works:**

- **Gunicorn**: Runs 4 worker processes × 2 threads = **8 concurrent requests**
- **Thread-Safe**: Database connections and RAG system use proper locking
- **Stateless API**: Each request is independent (scales horizontally)
- **SQLite**: Handles multiple concurrent reads (writes are serialized)

**Performance Estimates:**

- **Free Tier**: ~10-50 concurrent users (with some delays)
- **Paid Tier**: ~100-500 concurrent users (smooth experience)
- **Auto-Scale**: Can handle thousands (with load balancer)

### Render Handles:

✅ **Load Balancing**: Distributes requests across workers  
✅ **Auto-Restart**: Crashes don't affect other users  
✅ **SSL/HTTPS**: Automatic secure connections  
✅ **CDN**: Fast static file delivery worldwide  
✅ **Health Checks**: Auto-recovery if server hangs

### Free Tier Limitations:

⚠️ Sleeps after 15 mins inactivity (30 sec cold start)  
⚠️ 512 MB RAM (may restart if exceeded)  
⚠️ Shared CPU (slower during peak times)

### For Heavy Traffic:

1. **Upgrade to Paid** ($7/mo): Always-on, more resources
2. **Add PostgreSQL**: Better concurrent writes than SQLite
3. **Enable Auto-Scale**: Automatically adds servers under load
4. **Add Redis**: Shared session storage across instances

**Bottom Line:** Start on free tier, monitor usage, upgrade when needed. Render scales with you!

## 📊 Scalability

### Render Can Handle:

- **Multiple Users**: Gunicorn runs 4 workers + 2 threads = 8 concurrent requests
- **Auto-scaling**: Render can scale instances automatically (paid plans)
- **Persistent Storage**: SQLite database persists on Render's disk
- **Global CDN**: Static files served via Render's CDN

### For Heavy Traffic:

- Upgrade to Render paid plan for more resources
- Consider Redis for session/OTP storage (for multi-instance)
- Migrate to PostgreSQL for better concurrent writes
- Enable Render auto-scaling

### Current Limits (Free Tier):

- 750 hours/month runtime
- Sleeps after 15 mins inactivity (cold start: ~30 sec)
- 512 MB RAM
- Shared CPU

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
- On Render, database resets on deploy (use persistent disk for production)

### Cold Start Delay

- Free tier Render apps sleep after inactivity
- First request takes ~30 seconds to wake up

### CORS Errors

- Set `ALLOWED_ORIGINS` to your frontend domain
- Use comma-separated list for multiple origins

## 📈 Future Enhancements

- [ ] Redis for distributed session storage
- [ ] PostgreSQL for better concurrency
- [ ] Video interview analysis
- [ ] Resume builder integration
- [ ] College recommendation system
- [ ] Job board integration
- [ ] Mobile app (React Native)

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
- Contact: [Your Email]

## 🙏 Acknowledgments

- FER2013 dataset for emotion detection
- Sentence Transformers by UKPLab
- ChromaDB for vector storage
- Render for hosting platform

---

**Made with ❤️ for helping students find their perfect career**
