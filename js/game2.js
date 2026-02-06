// ============================================================================
// C$S - FIGHTER JET AIRFORCE MISSION
// Advanced Three.js 3D Game with Realistic Graphics
// ============================================================================

// Game State Variables
let scene, camera, renderer, clock;
let playerJet, airforceBase, aircraftCarrier;
let enemyPlanes = [],
  missiles = [],
  particles = [],
  clouds = [];
let keys = {},
  mouse = { x: 0, y: 0 };
let health = 100,
  score = 0,
  enemiesDefeated = 0;
let gameState = "start";
let questionsAnswered = 0,
  questionActive = false;
let sky, sun, terrain;
let targetPosition = new THREE.Vector3(0, 200, -2000);
let jetTakeoff = false,
  takeoffProgress = 0;

// Career Questions Database - Loaded from Flask API
let questions = [];
let currentQuestion = null;
let questionTriggerCounter = 0;
let sessionId = null;

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

// Fetch reasoning questions from Flask API
async function loadQuestions() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    sessionId =
      urlParams.get("session_id") || localStorage.getItem("sessionId");

    const response = await fetch(
      `http://localhost:5000/api/questions/reasoning?count=10&session_id=${sessionId}`,
    );
    const data = await response.json();
    questions = data.questions;
    console.log(
      `✅ Loaded ${questions.length} reasoning questions from AI dataset`,
    );
  } catch (error) {
    console.error("❌ Failed to load questions:", error);
    questions = [
      {
        question: "What's the logical next step?",
        answers: ["Option A", "Option B", "Option C", "Option D"],
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

  // Create Scene with sky fog
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x87ceeb, 0.0002);

  // Create Camera
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    10000,
  );
  camera.position.set(0, 150, 100);

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
  createClouds();
  createOcean();

  // Create Game Objects
  createAircraftCarrier();
  createPlayerJet();
  createAirforceBase();

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
  const skyGeometry = new THREE.SphereGeometry(9000, 32, 32);
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
  const sunGeometry = new THREE.SphereGeometry(80, 32, 32);
  const sunMaterial = new THREE.MeshBasicMaterial({
    color: 0xfdb813,
    fog: false,
  });
  sun = new THREE.Mesh(sunGeometry, sunMaterial);
  sun.position.set(800, 500, -1500);
  scene.add(sun);
}

function createTerrain() {
  const geometry = new THREE.PlaneGeometry(10000, 10000, 100, 100);
  const positions = geometry.attributes.position;

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const height = Math.sin(x * 0.01) * Math.cos(z * 0.01) * 15;
    positions.setY(i, height);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: 0x3a5f0b,
    roughness: 0.8,
    metalness: 0.2,
  });

  terrain = new THREE.Mesh(geometry, material);
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.y = -100;
  terrain.receiveShadow = true;
  scene.add(terrain);
}

function createOcean() {
  const geometry = new THREE.PlaneGeometry(10000, 10000, 200, 200);
  const material = new THREE.MeshPhysicalMaterial({
    color: 0x0066cc,
    transparent: true,
    opacity: 0.85,
    roughness: 0.05,
    metalness: 0.1,
    clearcoat: 1.0,
  });

  const ocean = new THREE.Mesh(geometry, material);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.y = -5;
  ocean.receiveShadow = true;
  scene.add(ocean);

  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const wave = Math.sin(x * 0.04) * Math.cos(z * 0.04) * 2;
    positions.setY(i, wave);
  }
  positions.needsUpdate = true;
}

function createClouds() {
  const cloudGeometry = new THREE.SphereGeometry(40, 8, 8);
  const cloudMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.7,
    fog: true,
  });

  for (let i = 0; i < 40; i++) {
    const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
    cloud.position.set(
      (Math.random() - 0.5) * 4000,
      100 + Math.random() * 300,
      (Math.random() - 0.5) * 4000,
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
  const ambientLight = new THREE.AmbientLight(0x87ceeb, 0.6);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xffe4b5, 1.8);
  sunLight.position.set(200, 300, -400);
  sunLight.castShadow = true;
  sunLight.shadow.camera.left = -500;
  sunLight.shadow.camera.right = 500;
  sunLight.shadow.camera.top = 500;
  sunLight.shadow.camera.bottom = -500;
  sunLight.shadow.camera.near = 0.1;
  sunLight.shadow.camera.far = 2000;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  scene.add(sunLight);

  const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x4a7c59, 0.6);
  scene.add(hemiLight);
}

// ============================================================================
// GAME OBJECTS CREATION
// ============================================================================

