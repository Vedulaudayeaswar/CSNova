// ============================================================================
// C$S - PIRATE CAREER ADVENTURE GAME
// Advanced Three.js 3D Game with Realistic Graphics
// ============================================================================

// Game State Variables
let scene, camera, renderer, clock;
let playerShip, navyPatrol;
let pirateShips = [],
  cannonballs = [],
  particles = [],
  clouds = [];
let keys = {},
  mouse = { x: 0, y: 0 };
let health = 100,
  score = 0,
  piratesDefeated = 0;
let gameState = "playing";
let questionsAnswered = 0,
  questionActive = false;
let water, sky, sun;

// Career Questions Database - Loaded dynamically from Flask API
let questions = [];
let currentQuestion = null;
let questionTriggerCounter = 0;
let sessionId = localStorage.getItem("sessionId");

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

// Fetch emotional questions from Flask API
async function loadQuestions() {
  try {
    const response = await fetch("/api/questions/emotional?count=10");
    const data = await response.json();
    questions = data.questions;
    console.log(
      `✅ Loaded ${questions.length} emotional questions from AI dataset`,
    );
    console.log("📋 First question structure:", questions[0]);
    console.log("🆔 Session ID:", sessionId);
  } catch (error) {
    console.error("❌ Failed to load questions:", error);
    // Fallback questions if API fails
    questions = [
      {
        question: "How do you handle stress?",
        answers: ["Take breaks", "Push through", "Avoid it", "Seek help"],
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

  // Create Scene with better fog for depth
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x87ceeb, 0.00025);

  // Create Camera
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    5000,
  );
  camera.position.set(0, 25, 40);

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
  createOcean();
  createSky();
  createSun();
  createClouds();

  // Create Game Objects
  createPlayerShip();
  createNavyPatrol();

  // Spawn initial pirate ships for immediate action
  for (let i = 0; i < 2; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const distance = 100 + Math.random() * 50;
    const pirate = createPirateShip(
      new THREE.Vector3(
        playerShip.position.x + Math.cos(angle) * distance,
        0,
        playerShip.position.z + Math.sin(angle) * distance,
      ),
    );
    pirateShips.push(pirate);
  }

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

function createOcean() {
  const geometry = new THREE.PlaneGeometry(10000, 10000, 300, 300);
  const material = new THREE.MeshPhysicalMaterial({
    color: 0x0066cc,
    transparent: true,
    opacity: 0.85,
    roughness: 0.05,
    metalness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    envMapIntensity: 2.0,
    reflectivity: 1.0,
  });

  water = new THREE.Mesh(geometry, material);
  water.rotation.x = -Math.PI / 2;
  water.receiveShadow = true;
  scene.add(water);

  // Create wave vertices with more dynamic motion
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const wave1 = Math.sin(x * 0.04) * Math.cos(z * 0.04) * 2.5;
    const wave2 = Math.sin(x * 0.02 + 50) * Math.cos(z * 0.02 + 50) * 1.5;
    const wave3 = Math.sin(x * 0.08) * Math.cos(z * 0.06) * 0.8;
    positions.setY(i, wave1 + wave2 + wave3);
  }
  positions.needsUpdate = true;
}

function createSky() {
  const skyGeometry = new THREE.SphereGeometry(4500, 32, 32);
  const skyMaterial = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(0x0077ff) },
      bottomColor: { value: new THREE.Color(0x89cff0) },
      offset: { value: 400 },
      exponent: { value: 0.5 },
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
  const sunGeometry = new THREE.SphereGeometry(50, 32, 32);
  const sunMaterial = new THREE.MeshBasicMaterial({
    color: 0xfdb813,
    fog: false,
  });
  sun = new THREE.Mesh(sunGeometry, sunMaterial);
  sun.position.set(500, 300, -1000);
  scene.add(sun);
}

function createClouds() {
  const cloudGeometry = new THREE.SphereGeometry(30, 8, 8);
  const cloudMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.6,
    fog: true,
  });

  for (let i = 0; i < 25; i++) {
    const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
    cloud.position.set(
      (Math.random() - 0.5) * 3000,
      200 + Math.random() * 200,
      (Math.random() - 0.5) * 3000,
    );
    cloud.scale.set(
      1 + Math.random() * 2,
      0.8 + Math.random() * 0.5,
      1 + Math.random() * 2,
    );
    clouds.push(cloud);
    scene.add(cloud);
  }
}

function setupLighting() {
  // Ambient Light
  const ambientLight = new THREE.AmbientLight(0x87ceeb, 0.5);
  scene.add(ambientLight);

  // Directional Sun Light
  const sunLight = new THREE.DirectionalLight(0xffe4b5, 1.5);
  sunLight.position.set(100, 150, -200);
  sunLight.castShadow = true;
  sunLight.shadow.camera.left = -200;
  sunLight.shadow.camera.right = 200;
  sunLight.shadow.camera.top = 200;
  sunLight.shadow.camera.bottom = -200;
  sunLight.shadow.camera.near = 0.1;
  sunLight.shadow.camera.far = 1000;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.bias = -0.0001;
  scene.add(sunLight);

  // Hemisphere Light
  const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x006994, 0.6);
  scene.add(hemiLight);

  // Add volumetric god rays effect
  const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
  rimLight.position.set(-100, 50, -100);
  scene.add(rimLight);

  // Fill light for better depth
  const fillLight = new THREE.DirectionalLight(0x88ccff, 0.4);
  fillLight.position.set(-50, 30, 100);
  scene.add(fillLight);
}

// ============================================================================
// SHIP CREATION
// ============================================================================

