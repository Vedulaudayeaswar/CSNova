// ============================================================================
// C$S - TANK BATTLE MISSION
// Advanced Three.js 3D Game with Realistic Graphics
// ============================================================================

// Game State Variables
let scene, camera, renderer, clock;
let playerTank, safeZone;
let enemyTanks = [],
  missiles = [],
  particles = [],
  rocks = [];
let keys = {},
  mouse = { x: 0, y: 0 };
let health = 100,
  score = 0,
  tanksDestroyed = 0;
let gameState = "playing";
let questionsAnswered = 0,
  questionActive = false;
let sky, sun, terrain;
let targetPosition = new THREE.Vector3(0, 0, -1500);

// Career Questions Database - Loaded from Flask API
let questions = [];
let currentQuestion = null;
let questionTriggerCounter = 0;
let sessionId = null;
let careerRecommendationData = null; // Store full career recommendation

// Music control
let backgroundMusic = null;
let musicPlaying = false;

// Toggle music play/pause
function toggleMusic() {
  if (!backgroundMusic) {
    backgroundMusic = document.getElementById("backgroundMusic");
  }

  const musicBtn = document.getElementById("musicToggle");

  if (musicPlaying) {
    backgroundMusic.pause();
    musicPlaying = false;
    musicBtn.classList.remove("playing");
    musicBtn.textContent = "🔇"; // Muted icon
  } else {
    backgroundMusic.play().catch((err) => {
      console.log("Music play failed:", err);
    });
    musicPlaying = true;
    musicBtn.classList.add("playing");
    musicBtn.textContent = "🎵"; // Music icon
  }
}

// Fetch academic questions from Flask API
async function loadQuestions() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    sessionId =
      urlParams.get("session_id") || localStorage.getItem("sessionId");

    const response = await fetch(
      `http://localhost:5000/api/questions/academic?count=15&session_id=${sessionId}`,
    );
    const data = await response.json();
    questions = data.questions;
    console.log(
      `✅ Loaded ${questions.length} academic questions from AI dataset`,
    );
  } catch (error) {
    console.error("❌ Failed to load questions:", error);
    questions = [
      {
        question: "What is the capital of France?",
        answers: ["Paris", "London", "Berlin", "Madrid"],
        correct: 0,
      },
    ];
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

async function init() {
  // Load questions from Flask API first
  await loadQuestions();

  // Create Scene
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x87ceeb, 0.0003);

  // Create Camera
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    5000,
  );
  camera.position.set(0, 40, 60);

  // Create Renderer
  renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById("gameCanvas"),
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputEncoding = THREE.sRGBEncoding;

  // Clock for animations
  clock = new THREE.Clock();

  // Create World
  createSky();
  createSun();
  createTerrain();
  createRocks();

  // Create Game Objects
  createPlayerTank();
  createSafeZone();

  // Setup Lighting
  setupLighting();

  // Event Listeners
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  document.addEventListener("mousemove", onMouseMove);
  window.addEventListener("resize", onWindowResize);

  // Start Game Loop
  animate();
}

// ============================================================================
// WORLD CREATION
// ============================================================================

