// ============================================
// EMOTION DETECTION SYSTEM USING FACE-API.JS
// ============================================

class EmotionDetector {
  constructor() {
    this.video = document.getElementById("video");
    this.canvas = document.getElementById("canvas");
    this.ctx = this.canvas.getContext("2d");

    this.isAnalyzing = false;
    this.startTime = null;
    this.frameCount = 0;
    this.emotionHistory = [];
    this.modelsLoaded = false;

    this.emotionMap = {
      happy: { icon: "😊", color: "#84fab0" },
      sad: { icon: "😢", color: "#4facfe" },
      angry: { icon: "😠", color: "#fa709a" },
      fearful: { icon: "😨", color: "#fb5283" },
      disgusted: { icon: "🤢", color: "#ff6b6b" },
      surprised: { icon: "😮", color: "#ffd89b" },
      neutral: { icon: "😐", color: "#95a5a6" },
    };

    // Emotion aggregates for session
    this.sessionStats = {
      happy: 0,
      sad: 0,
      stressed: 0, // Combination of angry + fearful + disgusted
      totalFrames: 0,
    };

    this.init();
  }

  async init() {
    try {
      console.log("Loading face detection models...");
      const spinner = document.getElementById("spinner");
      spinner.querySelector("p").textContent =
        "Loading Face Detection Models...";

      // Load face-api models - Using correct TinyFaceDetector models
      const MODEL_URL =
        "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/";

      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ]);

      this.modelsLoaded = true;
      console.log("Models loaded successfully!");

      // Update spinner message
      spinner.querySelector("p").textContent = "Requesting camera access...";

      // Setup video stream and ask for camera permission
      await this.setupCamera();

      // Hide spinner after camera is ready
      spinner.style.display = "none";

      // Show ready message
      console.log("✅ System ready! Click 'Start Analysis' to begin.");

