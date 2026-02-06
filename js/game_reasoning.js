// ============================================================================
// GAME 2: REASONING QUESTIONS WITH 10-SECOND TIMER
// ============================================================================

const API_URL = "/api";
let sessionId = null;
let reasoningQuestions = [];
let currentQuestionIndex = 0;
let gameActive = false;
let timer = 10;
let timerInterval = null;

// Three.js game setup
let scene,
  camera,
  renderer,
  playerJet,
  enemyJets = [];
let keys = {};

// Initialize on page load
window.addEventListener("load", async () => {
  // Get session ID from localStorage
  sessionId = localStorage.getItem("sessionId");

  if (!sessionId) {
    alert("No session found! Please complete previous phases first.");
    window.location.href = "game.html";
    return;
  }

  // Load reasoning questions
  await loadQuestions();

  // Initialize game
  initGame();

  // Show first question after 3 seconds
  setTimeout(() => {
    showQuestion();
  }, 3000);
});

async function loadQuestions() {
  try {
    const response = await fetch(`${API_URL}/questions/reasoning?count=10`);
    const data = await response.json();
    reasoningQuestions = data.questions;
    console.log("Loaded reasoning questions:", reasoningQuestions.length);
  } catch (error) {
    console.error("Error loading questions:", error);
    alert("Failed to load questions. Make sure the API server is running!");
  }
}

function initGame() {
  // Setup Three.js scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.FogExp2(0x87ceeb, 0.0002);

  // Camera
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    3000,
  );
  camera.position.set(0, 30, 40);

  // Renderer
  renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById("gameCanvas"),
    antialias: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
  sunLight.position.set(100, 200, 50);
  sunLight.castShadow = true;
  scene.add(sunLight);

  // Sky
  const skyGeometry = new THREE.SphereGeometry(2000, 32, 32);
  const skyMaterial = new THREE.MeshBasicMaterial({
    color: 0x87ceeb,
    side: THREE.BackSide,
  });
  const sky = new THREE.Mesh(skyGeometry, skyMaterial);
  scene.add(sky);

  // Ground
  const groundGeometry = new THREE.PlaneGeometry(5000, 5000);
  const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x228b22 });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -50;
  ground.receiveShadow = true;
  scene.add(ground);

  // Player jet
  createPlayerJet();

  // Enemy jets
  for (let i = 0; i < 4; i++) {
    createEnemyJet();
  }

  // Event listeners
  document.addEventListener("keydown", (e) => (keys[e.code] = true));
  document.addEventListener("keyup", (e) => (keys[e.code] = false));
  window.addEventListener("resize", onWindowResize);

  gameActive = true;
  animate();
}

function createPlayerJet() {
  const jetGroup = new THREE.Group();

  // Fuselage
  const fuselageGeometry = new THREE.ConeGeometry(2, 10, 4);
  const fuselageMaterial = new THREE.MeshStandardMaterial({ color: 0x0000ff });
  const fuselage = new THREE.Mesh(fuselageGeometry, fuselageMaterial);
  fuselage.rotation.x = Math.PI / 2;
  fuselage.castShadow = true;
  jetGroup.add(fuselage);

  // Wings
  const wingGeometry = new THREE.BoxGeometry(12, 0.3, 3);
  const wingMaterial = new THREE.MeshStandardMaterial({ color: 0x0000cc });
  const wings = new THREE.Mesh(wingGeometry, wingMaterial);
  wings.castShadow = true;
  jetGroup.add(wings);

  jetGroup.position.set(0, 10, 0);
  scene.add(jetGroup);
  playerJet = jetGroup;
}

function createEnemyJet() {
  const jetGroup = new THREE.Group();

  const fuselageGeometry = new THREE.ConeGeometry(1.5, 8, 4);
  const fuselageMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  const fuselage = new THREE.Mesh(fuselageGeometry, fuselageMaterial);
  fuselage.rotation.x = Math.PI / 2;
  fuselage.castShadow = true;
  jetGroup.add(fuselage);

  const wingGeometry = new THREE.BoxGeometry(10, 0.25, 2.5);
  const wingMaterial = new THREE.MeshStandardMaterial({ color: 0xcc0000 });
  const wings = new THREE.Mesh(wingGeometry, wingMaterial);
  jetGroup.add(wings);

  // Random position
  const angle = Math.random() * Math.PI * 2;
  const distance = 80 + Math.random() * 100;
  jetGroup.position.set(
    Math.cos(angle) * distance,
    10 + Math.random() * 20,
    Math.sin(angle) * distance,
  );

  scene.add(jetGroup);
  enemyJets.push(jetGroup);
}

