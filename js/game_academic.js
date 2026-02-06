// ============================================================================
// GAME 3: ACADEMIC QUESTIONS WITH 10-SECOND TIMER + CAREER RECOMMENDATION
// ============================================================================

const API_URL = "/api";
let sessionId = null;
let academicQuestions = [];
let currentQuestionIndex = 0;
let gameActive = false;
let timer = 10;
let timerInterval = null;
let questionInterval = null;

// Three.js game setup
let scene,
  camera,
  renderer,
  playerTank,
  enemyTanks = [];
let keys = {};

// Initialize on page load
window.addEventListener("load", async () => {
  // Get session ID from localStorage
  sessionId = localStorage.getItem("sessionId");

  if (!sessionId) {
    alert("No session found! Please complete previous phases first.");
    window.location.href = "game2.html";
    return;
  }

  // Load academic questions
  await loadQuestions();

  // Initialize game
  initGame();

  // Show first question after 3 seconds
  setTimeout(() => {
    showQuestion();
    startQuestionCycle();
  }, 3000);
});

async function loadQuestions() {
  try {
    const response = await fetch(`${API_URL}/questions/academic?count=15`);
    const data = await response.json();
    academicQuestions = data.questions;
    console.log("Loaded academic questions:", academicQuestions.length);
  } catch (error) {
    console.error("Error loading questions:", error);
    alert("Failed to load questions. Make sure the API server is running!");
  }
}

function initGame() {
  // Setup Three.js scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xd2b48c);
  scene.fog = new THREE.FogExp2(0xd2b48c, 0.0002);

  // Camera
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    3000,
  );
  camera.position.set(0, 40, 50);

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

  // Desert ground
  const groundGeometry = new THREE.PlaneGeometry(5000, 5000, 100, 100);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0xd2b48c,
    roughness: 0.8,
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Add some hills to the terrain
  const positions = groundGeometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const height = Math.sin(x * 0.01) * Math.cos(z * 0.01) * 5;
    positions.setY(i, height);
  }
  positions.needsUpdate = true;

  // Player tank
  createPlayerTank();

  // Enemy tanks
  for (let i = 0; i < 5; i++) {
    createEnemyTank();
  }

  // Event listeners
  document.addEventListener("keydown", (e) => (keys[e.code] = true));
  document.addEventListener("keyup", (e) => (keys[e.code] = false));
  window.addEventListener("resize", onWindowResize);

  gameActive = true;
  animate();
}

function createPlayerTank() {
  const tankGroup = new THREE.Group();

  // Body
  const bodyGeometry = new THREE.BoxGeometry(6, 2, 8);
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x228b22 });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 1;
  body.castShadow = true;
  tankGroup.add(body);

  // Turret
  const turretGeometry = new THREE.CylinderGeometry(2, 2, 1.5, 8);
  const turretMaterial = new THREE.MeshStandardMaterial({ color: 0x1a5f1a });
  const turret = new THREE.Mesh(turretGeometry, turretMaterial);
  turret.position.y = 2.75;
  turret.castShadow = true;
  tankGroup.add(turret);

  // Cannon
  const cannonGeometry = new THREE.CylinderGeometry(0.3, 0.3, 5);
  const cannonMaterial = new THREE.MeshStandardMaterial({ color: 0x0f4f0f });
  const cannon = new THREE.Mesh(cannonGeometry, cannonMaterial);
  cannon.rotation.z = Math.PI / 2;
  cannon.position.set(2.5, 2.75, 0);
  cannon.castShadow = true;
  tankGroup.add(cannon);

  tankGroup.position.set(0, 0, 0);
  scene.add(tankGroup);
  playerTank = tankGroup;
}

function createEnemyTank() {
  const tankGroup = new THREE.Group();

  const bodyGeometry = new THREE.BoxGeometry(5, 1.8, 7);
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0.9;
  body.castShadow = true;
  tankGroup.add(body);

  const turretGeometry = new THREE.CylinderGeometry(1.8, 1.8, 1.3, 8);
  const turretMaterial = new THREE.MeshStandardMaterial({ color: 0x654321 });
  const turret = new THREE.Mesh(turretGeometry, turretMaterial);
  turret.position.y = 2.25;
  tankGroup.add(turret);

  // Random position
  const angle = Math.random() * Math.PI * 2;
  const distance = 60 + Math.random() * 80;
  tankGroup.position.set(
    Math.cos(angle) * distance,
    0,
    Math.sin(angle) * distance,
  );

  scene.add(tankGroup);
  enemyTanks.push(tankGroup);
}