function createAircraftCarrier() {
  const carrierGroup = new THREE.Group();

  // Main hull
  const hullGeo = new THREE.BoxGeometry(100, 15, 250);
  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x555555,
    roughness: 0.7,
    metalness: 0.8,
  });
  const hull = new THREE.Mesh(hullGeo, hullMat);
  hull.castShadow = true;
  carrierGroup.add(hull);

  // Deck
  const deckGeo = new THREE.BoxGeometry(95, 2, 240);
  const deckMat = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.6,
    metalness: 0.9,
  });
  const deck = new THREE.Mesh(deckGeo, deckMat);
  deck.position.y = 8.5;
  deck.castShadow = true;
  carrierGroup.add(deck);

  // Control tower
  const towerGeo = new THREE.BoxGeometry(30, 35, 30);
  const towerMat = new THREE.MeshStandardMaterial({
    color: 0x666666,
    roughness: 0.5,
    metalness: 0.9,
  });
  const tower = new THREE.Mesh(towerGeo, towerMat);
  tower.position.set(30, 27, 0);
  tower.castShadow = true;
  carrierGroup.add(tower);

  // Runway markings
  const markingGeo = new THREE.PlaneGeometry(10, 200);
  const markingMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
  const marking = new THREE.Mesh(markingGeo, markingMat);
  marking.rotation.x = -Math.PI / 2;
  marking.position.y = 9.6;
  carrierGroup.add(marking);

  carrierGroup.position.set(0, 0, 0);
  scene.add(carrierGroup);
  aircraftCarrier = carrierGroup;
}

