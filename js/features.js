// Screen-locked stacking effect for features
const cards = document.querySelectorAll(".feature-card");
const dots = document.querySelectorAll(".progress-dot");
const featuresWrapper = document.querySelector(".features-wrapper");

let currentIndex = 0;
let isAnimating = false;

function updateCards() {
  if (!featuresWrapper) return;

  const wrapperTop = featuresWrapper.getBoundingClientRect().top;
  const wrapperHeight = featuresWrapper.offsetHeight;
  const scrollProgress = Math.max(
    0,
    -wrapperTop / (wrapperHeight - window.innerHeight),
  );

  // Calculate which card should be active (0 to 3)
  const targetIndex = Math.min(
    Math.floor(scrollProgress * cards.length),
    cards.length - 1,
  );

  cards.forEach((card, index) => {
    const content = card.querySelector(".feature-content");
    if (!content) return;

    if (index < targetIndex) {
      // Cards that have been passed - completely hide
      card.style.opacity = "0";
      card.style.visibility = "hidden";
      card.style.transform = "scale(0.8)";
      card.classList.remove("active");
    } else if (index === targetIndex) {
      // Current active card - full visibility
      card.style.opacity = "1";
      card.style.visibility = "visible";
      card.style.transform = "scale(1)";
      card.classList.add("active");
      content.style.opacity = "1";
      content.style.transform = "scale(1)";
    } else {
      // Upcoming cards - completely hide
      card.style.opacity = "0";
      card.style.visibility = "hidden";
      card.style.transform = "scale(0.95)";
      card.classList.remove("active");
    }
  });

  // Update progress dots
  if (targetIndex !== currentIndex) {
    currentIndex = targetIndex;
    dots.forEach((dot, index) => {
      dot.classList.toggle("active", index === currentIndex);
    });
  }
}

// Smooth scroll listener
let ticking = false;
window.addEventListener("scroll", () => {
  if (!ticking) {
    window.requestAnimationFrame(() => {
      updateCards();
      ticking = false;
    });
    ticking = true;
  }
});

// Dot navigation
dots.forEach((dot, index) => {
  dot.addEventListener("click", () => {
    const scrollTarget =
      featuresWrapper.offsetTop +
      (index / cards.length) *
        (featuresWrapper.offsetHeight - window.innerHeight);
    window.scrollTo({ top: scrollTarget, behavior: "smooth" });
  });
});

// Initialize first dot
if (dots[0]) dots[0].classList.add("active");

// Feature 1: Broken Lego Blocks
function initCanvas1() {
  const canvas = document.getElementById("canvas1");
  if (!canvas) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setSize(600, 600);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
  scene.add(ambientLight);
  const pointLight = new THREE.PointLight(0xffffff, 2);
  pointLight.position.set(10, 10, 10);
  scene.add(pointLight);

  const group = new THREE.Group();
  const colors = [0x4a90e2, 0xe74c3c, 0x2ecc71];

  for (let i = 0; i < 3; i++) {
    const geometry = new THREE.BoxGeometry(1.5, 0.7, 1.5);
    const material = new THREE.MeshPhysicalMaterial({
      color: colors[i],
      transparent: true,
      opacity: 0.75,
      transmission: 0.4,
      roughness: 0.2,
      metalness: 0.3,
    });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(
      (Math.random() - 0.5) * 2,
      i * 0.9,
      (Math.random() - 0.5) * 1.5,
    );
    cube.rotation.set(
      Math.random() * 0.3,
      Math.random() * 0.5,
      Math.random() * 0.3,
    );
    group.add(cube);
  }
  scene.add(group);

  camera.position.set(0, 1, 7);
  camera.lookAt(0, 0, 0);

  function animate() {
    requestAnimationFrame(animate);
    group.rotation.y += 0.003;
    group.children.forEach((cube, i) => {
      cube.rotation.x += 0.002;
      cube.position.y = i * 0.9 + Math.sin(Date.now() * 0.001 + i) * 0.2;
    });
    renderer.render(scene, camera);
  }
  animate();
}