function animate() {
  if (!gameActive) return;
  requestAnimationFrame(animate);

  // Player movement
  if (playerJet) {
    if (keys["KeyW"] || keys["ArrowUp"]) {
      playerJet.position.z -= 1.0;
    }
    if (keys["KeyS"] || keys["ArrowDown"]) {
      playerJet.position.z += 1.0;
    }
    if (keys["KeyA"] || keys["ArrowLeft"]) {
      playerJet.position.x -= 1.0;
      playerJet.rotation.z = Math.PI / 8;
    } else if (keys["KeyD"] || keys["ArrowRight"]) {
      playerJet.position.x += 1.0;
      playerJet.rotation.z = -Math.PI / 8;
    } else {
      playerJet.rotation.z = 0;
    }

    // Vertical movement
    if (keys["KeyQ"]) {
      playerJet.position.y += 0.5;
    }
    if (keys["KeyE"]) {
      playerJet.position.y -= 0.5;
    }

    // Camera follows player
    camera.position.x = playerJet.position.x;
    camera.position.y = playerJet.position.y + 30;
    camera.position.z = playerJet.position.z + 40;
    camera.lookAt(playerJet.position);
  }

  // Animate enemy jets
  enemyJets.forEach((jet) => {
    jet.rotation.y += 0.02;
    jet.position.y += Math.sin(Date.now() * 0.001) * 0.05;
  });

  renderer.render(scene, camera);
}

function showQuestion() {
  if (currentQuestionIndex >= reasoningQuestions.length) {
    endGame();
    return;
  }

  const question = reasoningQuestions[currentQuestionIndex];

  // Display question
  document.getElementById("questionText").textContent = question.question;

  // Display options
  const buttons = document.querySelectorAll(".answer-btn");
  question.options.forEach((option, index) => {
    if (buttons[index]) {
      buttons[index].textContent = option.text;
      buttons[index].style.display = "block";
    }
  });

  // Show popup
  document.getElementById("questionPopup").style.display = "block";

  // Start 10-second timer
  timer = 10;
  document.getElementById("timer").textContent = timer;
  document.getElementById("timer").style.display = "block";

  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    timer--;
    document.getElementById("timer").textContent = timer;

    // Change color as time runs out
    if (timer <= 3) {
      document.getElementById("timer").style.color = "#ff0000";
      document.getElementById("timer").style.animation = "pulse 0.5s infinite";
    } else if (timer <= 5) {
      document.getElementById("timer").style.color = "#ff9900";
    }

    if (timer <= 0) {
      clearInterval(timerInterval);
      // Auto-select random answer if time runs out
      const randomOption = Math.floor(Math.random() * question.options.length);
      selectAnswer(randomOption, true);
    }
  }, 1000);

  // Update score display
  document.getElementById("score").textContent =
    `REASONING QUESTIONS: ${currentQuestionIndex}/10`;
}

async function selectAnswer(optionIndex, autoSelected = false) {
  clearInterval(timerInterval);
  document.getElementById("timer").style.display = "none";

  const question = reasoningQuestions[currentQuestionIndex];
  const selectedOption = question.options[optionIndex];

  // Save answer to database
  try {
    await fetch(`${API_URL}/answer/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: sessionId,
        gameType: "reasoning",
        questionId: question.id,
        questionText: question.question,
        selectedOption: optionIndex,
        optionText: selectedOption.text,
        optionEffects: selectedOption.effects,
      }),
    });
  } catch (error) {
    console.error("Error saving answer:", error);
  }

  // Hide popup
  document.getElementById("questionPopup").style.display = "none";

  // Next question
  currentQuestionIndex++;

  // Show next question after 3 seconds
  if (currentQuestionIndex < reasoningQuestions.length) {
    setTimeout(() => {
      showQuestion();
    }, 3000);
  } else {
    setTimeout(() => {
      endGame();
    }, 2000);
  }
}

function endGame() {
  gameActive = false;
  clearInterval(timerInterval);
  document.getElementById("gameOverTitle").textContent =
    "Reasoning Phase Complete!";
  document.getElementById("gameOverText").textContent =
    "Excellent reasoning! Ready for academic questions?";
  document.getElementById("finalScore").textContent = currentQuestionIndex;
  document.getElementById("gameOver").style.display = "block";
}

function goToNextPhase() {
  window.location.href = "game3.html";
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Add pulse animation for timer
const style = document.createElement("style");
style.textContent = `
@keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
}
`;
document.head.appendChild(style);