function createPlayerJet() {
  const jetGroup = new THREE.Group();

  // Advanced materials
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x0a0a0a,
    roughness: 0.15,
    metalness: 0.95,
    emissive: 0x001a33,
    emissiveIntensity: 0.2,
    envMapIntensity: 2.0,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: 0x1a4d80,
    roughness: 0.2,
    metalness: 0.9,
    emissive: 0x0066cc,
    emissiveIntensity: 0.4,
  });

  // Main fuselage - Quinjet style with angular design
  const noseConeGeo = new THREE.ConeGeometry(3.5, 12, 6);
  const noseCone = new THREE.Mesh(noseConeGeo, bodyMat);
  noseCone.rotation.x = Math.PI / 2;
  noseCone.position.z = 8;
  noseCone.castShadow = true;
  jetGroup.add(noseCone);

  // Mid fuselage - wider body
  const midBodyGeo = new THREE.BoxGeometry(7, 5, 25);
  const midBody = new THREE.Mesh(midBodyGeo, bodyMat);
  midBody.position.set(0, 0, -5);
  midBody.castShadow = true;
  jetGroup.add(midBody);

  // Upper hull armor plates
  const upperPlateGeo = new THREE.BoxGeometry(6.5, 0.5, 24);
  const upperPlate = new THREE.Mesh(upperPlateGeo, accentMat);
  upperPlate.position.set(0, 2.8, -5);
  upperPlate.castShadow = true;
  jetGroup.add(upperPlate);

  // Side armor panels with glow lines
  for (let side = -1; side <= 1; side += 2) {
    const panelGeo = new THREE.BoxGeometry(0.3, 4, 20);
    const panel = new THREE.Mesh(panelGeo, accentMat);
    panel.position.set(side * 3.5, 0, -4);
    panel.castShadow = true;
    jetGroup.add(panel);

    // Glowing accent lines
    const lineGeo = new THREE.BoxGeometry(0.15, 0.2, 18);
    const lineMat = new THREE.MeshBasicMaterial({
      color: 0x00ccff,
      emissive: 0x00ccff,
      emissiveIntensity: 1.0,
    });
    const line = new THREE.Mesh(lineGeo, lineMat);
    line.position.set(side * 3.6, 0.5, -4);
    jetGroup.add(line);
  }

  // Advanced cockpit with multiple segments
  const cockpitMainGeo = new THREE.SphereGeometry(
    3,
    24,
    24,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2,
  );
  const cockpitMat = new THREE.MeshPhysicalMaterial({
    color: 0x0088ff,
    transparent: true,
    opacity: 0.4,
    roughness: 0.05,
    metalness: 0.95,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    emissive: 0x0066cc,
    emissiveIntensity: 0.3,
  });
  const cockpitMain = new THREE.Mesh(cockpitMainGeo, cockpitMat);
  cockpitMain.rotation.x = -Math.PI / 2;
  cockpitMain.position.set(0, 2.5, 4);
  cockpitMain.scale.set(1, 1.2, 1.3);
  cockpitMain.castShadow = true;
  jetGroup.add(cockpitMain);

  // Cockpit frame
  const frameGeo = new THREE.TorusGeometry(2.8, 0.15, 8, 24, Math.PI);
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x0a0a0a,
    roughness: 0.2,
    metalness: 1.0,
  });
  const frame = new THREE.Mesh(frameGeo, frameMat);
  frame.rotation.x = Math.PI / 2;
  frame.position.set(0, 2.5, 4);
  jetGroup.add(frame);

  // Advanced delta wings with multiple segments
  const mainWingGeo = new THREE.BoxGeometry(45, 0.8, 18);
  const mainWing = new THREE.Mesh(mainWingGeo, bodyMat);
  mainWing.position.set(0, -0.5, -3);
  mainWing.castShadow = true;
  jetGroup.add(mainWing);

  // Wing accent plates
  const wingAccentGeo = new THREE.BoxGeometry(44, 0.3, 16);
  const wingAccent = new THREE.Mesh(wingAccentGeo, accentMat);
  wingAccent.position.set(0, -0.1, -3);
  jetGroup.add(wingAccent);

  // Wing tip thrusters
  for (let side = -1; side <= 1; side += 2) {
    const tipGeo = new THREE.BoxGeometry(3, 1.5, 4);
    const tip = new THREE.Mesh(tipGeo, bodyMat);
    tip.position.set(side * 20, -0.5, -3);
    tip.castShadow = true;
    jetGroup.add(tip);

    // Thruster glow
    const thrusterGeo = new THREE.CylinderGeometry(0.6, 0.8, 2, 16);
    const thrusterMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 1.0,
      transparent: true,
      opacity: 0.8,
    });
    const thruster = new THREE.Mesh(thrusterGeo, thrusterMat);
    thruster.rotation.x = Math.PI / 2;
    thruster.position.set(side * 20, -0.5, -5);
    jetGroup.add(thruster);
  }

  // Vertical stabilizers - twin tail design
  for (let side = -1; side <= 1; side += 2) {
    const tailGeo = new THREE.BoxGeometry(1.5, 12, 8);
    const tail = new THREE.Mesh(tailGeo, bodyMat);
    tail.position.set(side * 5, 4, -15);
    tail.rotation.z = side * 0.15;
    tail.castShadow = true;
    jetGroup.add(tail);

    // Tail accent
    const tailAccentGeo = new THREE.BoxGeometry(1.2, 10, 7);
    const tailAccent = new THREE.Mesh(tailAccentGeo, accentMat);
    tailAccent.position.set(side * 5, 4, -15);
    tailAccent.rotation.z = side * 0.15;
    jetGroup.add(tailAccent);

    // Tail lights
    const lightGeo = new THREE.SphereGeometry(0.4, 8, 8);
    const lightMat = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 1.0,
    });
    const light = new THREE.Mesh(lightGeo, lightMat);
    light.position.set(side * 5, 9, -15);
    jetGroup.add(light);
  }

  // Main engines - quad engine design like Quinjet
  const enginePositions = [
    [-7, -1, -14],
    [7, -1, -14],
    [-7, 1.5, -14],
    [7, 1.5, -14],
  ];

  enginePositions.forEach((pos) => {
    // Engine housing
    const engineGeo = new THREE.CylinderGeometry(2, 2.5, 10, 16);
    const engine = new THREE.Mesh(engineGeo, bodyMat);
    engine.rotation.x = Math.PI / 2;
    engine.position.set(pos[0], pos[1], pos[2]);
    engine.castShadow = true;
    jetGroup.add(engine);

    // Engine inner ring
    const ringGeo = new THREE.CylinderGeometry(1.8, 2.2, 9, 16);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.3,
      metalness: 0.9,
      emissive: 0xff3300,
      emissiveIntensity: 0.6,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(pos[0], pos[1], pos[2]);
    jetGroup.add(ring);

    // Exhaust glow - multiple layers for depth
    for (let j = 0; j < 3; j++) {
      const glowGeo = new THREE.CylinderGeometry(
        1.5 - j * 0.3,
        2.0 - j * 0.3,
        4 + j * 2,
        16,
      );
      const glowMat = new THREE.MeshBasicMaterial({
        color: j === 0 ? 0xffaa00 : j === 1 ? 0xff6600 : 0xff3300,
        transparent: true,
        opacity: 0.7 - j * 0.2,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.rotation.x = Math.PI / 2;
      glow.position.set(pos[0], pos[1], pos[2] - 7 - j * 2);
      jetGroup.add(glow);

      // Store glow for animation
      if (!jetGroup.userData.engineGlows) jetGroup.userData.engineGlows = [];
      jetGroup.userData.engineGlows.push(glow);
    }

    // Engine heat distortion effect
    const heatGeo = new THREE.SphereGeometry(2.5, 16, 16);
    const heatMat = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.15,
    });
    const heat = new THREE.Mesh(heatGeo, heatMat);
    heat.position.set(pos[0], pos[1], pos[2] - 8);
    jetGroup.add(heat);
  });

  // Weapon systems - missile pods
  for (let side = -1; side <= 1; side += 2) {
    const podGeo = new THREE.BoxGeometry(2, 1.5, 8);
    const pod = new THREE.Mesh(podGeo, bodyMat);
    pod.position.set(side * 14, -1.5, -6);
    pod.castShadow = true;
    jetGroup.add(pod);

    // Missiles visible in pods
    for (let i = 0; i < 3; i++) {
      const missileGeo = new THREE.CylinderGeometry(0.3, 0.3, 4, 8);
      const missileMat = new THREE.MeshStandardMaterial({
        color: 0x888888,
        roughness: 0.3,
        metalness: 0.9,
      });
      const missile = new THREE.Mesh(missileGeo, missileMat);
      missile.rotation.x = Math.PI / 2;
      missile.position.set(side * 14, -1.5, -8 + i * 2);
      jetGroup.add(missile);

      // Missile tip
      const tipGeo = new THREE.ConeGeometry(0.3, 0.8, 8);
      const tip = new THREE.Mesh(
        tipGeo,
        new THREE.MeshStandardMaterial({ color: 0xff0000 }),
      );
      tip.rotation.x = Math.PI / 2;
      tip.position.set(side * 14, -1.5, -6 + i * 2);
      jetGroup.add(tip);
    }
  }

  // Rear air brake/stabilizer
  const brakeGeo = new THREE.BoxGeometry(10, 0.4, 3);
  const brake = new THREE.Mesh(brakeGeo, accentMat);
  brake.position.set(0, 0, -18);
  brake.castShadow = true;
  jetGroup.add(brake);

  // Landing gear bay doors
  for (let side = -1; side <= 1; side += 2) {
    const bayGeo = new THREE.BoxGeometry(2, 0.3, 4);
    const bayMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.4,
      metalness: 0.9,
    });
    const bay = new THREE.Mesh(bayGeo, bayMat);
    bay.position.set(side * 2.5, -2.5, 2);
    jetGroup.add(bay);
  }

  // Navigation lights
  const navLightPositions = [
    [-22, -0.5, -3, 0xff0000], // Left wing - red
    [22, -0.5, -3, 0x00ff00], // Right wing - green
    [0, 5, -18, 0xffffff], // Top rear - white
  ];

  navLightPositions.forEach((pos) => {
    const lightGeo = new THREE.SphereGeometry(0.5, 16, 16);
    const lightMat = new THREE.MeshBasicMaterial({
      color: pos[3],
      emissive: pos[3],
      emissiveIntensity: 1.0,
    });
    const navLight = new THREE.Mesh(lightGeo, lightMat);
    navLight.position.set(pos[0], pos[1], pos[2]);
    jetGroup.add(navLight);

    // Point light for illumination
    const pointLight = new THREE.PointLight(pos[3], 2, 30);
    pointLight.position.set(pos[0], pos[1], pos[2]);
    jetGroup.add(pointLight);
  });

  // Underbelly lights for ground illumination
  const spotGeo = new THREE.CylinderGeometry(0.4, 0.6, 0.5, 16);
  const spotMat = new THREE.MeshBasicMaterial({
    color: 0xffffaa,
    emissive: 0xffffaa,
    emissiveIntensity: 0.8,
  });

  for (let i = -1; i <= 1; i += 2) {
    const spotlight = new THREE.Mesh(spotGeo, spotMat);
    spotlight.position.set(i * 3, -2.5, 4);
    jetGroup.add(spotlight);

    const spotLight = new THREE.SpotLight(0xffffaa, 3, 100, Math.PI / 6, 0.5);
    spotLight.position.set(i * 3, -2.5, 4);
    spotLight.target.position.set(i * 3, -100, 4);
    jetGroup.add(spotLight);
    jetGroup.add(spotLight.target);
  }

  // HUD display on canopy (internal light)
  const hudGeo = new THREE.PlaneGeometry(2, 1.5);
  const hudMat = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
  });
  const hud = new THREE.Mesh(hudGeo, hudMat);
  hud.position.set(0, 2, 5);
  hud.rotation.x = -0.5;
  jetGroup.add(hud);

  // Afterburner particle emitters (stored for animation)
  jetGroup.userData.afterburnerPositions = [
    [-7, -1, -19],
    [7, -1, -19],
    [-7, 1.5, -19],
    [7, 1.5, -19],
  ];

  jetGroup.position.set(0, 20, 60);
  jetGroup.rotation.y = Math.PI;
  scene.add(jetGroup);
  playerJet = jetGroup;
}

