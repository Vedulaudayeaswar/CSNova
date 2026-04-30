class EmotionDetectorCNN {
  constructor() {
    this.video = document.getElementById("video");
    this.canvas = document.getElementById("canvas");
    this.ctx = this.canvas.getContext("2d");

    this.isAnalyzing = false;
    this.startTime = null;
    this.frameCount = 0;
    this.emotionHistory = [];
    this.cameraReady = false;

    this.emotionMap = {
      happy: { icon: "😊", color: "#84fab0" },
      sad: { icon: "😢", color: "#4facfe" },
      angry: { icon: "😠", color: "#fa709a" },
      fear: { icon: "😨", color: "#fb5283" },
      disgust: { icon: "🤢", color: "#ff6b6b" },
      surprise: { icon: "😮", color: "#ffd89b" },
      neutral: { icon: "😐", color: "#95a5a6" },
    };

    this.sessionStats = {
      happy: 0,
      sad: 0,
      stressed: 0,
      neutral: 0,
      totalFrames: 0,
      confidence: 0,
    };

    this.latestAnalysis = null;
    this.API_URL = "/api";

    this.init();
  }

  async init() {
    try {
      const spinner = document.getElementById("spinner");
      spinner.querySelector("p").textContent = "Requesting camera access...";
      await this.setupCamera();
      spinner.style.display = "none";
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

      const enableBtn = document.getElementById("enableCameraBtn");
      if (enableBtn && error.name === "NotAllowedError") {
        enableBtn.style.display = "block";
      }

      this.attachEventListeners();
    }
  }

  async setupCamera() {
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
        resolve();
      };
    });
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
    if (!this.cameraReady) {
      alert("Camera is not ready yet. Please wait...");
      return;
    }

    this.isAnalyzing = true;
    this.startTime = Date.now();
    this.frameCount = 0;
    this.emotionHistory = [];
    this.latestAnalysis = null;
    this.sessionStats = {
      happy: 0,
      sad: 0,
      stressed: 0,
      neutral: 0,
      totalFrames: 0,
      confidence: 0,
    };

    document.getElementById("startBtn").style.display = "none";
    document.getElementById("stopBtn").style.display = "inline-block";
    document.getElementById("saveBtn").style.display = "none";
    document.getElementById("resultsSection").style.display = "none";

    this.detectEmotions();
  }

  async detectEmotions() {
    if (!this.isAnalyzing) {
      return;
    }

    try {
      this.ctx.drawImage(
        this.video,
        0,
        0,
        this.canvas.width,
        this.canvas.height,
      );
      const imageData = this.canvas.toDataURL("image/jpeg", 0.8);

      const response = await fetch(`${this.API_URL}/emotion/detect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: imageData }),
      });

      const result = await response.json();
      this.frameCount += 1;
      document.getElementById("sessionTime").textContent = this.formatTime(
        Date.now() - this.startTime,
      );
      document.getElementById("frameCount").textContent = this.frameCount;

      if (!response.ok || result.error) {
        throw new Error(result.details || result.error || response.statusText);
      }

      const emotionData = this.processEmotionResult(result);
      this.latestAnalysis = emotionData;

      if (emotionData.faceDetected) {
        this.emotionHistory.push({
          timestamp: Date.now(),
          emotions: emotionData,
        });
        this.updateEmotionDisplay(emotionData);
        this.aggregateStats(emotionData);
      } else {
        this.updateEmotionDisplay(null);
      }
    } catch (error) {
      console.error("Emotion detection error:", error);
      this.showErrorMessage(
        "Emotion detection is temporarily unavailable. Please try again.",
      );
      this.stopAnalysis();
      return;
    }

    setTimeout(() => this.detectEmotions(), 600);
  }

  processEmotionResult(result) {
    const emotionScores = result.emotion_scores || result.emotionScores || {};
    const happy = Math.round(result.happy ?? emotionScores.happy ?? 0);
    const sad = Math.round(result.sad ?? emotionScores.sad ?? 0);
    const stressed = Math.round(result.stressed ?? 0);
    const neutral = Math.round(result.neutral ?? emotionScores.neutral ?? 0);
    const dominant = (result.dominantEmotion || result.emotion || "Neutral")
      .toString()
      .toLowerCase();

    return {
      faceDetected:
        result.face_detected ?? result.faceDetected ?? Boolean(result.face_box),
      dominant,
      confidence: Math.round(result.confidence ?? 0),
      happy,
      sad,
      stressed,
      neutral,
      allEmotions: emotionScores,
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

    if (!emotionData || !emotionData.faceDetected) {
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

    const emotionInfo =
      this.emotionMap[emotionData.dominant] || this.emotionMap.neutral;
    badge.innerHTML = `
      <span class="emotion-icon">${emotionInfo.icon}</span>
      <span class="emotion-name">${emotionData.dominant.charAt(0).toUpperCase() + emotionData.dominant.slice(1)}</span>
      <span class="emotion-confidence">${emotionData.confidence}%</span>
    `;

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
    this.sessionStats.neutral += emotionData.neutral;
    this.sessionStats.confidence += emotionData.confidence;
    this.sessionStats.totalFrames += 1;
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
      alert(
        "No analysis frames were captured yet. Keep your face centered in the camera for a few seconds, then stop and save again.",
      );
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
    const avgNeutral = Math.round(
      this.sessionStats.neutral / this.sessionStats.totalFrames,
    );
    const avgConfidence = Math.round(
      this.sessionStats.confidence / this.sessionStats.totalFrames,
    );

    let dominantEmotion = "Neutral";
    if (avgHappy > avgSad && avgHappy > avgStressed) {
      dominantEmotion = "Happy";
    } else if (avgSad > avgHappy && avgSad > avgStressed) {
      dominantEmotion = "Sad";
    } else if (avgStressed > avgHappy && avgStressed > avgSad) {
      dominantEmotion = "Stressed";
    }

    document.getElementById("resultsSection").style.display = "block";
    document.getElementById("dominantEmotion").textContent = dominantEmotion;
    document.getElementById("stressLevel").textContent = `${avgStressed}%`;

    const resultsNote = document.getElementById("resultsNote");
    if (avgStressed > 60) {
      resultsNote.textContent =
        "High stress detected. Consider careers with balance and clear pathways.";
    } else if (avgHappy > 60) {
      resultsNote.textContent =
        "Positive emotions detected. You seem engaged and motivated.";
    } else if (avgNeutral > 50) {
      resultsNote.textContent =
        "Balanced emotional state detected. Good for structured career planning.";
    } else {
      resultsNote.textContent =
        "You maintained a steady emotional pattern. Good for decision-making.";
    }

    this.latestAnalysis = {
      faceDetected: true,
      dominant: dominantEmotion.toLowerCase(),
      confidence: avgConfidence,
      happy: avgHappy,
      sad: avgSad,
      stressed: avgStressed,
      neutral: avgNeutral,
    };
  }

  getCurrentUserName() {
    const currentUserJson = localStorage.getItem("cssnova_current_user");
    if (currentUserJson) {
      try {
        const currentUser = JSON.parse(currentUserJson);
        if (currentUser?.username) {
          return currentUser.username;
        }
        if (currentUser?.name) {
          return currentUser.name;
        }
      } catch (error) {
        console.warn("Failed to parse current user:", error);
      }
    }

    const storedUserName = localStorage.getItem("userName");
    if (storedUserName) {
      return storedUserName;
    }

    return "Guest Student";
  }

  getNextGameUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const nextGame = urlParams.get("next");

    if (!nextGame) {
      return "/html/game.html";
    }

    const allowedTargets = new Set(["game.html", "game2.html", "game3.html"]);
    if (!allowedTargets.has(nextGame)) {
      return "/html/game.html";
    }

    const sessionId = localStorage.getItem("sessionId");
    const nextUrl = `/html/${nextGame}`;
    return sessionId
      ? `${nextUrl}?session_id=${encodeURIComponent(sessionId)}`
      : nextUrl;
  }

  saveResults() {
    if (!this.latestAnalysis || this.sessionStats.totalFrames === 0) {
      alert("Run the analysis first so we can store your results.");
      return;
    }

    const results = {
      timestamp: new Date().toISOString(),
      avgHappy: Math.round(
        this.sessionStats.happy / this.sessionStats.totalFrames,
      ),
      avgSad: Math.round(this.sessionStats.sad / this.sessionStats.totalFrames),
      avgStressed: Math.round(
        this.sessionStats.stressed / this.sessionStats.totalFrames,
      ),
      avgNeutral: Math.round(
        this.sessionStats.neutral / this.sessionStats.totalFrames,
      ),
      averageConfidence: Math.round(
        this.sessionStats.confidence / this.sessionStats.totalFrames,
      ),
      totalFrames: this.sessionStats.totalFrames,
      dominantEmotion: this.latestAnalysis.dominant,
    };

    let history = JSON.parse(localStorage.getItem("emotionHistory") || "[]");
    history.unshift(results);
    if (history.length > 10) {
      history = history.slice(0, 10);
    }
    localStorage.setItem("emotionHistory", JSON.stringify(history));

    this.createSessionInDatabase(results);
  }

  async createSessionInDatabase(results) {
    const sessionData = {
      userName: this.getCurrentUserName(),
      faceEmotion: results.dominantEmotion || "neutral",
      faceConfidence: results.averageConfidence || 0,
      faceAnalysisData: {
        dominantEmotion: results.dominantEmotion || "neutral",
        happyScore: results.avgHappy,
        sadScore: results.avgSad,
        stressScore: results.avgStressed,
        neutralScore: results.avgNeutral,
        averageConfidence: results.averageConfidence,
        framesAnalyzed: results.totalFrames,
        timestamp: results.timestamp,
      },
    };

    try {
      const response = await fetch(`${this.API_URL}/session/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create session (${response.status})`);
      }

      const result = await response.json();
      if (!result.sessionId) {
        throw new Error("Session ID missing from response");
      }

      localStorage.setItem("sessionId", result.sessionId);
      localStorage.setItem("userName", sessionData.userName);
      localStorage.setItem("faceEmotion", sessionData.faceEmotion);
      localStorage.setItem(
        "faceAnalysisData",
        JSON.stringify(sessionData.faceAnalysisData),
      );

      alert("✅ Emotion analysis saved. Starting your career journey...");
      setTimeout(() => {
        window.location.href = this.getNextGameUrl();
      }, 1000);
    } catch (error) {
      console.error("Error creating session:", error);
      localStorage.setItem("sessionId", `local_${Date.now()}`);
      localStorage.setItem("userName", sessionData.userName);
      localStorage.setItem("faceEmotion", sessionData.faceEmotion);
      localStorage.setItem(
        "faceAnalysisData",
        JSON.stringify(sessionData.faceAnalysisData),
      );

      alert("⚠️ Could not save to SQLite. Continuing with local session data.");
      setTimeout(() => {
        window.location.href = this.getNextGameUrl();
      }, 1000);
    }
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
        (item) => `
      <div class="history-item">
        <div class="history-header">
          <span class="history-date">${this.formatDateTime(item.timestamp)}</span>
        </div>
        <div class="history-stats">
          <span>😊 ${item.avgHappy}%</span>
          <span>😢 ${item.avgSad}%</span>
          <span>😰 ${item.avgStressed}%</span>
          <span>🌤️ ${item.avgNeutral ?? 0}%</span>
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

  showErrorMessage(message) {
    const errorDiv = document.createElement("div");
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(231, 76, 60, 0.95);
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 12px;
      z-index: 9999;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
      font-size: 0.95rem;
    `;
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 4000);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    new EmotionDetectorCNN();
  });
} else {
  new EmotionDetectorCNN();
}