function createIndianFlag() {
  const canvas = document.createElement("canvas");
  canvas.width = 300;
  canvas.height = 200;
  const ctx = canvas.getContext("2d");

  // Saffron stripe
  ctx.fillStyle = "#FF9933";
  ctx.fillRect(0, 0, 300, 67);

  // White stripe
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 67, 300, 66);

  // Green stripe
  ctx.fillStyle = "#138808";
  ctx.fillRect(0, 133, 300, 67);

  // Ashoka Chakra (wheel)
  const centerX = 150,
    centerY = 100,
    radius = 25;
  ctx.strokeStyle = "#000080";
  ctx.fillStyle = "#000080";
  ctx.lineWidth = 2;

  // Outer circle
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Inner circle
  ctx.beginPath();
  ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
  ctx.fill();

  // 24 spokes
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
      centerX + Math.cos(angle) * radius,
      centerY + Math.sin(angle) * radius,
    );
    ctx.stroke();
  }

  return new THREE.CanvasTexture(canvas);
}

function createWoodTexture(darkWood = false) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  const baseColor = darkWood ? "#3a2415" : "#8B4513";
  const grainColor = darkWood ? "#2a1810" : "#6B3410";

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 512);

  // Add wood grain
  for (let i = 0; i < 100; i++) {
    ctx.strokeStyle = grainColor;
    ctx.lineWidth = Math.random() * 2 + 0.5;
    ctx.globalAlpha = Math.random() * 0.3 + 0.1;
    ctx.beginPath();
    const y = Math.random() * 512;
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(
      128,
      y + Math.random() * 20 - 10,
      384,
      y + Math.random() * 20 - 10,
      512,
      y,
    );
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  return new THREE.CanvasTexture(canvas);
}

function createPlayerShip() {
  const group = new THREE.Group();

  // Modern Navy Hull (grey military color)
  const hullGeometry = new THREE.BoxGeometry(12, 5, 28);
  const hullMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x6b7280,
    metalness: 0.7,
    roughness: 0.3,
    clearcoat: 0.8,
    clearcoatRoughness: 0.2,
  });
  const hull = new THREE.Mesh(hullGeometry, hullMaterial);
  hull.castShadow = true;
  hull.receiveShadow = true;
  group.add(hull);

  // Upper Deck (grey)
  const deckGeometry = new THREE.BoxGeometry(13, 1.5, 26);
  const deckMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x8b95a0,
    roughness: 0.4,
    metalness: 0.6,
  });
  const deck = new THREE.Mesh(deckGeometry, deckMaterial);
  deck.position.y = 3;
  deck.castShadow = true;
  deck.receiveShadow = true;
  group.add(deck);

  // Bridge/Superstructure (command center)
  const bridgeGeometry = new THREE.BoxGeometry(8, 6, 10);
  const bridge = new THREE.Mesh(
    bridgeGeometry,
    new THREE.MeshPhysicalMaterial({
      color: 0x4b5563,
      metalness: 0.6,
      roughness: 0.4,
    }),
  );
  bridge.position.set(0, 7, 2);
  bridge.castShadow = true;
  group.add(bridge);

  // Bridge windows (blue tinted)
  const windowGeometry = new THREE.BoxGeometry(7, 1.5, 0.2);
  const windowMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x1e40af,
    transparent: true,
    opacity: 0.6,
    metalness: 0.9,
    roughness: 0.1,
  });
  const window1 = new THREE.Mesh(windowGeometry, windowMaterial);
  window1.position.set(0, 8, -2.9);
  group.add(window1);

  // Radar Tower
  const radarTowerGeometry = new THREE.BoxGeometry(3, 8, 3);
  const radarTower = new THREE.Mesh(
    radarTowerGeometry,
    new THREE.MeshPhysicalMaterial({
      color: 0x374151,
      metalness: 0.7,
      roughness: 0.3,
    }),
  );
  radarTower.position.set(0, 14, 2);
  radarTower.castShadow = true;
  group.add(radarTower);

  // Rotating Radar Dish
  const radarDishGeometry = new THREE.CylinderGeometry(2, 2, 0.3, 32);
  const radarDish = new THREE.Mesh(
    radarDishGeometry,
    new THREE.MeshPhysicalMaterial({
      color: 0x9ca3af,
      metalness: 0.9,
      roughness: 0.2,
    }),
  );
  radarDish.position.set(0, 18, 2);
  radarDish.rotation.x = Math.PI / 2;
  radarDish.castShadow = true;
  group.add(radarDish);

  // Modern Bow (sharp military design)
  const bowGeometry = new THREE.ConeGeometry(6, 10, 4);
  const bow = new THREE.Mesh(bowGeometry, hullMaterial);
  bow.rotation.x = Math.PI / 2;
  bow.position.z = -19;
  bow.castShadow = true;
  group.add(bow);

  // Helipad at rear
  const helipadGeometry = new THREE.CylinderGeometry(4, 4, 0.3, 32);
  const helipad = new THREE.Mesh(
    helipadGeometry,
    new THREE.MeshPhysicalMaterial({
      color: 0xf59e0b,
      roughness: 0.7,
      metalness: 0.3,
    }),
  );
  helipad.position.set(0, 4, 10);
  helipad.castShadow = true;
  group.add(helipad);

  // Helipad markings
  const hMarkGeometry = new THREE.RingGeometry(2, 2.2, 32);
  const hMark = new THREE.Mesh(
    hMarkGeometry,
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
    }),
  );
  hMark.rotation.x = -Math.PI / 2;
  hMark.position.set(0, 4.2, 10);
  group.add(hMark);

  // Communication antennas
  for (let i = 0; i < 4; i++) {
    const antennaGeometry = new THREE.CylinderGeometry(0.1, 0.1, 5);
    const antenna = new THREE.Mesh(
      antennaGeometry,
      new THREE.MeshPhysicalMaterial({
        color: 0x9ca3af,
        metalness: 0.9,
        roughness: 0.1,
      }),
    );
    antenna.position.set((i - 1.5) * 2, 19, 2);
    antenna.castShadow = true;
    group.add(antenna);
  }

  // Main Mast for Flag
  const mastGeometry = new THREE.CylinderGeometry(0.3, 0.3, 15);
  const mastMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x4b5563,
    metalness: 0.8,
    roughness: 0.2,
  });
  const mast = new THREE.Mesh(mastGeometry, mastMaterial);
  mast.position.set(0, 25, 2);
  mast.castShadow = true;
  group.add(mast);

  // Indian Flag
  const flagGeometry = new THREE.PlaneGeometry(5, 3.3);
  const flagMaterial = new THREE.MeshPhysicalMaterial({
    map: createIndianFlag(),
    side: THREE.DoubleSide,
    transparent: false,
  });
  const flag = new THREE.Mesh(flagGeometry, flagMaterial);
  flag.position.set(0, 32, 2);
  flag.castShadow = true;
  group.add(flag);

  // Missile Launchers (front)
  for (let i = 0; i < 2; i++) {
    const launcherGeometry = new THREE.BoxGeometry(2, 1.5, 3);
    const launcher = new THREE.Mesh(
      launcherGeometry,
      new THREE.MeshPhysicalMaterial({
        color: 0x374151,
        metalness: 0.8,
        roughness: 0.3,
      }),
    );
    launcher.position.set((i - 0.5) * 4, 5, -8);
    launcher.castShadow = true;
    group.add(launcher);
  }

  // Modern Naval Guns (3 front-facing cannons)
  for (let i = 0; i < 3; i++) {
    const cannonGeometry = new THREE.CylinderGeometry(0.5, 0.45, 6);
    const cannonMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x1f2937,
      metalness: 0.9,
      roughness: 0.1,
    });
    const cannon = new THREE.Mesh(cannonGeometry, cannonMaterial);
    cannon.position.set((i - 1) * 3, 5, -10);
    cannon.rotation.x = -Math.PI / 2;
    cannon.castShadow = true;
    group.add(cannon);

    // Cannon base/turret
    const turretGeometry = new THREE.BoxGeometry(1.5, 1.2, 1.5);
    const turret = new THREE.Mesh(turretGeometry, cannonMaterial);
    turret.position.set((i - 1) * 3, 5, -10);
    turret.castShadow = true;
    group.add(turret);
  }

  // Navigation Lights (green - starboard, red - port)
  const navLightGeometry = new THREE.SphereGeometry(0.3, 16, 16);
  const greenLight = new THREE.Mesh(
    navLightGeometry,
    new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      emissive: 0x00ff00,
      emissiveIntensity: 1,
    }),
  );
  greenLight.position.set(6, 6, -10);
  group.add(greenLight);

  const redLight = new THREE.Mesh(
    navLightGeometry,
    new THREE.MeshBasicMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 1,
    }),
  );
  redLight.position.set(-6, 6, -10);
  group.add(redLight);

  playerShip = group;
  playerShip.position.set(0, 0, 0);
  playerShip.castShadow = true;
  scene.add(playerShip);
}