function createAirforceBase() {
  const baseGroup = new THREE.Group();

  // Main building
  const buildingGeo = new THREE.BoxGeometry(150, 40, 150);
  const buildingMat = new THREE.MeshStandardMaterial({
    color: 0x8b4513,
    roughness: 0.7,
    metalness: 0.3,
  });
  const building = new THREE.Mesh(buildingGeo, buildingMat);
  building.position.y = 20;
  building.castShadow = true;
  baseGroup.add(building);

  // Control tower
  const towerGeo = new THREE.BoxGeometry(20, 60, 20);
  const towerMat = new THREE.MeshStandardMaterial({
    color: 0xa0522d,
    roughness: 0.6,
    metalness: 0.4,
  });
  const tower = new THREE.Mesh(towerGeo, towerMat);
  tower.position.set(40, 50, 0);
  tower.castShadow = true;
  baseGroup.add(tower);

  // Radar dish
  const radarGeo = new THREE.CylinderGeometry(15, 15, 2, 32);
  const radarMat = new THREE.MeshStandardMaterial({
    color: 0x00ff00,
    emissive: 0x00ff00,
    emissiveIntensity: 0.3,
  });
  const radar = new THREE.Mesh(radarGeo, radarMat);
  radar.position.set(40, 81, 0);
  radar.castShadow = true;
  baseGroup.add(radar);

  // Runway
  const runwayGeo = new THREE.PlaneGeometry(80, 300);
  const runwayMat = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.8,
  });
  const runway = new THREE.Mesh(runwayGeo, runwayMat);
  runway.rotation.x = -Math.PI / 2;
  runway.position.set(-80, -99, 0);
  baseGroup.add(runway);

  baseGroup.position.copy(targetPosition);
  baseGroup.position.y = -100;
  scene.add(baseGroup);
  airforceBase = baseGroup;
}