      this.attachEventListeners();
      this.loadAnalysisHistory();
    } catch (error) {
      console.error("Error during initialization:", error);
      const spinner = document.getElementById("spinner");
      const spinnerAnimation = spinner.querySelector(".spinner");
      if (spinnerAnimation) spinnerAnimation.style.display = "none";

      spinner.querySelector("p").innerHTML = `
        <div style="color: #e74c3c; text-align: center;">
          <p style="font-size: 1.2rem; margin-bottom: 1rem;">⚠️ Setup Error</p>
          <p>${error.message || "Failed to initialize emotion detection"}</p>
          <p style="font-size: 0.9rem; margin-top: 1rem;">Please refresh the page and allow camera access.</p>
        </div>
      `;

      // Show manual enable button if camera permission was denied
      const enableBtn = document.getElementById("enableCameraBtn");
      if (enableBtn && error.name === "NotAllowedError") {
        enableBtn.style.display = "block";
      }

      this.attachEventListeners();
    }
  }

  async setupCamera() {
    try {
      console.log("Requesting camera access...");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: false,
      });

      this.video.srcObject = stream;

      console.log("Camera access granted!");

      return new Promise((resolve) => {
        this.video.onloadedmetadata = () => {
          this.video.play();
          this.canvas.width = this.video.videoWidth;
          this.canvas.height = this.video.videoHeight;
          console.log("Video stream ready!");
          resolve();
        };
      });
    } catch (error) {
      console.error("Camera access error:", error);
      const spinner = document.getElementById("spinner");
      spinner.innerHTML = `
        <div style="color: #e74c3c; text-align: center;">
          <p style="font-size: 1.2rem; margin-bottom: 1rem;">📷 Camera Access Required</p>
          <p>Please allow camera access to use emotion detection.</p>
          <p style="font-size: 0.9rem; margin-top: 1rem;">Error: ${error.message}</p>
        </div>
      `;
      throw error;
    }
  }

  attachEventListeners() {
    document
      .getElementById("startBtn")
      .addEventListener("click", () => this.startAnalysis());
    document
      .getElementById("stopBtn")
      .addEventListener("click", () => this.stopAnalysis());
    document
      .getElementById("saveBtn")
      .addEventListener("click", () => this.saveResults());

    // Add manual camera enable button handler
    const enableCameraBtn = document.getElementById("enableCameraBtn");
    if (enableCameraBtn) {
      enableCameraBtn.addEventListener("click", () =>
        this.setupCamera().then(() => {
          document.getElementById("spinner").style.display = "none";
        }),
      );
    }
  }

  async startAnalysis() {
    if (!this.modelsLoaded) {
      alert("Models are still loading. Please wait...");
      return;
    }

    this.isAnalyzing = true;
    this.startTime = Date.now();
    this.frameCount = 0;
    this.emotionHistory = [];
    this.sessionStats = {
      happy: 0,
      sad: 0,
      stressed: 0,
      totalFrames: 0,
    };

    document.getElementById("startBtn").style.display = "none";
    document.getElementById("stopBtn").style.display = "inline-block";
    document.getElementById("saveBtn").style.display = "none";
    document.getElementById("resultsSection").style.display = "none";

    this.detectEmotions();
  }

  async detectEmotions() {
    if (!this.isAnalyzing) return;

    try {
      // Detect faces and expressions
      const detections = await faceapi
        .detectAllFaces(this.video, new faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions();

      // Update stats
      this.frameCount++;
      const currentTime = Date.now() - this.startTime;
      document.getElementById("sessionTime").textContent =
        this.formatTime(currentTime);
      document.getElementById("frameCount").textContent = this.frameCount;

      if (detections.length > 0) {
        const expressions = detections[0].expressions;

        // Process emotions
        const emotionData = this.processExpressions(expressions);
        this.emotionHistory.push({
          timestamp: Date.now(),
          emotions: emotionData,
        });

        // Update UI
        this.updateEmotionDisplay(emotionData);

        // Aggregate stats
        this.aggregateStats(emotionData);
      } else {
        // No face detected
        this.updateEmotionDisplay(null);
      }
    } catch (error) {
      console.error("Detection error:", error);
    }

    // Continue detection loop
    requestAnimationFrame(() => this.detectEmotions());
  }

  processExpressions(expressions) {
    // Map face-api expressions to our emotion categories
    const emotions = {
      happy: expressions.happy || 0,
      sad: expressions.sad || 0,
      angry: expressions.angry || 0,
      fearful: expressions.fearful || 0,
      disgusted: expressions.disgusted || 0,
      surprised: expressions.surprised || 0,
      neutral: expressions.neutral || 0,
    };

    // Enhanced stress calculation using weighted combination
    // Stress is a mix of anger (60%), fear (30%), and disgust (10%)
    const stressRaw =
      emotions.angry * 0.6 + emotions.fearful * 0.3 + emotions.disgusted * 0.1;

    // Boost stress detection by amplifying it
    const stressed = Math.min(stressRaw * 1.8, 1.0);

    // Enhanced sad detection - boost it for better sensitivity
    const sadEnhanced = Math.min(emotions.sad * 1.5, 1.0);

    return {
      happy: Math.round(emotions.happy * 100),
      sad: Math.round(sadEnhanced * 100),
      stressed: Math.round(stressed * 100),
      dominant: this.getDominantEmotion(emotions),
    };
  }

  getDominantEmotion(emotions) {
    let dominant = "neutral";
    let maxScore = emotions.neutral;

    Object.keys(emotions).forEach((emotion) => {
      if (emotions[emotion] > maxScore) {
        maxScore = emotions[emotion];
        dominant = emotion;
      }
    });

    return dominant;
  }

  updateEmotionDisplay(emotionData) {
    const badge = document.getElementById("emotionBadge");
    const happyBar = document.getElementById("happyBar");
    const sadBar = document.getElementById("sadBar");
    const stressedBar = document.getElementById("stressedBar");
    const happyValue = document.getElementById("happyValue");
    const sadValue = document.getElementById("sadValue");
    const stressedValue = document.getElementById("stressedValue");

    if (!emotionData) {
      badge.innerHTML =
        '<span class="emotion-icon">❌</span><span class="emotion-name">No Face Detected</span>';
      happyBar.style.width = "0%";
      sadBar.style.width = "0%";
      stressedBar.style.width = "0%";
      happyValue.textContent = "0%";
      sadValue.textContent = "0%";
      stressedValue.textContent = "0%";
      return;
    }

    const emotion = emotionData.dominant;
    const emotionInfo = this.emotionMap[emotion];

    badge.innerHTML = `<span class="emotion-icon">${emotionInfo.icon}</span><span class="emotion-name">${emotion.toUpperCase()}</span>`;

    happyBar.style.width = emotionData.happy + "%";
    sadBar.style.width = emotionData.sad + "%";
    stressedBar.style.width = emotionData.stressed + "%";

    happyValue.textContent = emotionData.happy + "%";
    sadValue.textContent = emotionData.sad + "%";
    stressedValue.textContent = emotionData.stressed + "%";
  }

  aggregateStats(emotionData) {
    // Accumulate emotion scores for averaging later
    this.sessionStats.happy += emotionData.happy;
    this.sessionStats.sad += emotionData.sad;
    this.sessionStats.stressed += emotionData.stressed;
    this.sessionStats.totalFrames++;
  }

  stopAnalysis() {
    this.isAnalyzing = false;

    document.getElementById("startBtn").style.display = "inline-block";
    document.getElementById("stopBtn").style.display = "none";
    document.getElementById("saveBtn").style.display = "inline-block";

    // Show results
    this.displayResults();
  }

  displayResults() {
    const resultsSection = document.getElementById("resultsSection");
    const totalFrames = this.sessionStats.totalFrames;

    if (totalFrames === 0) {
      alert("No face detected during analysis. Please try again.");
      return;
    }

    // Calculate averages
    const avgHappy = Math.round(this.sessionStats.happy / totalFrames);
    const avgSad = Math.round(this.sessionStats.sad / totalFrames);
    const avgStressed = Math.round(this.sessionStats.stressed / totalFrames);

    // Determine dominant emotion
    let dominant = "Neutral";
    if (avgHappy > avgSad && avgHappy > avgStressed) {
      dominant = "Happy";
    } else if (avgSad > avgStressed) {
      dominant = "Sad";
    } else if (avgStressed > 30) {
      dominant = "Stressed";
    }

    // Create note based on emotion
    let note = "";
    if (dominant === "Happy") {
      note =
        "Great! You seem confident and positive. This is excellent for career discussions and interviews.";
    } else if (dominant === "Sad") {
      note =
        "You seem a bit down. Remember, career challenges are opportunities for growth. Stay positive!";
    } else if (dominant === "Stressed") {
      note =
        "You appear stressed. Consider taking breaks during career assessments. Managing stress helps with better decision-making.";
    } else {
      note =
        "You maintained a calm demeanor. Good job staying composed during the analysis!";
    }

    // Display results
    document.getElementById("dominantEmotion").textContent = dominant;
    document.getElementById("stressLevel").textContent =
      avgStressed > 50 ? "HIGH" : avgStressed > 20 ? "MODERATE" : "LOW";
    document.getElementById("resultsNote").textContent = note;
    resultsSection.style.display = "block";

    // Prepare data for storage
    this.prepareDataForStorage({
      dominant,
      avgHappy,
      avgSad,
      avgStressed,
      note,
      totalFrames,
    });
  }

  prepareDataForStorage(results) {
    // Store in userData
    const currentUser = this.getCurrentUser();

    if (!currentUser) {
      alert("Please login first to save your analysis.");
      return;
    }

    const emotionAnalysis = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      dominantEmotion: results.dominant,
      happyScore: results.avgHappy,
      sadScore: results.avgSad,
      stressScore: results.avgStressed,
      stressLevel:
        results.avgStressed > 50
          ? "HIGH"
          : results.avgStressed > 20
            ? "MODERATE"
            : "LOW",
      note: results.note,
      framesAnalyzed: results.totalFrames,
    };

    this.updateUserWithAnalysis(currentUser, emotionAnalysis);
  }

  getCurrentUser() {
    const userJson = localStorage.getItem("cssnova_current_user");
    return userJson ? JSON.parse(userJson) : null;
  }

  updateUserWithAnalysis(user, analysis) {
    // Initialize emotion analyses array if not present
    if (!user.emotionAnalyses) {
      user.emotionAnalyses = [];
    }

    // Add new analysis
    user.emotionAnalyses.push(analysis);

    // Keep only last 50 analyses
    if (user.emotionAnalyses.length > 50) {
      user.emotionAnalyses = user.emotionAnalyses.slice(-50);
    }

    // Update user in localStorage
    localStorage.setItem("cssnova_current_user", JSON.stringify(user));

    // Also update in users list
    const users = JSON.parse(localStorage.getItem("cssnova_users") || "[]");
    const userIndex = users.findIndex((u) => u.id === user.id);
    if (userIndex !== -1) {
      users[userIndex] = user;
      localStorage.setItem("cssnova_users", JSON.stringify(users));
    }

    console.log("Analysis saved:", analysis);
  }

  saveResults() {
    const currentUser = this.getCurrentUser();

    if (!currentUser) {
      alert("Please login first to save your analysis.");
      return;
    }

    // Create session in database with face analysis data
    this.createSessionInDatabase(currentUser);
  }

  async createSessionInDatabase(user) {
    const API_URL = "http://localhost:5000/api";

    // Get the most recent analysis for this user
    const recentAnalysis =
      user.emotionAnalyses && user.emotionAnalyses.length > 0
        ? user.emotionAnalyses[user.emotionAnalyses.length - 1]
        : null;

    const sessionData = {
      userName: user.username,
      faceEmotion: recentAnalysis ? recentAnalysis.dominantEmotion : "neutral",
      faceConfidence: recentAnalysis ? recentAnalysis.happyScore : 50,
      faceAnalysisData: {
        dominantEmotion: recentAnalysis
          ? recentAnalysis.dominantEmotion
          : "neutral",
        stressLevel: recentAnalysis ? recentAnalysis.stressLevel : "medium",
        happyScore: recentAnalysis ? recentAnalysis.happyScore : 50,
        emotions: recentAnalysis ? recentAnalysis.emotions : {},
        timestamp: recentAnalysis
          ? recentAnalysis.timestamp
          : new Date().toISOString(),
      },
    };

    try {
      const response = await fetch(`${API_URL}/session/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionData),
      });

      const result = await response.json();

      if (result.sessionId) {
        // Store session ID in localStorage for use in games
        localStorage.setItem("sessionId", result.sessionId);
        localStorage.setItem("userName", user.username);

        alert(
          "✅ Your emotion analysis has been saved! Starting your career journey...",
        );

        // Navigate to game.html after short delay
        setTimeout(() => {
          window.location.href = "/html/game.html";
        }, 1500);
      } else {
        throw new Error("Failed to create session");
      }
    } catch (error) {
      console.error("Error creating session:", error);
      alert("⚠️ Could not connect to server. Proceeding with local data...");

      // Still proceed but without server session
      localStorage.setItem("sessionId", "local_" + Date.now());
      localStorage.setItem("userName", user.username);

      setTimeout(() => {
        window.location.href = "/html/game.html";
      }, 1500);
    }
  }

  loadAnalysisHistory() {
    const currentUser = this.getCurrentUser();

    if (!currentUser || !currentUser.emotionAnalyses) {
      return;
    }

    const historyList = document.getElementById("historyList");
    const analyses = currentUser.emotionAnalyses.slice(-10); // Show last 10

    if (analyses.length === 0) {
      historyList.innerHTML =
        '<p class="empty-message">No analysis history yet</p>';
      return;
    }

    historyList.innerHTML = analyses
      .reverse()
      .map(
        (analysis, index) => `
      <div class="history-item">
        <div class="history-info">
          <div class="history-date">${this.formatDateTime(analysis.timestamp)}</div>
          <div class="history-emotion">
            Dominant: ${analysis.dominantEmotion} | Stress: ${analysis.stressLevel} | Happy: ${analysis.happyScore}%
          </div>
        </div>
        <button class="history-delete" onclick="emotionDetector.deleteAnalysis(${analysis.id}, ${index})">
          ✕
        </button>
      </div>
    `,
      )
      .join("");
  }

  deleteAnalysis(analysisId, index) {
    const currentUser = this.getCurrentUser();

    if (!currentUser || !currentUser.emotionAnalyses) return;

    // Remove the analysis
    currentUser.emotionAnalyses = currentUser.emotionAnalyses.filter(
      (a) => a.id !== analysisId,
    );

    // Update storage
    localStorage.setItem("cssnova_current_user", JSON.stringify(currentUser));

    const users = JSON.parse(localStorage.getItem("cssnova_users") || "[]");
    const userIndex = users.findIndex((u) => u.id === currentUser.id);
    if (userIndex !== -1) {
      users[userIndex] = currentUser;
      localStorage.setItem("cssnova_users", JSON.stringify(users));
    }

    this.loadAnalysisHistory();
  }

  formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  formatDateTime(isoString) {
    const date = new Date(isoString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let dateStr = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    if (date.toDateString() === today.toDateString()) {
      dateStr = "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      dateStr = "Yesterday";
    }

    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return `${dateStr} at ${timeStr}`;
  }
}

// Initialize emotion detector when DOM is ready
let emotionDetector;

console.log("face.js loaded - initializing...");

if (document.readyState === "loading") {
  console.log("Waiting for DOM to load...");
  document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM loaded - creating EmotionDetector...");
    emotionDetector = new EmotionDetector();
  });
} else {
  console.log("DOM already loaded - creating EmotionDetector...");
  emotionDetector = new EmotionDetector();
}
