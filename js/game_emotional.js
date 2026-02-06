// ============================================================================
// GAME 1: EMOTIONAL INTELLIGENCE QUESTIONS
// ============================================================================

const API_URL = "/api";
let sessionId = null;
let emotionalQuestions = [];
let currentQuestionIndex = 0;
let gameActive = false;

// Three.js game setup (simplified pirate game)
let scene,
  camera,
  renderer,
  playerShip,
  pirateShips = [];
let keys = {};

// Initialize on page load
window.addEventListener("load", async () => {
  // Get session ID from localStorage (set by face.html)
  sessionId = localStorage.getItem("sessionId");

  if (!sessionId) {
    alert("No session found! Please complete face detection first.");
    window.location.href = "face.html";
    return;
  }

  // Load emotional questions
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
    const response = await fetch(`${API_URL}/questions/emotional?count=10`);
    const data = await response.json();
    emotionalQuestions = data.questions;
    console.log("Loaded emotional questions:", emotionalQuestions.length);
  } catch (error) {
    console.error("Error loading questions:", error);
    alert("Failed to load questions. Make sure the API server is running!");
  }
}

function initGame() {
  // Setup Three.js scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.FogExp2(0x87ceeb, 0.0003);

  // Camera
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    2000,
  );
  camera.position.set(0, 20, 30);

  // Renderer
  renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById("gameCanvas"),
    antialias: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
  sunLight.position.set(100, 100, 50);
  sunLight.castShadow = true;
  scene.add(sunLight);

  // Ocean
  const oceanGeometry = new THREE.PlaneGeometry(5000, 5000, 100, 100);
  const oceanMaterial = new THREE.MeshStandardMaterial({
    color: 0x0066cc,
    roughness: 0.5,
    metalness: 0.1,
  });
  const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
  ocean.rotation.x = -Math.PI / 2;
  ocean.receiveShadow = true;
  scene.add(ocean);

  // Player ship
  createPlayerShip();

  // Pirate ships
  for (let i = 0; i < 3; i++) {
    createPirateShip();
  }

  // Event listeners
  document.addEventListener("keydown", (e) => (keys[e.code] = true));
  document.addEventListener("keyup", (e) => (keys[e.code] = false));
  window.addEventListener("resize", onWindowResize);

  gameActive = true;
  animate();
}

function createPlayerShip() {
  // Simple ship using boxes
  const shipGroup = new THREE.Group();

  // Hull
  const hullGeometry = new THREE.BoxGeometry(4, 2, 8);
  const hullMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
  const hull = new THREE.Mesh(hullGeometry, hullMaterial);
  hull.castShadow = true;
  shipGroup.add(hull);

  // Mast
  const mastGeometry = new THREE.CylinderGeometry(0.2, 0.2, 8);
  const mastMaterial = new THREE.MeshStandardMaterial({ color: 0x654321 });
  const mast = new THREE.Mesh(mastGeometry, mastMaterial);
  mast.position.y = 5;
  mast.castShadow = true;
  shipGroup.add(mast);

  // Sail
  const sailGeometry = new THREE.PlaneGeometry(6, 6);
  const sailMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
  });
  const sail = new THREE.Mesh(sailGeometry, sailMaterial);
  sail.position.set(0, 5, 0);
  sail.castShadow = true;
  shipGroup.add(sail);

  shipGroup.position.set(0, 1, 0);
  scene.add(shipGroup);
  playerShip = shipGroup;
}

function createPirateShip() {
  const shipGroup = new THREE.Group();

  const hullGeometry = new THREE.BoxGeometry(3, 1.5, 6);
  const hullMaterial = new THREE.MeshStandardMaterial({ color: 0x2f2f2f });
  const hull = new THREE.Mesh(hullGeometry, hullMaterial);
  hull.castShadow = true;
  shipGroup.add(hull);

  const mastGeometry = new THREE.CylinderGeometry(0.15, 0.15, 6);
  const mastMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
  const mast = new THREE.Mesh(mastGeometry, mastMaterial);
  mast.position.y = 3.5;
  shipGroup.add(mast);

  // Random position around player
  const angle = Math.random() * Math.PI * 2;
  const distance = 50 + Math.random() * 50;
  shipGroup.position.set(
    Math.cos(angle) * distance,
    1,
    Math.sin(angle) * distance,
  );

  scene.add(shipGroup);
  pirateShips.push(shipGroup);
}

function animate() {
  if (!gameActive) return;
  requestAnimationFrame(animate);

  // Player movement
  if (playerShip) {
    if (keys["KeyW"] || keys["ArrowUp"]) {
      playerShip.position.z -= 0.5;
    }
    if (keys["KeyS"] || keys["ArrowDown"]) {
      playerShip.position.z += 0.5;
    }
    if (keys["KeyA"] || keys["ArrowLeft"]) {
      playerShip.position.x -= 0.5;
      playerShip.rotation.y = Math.PI / 6;
    } else if (keys["KeyD"] || keys["ArrowRight"]) {
      playerShip.position.x += 0.5;
      playerShip.rotation.y = -Math.PI / 6;
    } else {
      playerShip.rotation.y = 0;
    }

    // Camera follows player
    camera.position.x = playerShip.position.x;
    camera.position.z = playerShip.position.z + 30;
    camera.lookAt(playerShip.position);
  }

  // Animate pirate ships (simple rotation)
  pirateShips.forEach((ship) => {
    ship.rotation.y += 0.01;
  });

  renderer.render(scene, camera);
}

function showQuestion() {
  if (currentQuestionIndex >= emotionalQuestions.length) {
    endGame();
    return;
  }

  const question = emotionalQuestions[currentQuestionIndex];

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

  // Update score display
  document.getElementById("score").textContent =
    `EMOTIONAL QUESTIONS: ${currentQuestionIndex}/10`;
}

async function selectAnswer(optionIndex) {
  const question = emotionalQuestions[currentQuestionIndex];
  const selectedOption = question.options[optionIndex];

  // Save answer to database
  try {
    await fetch(`${API_URL}/answer/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: sessionId,
        gameType: "emotional",
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

  // Show next question after 5 seconds
  if (currentQuestionIndex < emotionalQuestions.length) {
    setTimeout(() => {
      showQuestion();
    }, 5000);
  } else {
    setTimeout(() => {
      endGame();
    }, 2000);
  }
}

function endGame() {
  gameActive = false;
  document.getElementById("gameOverTitle").textContent =
    "Emotional Phase Complete!";
  document.getElementById("gameOverText").textContent =
    "Great job! Ready for the reasoning phase?";
  document.getElementById("finalScore").textContent = currentQuestionIndex;
  document.getElementById("gameOver").style.display = "block";
}

function goToNextPhase() {
  window.location.href = "game2.html";
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