function createEnemyPlane(position) {
  const enemyGroup = new THREE.Group();

  // Advanced Fuselage with nose cone
  const fuselageGeo = new THREE.ConeGeometry(2.2, 16, 8);
  const fuselageMat = new THREE.MeshStandardMaterial({
    color: 0x8b0000,
    roughness: 0.3,
    metalness: 0.85,
  });
  const fuselage = new THREE.Mesh(fuselageGeo, fuselageMat);
  fuselage.rotation.x = Math.PI / 2;
  fuselage.castShadow = true;
  enemyGroup.add(fuselage);

  // Cockpit
  const cockpitGeo = new THREE.SphereGeometry(1.2, 8, 8);
  const cockpitMat = new THREE.MeshPhysicalMaterial({
    color: 0x111111,
    metalness: 0.9,
    roughness: 0.1,
    transparent: true,
    opacity: 0.6,
  });
  const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
  cockpit.position.z = 4;
  cockpit.position.y = 1;
  cockpit.scale.set(1, 0.7, 1.2);
  enemyGroup.add(cockpit);

  // Swept-back wings
  const wingGeo = new THREE.BoxGeometry(28, 0.6, 9);
  const wingMat = new THREE.MeshStandardMaterial({
    color: 0xa00000,
    roughness: 0.4,
    metalness: 0.75,
  });
  const wings = new THREE.Mesh(wingGeo, wingMat);
  wings.position.z = -2;
  wings.rotation.y = 0.15; // Slight sweep
  wings.castShadow = true;
  enemyGroup.add(wings);

  // Wing tips
  const tipGeo = new THREE.BoxGeometry(3, 0.4, 1);
  for (let i = -1; i <= 1; i += 2) {
    const tip = new THREE.Mesh(tipGeo, wingMat);
    tip.position.set(i * 13, 0, -2);
    tip.position.y = 2;
    enemyGroup.add(tip);
  }

  // Dual jet engines with glow
  for (let i = -1; i <= 1; i += 2) {
    const engineGeo = new THREE.CylinderGeometry(0.8, 1.2, 6, 8);
    const engineMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.9,
      roughness: 0.3,
    });
    const engine = new THREE.Mesh(engineGeo, engineMat);
    engine.position.set(i * 3, -0.5, -6);
    engine.rotation.x = Math.PI / 2;
    enemyGroup.add(engine);

    // Engine exhaust glow
    const exhaustGeo = new THREE.CylinderGeometry(0.6, 0.8, 1.5, 8);
    const exhaustMat = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      emissive: 0xff4400,
      emissiveIntensity: 1.2,
    });
    const exhaust = new THREE.Mesh(exhaustGeo, exhaustMat);
    exhaust.position.set(i * 3, -0.5, -9);
    exhaust.rotation.x = Math.PI / 2;
    enemyGroup.add(exhaust);

    const engineLight = new THREE.PointLight(0xff4400, 2, 20);
    engineLight.position.set(i * 3, -0.5, -9);
    enemyGroup.add(engineLight);
  }

  // Missile pods under wings
  for (let i = -1; i <= 1; i += 2) {
    const podGeo = new THREE.CylinderGeometry(0.4, 0.4, 4, 8);
    const podMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      metalness: 0.8,
      roughness: 0.4,
    });
    const pod = new THREE.Mesh(podGeo, podMat);
    pod.position.set(i * 8, -1.5, 0);
    pod.rotation.x = Math.PI / 2;
    enemyGroup.add(pod);
  }

  // Tail fins
  const tailFinGeo = new THREE.BoxGeometry(8, 4, 0.5);
  const tailFin = new THREE.Mesh(tailFinGeo, wingMat);
  tailFin.position.z = -8;
  tailFin.position.y = 2;
  enemyGroup.add(tailFin);

  // Red threat lights
  const threatGeo = new THREE.SphereGeometry(0.3, 8, 8);
  const threatMat = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    emissive: 0xff0000,
    emissiveIntensity: 2,
  });
  for (let i = -1; i <= 1; i += 2) {
    const light = new THREE.Mesh(threatGeo, threatMat);
    light.position.set(i * 12, 0, -2);
    enemyGroup.add(light);
  }

  enemyGroup.position.copy(position);
  enemyGroup.userData.velocity = new THREE.Vector3();
  enemyGroup.userData.health = 100;
  enemyGroup.userData.lastAttack = 0;

  scene.add(enemyGroup);
  return enemyGroup;
}

// ============================================================================
// GAME LOGIC
// ============================================================================