function createPirateShip(position) {
  const group = new THREE.Group();

  // Dark hull with texture
  const hullGeometry = new THREE.BoxGeometry(8, 4, 20);
  const hullMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x0a0503,
    metalness: 0.5,
    roughness: 0.5,
    map: createWoodTexture(true),
    clearcoat: 0.3,
  });
  const hull = new THREE.Mesh(hullGeometry, hullMaterial);
  hull.castShadow = true;
  hull.receiveShadow = true;
  group.add(hull);

  // Deck
  const deckGeometry = new THREE.BoxGeometry(9, 1, 18);
  const deck = new THREE.Mesh(
    deckGeometry,
    new THREE.MeshPhysicalMaterial({
      color: 0x2f1b14,
      roughness: 0.7,
      map: createWoodTexture(true),
    }),
  );
  deck.position.y = 2.5;
  deck.castShadow = true;
  group.add(deck);

  // Main Mast
  const mastGeometry = new THREE.CylinderGeometry(0.5, 0.6, 24);
  const mast = new THREE.Mesh(
    mastGeometry,
    new THREE.MeshPhysicalMaterial({
      color: 0x3a2a1a,
      roughness: 0.8,
    }),
  );
  mast.position.y = 15;
  mast.castShadow = true;
  group.add(mast);

  // Black sail (tattered and worn)
  const sailGeometry = new THREE.PlaneGeometry(12, 16);
  const sailMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x0a0a0a,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    roughness: 0.9,
  });
  const sail = new THREE.Mesh(sailGeometry, sailMaterial);
  sail.position.set(0, 15, -1);
  sail.rotation.y = Math.PI / 2;
  sail.castShadow = true;
  sail.userData.sailWave = Math.random() * Math.PI;
  group.add(sail);

  // Second smaller torn sail
  const sail2Geometry = new THREE.PlaneGeometry(8, 12);
  const sail2 = new THREE.Mesh(sail2Geometry, sailMaterial);
  sail2.position.set(0, 13, 5);
  sail2.rotation.y = Math.PI / 2;
  sail2.castShadow = true;
  sail2.userData.sailWave = Math.random() * Math.PI;
  group.add(sail2);

  // Cannons (6 per side)
  for (let i = 0; i < 6; i++) {
    const cannonGeometry = new THREE.CylinderGeometry(0.3, 0.3, 3.5);
    const cannon = new THREE.Mesh(
      cannonGeometry,
      new THREE.MeshPhysicalMaterial({
        color: 0x0a0a0a,
        metalness: 0.9,
        roughness: 0.1,
      }),
    );
    cannon.position.set(-4.5, 2, (i - 2.5) * 3);
    cannon.rotation.z = Math.PI / 2;
    cannon.castShadow = true;
    group.add(cannon);

    // Right side cannons
    const cannon2 = cannon.clone();
    cannon2.position.set(4.5, 2, (i - 2.5) * 3);
    group.add(cannon2);
  }

  // Skull flag
  const flagGeometry = new THREE.PlaneGeometry(3, 2.5);
  const flagMaterial = new THREE.MeshBasicMaterial({
    map: createSkullTexture(),
    transparent: true,
    side: THREE.DoubleSide,
  });
  const flag = new THREE.Mesh(flagGeometry, flagMaterial);
  flag.position.set(0, 25, -1);
  group.add(flag);

  // Add dangerous spikes on the bow
  for (let i = 0; i < 8; i++) {
    const spikeGeometry = new THREE.ConeGeometry(0.2, 2, 4);
    const spikeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x1a0f0a,
      metalness: 0.8,
      roughness: 0.2,
    });
    const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
    const angle = (i / 8) * Math.PI * 2;
    spike.position.set(Math.cos(angle) * 3, 2, -9 + Math.sin(angle) * 0.5);
    spike.rotation.z = Math.PI / 2;
    spike.rotation.y = angle;
    spike.castShadow = true;
    group.add(spike);
  }

  // Add red warning lights
  for (let i = 0; i < 4; i++) {
    const lightGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const lightMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
    });
    const light = new THREE.Mesh(lightGeometry, lightMaterial);
    light.position.set((i - 1.5) * 2, 3, -8);
    group.add(light);
  }

  // Add battle damage (holes)
  const holeGeometry = new THREE.BoxGeometry(1, 0.5, 0.5);
  const holeMaterial = new THREE.MeshPhysicalMaterial({ color: 0x000000 });
  for (let i = 0; i < 3; i++) {
    const hole = new THREE.Mesh(holeGeometry, holeMaterial);
    hole.position.set((Math.random() - 0.5) * 4, 1, (Math.random() - 0.5) * 8);
    group.add(hole);
  }

  const ship = group;
  ship.position.copy(position);
  ship.castShadow = true;
  ship.userData = { type: "pirate", health: 3, velocity: new THREE.Vector3() };
  scene.add(ship);
  return ship;
}

function createSkullTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  // Black background
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, 256, 256);

  // White skull
  ctx.fillStyle = "#FFFFFF";

  // Skull head
  ctx.beginPath();
  ctx.arc(128, 110, 60, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.arc(105, 100, 12, 0, Math.PI * 2);
  ctx.arc(151, 100, 12, 0, Math.PI * 2);
  ctx.fill();

  // Nose
  ctx.beginPath();
  ctx.moveTo(128, 120);
  ctx.lineTo(120, 135);
  ctx.lineTo(136, 135);
  ctx.closePath();
  ctx.fill();

  // Jaw
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(100, 140, 56, 30);

  // Teeth
  ctx.fillStyle = "#000000";
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(105 + i * 8, 145, 4, 20);
  }

  // Crossbones
  ctx.fillStyle = "#FFFFFF";
  ctx.save();
  ctx.translate(128, 200);
  ctx.rotate(-Math.PI / 4);
  ctx.fillRect(-50, -6, 100, 12);
  ctx.restore();

  ctx.save();
  ctx.translate(128, 200);
  ctx.rotate(Math.PI / 4);
  ctx.fillRect(-50, -6, 100, 12);
  ctx.restore();

  return new THREE.CanvasTexture(canvas);
}

function createNavyPatrol() {
  const group = new THREE.Group();

  // INS Vikrant - Large Indian Navy Aircraft Carrier
  const hullGeometry = new THREE.BoxGeometry(20, 8, 50);
  const hullMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x6b7280, // Grey Indian Navy color
    metalness: 0.7,
    roughness: 0.2,
    clearcoat: 0.8,
  });
  const hull = new THREE.Mesh(hullGeometry, hullMaterial);
  hull.castShadow = true;
  hull.receiveShadow = true;
  group.add(hull);

  // Flight Deck (Aircraft Carrier)
  const deckGeometry = new THREE.BoxGeometry(21, 2, 48);
  const deck = new THREE.Mesh(
    deckGeometry,
    new THREE.MeshPhysicalMaterial({
      color: 0x505050,
      roughness: 0.6,
      metalness: 0.5,
    }),
  );
  deck.position.y = 5;
  deck.castShadow = true;
  group.add(deck);

  // Control Tower (Island)
  const tower = new THREE.Mesh(
    new THREE.BoxGeometry(6, 12, 8),
    new THREE.MeshPhysicalMaterial({
      color: 0x6b7280,
      metalness: 0.6,
      roughness: 0.3,
    }),
  );
  tower.position.set(8, 12, 0);
  tower.castShadow = true;
  group.add(tower);

  // Radar on tower
  const radar = new THREE.Mesh(
    new THREE.CylinderGeometry(2, 2, 0.5, 16),
    new THREE.MeshPhysicalMaterial({
      color: 0x404040,
      metalness: 0.9,
      roughness: 0.1,
    }),
  );
  radar.position.set(8, 19, 0);
  radar.castShadow = true;
  group.add(radar);

  // Indian Naval Ensign (Flag)
  const flagGeometry = new THREE.PlaneGeometry(8, 5);
  const flagMaterial = new THREE.MeshBasicMaterial({
    map: createIndianFlag(),
    side: THREE.DoubleSide,
  });
  const flag = new THREE.Mesh(flagGeometry, flagMaterial);
  flag.position.set(8, 22, 0);
  group.add(flag);

  // Add "INS VIKRANT" text on the side
  const nameGeometry = new THREE.BoxGeometry(15, 1, 0.5);
  const nameMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const nameplate = new THREE.Mesh(nameGeometry, nameMaterial);
  nameplate.position.set(0, 6, 25.5);
  group.add(nameplate);

  navyPatrol = group;
  navyPatrol.position.set(0, 0, -900);
  navyPatrol.castShadow = true;
  scene.add(navyPatrol);
}