// Feature 2: Golden Sphere
function initCanvas2() {
  const canvas = document.getElementById("canvas2");
  if (!canvas) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setSize(600, 600);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
  scene.add(ambientLight);
  const pointLight1 = new THREE.PointLight(0xffd700, 3);
  pointLight1.position.set(5, 5, 5);
  scene.add(pointLight1);
  const pointLight2 = new THREE.PointLight(0xffffff, 2);
  pointLight2.position.set(-5, -5, 5);
  scene.add(pointLight2);

  const geometry = new THREE.SphereGeometry(2, 64, 64);
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xffd700,
    metalness: 0.8,
    roughness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    reflectivity: 1.0,
    transparent: true,
    opacity: 0.85,
    transmission: 0.2,
  });
  const sphere = new THREE.Mesh(geometry, material);
  scene.add(sphere);

  camera.position.z = 6;

  function animate() {
    requestAnimationFrame(animate);
    sphere.rotation.x += 0.002;
    sphere.rotation.y += 0.003;
    // Up and down animation
    sphere.position.y = Math.sin(Date.now() * 0.001) * 0.8;
    renderer.render(scene, camera);
  }
  animate();
}

// Feature 3: Purple Fish with Files
function initCanvas3() {
  const canvas = document.getElementById("canvas3");
  if (!canvas) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setSize(600, 600);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
  directionalLight.position.set(5, 5, 5);
  scene.add(directionalLight);
  const purpleLight = new THREE.PointLight(0x9b59b6, 2);
  purpleLight.position.set(-5, 0, 5);
  scene.add(purpleLight);
  const backLight = new THREE.PointLight(0xffffff, 1);
  backLight.position.set(0, 0, -5);
  scene.add(backLight);

  // Create a simple fish shape using spheres and cones
  const fishGroup = new THREE.Group();

  // Fish body (purple transparent sphere)
  const bodyGeometry = new THREE.SphereGeometry(1.5, 32, 32);
  bodyGeometry.scale(1.5, 1, 0.8); // Make it more fish-like
  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x9b59b6,
    transparent: true,
    opacity: 0.85,
    transmission: 0.5,
    roughness: 0.2,
    metalness: 0.3,
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  fishGroup.add(body);

  // Tail (cone)
  const tailGeometry = new THREE.ConeGeometry(0.6, 1.2, 32);
  tailGeometry.rotateZ(Math.PI / 2);
  const tailMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x8e44ad,
    transparent: true,
    opacity: 0.6,
    transmission: 0.5,
  });
  const tail = new THREE.Mesh(tailGeometry, tailMaterial);
  tail.position.set(-1.5, 0, 0);
  fishGroup.add(tail);

  // Top fin
  const finGeometry = new THREE.ConeGeometry(0.4, 0.8, 32);
  const finMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x8e44ad,
    transparent: true,
    opacity: 0.65,
  });
  const topFin = new THREE.Mesh(finGeometry, finMaterial);
  topFin.position.set(0, 0.8, 0);
  fishGroup.add(topFin);

  // Floating document files around the fish
  const filesGroup = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const geometry = new THREE.PlaneGeometry(0.8, 1.1);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      roughness: 0.3,
    });
    const plane = new THREE.Mesh(geometry, material);
    const angle = (i / 4) * Math.PI * 2;
    plane.position.set(
      Math.cos(angle) * 3,
      Math.sin(angle * 2) * 0.5,
      Math.sin(angle) * 3,
    );
    plane.rotation.y = angle;
    filesGroup.add(plane);
  }
  scene.add(filesGroup);

  fishGroup.position.set(0, 0, 0);
  scene.add(fishGroup);

  camera.position.set(2, 1, 6);
  camera.lookAt(0, 0, 0);

  function animate() {
    requestAnimationFrame(animate);

    // Fish swimming animation
    fishGroup.position.x = Math.sin(Date.now() * 0.0008) * 1.5;
    fishGroup.position.y = Math.sin(Date.now() * 0.001) * 0.5;
    fishGroup.rotation.y = Math.sin(Date.now() * 0.0008) * 0.3;

    // Tail wagging
    tail.rotation.y = Math.sin(Date.now() * 0.003) * 0.3;

    // Files floating
    filesGroup.children.forEach((plane, i) => {
      plane.position.y += Math.sin(Date.now() * 0.001 + i * 0.5) * 0.002;
      plane.rotation.y += 0.002;
    });

    renderer.render(scene, camera);
  }
  animate();
}