function startMission() {
  gameState = "takeoff";
  document.getElementById("startScreen").style.display = "none";
  jetTakeoff = true;
  takeoffProgress = 0;
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  if (gameState === "playing" || gameState === "takeoff") {
    updatePlayer(delta, time);
    updateCamera();
    updateEnemies(delta, time);
    updateMissiles(delta);
    updateParticles(delta);
    updateClouds(time);
    updateDirectionArrow();
    updateJetEffects(time);
    checkCollisions();
    checkGameWin();

    // ========== QUESTION TRIGGERS ==========
    questionTriggerCounter += delta;
    if (
      !questionActive &&
      questionsAnswered < 10 &&
      questionTriggerCounter > 3
    ) {
      showQuestion();
      questionTriggerCounter = 0;
    }

    // Spawn enemies periodically at same altitude (200)
    if (time % 8 < delta && enemyPlanes.length < 5) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 300 + Math.random() * 200;
      const pos = new THREE.Vector3(
        playerJet.position.x + Math.cos(angle) * distance,
        200,
        playerJet.position.z + Math.sin(angle) * distance,
      );
      enemyPlanes.push(createEnemyPlane(pos));
    }
  }

  renderer.render(scene, camera);
  updateHUD();
}

function updateJetEffects(time) {
  // Pulse engine glows
  if (playerJet.userData.engineGlows) {
    playerJet.userData.engineGlows.forEach((glow, index) => {
      const pulse = Math.sin(time * 10 + index) * 0.15 + 0.85;
      glow.material.opacity = glow.material.opacity * 0.9 + pulse * 0.1;
      glow.scale.setScalar(pulse);
    });
  }

  // Create afterburner particles when moving
  if (gameState === "playing" && (keys["w"] || keys["ArrowUp"])) {
    if (playerJet.userData.afterburnerPositions && Math.random() > 0.7) {
      playerJet.userData.afterburnerPositions.forEach((pos) => {
        const worldPos = new THREE.Vector3(pos[0], pos[1], pos[2]);
        worldPos.applyQuaternion(playerJet.quaternion);
        worldPos.add(playerJet.position);
        createAfterburnerParticle(worldPos);
      });
    }
  }
}

function createAfterburnerParticle(position) {
  const geometry = new THREE.SphereGeometry(0.8 + Math.random() * 0.5, 8, 8);
  const color = Math.random() > 0.5 ? 0xff6600 : 0xffaa00;
  const material = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.9,
  });
  const particle = new THREE.Mesh(geometry, material);
  particle.position.copy(position);
  particle.position.x += (Math.random() - 0.5) * 2;
  particle.position.y += (Math.random() - 0.5) * 2;
  particle.position.z += (Math.random() - 0.5) * 2;
  particle.userData.life = 0.3 + Math.random() * 0.2;
  particle.userData.maxLife = particle.userData.life;
  particle.userData.velocity = new THREE.Vector3(
    (Math.random() - 0.5) * 5,
    (Math.random() - 0.5) * 5,
    Math.random() * 10,
  );
  scene.add(particle);
  particles.push(particle);
}

function updatePlayer(delta, time) {
  if (gameState === "takeoff") {
    takeoffProgress += delta * 0.3;

    if (takeoffProgress < 1) {
      // Move forward on carrier
      playerJet.position.z -= delta * 30;
    } else if (takeoffProgress < 3) {
      // Ascend
      playerJet.position.y += delta * 25;
      playerJet.position.z -= delta * 20;
      playerJet.rotation.x = -0.3;
    } else {
      // Level off and start game
      gameState = "playing";
      playerJet.rotation.x = 0;
    }
    return;
  }

  const speed = 80;
  const turnSpeed = 1.5;

  // Movement
  if (keys["w"] || keys["ArrowUp"]) {
    playerJet.position.z -= Math.cos(playerJet.rotation.y) * speed * delta;
    playerJet.position.x -= Math.sin(playerJet.rotation.y) * speed * delta;
  }
  if (keys["s"] || keys["ArrowDown"]) {
    playerJet.position.z += Math.cos(playerJet.rotation.y) * speed * delta;
    playerJet.position.x += Math.sin(playerJet.rotation.y) * speed * delta;
  }
  if (keys["a"] || keys["ArrowLeft"]) {
    playerJet.rotation.y += turnSpeed * delta;
    playerJet.rotation.z = Math.min(playerJet.rotation.z + delta, 0.3);
  } else if (keys["d"] || keys["ArrowRight"]) {
    playerJet.rotation.y -= turnSpeed * delta;
    playerJet.rotation.z = Math.max(playerJet.rotation.z - delta, -0.3);
  } else {
    playerJet.rotation.z *= 0.95;
  }

  // Lock altitude at 200 (same level as enemies and destination)
  playerJet.position.y = 200;

  // Boost mode - press 'B' for afterburner boost
  if (keys["b"] || keys["B"]) {
    const boostSpeed = 150;
    playerJet.position.z -= Math.cos(playerJet.rotation.y) * boostSpeed * delta;
    playerJet.position.x -= Math.sin(playerJet.rotation.y) * boostSpeed * delta;

    // Create sonic boom rings periodically
    if (Math.random() > 0.9) {
      createSonicBoom(playerJet.position.clone());
    }
  }

  // Fire missiles
  if (keys[" "] && time - (playerJet.userData.lastFire || 0) > 0.3) {
    fireMissile();
    playerJet.userData.lastFire = time;
  }
}