// ============================================================================
// COMBAT SYSTEM
// ============================================================================

function fireCannon() {
  if (questionActive) return;

  const cannonballGeometry = new THREE.SphereGeometry(0.8, 16, 16);
  const cannonballMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xff4500,
    metalness: 0.9,
    roughness: 0.1,
    emissive: 0xff2200,
    emissiveIntensity: 0.5,
  });
  const cannonball = new THREE.Mesh(cannonballGeometry, cannonballMaterial);

  cannonball.position.copy(playerShip.position);
  cannonball.position.y += 3;
  cannonball.position.z -= 15;

  const direction = new THREE.Vector3(0, 0, -1);
  direction.applyQuaternion(playerShip.quaternion);

  cannonball.userData = {
    velocity: direction.multiplyScalar(2.5),
    type: "playerCannon",
    lifespan: 0,
  };

  cannonball.castShadow = true;
  scene.add(cannonball);
  cannonballs.push(cannonball);

  // Create massive fire blast
  createFireBlast(cannonball.position, direction);
  createMuzzleFlash(cannonball.position);
  createSmokeTrail(cannonball);
}

function fireEnemyCannon(fromPos, targetPos) {
  const cannonballGeometry = new THREE.SphereGeometry(0.7, 16, 16);
  const cannonballMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xff0000,
    metalness: 0.8,
    roughness: 0.2,
    emissive: 0xff1100,
    emissiveIntensity: 0.8,
  });
  const cannonball = new THREE.Mesh(cannonballGeometry, cannonballMaterial);

  cannonball.position.copy(fromPos);
  cannonball.position.y += 3;

  const direction = new THREE.Vector3()
    .subVectors(targetPos, fromPos)
    .normalize();
  cannonball.userData = {
    velocity: direction.multiplyScalar(1.5),
    type: "enemy",
    lifespan: 0,
  };

  cannonball.castShadow = true;
  scene.add(cannonball);
  cannonballs.push(cannonball);

  createFireBlast(cannonball.position, direction);
  createMuzzleFlash(cannonball.position);
  createSmokeTrail(cannonball);
}

function createMuzzleFlash(position) {
  // Main flash
  const flashGeometry = new THREE.SphereGeometry(3, 12, 12);
  const flashMaterial = new THREE.MeshBasicMaterial({
    color: 0xffaa00,
    transparent: true,
    opacity: 1,
  });
  const flash = new THREE.Mesh(flashGeometry, flashMaterial);
  flash.position.copy(position);
  scene.add(flash);

  // Secondary ring flash
  const ringGeometry = new THREE.TorusGeometry(2, 0.5, 8, 16);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xff5500,
    transparent: true,
    opacity: 0.8,
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.position.copy(position);
  scene.add(ring);

  let scale = 1;
  const flashInterval = setInterval(() => {
    scale += 0.3;
    flash.scale.set(scale, scale, scale);
    ring.scale.set(scale, scale, scale);
    flash.material.opacity -= 0.2;
    ring.material.opacity -= 0.2;
    if (flash.material.opacity <= 0) {
      scene.remove(flash);
      scene.remove(ring);
      clearInterval(flashInterval);
    }
  }, 30);
}

function createFireBlast(position, direction) {
  // Create massive fire cone blast
  for (let i = 0; i < 50; i++) {
    const particleGeometry = new THREE.SphereGeometry(
      0.4 + Math.random() * 0.3,
      8,
      8,
    );
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(0.05 + Math.random() * 0.1, 1, 0.5),
      transparent: true,
      opacity: 1,
    });
    const particle = new THREE.Mesh(particleGeometry, particleMaterial);

    particle.position.copy(position);

    // Create cone-shaped spread
    const spread = new THREE.Vector3(
      direction.x + (Math.random() - 0.5) * 2,
      direction.y + (Math.random() - 0.5) * 0.5,
      direction.z + (Math.random() - 0.5) * 2,
    );

    particle.userData = {
      velocity: spread.multiplyScalar(1.5 + Math.random() * 2),
      gravity: -0.05,
      life: 0.6 + Math.random() * 0.4,
    };

    scene.add(particle);
    particles.push(particle);
  }

  // Add bright flash light
  const pointLight = new THREE.PointLight(0xff6600, 5, 50);
  pointLight.position.copy(position);
  scene.add(pointLight);
  setTimeout(() => {
    scene.remove(pointLight);
  }, 150);
}

function createSmokeTrail(cannonball) {
  cannonball.userData.smokeTimer = setInterval(() => {
    if (!cannonball.parent) {
      clearInterval(cannonball.userData.smokeTimer);
      return;
    }

    const smokeGeometry = new THREE.SphereGeometry(0.5, 8, 8);
    const smokeMaterial = new THREE.MeshBasicMaterial({
      color: 0x555555,
      transparent: true,
      opacity: 0.6,
    });
    const smoke = new THREE.Mesh(smokeGeometry, smokeMaterial);
    smoke.position.copy(cannonball.position);

    smoke.userData = {
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        Math.random() * 0.2,
        (Math.random() - 0.5) * 0.5,
      ),
      life: 1.0,
    };

    scene.add(smoke);
    particles.push(smoke);
  }, 50);
}