// Feature 4: Purple Jellyfish Blob
function initCanvas4() {
  const canvas = document.getElementById("canvas4");
  if (!canvas) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setSize(600, 600);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  const pointLight1 = new THREE.PointLight(0xff00ff, 2, 100);
  pointLight1.position.set(5, 5, 5);
  scene.add(pointLight1);
  const pointLight2 = new THREE.PointLight(0x00ffff, 1.5, 100);
  pointLight2.position.set(-5, -5, 5);
  scene.add(pointLight2);

  // Create Jellyfish Group
  const jellyfishGroup = new THREE.Group();

  // Jellyfish bell (dome) - glassmorphic effect
  const bellGeometry = new THREE.SphereGeometry(
    1.2,
    32,
    32,
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.5,
  );
  const bellMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xcc00ff,
    transparent: true,
    opacity: 0.7,
    roughness: 0.1,
    metalness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    transmission: 0.5,
    thickness: 0.5,
    ior: 1.5,
    side: THREE.DoubleSide,
  });
  const bell = new THREE.Mesh(bellGeometry, bellMaterial);
  jellyfishGroup.add(bell);

  // Inner glow sphere
  const glowGeometry = new THREE.SphereGeometry(0.9, 32, 32);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xff00ff,
    transparent: true,
    opacity: 0.3,
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.position.y = 0.2;
  jellyfishGroup.add(glow);

  // Create flowing tentacles
  const tentacleCount = 12;
  const tentacles = [];

  for (let i = 0; i < tentacleCount; i++) {
    const angle = (i / tentacleCount) * Math.PI * 2;
    const tentacleGroup = new THREE.Group();

    // Create flowing tentacle with curve
    const points = [];
    const segments = 20;

    for (let j = 0; j <= segments; j++) {
      const t = j / segments;
      const x = Math.cos(angle) * 0.8 * (1 - t * 0.3);
      const y = -t * 3.5;
      const z = Math.sin(angle) * 0.8 * (1 - t * 0.3);
      points.push(new THREE.Vector3(x, y, z));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const tentacleGeometry = new THREE.TubeGeometry(curve, 20, 0.025, 8, false);
    const tentacleMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xee44ff,
      transparent: true,
      opacity: 0.8,
      emissive: 0xff00ff,
      emissiveIntensity: 0.3,
      roughness: 0.3,
      metalness: 0.1,
    });

    const tentacle = new THREE.Mesh(tentacleGeometry, tentacleMaterial);
    tentacleGroup.add(tentacle);
    tentacleGroup.userData = { angle, offset: Math.random() * Math.PI * 2 };

    jellyfishGroup.add(tentacleGroup);
    tentacles.push(tentacleGroup);
  }

  scene.add(jellyfishGroup);
  camera.position.z = 6;

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    // Jellyfish floating animation
    jellyfishGroup.position.y = Math.sin(elapsedTime * 0.5) * 0.4;
    jellyfishGroup.rotation.y = elapsedTime * 0.1;

    // Bell pulsing
    const pulsScale = 1 + Math.sin(elapsedTime * 2) * 0.05;
    bell.scale.set(pulsScale, pulsScale, pulsScale);

    // Glow pulsing
    glow.material.opacity = 0.2 + Math.sin(elapsedTime * 2) * 0.1;

    // Tentacle wave animation
    tentacles.forEach((tentacleGroup) => {
      const userData = tentacleGroup.userData;
      const wave = Math.sin(elapsedTime * 2 + userData.offset) * 0.2;
      tentacleGroup.rotation.z = wave;
      tentacleGroup.rotation.x = wave * 0.5;
    });

    renderer.render(scene, camera);
  }
  animate();
}

// Initialize all canvases
setTimeout(() => {
  initCanvas1();
  initCanvas2();
  initCanvas3();
  initCanvas4();

  // Initialize card states
  updateCards();
}, 100);