function createSonicBoom(position) {
  const ringGeo = new THREE.TorusGeometry(5, 0.3, 8, 24);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xaaddff,
    transparent: true,
    opacity: 0.6,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.copy(position);
  ring.rotation.y = playerJet.rotation.y;
  ring.userData.life = 0.5;
  ring.userData.maxLife = 0.5;
  ring.userData.expandSpeed = 30;
  scene.add(ring);
  particles.push(ring);
}

function updateCamera() {
  // Cinematic camera with dynamic positioning
  const speed = playerJet.userData.velocity?.length() || 0;
  const dynamicDistance = 60 + Math.min(speed * 0.1, 20);
  const dynamicHeight = 20 + Math.abs(playerJet.rotation.z) * 30;

  const idealOffset = new THREE.Vector3(0, dynamicHeight, dynamicDistance);
  idealOffset.applyQuaternion(playerJet.quaternion);
  const idealPosition = playerJet.position.clone().add(idealOffset);

  camera.position.lerp(idealPosition, 0.08);

  // Look ahead of the jet
  const lookAhead = new THREE.Vector3(0, 0, -20);
  lookAhead.applyQuaternion(playerJet.quaternion);
  const lookAtPos = playerJet.position.clone().add(lookAhead);

  camera.lookAt(lookAtPos);

  // Camera shake during combat or boost
  if (keys["b"] || keys["B"]) {
    camera.position.x += (Math.random() - 0.5) * 0.5;
    camera.position.y += (Math.random() - 0.5) * 0.5;
  }
}

function updateEnemies(delta, time) {
  for (let i = enemyPlanes.length - 1; i >= 0; i--) {
    const enemy = enemyPlanes[i];

    // Rotate propeller
    if (enemy.userData.propeller) {
      enemy.userData.propeller.rotation.z += delta * 30;
    }

    // AI behavior - chase player
    const direction = new THREE.Vector3()
      .subVectors(playerJet.position, enemy.position)
      .normalize();

    enemy.userData.velocity.lerp(direction.multiplyScalar(40), delta);
    enemy.position.add(enemy.userData.velocity.clone().multiplyScalar(delta));

    // Look at player
    enemy.lookAt(playerJet.position);

    // Attack player if close
    const distance = enemy.position.distanceTo(playerJet.position);
    if (distance < 100 && time - enemy.userData.lastAttack > 2) {
      enemy.userData.lastAttack = time;
      // Damage player
      if (Math.random() > 0.7) {
        health -= 5;
        createExplosion(playerJet.position.clone(), 0xff0000, 10);
      }
    }

    // Remove if too far
    if (distance > 1500) {
      scene.remove(enemy);
      enemyPlanes.splice(i, 1);
    }
  }
}

function fireMissile() {
  // Advanced missile design
  const missileGroup = new THREE.Group();

  // Missile body
  const bodyGeo = new THREE.CylinderGeometry(0.35, 0.35, 5, 12);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xeeeeee,
    roughness: 0.2,
    metalness: 0.9,
    emissive: 0x333333,
    emissiveIntensity: 0.2,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.rotation.x = Math.PI / 2;
  missileGroup.add(body);

  // Missile nose cone
  const noseGeo = new THREE.ConeGeometry(0.35, 1.2, 12);
  const noseMat = new THREE.MeshStandardMaterial({
    color: 0xff3300,
    roughness: 0.3,
    metalness: 0.8,
    emissive: 0xff3300,
    emissiveIntensity: 0.3,
  });
  const nose = new THREE.Mesh(noseGeo, noseMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = -3.1;
  missileGroup.add(nose);

  // Tail fins
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const finGeo = new THREE.BoxGeometry(0.1, 1.2, 0.8);
    const finMat = new THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.4,
      metalness: 0.9,
    });
    const fin = new THREE.Mesh(finGeo, finMat);
    fin.position.set(Math.cos(angle) * 0.4, Math.sin(angle) * 0.4, 2.5);
    fin.rotation.z = angle;
    missileGroup.add(fin);
  }

  // Rocket motor glow
  const motorGeo = new THREE.CylinderGeometry(0.25, 0.3, 1, 12);
  const motorMat = new THREE.MeshBasicMaterial({
    color: 0xff9900,
    transparent: true,
    opacity: 0.9,
  });
  const motor = new THREE.Mesh(motorGeo, motorMat);
  motor.rotation.x = Math.PI / 2;
  motor.position.z = 3;
  missileGroup.add(motor);

  // Guidance lights
  const lightGeo = new THREE.SphereGeometry(0.15, 8, 8);
  const lightMat = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    emissive: 0x00ff00,
    emissiveIntensity: 1.0,
  });
  const light = new THREE.Mesh(lightGeo, lightMat);
  light.position.z = 1;
  missileGroup.add(light);

  // Position missile from wing pods
  missileGroup.position.copy(playerJet.position);
  const offset = new THREE.Vector3(0, -1.5, -10);
  offset.applyQuaternion(playerJet.quaternion);
  missileGroup.position.add(offset);

  missileGroup.rotation.copy(playerJet.rotation);

  const direction = new THREE.Vector3(0, 0, -1);
  direction.applyQuaternion(playerJet.quaternion);
  missileGroup.userData.velocity = direction.multiplyScalar(250);
  missileGroup.userData.isGroup = true;

  scene.add(missileGroup);
  missiles.push(missileGroup);

  // Launch flash effect
  createExplosion(missileGroup.position.clone(), 0xffaa00, 8);
}