function createExplosion(position) {
  // Create massive fire particle explosion
  for (let i = 0; i < 60; i++) {
    const particleGeometry = new THREE.SphereGeometry(
      0.4 + Math.random() * 0.3,
      8,
      8,
    );
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(
        0.05 + Math.random() * 0.1,
        1,
        0.5 + Math.random() * 0.3,
      ),
      transparent: true,
      opacity: 1,
    });
    const particle = new THREE.Mesh(particleGeometry, particleMaterial);

    particle.position.copy(position);
    particle.userData = {
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        Math.random() * 5 + 2,
        (Math.random() - 0.5) * 8,
      ),
      gravity: -0.15,
      life: 1.0 + Math.random() * 0.5,
    };

    scene.add(particle);
    particles.push(particle);
  }

  // Add black smoke
  for (let i = 0; i < 20; i++) {
    const smokeGeometry = new THREE.SphereGeometry(
      1 + Math.random() * 0.5,
      8,
      8,
    );
    const smokeMaterial = new THREE.MeshBasicMaterial({
      color: 0x222222,
      transparent: true,
      opacity: 0.7,
    });
    const smoke = new THREE.Mesh(smokeGeometry, smokeMaterial);
    smoke.position.copy(position);
    smoke.userData = {
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        Math.random() * 4 + 2,
        (Math.random() - 0.5) * 3,
      ),
      gravity: 0.05,
      life: 2.0,
    };
    scene.add(smoke);
    particles.push(smoke);
  }

  // Main flash sphere
  const flashGeometry = new THREE.SphereGeometry(5, 16, 16);
  const flashMaterial = new THREE.MeshBasicMaterial({
    color: 0xff4400,
    transparent: true,
    opacity: 1,
  });
  const flash = new THREE.Mesh(flashGeometry, flashMaterial);
  flash.position.copy(position);
  scene.add(flash);

  // Shockwave ring
  const ringGeometry = new THREE.TorusGeometry(3, 0.8, 8, 24);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xffaa00,
    transparent: true,
    opacity: 0.8,
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.position.copy(position);
  scene.add(ring);

  // Bright explosion light
  const explosionLight = new THREE.PointLight(0xff6600, 10, 100);
  explosionLight.position.copy(position);
  scene.add(explosionLight);

  let scale = 1;
  const flashInterval = setInterval(() => {
    scale += 0.8;
    flash.scale.set(scale, scale, scale);
    ring.scale.set(scale, scale, scale);
    flash.material.opacity -= 0.1;
    ring.material.opacity -= 0.15;
    explosionLight.intensity -= 1;

    if (flash.material.opacity <= 0) {
      scene.remove(flash);
      scene.remove(ring);
      scene.remove(explosionLight);
      clearInterval(flashInterval);
    }
  }, 40);
}

// ============================================================================
// QUESTION SYSTEM
// ============================================================================