function createSky() {
  const skyGeometry = new THREE.SphereGeometry(4500, 32, 32);
  const skyMaterial = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(0x0077ff) },
      bottomColor: { value: new THREE.Color(0xd4a574) },
      offset: { value: 400 },
      exponent: { value: 0.6 },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + offset).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
      }
    `,
    side: THREE.BackSide,
  });

  sky = new THREE.Mesh(skyGeometry, skyMaterial);
  scene.add(sky);
}

function createSun() {
  const sunGeometry = new THREE.SphereGeometry(60, 32, 32);
  const sunMaterial = new THREE.MeshBasicMaterial({
    color: 0xfdb813,
    fog: false,
  });
  sun = new THREE.Mesh(sunGeometry, sunMaterial);
  sun.position.set(600, 400, -1000);
  scene.add(sun);
}

function createTerrain() {
  const geometry = new THREE.PlaneGeometry(5000, 5000, 150, 150);
  const positions = geometry.attributes.position;

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const height =
      Math.sin(x * 0.02) * Math.cos(z * 0.02) * 8 +
      Math.sin(x * 0.05) * Math.cos(z * 0.03) * 4;
    positions.setY(i, height);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: 0x8b7355,
    roughness: 0.9,
    metalness: 0.1,
  });

  terrain = new THREE.Mesh(geometry, material);
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.y = 0;
  terrain.receiveShadow = true;
  scene.add(terrain);

  // Add desert sand texture appearance
  const sandDetail = new THREE.Mesh(
    new THREE.PlaneGeometry(5000, 5000),
    new THREE.MeshStandardMaterial({
      color: 0xc2b280,
      roughness: 0.95,
      transparent: true,
      opacity: 0.3,
    }),
  );
  sandDetail.rotation.x = -Math.PI / 2;
  sandDetail.position.y = 0.1;
  sandDetail.receiveShadow = true;
  scene.add(sandDetail);
}

function createRocks() {
  for (let i = 0; i < 50; i++) {
    const size = 5 + Math.random() * 15;
    const rockGeo = new THREE.DodecahedronGeometry(size, 0);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x696969,
      roughness: 0.9,
      metalness: 0.1,
    });
    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.position.set(
      (Math.random() - 0.5) * 2000,
      size / 2,
      (Math.random() - 0.5) * 2000,
    );
    rock.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI,
    );
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
    rocks.push(rock);
  }
}

function setupLighting() {
  const ambientLight = new THREE.AmbientLight(0xd4a574, 0.5);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xffe4b5, 1.5);
  sunLight.position.set(150, 200, -250);
  sunLight.castShadow = true;
  sunLight.shadow.camera.left = -300;
  sunLight.shadow.camera.right = 300;
  sunLight.shadow.camera.top = 300;
  sunLight.shadow.camera.bottom = -300;
  sunLight.shadow.camera.near = 0.1;
  sunLight.shadow.camera.far = 1000;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  scene.add(sunLight);

  const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x8b7355, 0.6);
  scene.add(hemiLight);
}

// ============================================================================
// GAME OBJECTS CREATION
// ============================================================================

function createPlayerTank() {
  const tankGroup = new THREE.Group();

  // Advanced Avengers-style materials
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x0a0a0a,
    roughness: 0.15,
    metalness: 0.95,
    emissive: 0x001a00,
    emissiveIntensity: 0.2,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: 0x1a4d2e,
    roughness: 0.2,
    metalness: 0.9,
    emissive: 0x00ff00,
    emissiveIntensity: 0.4,
  });

  // Main hull - angular Stark-tech inspired design
  const lowerHullGeo = new THREE.BoxGeometry(14, 3, 22);
  const lowerHull = new THREE.Mesh(lowerHullGeo, bodyMat);
  lowerHull.position.y = 2.5;
  lowerHull.castShadow = true;
  tankGroup.add(lowerHull);

  // Upper hull
  const upperHullGeo = new THREE.BoxGeometry(13, 4, 20);
  const upperHull = new THREE.Mesh(upperHullGeo, bodyMat);
  upperHull.position.y = 5.5;
  upperHull.castShadow = true;
  tankGroup.add(upperHull);

  // Reactive armor plates with glow
  const armorPos = [
    [0, 4, -12],
    [0, 4, 12],
    [-7, 4, 0],
    [7, 4, 0],
  ];
  armorPos.forEach((pos, idx) => {
    const plateGeo = new THREE.BoxGeometry(
      idx < 2 ? 14 : 2,
      idx < 2 ? 2 : 18,
      idx < 2 ? 2 : 2,
    );
    const plate = new THREE.Mesh(plateGeo, accentMat);
    plate.position.set(pos[0], pos[1], pos[2]);
    if (idx === 0) plate.rotation.x = -0.3;
    if (idx === 1) plate.rotation.x = 0.3;
    plate.castShadow = true;
    tankGroup.add(plate);
  });

  // Advanced hexagonal turret
  const turretGeo = new THREE.CylinderGeometry(6, 6, 5, 6);
  const turret = new THREE.Mesh(turretGeo, bodyMat);
  turret.position.y = 9;
  turret.castShadow = true;
  tankGroup.add(turret);
  tankGroup.userData.turret = turret;

  // Dual electromagnetic railgun cannons
  for (let side = -1; side <= 1; side += 2) {
    const cannonGeo = new THREE.CylinderGeometry(0.9, 1.1, 24, 16);
    const cannon = new THREE.Mesh(
      cannonGeo,
      new THREE.MeshStandardMaterial({
        color: 0x0a0a0a,
        roughness: 0.1,
        metalness: 0.98,
        emissive: 0x003300,
        emissiveIntensity: 0.3,
      }),
    );
    cannon.rotation.x = Math.PI / 2;
    cannon.position.set(side * 2, 9, -14);
    cannon.castShadow = true;
    turret.add(cannon);

    // Energy coils on cannons
    for (let j = 0; j < 5; j++) {
      const coilGeo = new THREE.TorusGeometry(1.2, 0.15, 8, 16);
      const coil = new THREE.Mesh(
        coilGeo,
        new THREE.MeshBasicMaterial({
          color: 0x00ff00,
          emissive: 0x00ff00,
          emissiveIntensity: 0.8,
        }),
      );
      coil.rotation.x = Math.PI / 2;
      coil.position.set(side * 2, 9, -6 - j * 3);
      turret.add(coil);
    }

    // Glowing muzzle
    const muzzleGeo = new THREE.CylinderGeometry(1.3, 1.1, 2, 16);
    const muzzle = new THREE.Mesh(
      muzzleGeo,
      new THREE.MeshStandardMaterial({
        color: 0xff3300,
        emissive: 0xff3300,
        emissiveIntensity: 0.6,
        roughness: 0.2,
        metalness: 0.9,
      }),
    );
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.set(side * 2, 9, -26);
    turret.add(muzzle);
  }

  // Targeting sphere (like Arc Reactor)
  const targetingGeo = new THREE.SphereGeometry(1.5, 16, 16);
  const targeting = new THREE.Mesh(
    targetingGeo,
    new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.6,
      emissive: 0x00ffff,
      emissiveIntensity: 0.8,
      roughness: 0.1,
      metalness: 0.9,
    }),
  );
  targeting.position.y = 12;
  turret.add(targeting);

  // Repulsor hover systems (Stark tech)
  for (let side = -1; side <= 1; side += 2) {
    for (let pos = -1; pos <= 1; pos += 2) {
      const repulsorGeo = new THREE.CylinderGeometry(1.5, 2, 2, 16);
      const repulsor = new THREE.Mesh(
        repulsorGeo,
        new THREE.MeshStandardMaterial({
          color: 0x444444,
          roughness: 0.3,
          metalness: 0.9,
          emissive: 0x0088ff,
          emissiveIntensity: 0.5,
        }),
      );
      repulsor.position.set(side * 6, 0.5, pos * 8);
      tankGroup.add(repulsor);

      const glowGeo = new THREE.CylinderGeometry(1.8, 2.2, 1, 16);
      const glow = new THREE.Mesh(
        glowGeo,
        new THREE.MeshBasicMaterial({
          color: 0x00ccff,
          transparent: true,
          opacity: 0.5,
        }),
      );
      glow.position.set(side * 6, -0.3, pos * 8);
      tankGroup.add(glow);
      if (!tankGroup.userData.repulsors) tankGroup.userData.repulsors = [];
      tankGroup.userData.repulsors.push(glow);
    }
  }

  // Armored tracks with energy strips
  for (let side = -1; side <= 1; side += 2) {
    const trackGeo = new THREE.BoxGeometry(3.5, 4.5, 24);
    const track = new THREE.Mesh(trackGeo, bodyMat);
    track.position.set(side * 7.5, 2.5, 0);
    track.castShadow = true;
    tankGroup.add(track);

    const stripGeo = new THREE.BoxGeometry(0.3, 0.5, 22);
    const strip = new THREE.Mesh(
      stripGeo,
      new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        emissive: 0x00ff00,
        emissiveIntensity: 1.0,
      }),
    );
    strip.position.set(side * 7.8, 3.5, 0);
    tankGroup.add(strip);

    for (let i = -4; i <= 4; i++) {
      const wheelGeo = new THREE.CylinderGeometry(1.8, 1.8, 2.5, 16);
      const wheel = new THREE.Mesh(wheelGeo, bodyMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(side * 7.5, 1, i * 2.7);
      tankGroup.add(wheel);
      if (!tankGroup.userData.wheels) tankGroup.userData.wheels = [];
      tankGroup.userData.wheels.push(wheel);
    }
  }

  // Advanced sensor array
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const sensor = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 4, 0.8),
      accentMat,
    );
    sensor.position.set(Math.cos(angle) * 3, 11, Math.sin(angle) * 3);
    turret.add(sensor);

    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 8, 8),
      new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        emissive: 0x00ff00,
        emissiveIntensity: 1.0,
      }),
    );
    light.position.set(Math.cos(angle) * 3, 13.5, Math.sin(angle) * 3);
    turret.add(light);
  }

  // Point lights for atmosphere
  [
    [5, 6, -10],
    [-5, 6, -10],
    [5, 6, 10],
    [-5, 6, 10],
  ].forEach((pos) => {
    const pointLight = new THREE.PointLight(0x00ff00, 2, 20);
    pointLight.position.set(pos[0], pos[1], pos[2]);
    tankGroup.add(pointLight);
  });

  tankGroup.position.set(0, 0, 500);
  tankGroup.userData.velocity = new THREE.Vector3();
  scene.add(tankGroup);
  playerTank = tankGroup;
}

function createSafeZone() {
  const zoneGroup = new THREE.Group();

  // Fortress walls
  const wallGeo = new THREE.BoxGeometry(200, 30, 10);
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x654321,
    roughness: 0.8,
    metalness: 0.2,
  });

  // Four walls
  const positions = [
    [0, 15, -100],
    [0, 15, 100],
    [-100, 15, 0],
    [100, 15, 0],
  ];
  const rotations = [0, 0, Math.PI / 2, Math.PI / 2];

  positions.forEach((pos, i) => {
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(pos[0], pos[1], pos[2]);
    wall.rotation.y = rotations[i];
    wall.castShadow = true;
    wall.receiveShadow = true;
    zoneGroup.add(wall);
  });

  // Guard towers
  const towerGeo = new THREE.BoxGeometry(15, 40, 15);
  const towerMat = new THREE.MeshStandardMaterial({
    color: 0x8b4513,
    roughness: 0.7,
    metalness: 0.3,
  });

  const towerPositions = [
    [-100, 20, -100],
    [100, 20, -100],
    [-100, 20, 100],
    [100, 20, 100],
  ];

  towerPositions.forEach((pos) => {
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.set(pos[0], pos[1], pos[2]);
    tower.castShadow = true;
    zoneGroup.add(tower);

    // Tower top
    const topGeo = new THREE.ConeGeometry(10, 15, 4);
    const topMat = new THREE.MeshStandardMaterial({ color: 0x2a5a2a });
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.set(pos[0], 47, pos[2]);
    top.rotation.y = Math.PI / 4;
    top.castShadow = true;
    zoneGroup.add(top);
  });

  // Safe zone marker - green energy field
  const fieldGeo = new THREE.CylinderGeometry(90, 90, 50, 32, 1, true);
  const fieldMat = new THREE.MeshStandardMaterial({
    color: 0x00ff00,
    transparent: true,
    opacity: 0.2,
    emissive: 0x00ff00,
    emissiveIntensity: 0.3,
    side: THREE.DoubleSide,
  });
  const field = new THREE.Mesh(fieldGeo, fieldMat);
  field.position.y = 25;
  zoneGroup.add(field);

  zoneGroup.position.copy(targetPosition);
  zoneGroup.position.y = 0;
  scene.add(zoneGroup);
  safeZone = zoneGroup;
}

function createEnemyTank(position) {
  const tankGroup = new THREE.Group();

  // Enemy materials - menacing red armored design
  const enemyBodyMat = new THREE.MeshStandardMaterial({
    color: 0x330000,
    roughness: 0.3,
    metalness: 0.9,
    emissive: 0x660000,
    emissiveIntensity: 0.3,
  });

  const enemyAccentMat = new THREE.MeshStandardMaterial({
    color: 0x8b0000,
    roughness: 0.2,
    metalness: 0.85,
    emissive: 0xff0000,
    emissiveIntensity: 0.5,
  });

  // Main hull - aggressive design
  const bodyGeo = new THREE.BoxGeometry(11, 4.5, 17);
  const body = new THREE.Mesh(bodyGeo, enemyBodyMat);
  body.position.y = 3;
  body.castShadow = true;
  tankGroup.add(body);

  // Armor plates
  const plateGeo = new THREE.BoxGeometry(12, 1.5, 3);
  const frontPlate = new THREE.Mesh(plateGeo, enemyAccentMat);
  frontPlate.position.set(0, 3.5, -9);
  frontPlate.rotation.x = -0.3;
  frontPlate.castShadow = true;
  tankGroup.add(frontPlate);

  // Turret - hexagonal menacing design
  const turretGeo = new THREE.CylinderGeometry(5, 5, 4, 6);
  const turret = new THREE.Mesh(turretGeo, enemyBodyMat);
  turret.position.y = 7;
  turret.castShadow = true;
  tankGroup.add(turret);
  tankGroup.userData.turret = turret;

  // Dual cannons
  for (let side = -1; side <= 1; side += 2) {
    const cannonGeo = new THREE.CylinderGeometry(0.7, 0.9, 18, 12);
    const cannon = new THREE.Mesh(cannonGeo, enemyBodyMat);
    cannon.rotation.x = Math.PI / 2;
    cannon.position.set(side * 1.5, 7, -11);
    cannon.castShadow = true;
    turret.add(cannon);

    // Muzzle glow
    const muzzleGeo = new THREE.CylinderGeometry(1, 0.9, 1.5, 12);
    const muzzle = new THREE.Mesh(
      muzzleGeo,
      new THREE.MeshBasicMaterial({
        color: 0xff3300,
        emissive: 0xff3300,
        emissiveIntensity: 0.7,
      }),
    );
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.set(side * 1.5, 7, -20);
    turret.add(muzzle);
  }

  // Armored tracks with red glow
  for (let side = -1; side <= 1; side += 2) {
    const trackGeo = new THREE.BoxGeometry(3, 3.5, 18);
    const track = new THREE.Mesh(trackGeo, enemyBodyMat);
    track.position.set(side * 6.5, 2, 0);
    track.castShadow = true;
    tankGroup.add(track);

    const stripGeo = new THREE.BoxGeometry(0.3, 0.5, 16);
    const strip = new THREE.Mesh(
      stripGeo,
      new THREE.MeshBasicMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 1.0,
      }),
    );
    strip.position.set(side * 6.8, 3, 0);
    tankGroup.add(strip);
  }

  // Threat indicators
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 8, 8),
      new THREE.MeshBasicMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 1.0,
      }),
    );
    light.position.set(Math.cos(angle) * 3, 9, Math.sin(angle) * 3);
    turret.add(light);
  }

  tankGroup.position.copy(position);
  tankGroup.userData.velocity = new THREE.Vector3();
  tankGroup.userData.health = 100;
  tankGroup.userData.lastAttack = 0;

  scene.add(tankGroup);
  return tankGroup;
}

// ============================================================================
// GAME LOGIC
// ============================================================================

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  if (gameState === "playing") {
    updatePlayer(delta, time);
    updateCamera();
    updateEnemies(delta, time);
    updateMissiles(delta);
    updateParticles(delta);
    updateDirectionArrow();
    checkCollisions();
    checkGameWin();

    // Spawn enemies periodically
    if (time % 6 < delta && enemyTanks.length < 4) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 200 + Math.random() * 150;
      const pos = new THREE.Vector3(
        playerTank.position.x + Math.cos(angle) * distance,
        0,
        playerTank.position.z + Math.sin(angle) * distance,
      );
      enemyTanks.push(createEnemyTank(pos));
    }
  }

  renderer.render(scene, camera);
  updateHUD();

  // ========== QUESTION TRIGGERS ==========
  if (gameState === "playing") {
    questionTriggerCounter += delta;
    if (
      !questionActive &&
      questionsAnswered < 15 &&
      questionTriggerCounter > 3
    ) {
      showQuestion();
      questionTriggerCounter = 0;
    }
  }
}

function updatePlayer(delta, time) {
  const speed = 50;
  const turnSpeed = 2.0;

  // Movement
  const moveDirection = new THREE.Vector3();

  if (keys["w"] || keys["ArrowUp"]) {
    moveDirection.z = -1;
  }
  if (keys["s"] || keys["ArrowDown"]) {
    moveDirection.z = 1;
  }
  if (keys["a"] || keys["ArrowLeft"]) {
    playerTank.rotation.y += turnSpeed * delta;
  }
  if (keys["d"] || keys["ArrowRight"]) {
    playerTank.rotation.y -= turnSpeed * delta;
  }

  // Apply movement
  if (moveDirection.length() > 0) {
    moveDirection.applyQuaternion(playerTank.quaternion);
    playerTank.position.add(moveDirection.multiplyScalar(speed * delta));

    // Animate wheels
    if (playerTank.userData.wheels) {
      playerTank.userData.wheels.forEach((wheel) => {
        wheel.rotation.y += delta * 5 * (keys["s"] ? -1 : 1);
      });
    }
  }

  // Turret always faces forward (no rotation)
  if (playerTank.userData.turret) {
    playerTank.userData.turret.rotation.y = 0;
  }

  // Fire missiles
  if (keys[" "] && time - (playerTank.userData.lastFire || 0) > 0.5) {
    fireMissile();
    playerTank.userData.lastFire = time;
  }
}

function updateCamera() {
  const idealOffset = new THREE.Vector3(0, 35, 50);
  idealOffset.applyQuaternion(playerTank.quaternion);
  const idealPosition = playerTank.position.clone().add(idealOffset);

  camera.position.lerp(idealPosition, 0.1);

  const lookAtPos = playerTank.position.clone();
  lookAtPos.y += 5;
  camera.lookAt(lookAtPos);
}

function updateEnemies(delta, time) {
  for (let i = enemyTanks.length - 1; i >= 0; i--) {
    const enemy = enemyTanks[i];

    // AI behavior - move toward and circle player
    const direction = new THREE.Vector3().subVectors(
      playerTank.position,
      enemy.position,
    );
    const distance = direction.length();
    direction.normalize();

    // Maintain distance and circle
    if (distance > 80) {
      enemy.userData.velocity.lerp(direction.multiplyScalar(30), delta * 2);
    } else {
      const tangent = new THREE.Vector3(-direction.z, 0, direction.x);
      enemy.userData.velocity.lerp(tangent.multiplyScalar(25), delta * 2);
    }

    enemy.position.add(enemy.userData.velocity.clone().multiplyScalar(delta));

    // Look at player
    enemy.lookAt(playerTank.position);

    // Turret aims at player
    if (enemy.userData.turret) {
      const angle = Math.atan2(
        playerTank.position.x - enemy.position.x,
        playerTank.position.z - enemy.position.z,
      );
      enemy.userData.turret.rotation.y = angle - enemy.rotation.y;
    }

    // Attack player
    if (distance < 150 && time - enemy.userData.lastAttack > 2) {
      enemy.userData.lastAttack = time;
      fireEnemyMissile(enemy);
    }

    // Remove if too far
    if (distance > 800) {
      scene.remove(enemy);
      enemyTanks.splice(i, 1);
    }
  }
}

function fireMissile() {
  const missileGeo = new THREE.CylinderGeometry(0.5, 0.5, 3, 8);
  const missileMat = new THREE.MeshStandardMaterial({
    color: 0xffaa00,
    emissive: 0xff6600,
    emissiveIntensity: 0.7,
  });
  const missile = new THREE.Mesh(missileGeo, missileMat);

  // Position at cannon tip (front of tank)
  const cannonTip = new THREE.Vector3(0, 8.5, -21);
  cannonTip.applyQuaternion(playerTank.quaternion);
  cannonTip.add(playerTank.position);

  missile.position.copy(cannonTip);
  missile.rotation.copy(playerTank.rotation);
  missile.rotation.x = Math.PI / 2;

  // Fire straight ahead in tank's facing direction
  const direction = new THREE.Vector3(0, 0, -1);
  direction.applyQuaternion(playerTank.quaternion);
  missile.userData.velocity = direction.multiplyScalar(150);
  missile.userData.isPlayer = true;

  scene.add(missile);
  missiles.push(missile);

  // Recoil effect
  createExplosion(cannonTip, 0xff6600, 5);
}

function fireEnemyMissile(enemy) {
  const missileGeo = new THREE.CylinderGeometry(0.4, 0.4, 2.5, 8);
  const missileMat = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    emissive: 0xff0000,
    emissiveIntensity: 0.6,
  });
  const missile = new THREE.Mesh(missileGeo, missileMat);

  missile.position.copy(enemy.position);
  missile.position.y = 6.5;
  missile.rotation.copy(enemy.userData.turret.rotation);
  missile.rotation.y += enemy.rotation.y;

  const direction = new THREE.Vector3()
    .subVectors(playerTank.position, enemy.position)
    .normalize();
  missile.userData.velocity = direction.multiplyScalar(100);
  missile.userData.isPlayer = false;

  scene.add(missile);
  missiles.push(missile);
}

function updateMissiles(delta) {
  for (let i = missiles.length - 1; i >= 0; i--) {
    const missile = missiles[i];

    // HOMING MISSILE - Auto-target nearest enemy
    if (missile.userData.isPlayer && enemyTanks.length > 0) {
      // Find nearest enemy
      let nearestEnemy = null;
      let nearestDistance = Infinity;

      for (const enemy of enemyTanks) {
        const dist = missile.position.distanceTo(enemy.position);
        if (dist < nearestDistance) {
          nearestDistance = dist;
          nearestEnemy = enemy;
        }
      }

      // Guide missile toward target
      if (nearestEnemy && nearestDistance < 300) {
        const targetDirection = new THREE.Vector3()
          .subVectors(nearestEnemy.position, missile.position)
          .normalize();

        // Gradually turn toward target
        missile.userData.velocity.lerp(
          targetDirection.multiplyScalar(150),
          delta * 3,
        );

        // Point missile in direction of travel
        const angle = Math.atan2(
          missile.userData.velocity.x,
          -missile.userData.velocity.z,
        );
        missile.rotation.y = angle;
      }
    }

    missile.position.add(
      missile.userData.velocity.clone().multiplyScalar(delta),
    );

    // Create trail
    createParticle(
      missile.position.clone(),
      missile.userData.isPlayer ? 0xff6600 : 0xff0000,
      1,
    );

    // Check collision with enemies (player missiles only)
    if (missile.userData.isPlayer) {
      for (let j = enemyTanks.length - 1; j >= 0; j--) {
        const enemy = enemyTanks[j];
        if (missile.position.distanceTo(enemy.position) < 8) {
          enemy.userData.health -= 50;

          // MASSIVE BOMB BLAST EFFECT
          createMassiveExplosion(enemy.position.clone(), 0xff6600);

          scene.remove(missile);
          missiles.splice(i, 1);

          if (enemy.userData.health <= 0) {
            // CRITICAL EXPLOSION when tank is destroyed
            createTankDestructionExplosion(enemy.position.clone());
            scene.remove(enemy);
            enemyTanks.splice(j, 1);
            tanksDestroyed++;
            score += 100;

            // Trigger question
            questionTriggerCounter++;
            if (questionTriggerCounter >= 2 && !questionActive) {
              questionTriggerCounter = 0;
              showQuestion();
            }
          }
          break;
        }
      }
    } else {
      // Enemy missile hitting player
      if (missile.position.distanceTo(playerTank.position) < 8) {
        health -= 15;
        createMassiveExplosion(playerTank.position.clone(), 0xff0000);
        scene.remove(missile);
        missiles.splice(i, 1);
      }
    }

    // Remove if hit ground or too far
    if (
      missile.position.y < 0 ||
      missile.position.distanceTo(playerTank.position) > 500
    ) {
      // Ground impact explosion
      if (missile.position.y < 0) {
        const groundPos = missile.position.clone();
        groundPos.y = 0;
        createGroundExplosion(groundPos);
      }
      scene.remove(missile);
      missiles.splice(i, 1);
    }
  }
}

function updateParticles(delta) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const particle = particles[i];
    particle.userData.life -= delta;
    particle.material.opacity =
      particle.userData.life / particle.userData.maxLife;
    particle.scale.multiplyScalar(0.95);

    if (particle.userData.life <= 0) {
      scene.remove(particle);
      particles.splice(i, 1);
    }
  }
}

function updateDirectionArrow() {
  const direction = new THREE.Vector3().subVectors(
    targetPosition,
    playerTank.position,
  );
  const distance = direction.length();

  direction.normalize();

  // Calculate angle relative to tank's forward direction
  const angle = Math.atan2(direction.x, direction.z) - playerTank.rotation.y;

  const arrow = document.querySelector(".arrow-pointer");
  if (arrow) {
    arrow.style.transform = `translate(-50%, -100%) rotate(${angle}rad)`;
  }

  const distanceEl = document.querySelector(".arrow-distance");
  if (distanceEl) {
    distanceEl.textContent = `Distance: ${Math.floor(distance)}m`;
  }
}

function createParticle(position, color, count) {
  for (let i = 0; i < count; i++) {
    const geometry = new THREE.SphereGeometry(0.5, 4, 4);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 1,
    });
    const particle = new THREE.Mesh(geometry, material);
    particle.position.copy(position);
    particle.userData.life = 0.5;
    particle.userData.maxLife = 0.5;
    scene.add(particle);
    particles.push(particle);
  }
}

function createExplosion(position, color, count) {
  for (let i = 0; i < count; i++) {
    const geometry = new THREE.SphereGeometry(1 + Math.random(), 4, 4);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 1,
    });
    const particle = new THREE.Mesh(geometry, material);
    particle.position.copy(position);
    particle.position.x += (Math.random() - 0.5) * 10;
    particle.position.y += (Math.random() - 0.5) * 10;
    particle.position.z += (Math.random() - 0.5) * 10;
    particle.userData.life = 0.8 + Math.random() * 0.4;
    particle.userData.maxLife = particle.userData.life;
    scene.add(particle);
    particles.push(particle);
  }
}

// MASSIVE AVENGERS-STYLE EXPLOSION EFFECTS
function createMassiveExplosion(position, color) {
  // Primary fireball
  for (let i = 0; i < 40; i++) {
    const size = 2 + Math.random() * 4;
    const geometry = new THREE.SphereGeometry(size, 8, 8);
    const fireColor = i < 20 ? 0xff6600 : i < 30 ? 0xff3300 : 0xffaa00;
    const material = new THREE.MeshBasicMaterial({
      color: fireColor,
      transparent: true,
      opacity: 0.9,
    });
    const particle = new THREE.Mesh(geometry, material);
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 15;
    particle.position.copy(position);
    particle.position.x += Math.cos(angle) * radius;
    particle.position.y += Math.random() * 12;
    particle.position.z += Math.sin(angle) * radius;
    particle.userData.life = 0.8 + Math.random() * 0.6;
    particle.userData.maxLife = particle.userData.life;
    particle.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 20,
      Math.random() * 25 + 10,
      (Math.random() - 0.5) * 20,
    );
    scene.add(particle);
    particles.push(particle);
  }

  // Shockwave rings
  for (let i = 0; i < 3; i++) {
    const ringGeo = new THREE.TorusGeometry(5 + i * 2, 0.8, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.7,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(position);
    ring.position.y += 3;
    ring.rotation.x = Math.PI / 2;
    ring.userData.life = 0.6;
    ring.userData.maxLife = 0.6;
    ring.userData.expandSpeed = 40 + i * 10;
    scene.add(ring);
    particles.push(ring);
  }

  // Smoke plume
  for (let i = 0; i < 25; i++) {
    const smokeGeo = new THREE.SphereGeometry(3 + Math.random() * 2, 6, 6);
    const smokeMat = new THREE.MeshBasicMaterial({
      color: i < 15 ? 0x222222 : 0x555555,
      transparent: true,
      opacity: 0.7,
    });
    const smoke = new THREE.Mesh(smokeGeo, smokeMat);
    smoke.position.copy(position);
    smoke.position.x += (Math.random() - 0.5) * 8;
    smoke.position.y += Math.random() * 5;
    smoke.position.z += (Math.random() - 0.5) * 8;
    smoke.userData.life = 1.5 + Math.random();
    smoke.userData.maxLife = smoke.userData.life;
    smoke.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 3,
      Math.random() * 8 + 5,
      (Math.random() - 0.5) * 3,
    );
    scene.add(smoke);
    particles.push(smoke);
  }

  // Flash light
  const flashLight = new THREE.PointLight(color, 50, 100);
  flashLight.position.copy(position);
  flashLight.position.y += 5;
  scene.add(flashLight);
  setTimeout(() => scene.remove(flashLight), 200);
}

function createTankDestructionExplosion(position) {
  // Massive primary explosion
  createMassiveExplosion(position, 0xff3300);

  // Secondary explosions
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        Math.random() * 5,
        (Math.random() - 0.5) * 10,
      );
      createMassiveExplosion(position.clone().add(offset), 0xff6600);
    }, i * 150);
  }

  // Debris chunks
  for (let i = 0; i < 30; i++) {
    const debrisGeo = new THREE.BoxGeometry(
      1 + Math.random() * 2,
      1 + Math.random() * 2,
      1 + Math.random() * 2,
    );
    const debrisMat = new THREE.MeshStandardMaterial({
      color: Math.random() > 0.5 ? 0x333333 : 0x8b0000,
      roughness: 0.8,
      metalness: 0.5,
    });
    const debris = new THREE.Mesh(debrisGeo, debrisMat);
    debris.position.copy(position);
    debris.position.y += 5;
    debris.userData.life = 2 + Math.random();
    debris.userData.maxLife = debris.userData.life;
    debris.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 40,
      Math.random() * 30 + 20,
      (Math.random() - 0.5) * 40,
    );
    debris.userData.rotationVel = new THREE.Vector3(
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10,
    );
    debris.castShadow = true;
    scene.add(debris);
    particles.push(debris);
  }

  // Mushroom cloud effect
  for (let i = 0; i < 15; i++) {
    setTimeout(() => {
      const cloudGeo = new THREE.SphereGeometry(5 + Math.random() * 3, 8, 8);
      const cloudMat = new THREE.MeshBasicMaterial({
        color: 0x444444,
        transparent: true,
        opacity: 0.5,
      });
      const cloud = new THREE.Mesh(cloudGeo, cloudMat);
      cloud.position.copy(position);
      cloud.position.y += 15 + i * 2;
      cloud.position.x += (Math.random() - 0.5) * 10;
      cloud.position.z += (Math.random() - 0.5) * 10;
      cloud.userData.life = 3;
      cloud.userData.maxLife = 3;
      cloud.userData.expandSpeed = 2;
      scene.add(cloud);
      particles.push(cloud);
    }, i * 100);
  }

  // Camera shake
  const originalCameraPos = camera.position.clone();
  for (let i = 0; i < 20; i++) {
    setTimeout(() => {
      camera.position.x += (Math.random() - 0.5) * 2;
      camera.position.y += (Math.random() - 0.5) * 2;
      camera.position.z += (Math.random() - 0.5) * 2;
    }, i * 50);
  }
}

function createGroundExplosion(position) {
  // Dust and dirt
  for (let i = 0; i < 30; i++) {
    const dustGeo = new THREE.SphereGeometry(1 + Math.random(), 6, 6);
    const dustMat = new THREE.MeshBasicMaterial({
      color: 0x8b7355,
      transparent: true,
      opacity: 0.6,
    });
    const dust = new THREE.Mesh(dustGeo, dustMat);
    dust.position.copy(position);
    dust.userData.life = 1.2;
    dust.userData.maxLife = 1.2;
    dust.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 15,
      Math.random() * 12,
      (Math.random() - 0.5) * 15,
    );
    scene.add(dust);
    particles.push(dust);
  }

  // Impact crater effect
  const craterGeo = new THREE.RingGeometry(2, 8, 16);
  const craterMat = new THREE.MeshBasicMaterial({
    color: 0x3a3a3a,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
  });
  const crater = new THREE.Mesh(craterGeo, craterMat);
  crater.rotation.x = -Math.PI / 2;
  crater.position.copy(position);
  crater.position.y = 0.1;
  crater.userData.life = 0.8;
  crater.userData.maxLife = 0.8;
  scene.add(crater);
  particles.push(crater);
}

function checkCollisions() {
  // Check collision with enemies
  for (let i = enemyTanks.length - 1; i >= 0; i--) {
    const enemy = enemyTanks[i];
    if (playerTank.position.distanceTo(enemy.position) < 15) {
      health -= 20;
      createMassiveExplosion(enemy.position.clone(), 0xff0000);
      scene.remove(enemy);
      enemyTanks.splice(i, 1);
    }
  }

  // Check health
  if (health <= 0) {
    gameOver(false);
  }
}

function checkGameWin() {
  const distance = playerTank.position.distanceTo(targetPosition);
  if (distance < 120) {
    gameOver(true);
  }
}

// ============================================================================
// QUESTIONS SYSTEM
// ============================================================================

function showQuestion() {
  if (
    questionActive ||
    questions.length === 0 ||
    questionsAnswered >= questions.length
  )
    return;

  questionActive = true;
  const prevState = gameState;
  gameState = "paused";

  // Show questions sequentially, not randomly
  currentQuestion = questions[questionsAnswered];
  console.log(
    `📝 Showing academic question ${questionsAnswered + 1}/${questions.length}`,
  );
  console.log(
    "📋 Question options:",
    currentQuestion.options || currentQuestion.answers,
  );

  document.getElementById("questionText").textContent =
    currentQuestion.question;

  const buttons = document.querySelectorAll(".answer-btn");

  // Handle both API format (options array) and fallback format (answers array)
  const answerOptions = currentQuestion.options || currentQuestion.answers;

  // Create a shuffled version with original indices
  const shuffledOptions = answerOptions.map((opt, idx) => ({
    opt,
    originalIdx: idx,
  }));
  // Shuffle the options for variety
  for (let i = shuffledOptions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledOptions[i], shuffledOptions[j]] = [
      shuffledOptions[j],
      shuffledOptions[i],
    ];
  }

  // Store the shuffle mapping for answer selection
  currentQuestion._shuffleMap = shuffledOptions.map((s) => s.originalIdx);

  shuffledOptions.forEach((item, index) => {
    const option = item.opt;
    // API format has {text, effects}, fallback has just strings
    buttons[index].textContent = option.text || option;
    buttons[index].style.display = "block";
  });

  document.getElementById("questionPopup").classList.add("active");
}

async function selectAnswer(index) {
  if (!currentQuestion) return;

  const answerOptions = currentQuestion.options || currentQuestion.answers;
  // Get the original index from the shuffle map
  const originalIndex = currentQuestion._shuffleMap
    ? currentQuestion._shuffleMap[index]
    : index;
  const selectedOption = answerOptions[originalIndex];
  const correct = originalIndex === currentQuestion.correct;

  if (correct || !currentQuestion.correct) {
    score += 50;
    questionsAnswered++;
    health = Math.min(health + 10, 100);
  } else {
    health -= 10;
  }

  // Save answer to Flask API
  try {
    await fetch("http://localhost:5000/api/answer/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: sessionId,
        gameType: "academic",
        questionId: currentQuestion.id,
        questionText: currentQuestion.question,
        selectedOption: originalIndex,
        optionText: selectedOption.text || selectedOption,
        optionEffects: selectedOption.effects || {},
      }),
    });
  } catch (error) {
    console.error("Failed to save answer:", error);
  }

  document.getElementById("questionPopup").classList.remove("active");
  questionActive = false;
  gameState = "playing";
  currentQuestion = null;
}

// ============================================================================
// GAME OVER
// ============================================================================

function gameOver(won) {
  gameState = "gameover";

  const gameOverEl = document.getElementById("gameOver");
  const titleEl = document.getElementById("gameOverTitle");
  const textEl = document.getElementById("gameOverText");

  if (won) {
    titleEl.textContent = "MISSION COMPLETE!";
    textEl.textContent = "You reached the Safe Zone! Career unlocked!";
    gameOverEl.classList.remove("defeat");
    // Change button text to show completion
    const btnRestart = document.querySelector(".btn-restart");
    if (btnRestart) btnRestart.textContent = "✓ ALL MISSIONS COMPLETE";

    // Fetch career recommendation
    fetchCareerRecommendation();
  } else {
    titleEl.textContent = "MISSION FAILED";
    textEl.textContent = "Your tank was destroyed. Try again!";
    gameOverEl.classList.add("defeat");
    // Keep button text as PLAY AGAIN
    const btnRestart = document.querySelector(".btn-restart");
    if (btnRestart) btnRestart.textContent = "PLAY AGAIN";
  }

  const finalScoreEl = document.getElementById("finalScore");
  if (finalScoreEl) finalScoreEl.textContent = questionsAnswered;

  gameOverEl.classList.add("active");
}

function restartGame() {
  // Check if player won
  const titleEl = document.getElementById("gameOverTitle");
  if (
    gameState === "gameover" &&
    titleEl &&
    titleEl.textContent === "MISSION COMPLETE!"
  ) {
    // Final game completed - return to home
    alert(
      "🎉 Congratulations! You've completed all missions! Your comprehensive career profile is ready.",
    );
    window.location.href = "/";
  } else {
    // Restart current game
    window.location.reload();
  }
}

// Fetch career recommendation from backend
async function fetchCareerRecommendation() {
  try {
    const response = await fetch(
      `http://localhost:5000/api/career/recommend/${sessionId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
    );

    const data = await response.json();

    // Store data globally for download
    careerRecommendationData = data;

    console.log("✅ Career Recommendation Data:", data);

    const careerEl = document.getElementById("recommendedCareer");
    const detailsEl = document.getElementById("careerDetails");
    const pathEl = document.getElementById("careerPath");
    const matchesEl = document.getElementById("careerMatches");

    if (careerEl && data.career) {
      careerEl.textContent = data.career;
    }

    if (detailsEl && pathEl && data.careerPath) {
      pathEl.textContent = data.careerPath;

      // Populate top 5 career matches if available
      if (matchesEl && data.allMatches) {
        matchesEl.innerHTML = "";
        data.allMatches.slice(0, 5).forEach((match, index) => {
          const li = document.createElement("li");
          li.textContent = `${match.career} (${match.score} points)`;
          li.style.marginBottom = "5px";
          if (index === 0) {
            li.style.fontWeight = "bold";
            li.style.color = "#ffd700";
          }
          matchesEl.appendChild(li);
        });
      }

      // Show view details button
      const viewBtn = document.getElementById("viewDetailsBtn");
      if (viewBtn) viewBtn.style.display = "inline-block";

      // Show download button
      const downloadBtn = document.getElementById("downloadRoadmapBtn");
      if (downloadBtn) downloadBtn.style.display = "inline-block";
    }
  } catch (error) {
    console.error("❌ Failed to fetch career recommendation:", error);
    const careerEl = document.getElementById("recommendedCareer");
    if (careerEl) careerEl.textContent = "Error loading recommendation";
  }
}