function updateMissiles(delta) {
  for (let i = missiles.length - 1; i >= 0; i--) {
    const missile = missiles[i];

    // HOMING MISSILE - Auto-target nearest enemy
    if (enemyPlanes.length > 0) {
      // Find nearest enemy
      let nearestEnemy = null;
      let nearestDistance = Infinity;

      for (const enemy of enemyPlanes) {
        const dist = missile.position.distanceTo(enemy.position);
        if (dist < nearestDistance) {
          nearestDistance = dist;
          nearestEnemy = enemy;
        }
      }

      // Guide missile toward target
      if (nearestEnemy && nearestDistance < 400) {
        const targetDirection = new THREE.Vector3()
          .subVectors(nearestEnemy.position, missile.position)
          .normalize();

        // Gradually turn toward target
        missile.userData.velocity.lerp(
          targetDirection.multiplyScalar(250),
          delta * 4,
        );
      }
    }

    missile.position.add(
      missile.userData.velocity.clone().multiplyScalar(delta),
    );

    // Create trail
    createParticle(missile.position.clone(), 0xff6600, 1);

    // Check collision with enemies
    for (let j = enemyPlanes.length - 1; j >= 0; j--) {
      const enemy = enemyPlanes[j];
      if (missile.position.distanceTo(enemy.position) < 8) {
        // Hit!
        enemy.userData.health -= 50;
        createExplosion(enemy.position.clone(), 0xff6600, 20);

        scene.remove(missile);
        missiles.splice(i, 1);

        if (enemy.userData.health <= 0) {
          scene.remove(enemy);
          enemyPlanes.splice(j, 1);
          enemiesDefeated++;
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

    // Remove if too far
    if (missile.position.distanceTo(playerJet.position) > 1000) {
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

    // Sonic boom rings expand
    if (particle.userData.expandSpeed) {
      const scale =
        1 +
        (1 - particle.userData.life / particle.userData.maxLife) *
          particle.userData.expandSpeed;
      particle.scale.setScalar(scale);
    } else {
      particle.scale.multiplyScalar(0.95);
    }

    // Apply velocity if it exists (for afterburner particles)
    if (particle.userData.velocity) {
      particle.position.add(
        particle.userData.velocity.clone().multiplyScalar(delta),
      );
    }

    if (particle.userData.life <= 0) {
      scene.remove(particle);
      particles.splice(i, 1);
    }
  }
}

function updateClouds(time) {
  clouds.forEach((cloud, i) => {
    cloud.position.x += Math.sin(time * 0.1 + i) * 0.02;
    cloud.position.z += Math.cos(time * 0.1 + i) * 0.02;
  });
}

function updateDirectionArrow() {
  const direction = new THREE.Vector3().subVectors(
    targetPosition,
    playerJet.position,
  );
  const distance = direction.length();

  direction.normalize();

  // Calculate angle
  const angle = Math.atan2(direction.x, direction.z) - playerJet.rotation.y;

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
    particle.userData.life = 1;
    particle.userData.maxLife = 1;
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
    particle.userData.life = 0.5 + Math.random() * 0.5;
    particle.userData.maxLife = particle.userData.life;
    scene.add(particle);
    particles.push(particle);
  }
}

function checkCollisions() {
  // Check collision with enemies
  for (let i = enemyPlanes.length - 1; i >= 0; i--) {
    const enemy = enemyPlanes[i];
    if (playerJet.position.distanceTo(enemy.position) < 15) {
      health -= 20;
      createExplosion(enemy.position.clone(), 0xff0000, 15);
      scene.remove(enemy);
      enemyPlanes.splice(i, 1);
    }
  }

  // Check health
  if (health <= 0) {
    gameOver(false);
  }
}

function checkGameWin() {
  // Win when entering the blue barrier at destination
  const distance = playerJet.position.distanceTo(targetPosition);
  if (distance < 200) {
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
  gameState = "paused";

  // Show questions sequentially, not randomly
  currentQuestion = questions[questionsAnswered];
  console.log(
    `📝 Showing reasoning question ${questionsAnswered + 1}/${questions.length}`,
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
        gameType: "reasoning",
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
    textEl.textContent = "You reached the Airforce Base! Career unlocked!";
    gameOverEl.classList.remove("defeat");
    // Change button text to NEXT MISSION
    const btnRestart = document.querySelector(".btn-restart");
    if (btnRestart) btnRestart.textContent = "NEXT MISSION →";
  } else {
    titleEl.textContent = "MISSION FAILED";
    textEl.textContent = "Your jet was destroyed. Try again!";
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
    // Move to next game with session_id
    window.location.href = `/html/game3.html?session_id=${sessionId}`;
  } else {
    // Restart current game
    window.location.reload();
  }
}

// Function for goToNextPhase button in HTML
function goToNextPhase() {
  window.location.href = `/html/game3.html?session_id=${sessionId}`;
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