function showQuestion() {
  console.log("🎮 showQuestion() called", {
    questionsAnswered,
    totalQuestions: questions.length,
    questionActive,
  });

  if (questionsAnswered >= questions.length || questionActive) {
    console.log("⏭️ Skipping question:", {
      reason:
        questionsAnswered >= questions.length
          ? "All answered"
          : "Question already active",
    });
    return;
  }

  currentQuestion = questions[questionsAnswered];
  console.log(
    "📝 Showing question",
    questionsAnswered + 1,
    "of",
    questions.length,
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

  // Create a shuffled version with original indices to track correct answer
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

  buttons.forEach((btn, i) => {
    if (shuffledOptions && shuffledOptions[i]) {
      const option = shuffledOptions[i].opt;
      // API format has {text, effects}, fallback has just strings
      btn.textContent = option.text || option;
      btn.className = "answer-btn";
      btn.disabled = false;
      btn.style.display = "block";
    } else {
      btn.style.display = "none";
    }
  });

  document.getElementById("questionPopup").style.display = "block";
  questionActive = true;
}

window.selectAnswer = async function (index) {
  const buttons = document.querySelectorAll(".answer-btn");
  buttons.forEach((btn) => (btn.disabled = true));

  // For emotional questions, there's no "correct" answer - just track the choice
  const answerOptions = currentQuestion.options || currentQuestion.answers;
  // Get the original index from the shuffle map
  const originalIndex = currentQuestion._shuffleMap
    ? currentQuestion._shuffleMap[index]
    : index;
  const selectedOption = answerOptions[originalIndex];

  // Visual feedback
  buttons[index].classList.add("correct");
  score += 100;
  questionsAnswered++;

  // Apply effects if available (from API format)
  if (selectedOption && selectedOption.effects) {
    // Effects will be used for career recommendation
    console.log("📊 Answer effects:", selectedOption.effects);
  }

  // Save answer to Flask API
  try {
    await fetch("/api/answer/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: sessionId,
        gameType: "emotional",
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

  setTimeout(() => {
    document.getElementById("questionPopup").style.display = "none";
    questionActive = false;
    updateHUD();
  }, 1500);
};

// ============================================================================
// INPUT HANDLING
// ============================================================================

function onKeyDown(event) {
  keys[event.code] = true;

  // Spacebar for firing
  if (event.code === "Space") {
    event.preventDefault();
    fireCannon();
  }
}

function onKeyUp(event) {
  keys[event.code] = false;
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
// HUD UPDATE
// ============================================================================

function updateHUD() {
  document.getElementById("score").textContent = `SCORE: ${score}`;
  document.getElementById("healthFill").style.width = `${Math.max(0, health)}%`;

  // Update health bar color
  const healthFill = document.getElementById("healthFill");
  if (health > 60) {
    healthFill.style.background = "linear-gradient(90deg, #2ecc71, #27ae60)";
  } else if (health > 30) {
    healthFill.style.background = "linear-gradient(90deg, #f39c12, #e67e22)";
  } else {
    healthFill.style.background = "linear-gradient(90deg, #e74c3c, #c0392b)";
  }
}

// ============================================================================
// GAME LOOP
// ============================================================================

function animate() {
  requestAnimationFrame(animate);

  if (gameState !== "playing") return;

  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  // ========== PLAYER MOVEMENT ==========
  const speed = 0.6;
  const rotationSpeed = 0.03;

  if (keys["KeyW"] || keys["ArrowUp"]) {
    const forward = new THREE.Vector3(0, 0, -speed);
    forward.applyQuaternion(playerShip.quaternion);
    playerShip.position.add(forward);
  }
  if (keys["KeyS"] || keys["ArrowDown"]) {
    const backward = new THREE.Vector3(0, 0, speed * 0.5);
    backward.applyQuaternion(playerShip.quaternion);
    playerShip.position.add(backward);
  }
  if (keys["KeyA"] || keys["ArrowLeft"]) {
    playerShip.rotation.y += rotationSpeed;
  }
  if (keys["KeyD"] || keys["ArrowRight"]) {
    playerShip.rotation.y -= rotationSpeed;
  }

  // Ship bobbing animation with more realistic movement
  playerShip.position.y = Math.sin(time * 1.5) * 1.5;
  playerShip.rotation.x = Math.sin(time * 1.2) * 0.06;
  playerShip.rotation.z = Math.sin(time * 0.8) * 0.04;

  // Animate player ship sails with wind
  if (playerShip.children) {
    playerShip.children.forEach((child) => {
      if (child.geometry && child.geometry.type === "PlaneGeometry") {
        child.rotation.x = Math.sin(time * 2.5) * 0.08;
      }
    });
  }

  // ========== CAMERA FOLLOW ==========
  const idealOffset = new THREE.Vector3(0, 30, 50);
  idealOffset.applyQuaternion(playerShip.quaternion);
  const idealPosition = playerShip.position.clone().add(idealOffset);

  camera.position.lerp(idealPosition, 0.1);

  const lookAtOffset = new THREE.Vector3(0, 5, -20);
  lookAtOffset.applyQuaternion(playerShip.quaternion);
  const lookAtPosition = playerShip.position.clone().add(lookAtOffset);
  camera.lookAt(lookAtPosition);

  // ========== OCEAN ANIMATION ==========
  if (water) {
    const positions = water.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const wave1 =
        Math.sin(x * 0.05 + time * 0.5) * Math.cos(z * 0.05 + time * 0.3) * 1.5;
      const wave2 =
        Math.sin(x * 0.03 + time * 0.3 + 100) *
        Math.cos(z * 0.03 + time * 0.4 + 100) *
        1.0;
      const wave3 = Math.sin(x * 0.08 + time * 0.7) * 0.5;
      positions.setY(i, wave1 + wave2 + wave3);
    }
    positions.needsUpdate = true;
  }

  // ========== CLOUDS MOVEMENT ==========
  clouds.forEach((cloud) => {
    cloud.position.x += 0.02;
    if (cloud.position.x > 1500) {
      cloud.position.x = -1500;
    }
  });

  // ========== PIRATE SPAWNING ==========
  if (Math.random() < 0.003 && pirateShips.length < 6) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 150 + Math.random() * 100;
    const pirate = createPirateShip(
      new THREE.Vector3(
        playerShip.position.x + Math.cos(angle) * distance,
        0,
        playerShip.position.z + Math.sin(angle) * distance - 50,
      ),
    );
    pirateShips.push(pirate);
  }

  // ========== PIRATE AI ==========
  pirateShips.forEach((pirate, index) => {
    const dx = playerShip.position.x - pirate.position.x;
    const dz = playerShip.position.z - pirate.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Chase player more aggressively
    if (distance > 15) {
      const moveSpeed = 0.45;
      pirate.userData.velocity.x = (dx / distance) * moveSpeed;
      pirate.userData.velocity.z = (dz / distance) * moveSpeed;
    }

    // Add ramming behavior when close
    if (distance < 20 && distance > 10) {
      const rammingSpeed = 0.6;
      pirate.userData.velocity.x = (dx / distance) * rammingSpeed;
      pirate.userData.velocity.z = (dz / distance) * rammingSpeed;
    }

    pirate.position.add(pirate.userData.velocity);
    pirate.rotation.y = Math.atan2(dx, dz);

    // Bobbing and realistic rolling
    pirate.position.y = Math.sin(time * 1.3 + index) * 1.2;
    pirate.rotation.x = Math.sin(time * 1.1 + index) * 0.06;
    pirate.rotation.z = Math.sin(time * 0.9 + index) * 0.04;

    // Animate sails with wind
    if (pirate.children) {
      pirate.children.forEach((child) => {
        if (child.geometry && child.geometry.type === "PlaneGeometry") {
          child.rotation.x = Math.sin(time * 2 + index) * 0.05;
        }
      });
    }

    // Fire at player more frequently
    if (Math.random() < 0.012 && distance < 120 && distance > 15) {
      fireEnemyCannon(pirate.position, playerShip.position);
    }

    // Remove if destroyed
    if (pirate.userData.health <= 0) {
      createExplosion(pirate.position);
      scene.remove(pirate);
      pirateShips.splice(index, 1);
      score += 75;
      piratesDefeated++;
      updateHUD();
    }
  });

  // ========== CANNONBALL PHYSICS ==========
  cannonballs.forEach((ball, index) => {
    ball.userData.lifespan += delta;
    ball.userData.velocity.y -= 0.03; // Gravity
    ball.position.add(ball.userData.velocity);
    ball.rotation.x += 0.2;
    ball.rotation.y += 0.15;

    // Check collision with pirates
    if (ball.userData.type === "playerCannon") {
      pirateShips.forEach((pirate) => {
        if (ball.position.distanceTo(pirate.position) < 9) {
          pirate.userData.health--;
          createExplosion(ball.position);
          scene.remove(ball);
          cannonballs.splice(index, 1);

          // Visual feedback for hits
          if (pirate.userData.health > 0) {
            // Show damage - flash red
            pirate.traverse((child) => {
              if (child.material && child.material.color) {
                const originalColor = child.material.color.clone();
                child.material.color.setHex(0xff0000);
                setTimeout(() => {
                  child.material.color.copy(originalColor);
                }, 100);
              }
            });
          }
        }
      });
    }

    // Check collision with player
    if (ball.userData.type === "enemy") {
      if (ball.position.distanceTo(playerShip.position) < 10) {
        health -= 5;
        updateHUD();
        createExplosion(ball.position);
        scene.remove(ball);
        cannonballs.splice(index, 1);
      }
    }

    // Remove if out of bounds or hit water
    if (
      ball.position.y < -5 ||
      ball.userData.lifespan > 10 ||
      Math.abs(ball.position.x) > 1000 ||
      Math.abs(ball.position.z) > 1000
    ) {
      if (ball.position.y < -2) {
        createSplash(ball.position);
      }
      if (ball.userData.smokeTimer) {
        clearInterval(ball.userData.smokeTimer);
      }
      scene.remove(ball);
      cannonballs.splice(index, 1);
    }
  });

  // ========== PARTICLE PHYSICS ==========
  particles.forEach((particle, index) => {
    particle.userData.velocity.y += particle.userData.gravity || -0.1;
    particle.position.add(particle.userData.velocity);
    particle.userData.life -= delta;
    particle.material.opacity = particle.userData.life;

    if (particle.userData.life <= 0 || particle.position.y < -10) {
      scene.remove(particle);
      particles.splice(index, 1);
    }
  });

  // ========== QUESTION TRIGGERS ==========
  questionTriggerCounter += delta;
  if (
    !questionActive &&
    questionsAnswered < questions.length &&
    questionTriggerCounter > 3
  ) {
    showQuestion();
    questionTriggerCounter = 0;
  }

  // ========== WIN CONDITION ==========
  // Reach INS Vikrant Indian Navy Coast Line
  if (playerShip.position.distanceTo(navyPatrol.position) < 80) {
    endGame(true);
  }

  // ========== LOSE CONDITION ==========
  if (health <= 0) {
    endGame(false);
  }

  // ========== RENDER ==========
  renderer.render(scene, camera);
}

function createSplash(position) {
  for (let i = 0; i < 15; i++) {
    const particleGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: 0x87ceeb,
      transparent: true,
      opacity: 0.8,
    });
    const particle = new THREE.Mesh(particleGeometry, particleMaterial);

    particle.position.set(position.x, 0, position.z);
    particle.userData = {
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 2,
        (Math.random() - 0.5) * 2,
      ),
      gravity: -0.1,
      life: 0.5,
    };

    scene.add(particle);
    particles.push(particle);
  }
}