function animate() {
  if (!gameActive) return;
  requestAnimationFrame(animate);

  // Player movement
  if (playerTank) {
    if (keys["KeyW"] || keys["ArrowUp"]) {
      playerTank.position.z -= 0.8;
      playerTank.rotation.y = 0;
    }
    if (keys["KeyS"] || keys["ArrowDown"]) {
      playerTank.position.z += 0.8;
      playerTank.rotation.y = Math.PI;
    }
    if (keys["KeyA"] || keys["ArrowLeft"]) {
      playerTank.position.x -= 0.8;
      playerTank.rotation.y = Math.PI / 2;
    }
    if (keys["KeyD"] || keys["ArrowRight"]) {
      playerTank.position.x += 0.8;
      playerTank.rotation.y = -Math.PI / 2;
    }

    // Camera follows player
    camera.position.x = playerTank.position.x;
    camera.position.z = playerTank.position.z + 50;
    camera.lookAt(playerTank.position);
  }

  // Animate enemy tanks
  enemyTanks.forEach((tank) => {
    tank.rotation.y += 0.01;
  });

  renderer.render(scene, camera);
}

function startQuestionCycle() {
  // Show a new question every 10 seconds automatically
  questionInterval = setInterval(() => {
    if (currentQuestionIndex < academicQuestions.length) {
      // If a question is still showing, auto-select random answer
      if (document.getElementById("questionPopup").style.display === "block") {
        const question = academicQuestions[currentQuestionIndex];
        const randomOption = Math.floor(
          Math.random() * question.options.length,
        );
        selectAnswer(randomOption, true);
      }

      // Small delay then show next
      setTimeout(() => {
        if (currentQuestionIndex < academicQuestions.length) {
          showQuestion();
        } else {
          clearInterval(questionInterval);
          endGame();
        }
      }, 1000);
    } else {
      clearInterval(questionInterval);
      endGame();
    }
  }, 11000); // 10 seconds for question + 1 second buffer
}

function showQuestion() {
  if (currentQuestionIndex >= academicQuestions.length) {
    endGame();
    return;
  }

  const question = academicQuestions[currentQuestionIndex];

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
  document.getElementById("timer").style.color = "#ff9900";

  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    timer--;
    document.getElementById("timer").textContent = timer;

    // Change color as time runs out
    if (timer <= 3) {
      document.getElementById("timer").style.color = "#ff0000";
      document.getElementById("timer").style.animation = "pulse 0.5s infinite";
    } else if (timer <= 5) {
      document.getElementById("timer").style.color = "#ff6600";
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
    `ACADEMIC QUESTIONS: ${currentQuestionIndex}/15`;
}

async function selectAnswer(optionIndex, autoSelected = false) {
  clearInterval(timerInterval);
  document.getElementById("timer").style.display = "none";

  const question = academicQuestions[currentQuestionIndex];
  const selectedOption = question.options[optionIndex];

  // Save answer to database
  try {
    await fetch(`${API_URL}/answer/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: sessionId,
        gameType: "academic",
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
}

async function endGame() {
  gameActive = false;
  clearInterval(timerInterval);
  clearInterval(questionInterval);

  document.getElementById("finalScore").textContent = currentQuestionIndex;
  document.getElementById("gameOver").style.display = "block";

  // Get career recommendation
  try {
    const response = await fetch(`${API_URL}/career/recommend/${sessionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const recommendation = await response.json();

    // Display recommendation
    document.getElementById("gameOverTitle").textContent =
      "Career Analysis Complete! 🎓";
    document.getElementById("gameOverText").textContent =
      "Based on your emotional intelligence, reasoning ability, and academic interests...";
    document.getElementById("recommendedCareer").textContent =
      recommendation.recommendedCareer;

    // Show career path
    document.getElementById("careerPath").textContent =
      recommendation.careerPath;

    // Show top 5 matches
    const matchesList = document.getElementById("careerMatches");
    matchesList.innerHTML = "";
    recommendation.allMatches.forEach((match, index) => {
      const li = document.createElement("li");
      li.textContent = `${match.career} (${match.score} points)`;
      li.style.marginBottom = "5px";
      matchesList.appendChild(li);
    });

    // Show view details button
    document.getElementById("viewDetailsBtn").style.display = "inline-block";

    console.log("Career Recommendation:", recommendation);
  } catch (error) {
    console.error("Error getting career recommendation:", error);
    document.getElementById("recommendedCareer").textContent =
      "Error loading recommendation";
  }
}

function toggleCareerDetails() {
  const details = document.getElementById("careerDetails");
  const btn = document.getElementById("viewDetailsBtn");

  if (details.style.display === "none") {
    details.style.display = "block";
    btn.textContent = "Hide Career Details";
  } else {
    details.style.display = "none";
    btn.textContent = "View Career Details";
  }
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
    50% { transform: scale(1.15); }
}
`;
document.head.appendChild(style);