// Toggle career details visibility
function toggleCareerDetails() {
  const details = document.getElementById("careerDetails");
  const btn = document.getElementById("viewDetailsBtn");

  if (details && btn) {
    if (details.style.display === "none") {
      details.style.display = "block";
      btn.textContent = "Hide Career Details";
    } else {
      details.style.display = "none";
      btn.textContent = "View Career Details";
    }
  }
}

// Download career roadmap as text file
function downloadCareerRoadmap() {
  if (!careerRecommendationData) {
    alert("Career data not loaded yet. Please wait...");
    return;
  }

  const data = careerRecommendationData;
  const date = new Date().toLocaleDateString();

  // Create comprehensive roadmap content
  let content = `
╔════════════════════════════════════════════════════════════════╗
║          C$S CAREER GUIDANCE SYSTEM - YOUR ROADMAP            ║
║                    Generated: ${date}                    ║
╚════════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 YOUR RECOMMENDED CAREER PATH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${data.career || data.recommendedCareer}

Confidence Score: ${data.confidenceScore || 0}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 COMPLETE ROADMAP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${data.careerPath || data.description || "No detailed path available"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏆 TOP 5 CAREER MATCHES FOR YOU
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  if (data.allMatches && data.allMatches.length > 0) {
    data.allMatches.slice(0, 5).forEach((match, index) => {
      content += `
${index + 1}. ${match.career}
   Score: ${match.score} points
   
${match.path || "Details not available"}

${"─".repeat(66)}
`;
    });
  }

  content += `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 YOUR PROFILE ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Emotional Intelligence:
`;

  if (data.emotionalScores) {
    for (const [key, value] of Object.entries(data.emotionalScores)) {
      content += `  • ${key}: ${value > 0 ? "+" : ""}${value}\n`;
    }
  }

  content += `
Reasoning Skills:
`;

  if (data.reasoningScores) {
    for (const [key, value] of Object.entries(data.reasoningScores)) {
      content += `  • ${key}: ${value > 0 ? "+" : ""}${value}\n`;
    }
  }

  content += `
Academic Interests:
`;

  if (data.academicScores) {
    for (const [key, value] of Object.entries(data.academicScores)) {
      content += `  • ${key}: ${value > 0 ? "+" : ""}${value}\n`;
    }
  }

  content += `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 NEXT STEPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Review this roadmap carefully
2. Discuss with parents/teachers
3. Start preparing from TODAY
4. Research more about your recommended career
5. Connect with professionals in this field
6. Work on the skills mentioned in the roadmap

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎓 Remember: Your career path is a journey, not a destination!
   Stay curious, keep learning, and believe in yourself! 

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generated by C$S Career Guidance System
Session ID: ${sessionId || "N/A"}
Date: ${new Date().toLocaleString()}

For more information, visit: https://github.com/yourusername/css-career
`;

  // Create blob and download
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Career_Roadmap_${data.career?.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);

  console.log("📥 Career roadmap downloaded successfully!");
}

// ============================================================================
// HUD UPDATE
// ============================================================================

function updateHUD() {
  document.getElementById("score").textContent = `SCORE: ${score}`;
  document.getElementById("healthFill").style.width = `${health}%`;
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

function onKeyDown(event) {
  keys[event.key] = true;
}

function onKeyUp(event) {
  keys[event.key] = false;
}

function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ============================================================================
// START GAME
// ============================================================================

init();
