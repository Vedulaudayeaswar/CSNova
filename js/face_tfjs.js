// ============================================
// BROWSER-BASED EMOTION DETECTION USING FACE-API.JS
// No server needed - runs entirely in your browser!
// ============================================

class EmotionDetectorTFJS {
  constructor() {
    this.video = document.getElementById("video");
    this.canvas = document.getElementById("canvas");
    this.ctx = this.canvas.getContext("2d");

    this.isAnalyzing = false;
    this.startTime = null;
    this.frameCount = 0;
    this.emotionHistory = [];
    this.cameraReady = false;
    this.modelsLoaded = false;

    // Emotion mapping for face-api.js
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
      stressed: 0,
      totalFrames: 0,
    };

    this.init();
  }

  async init() {
    try {
      console.log("🚀 Initializing browser-based emotion detection...");
      const spinner = document.getElementById("spinner");
      spinner.querySelector("p").textContent = "Loading AI models...";

      // Load face-api.js models from CDN
      await this.loadModels();

      spinner.querySelector("p").textContent = "Requesting camera access...";

      // Setup camera
      await this.setupCamera();

      // Hide spinner
      spinner.style.display = "none";

      console.log("✅ System ready! Click 'Start Analysis' to begin.");
      this.attachEventListeners();
      this.loadAnalysisHistory();
    } catch (error) {
      console.error("❌ Initialization error:", error);
      const spinner = document.getElementById("spinner");
      const spinnerAnimation = spinner.querySelector(".spinner");
      if (spinnerAnimation) spinnerAnimation.style.display = "none";

      spinner.querySelector("p").innerHTML = `
        <div style="color: #e74c3c; text-align: center;">
          <p style="font-size: 1.2rem; margin-bottom: 1rem;">⚠️ Setup Error</p>
          <p>${error.message || "Failed to initialize"}</p>
          <p style="font-size: 0.9rem; margin-top: 1rem;">Please refresh and allow camera access.</p>
        </div>
      `;

      this.attachEventListeners();
    }
  }

  async loadModels() {
    try {
      console.log("📦 Loading face-api.js models from CDN...");

      const MODEL_URL =
        "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model";

      // Load required models
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ]);

      this.modelsLoaded = true;
      console.log("✅ Models loaded successfully!");
    } catch (error) {
      console.error("❌ Failed to load models:", error);
      throw new Error(
        "Failed to load AI models. Please check your internet connection.",
      );
    }
  }

  async setupCamera() {
    try {
      console.log("📷 Requesting camera access...");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: false,
      });

      this.video.srcObject = stream;

      return new Promise((resolve) => {
        this.video.onloadedmetadata = () => {
          this.video.play();
          this.canvas.width = this.video.videoWidth;
          this.canvas.height = this.video.videoHeight;
          this.cameraReady = true;
          console.log("✅ Camera ready!");
          resolve();
        };
      });
    } catch (error) {
      console.error("❌ Camera error:", error);
      throw new Error("Camera access denied. Please allow camera access.");
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
  }

  async startAnalysis() {
    console.log("🎬 Starting analysis...");

    if (!this.cameraReady || !this.modelsLoaded) {
      alert("Please wait for models and camera to be ready...");
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
      // Detect faces and expressions using face-api.js
      const detections = await faceapi
        .detectAllFaces(this.video, new faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions();

      // Update frame count and time
      this.frameCount++;
      const currentTime = Date.now() - this.startTime;
      document.getElementById("sessionTime").textContent =
        this.formatTime(currentTime);
      document.getElementById("frameCount").textContent = this.frameCount;

      if (detections.length > 0) {
        // Process first detected face
        const expressions = detections[0].expressions;
        const emotionData = this.processEmotions(expressions);

        this.emotionHistory.push({
          timestamp: Date.now(),
          emotions: emotionData,
        });

        this.updateEmotionDisplay(emotionData);
        this.aggregateStats(emotionData);
      } else {
        // No face detected
        this.updateEmotionDisplay(null);
      }
    } catch (error) {
      console.error("🔥 Detection error:", error);
    }

    // Continue detection loop (2 FPS)
    setTimeout(() => this.detectEmotions(), 500);
  }

  processEmotions(expressions) {
    // Convert face-api.js expressions to our format
    const happy = Math.round((expressions.happy || 0) * 100);
    const sad = Math.round((expressions.sad || 0) * 100);

    // Calculate stress from angry, fearful, disgusted
    const angry = (expressions.angry || 0) * 100;
    const fearful = (expressions.fearful || 0) * 100;
    const disgusted = (expressions.disgusted || 0) * 100;
    const stressed = Math.round(angry * 0.6 + fearful * 0.3 + disgusted * 0.1);

    // Find dominant emotion
    const emotionScores = {
      happy: expressions.happy || 0,
      sad: expressions.sad || 0,
      angry: expressions.angry || 0,
      fearful: expressions.fearful || 0,
      disgusted: expressions.disgusted || 0,
      surprised: expressions.surprised || 0,
      neutral: expressions.neutral || 0,
    };

    const dominant = Object.keys(emotionScores).reduce((a, b) =>
      emotionScores[a] > emotionScores[b] ? a : b,
    );

    return {
      happy: happy,
      sad: sad,
      stressed: stressed,
      dominant: dominant,
      confidence: Math.round(emotionScores[dominant] * 100),
      allEmotions: expressions,
    };
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

    // Update current emotion badge
    const emotionInfo =
      this.emotionMap[emotionData.dominant] || this.emotionMap.neutral;
    badge.innerHTML = `
      <span class="emotion-icon">${emotionInfo.icon}</span>
      <span class="emotion-name">${emotionData.dominant.charAt(0).toUpperCase() + emotionData.dominant.slice(1)}</span>
      <span class="emotion-confidence">${emotionData.confidence}%</span>
    `;

    // Update emotion bars
    happyBar.style.width = `${emotionData.happy}%`;
    sadBar.style.width = `${emotionData.sad}%`;
    stressedBar.style.width = `${emotionData.stressed}%`;
    happyValue.textContent = `${emotionData.happy}%`;
    sadValue.textContent = `${emotionData.sad}%`;
    stressedValue.textContent = `${emotionData.stressed}%`;
  }

  aggregateStats(emotionData) {
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

    this.displayResults();
  }

  displayResults() {
    if (this.sessionStats.totalFrames === 0) {
      alert("No face detected during analysis. Please try again.");
      return;
    }

    const avgHappy = Math.round(
      this.sessionStats.happy / this.sessionStats.totalFrames,
    );
    const avgSad = Math.round(
      this.sessionStats.sad / this.sessionStats.totalFrames,
    );
    const avgStressed = Math.round(
      this.sessionStats.stressed / this.sessionStats.totalFrames,
    );

    // Determine dominant emotion
    let dominantEmotion = "Neutral";
    if (avgHappy > avgSad && avgHappy > avgStressed) dominantEmotion = "Happy";
    else if (avgSad > avgHappy && avgSad > avgStressed) dominantEmotion = "Sad";
    else if (avgStressed > avgHappy && avgStressed > avgSad)
      dominantEmotion = "Stressed";

    // Show results
    document.getElementById("resultsSection").style.display = "block";
    document.getElementById("dominantEmotion").textContent = dominantEmotion;
    document.getElementById("stressLevel").textContent = `${avgStressed}%`;

    const resultsNote = document.getElementById("resultsNote");
    if (avgStressed > 60) {
      resultsNote.textContent =
        "High stress detected. Consider careers with work-life balance.";
    } else if (avgHappy > 60) {
      resultsNote.textContent =
        "Positive emotions detected. You seem engaged and motivated!";
    } else {
      resultsNote.textContent =
        "Balanced emotional state. Good for decision-making.";
    }
  }

  saveResults() {
    // Save to localStorage and redirect to game
    const results = {
      timestamp: new Date().toISOString(),
      avgHappy: Math.round(
        this.sessionStats.happy / this.sessionStats.totalFrames,
      ),
      avgSad: Math.round(this.sessionStats.sad / this.sessionStats.totalFrames),
      avgStressed: Math.round(
        this.sessionStats.stressed / this.sessionStats.totalFrames,
      ),
      totalFrames: this.sessionStats.totalFrames,
    };

    // Store in history
    let history = JSON.parse(localStorage.getItem("emotionHistory") || "[]");
    history.unshift(results);
    if (history.length > 10) history = history.slice(0, 10);
    localStorage.setItem("emotionHistory", JSON.stringify(history));

    // Redirect to game
    window.location.href = "/html/game.html";
  }

  loadAnalysisHistory() {
    const history = JSON.parse(localStorage.getItem("emotionHistory") || "[]");
    const historyList = document.getElementById("historyList");

    if (history.length === 0) {
      historyList.innerHTML =
        '<p class="empty-message">No analysis history yet</p>';
      return;
    }

    historyList.innerHTML = history
      .map(
        (item, index) => `
      <div class="history-item">
        <div class="history-header">
          <span class="history-date">${this.formatDateTime(item.timestamp)}</span>
        </div>
        <div class="history-stats">
          <span>😊 ${item.avgHappy}%</span>
          <span>😢 ${item.avgSad}%</span>
          <span>😰 ${item.avgStressed}%</span>
          <span>📊 ${item.totalFrames} frames</span>
        </div>
      </div>
    `,
      )
      .join("");
  }

  formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  formatDateTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString();
  }
}

// Initialize when page loads
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM loaded - creating EmotionDetectorTFJS...");
    new EmotionDetectorTFJS();
  });
} else {
  console.log("DOM already loaded - creating EmotionDetectorTFJS...");
  new EmotionDetectorTFJS();
}