// ============================================================================
// GAME END
// ============================================================================

function endGame(victory) {
  gameState = "ended";

  const gameOver = document.getElementById("gameOver");
  const title = document.getElementById("gameOverTitle");
  const text = document.getElementById("gameOverText");

  document.getElementById("finalScore").textContent = score;
  document.getElementById("finalQuestions").textContent = questionsAnswered;
  document.getElementById("finalPirates").textContent = piratesDefeated;

  if (victory) {
    title.textContent = "MISSION SUCCESS!";
    title.style.background = "linear-gradient(135deg, #2ecc71, #27ae60)";
    title.style.webkitBackgroundClip = "text";
    title.style.webkitTextFillColor = "transparent";
    text.textContent =
      "You reached INS Vikrant - Indian Navy Coast Line! Your career path awaits!";
    // Change button text to NEXT MISSION
    document.querySelector(".btn-restart").textContent = "NEXT MISSION →";
  } else {
    title.textContent = "GAME OVER";
    title.style.background = "linear-gradient(135deg, #e74c3c, #c0392b)";
    title.style.webkitBackgroundClip = "text";
    title.style.webkitTextFillColor = "transparent";
    text.textContent =
      "The pirates defeated you. Try again to unlock your career!";
    // Keep button text as PLAY AGAIN
    document.querySelector(".btn-restart").textContent = "PLAY AGAIN";
  }

  gameOver.style.display = "block";
}

window.restartGame = function () {
  // Check if player won
  if (
    gameState === "ended" &&
    document.getElementById("gameOverTitle").textContent === "MISSION SUCCESS!"
  ) {
    // Move to next game with session_id
    window.location.href = `/html/game2.html?session_id=${sessionId}`;
  } else {
    // Restart current game
    location.reload();
  }
};

// ============================================================================
// START GAME
// ============================================================================

window.addEventListener("load", () => {
  init();
  updateHUD();

  // Trigger first question after 3 seconds
  setTimeout(() => {
    if (questions.length > 0 && !questionActive) {
      console.log("📝 Auto-triggering first question");
      showQuestion();
    }
  }, 3000);
});
