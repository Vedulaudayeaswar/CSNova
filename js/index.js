// Scene setup - wrap in check to ensure DOM is ready
const container = document.getElementById("canvas-container");

// ============================================
// LOGIN/LOGOUT STATE MANAGEMENT
// ============================================
function checkLoginState() {
  const user = localStorage.getItem("cssnova_current_user");
  const userNameDisplay = document.getElementById("userNameDisplay");
  const userName = document.getElementById("userName");
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  if (user) {
    try {
      const userData = JSON.parse(user);
      // User is logged in - show username and logout button
      if (userNameDisplay && userName && logoutBtn) {
        userName.textContent = userData.username || userData.name || "User";
        userNameDisplay.style.display = "block";
        logoutBtn.style.display = "block";
        if (loginBtn) loginBtn.style.display = "none";
      }
    } catch (e) {
      console.error("Error parsing user data:", e);
      // Show login button if user data is corrupted
      if (loginBtn) loginBtn.style.display = "block";
      if (userNameDisplay) userNameDisplay.style.display = "none";
      if (logoutBtn) logoutBtn.style.display = "none";
    }
  } else {
    // User is not logged in - show login button
    if (loginBtn) loginBtn.style.display = "block";
    if (userNameDisplay) userNameDisplay.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "none";
  }
}

// Call on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", checkLoginState);
} else {
  checkLoginState();
}

// Add hover effects for auth buttons
document.addEventListener("DOMContentLoaded", () => {
  const authBtns = document.querySelectorAll(".auth-btn");
  authBtns.forEach((btn) => {
    btn.addEventListener("mouseenter", () => {
      btn.style.background = "rgba(255,255,255,0.2)";
      btn.style.borderColor = "rgba(255,255,255,0.5)";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.background = "rgba(255,255,255,0.1)";
      btn.style.borderColor = "rgba(255,255,255,0.3)";
    });
  });
});

if (container) {
  console.log("Canvas container found, initializing Three.js scene");

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  console.log("Three.js renderer appended to canvas-container");

  // Lighting - bright enough to see pieces
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
  scene.add(ambientLight);

  const directionalLight1 = new THREE.DirectionalLight(0xffffff, 2.0);
  directionalLight1.position.set(5, 10, 5);
  scene.add(directionalLight1);

  const directionalLight2 = new THREE.DirectionalLight(0xc8d3e3, 1.0);
  directionalLight2.position.set(-5, -5, -5);
  scene.add(directionalLight2);

  const pointLight1 = new THREE.PointLight(0xffffff, 1.5, 50);
  pointLight1.position.set(0, 5, 8);
  scene.add(pointLight1);

  // Create hollow cylindrical piece (like Lego)
  function createHollowCylindricalPiece() {
    const group = new THREE.Group();

    // Material - more visible
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xf5f8fb,
      transparent: true,
      opacity: 1.2, // Increased visibility
      transmission: 0.85,
      roughness: 0.1,
      metalness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      ior: 1.4,
      side: THREE.DoubleSide,
    });

    // Create 3-4 stacked hollow cylinders
    for (let i = 0; i < 3; i++) {
      // Outer cylinder
      const outerGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.6, 32);
      const outer = new THREE.Mesh(outerGeometry, material);
      outer.position.y = i * 0.65;
      group.add(outer);

      // Inner cylinder (hollow effect)
      const innerGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.62, 32);
      const innerMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.3,
        transmission: 0.95,
        roughness: 0.05,
        side: THREE.BackSide,
      });
      const inner = new THREE.Mesh(innerGeometry, innerMaterial);
      inner.position.y = i * 0.65;
      group.add(inner);

      // Top circular rim
      const rimGeometry = new THREE.TorusGeometry(0.7, 0.08, 16, 32);
      const rim = new THREE.Mesh(rimGeometry, material);
      rim.position.y = i * 0.65 + 0.3;
      rim.rotation.x = Math.PI / 2;
      group.add(rim);
    }

    // Add visible wireframe edges
    const edgeGeometry = new THREE.CylinderGeometry(0.8, 0.8, 2, 32);
    const edges = new THREE.EdgesGeometry(edgeGeometry);
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0xe0e8f0,
      transparent: true,
      opacity: 0.4,
    });
    const wireframe = new THREE.LineSegments(edges, edgeMaterial);
    group.add(wireframe);

    return group;
  }

  // Create 2 hollow pieces - positioned closer and more visible
  const piece1 = createHollowCylindricalPiece();
  piece1.position.set(-2, 0, 5); // Brought back into frame
  piece1.scale.set(1.0, 1.0, 1.0);
  scene.add(piece1);

  const piece2 = createHollowCylindricalPiece();
  piece2.position.set(2, 0.5, 4.5); // Kept as is - works well
  piece2.scale.set(0.85, 0.85, 0.85);
  scene.add(piece2);

  // Position camera closer
  camera.position.set(0, 1, 10);
  camera.lookAt(0, 0, 0);

  // Mouse interaction
  let mouseX = 0;
  let mouseY = 0;

  document.addEventListener("mousemove", (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  // Animation
  let time = 0;
  function animate() {
    requestAnimationFrame(animate);
    time += 0.006;

    // Slow rotation - piece 1
    piece1.rotation.y += 0.004;
    piece1.rotation.x = Math.sin(time * 0.5) * 0.1;
    piece1.position.y = Math.sin(time * 0.6) * 0.2;

    // Counter-rotation - piece 2
    piece2.rotation.y -= 0.003;
    piece2.rotation.x = Math.cos(time * 0.4) * 0.08;
    piece2.position.y = 0.5 + Math.cos(time * 0.7) * 0.15;

    // Gentle mouse parallax
    const targetX = mouseX * 0.4;
    const targetY = mouseY * 0.3;

    camera.position.x += (targetX - camera.position.x) * 0.02;
    camera.position.y += (1 + targetY - camera.position.y) * 0.02;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }

  animate();

  // Responsive
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
} else {
  console.error(
    "Canvas container not found! Cannot initialize Three.js scene.",
  );
}

// Debug: Check if THREE is defined
if (typeof THREE === "undefined") {
  console.error("THREE.js library not loaded!");
} else {
  console.log("THREE.js library loaded successfully, version:", THREE.REVISION);
}

// Menu toggle functionality
const menuButton = document.getElementById("menuButton");
const menuOverlay = document.getElementById("menuOverlay");
const closeMenu = document.getElementById("closeMenu");

if (menuButton && menuOverlay && closeMenu) {
  console.log("Menu elements found, attaching event listeners");

  menuButton.addEventListener("click", () => {
    console.log("Menu button clicked!");
    menuOverlay.classList.add("active");
    menuButton.classList.add("hidden");
    console.log("Menu overlay active class added");
  });

  closeMenu.addEventListener("click", () => {
    console.log("Close menu clicked!");
    menuOverlay.classList.remove("active");
    menuButton.classList.remove("hidden");
  });

  // Close menu when clicking outside
  menuOverlay.addEventListener("click", (e) => {
    if (e.target === menuOverlay) {
      menuOverlay.classList.remove("active");
      menuButton.classList.remove("hidden");
    }
  });
} else {
  console.error("Menu elements not found:", {
    menuButton,
    menuOverlay,
    closeMenu,
  });
}

// Insights Image Slider
const images = document.querySelectorAll(".insight-image");
let insightCurrentIndex = 0;

function showNextImage() {
  images[insightCurrentIndex].classList.remove("active");
  insightCurrentIndex = (insightCurrentIndex + 1) % images.length;
  images[insightCurrentIndex].classList.add("active");
}

// Change image every 2 seconds
if (images.length > 0) {
  setInterval(showNextImage, 2000);
}

// Q&A Accordion
const qaItems = document.querySelectorAll(".qa-item");
qaItems.forEach((item) => {
  const question = item.querySelector(".qa-question");
  question.addEventListener("click", () => {
    // Close other items
    qaItems.forEach((otherItem) => {
      if (otherItem !== item) {
        otherItem.classList.remove("active");
      }
    });
    // Toggle current item
    item.classList.toggle("active");
  });
});

// Contact Form Submission
const contactForm = document.getElementById("contactForm");
if (contactForm) {
  contactForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const btn = document.querySelector(".submit-btn");
    const originalText = btn.innerHTML;

    btn.innerHTML = "Launching...";
    btn.style.background = "#5a6472";
    btn.disabled = true;

    // Simulate form submission
    setTimeout(() => {
      btn.innerHTML = "Adventure Launched!";
      btn.style.background = "#000";

      setTimeout(() => {
        alert(
          "⚓ Your career adventure begins! We will contact you soon with your personalized roadmap.",
        );
        contactForm.reset();
        btn.innerHTML = originalText;
        btn.disabled = false;
      }, 1500);
    }, 2000);
  });
}

// Input animations
document.querySelectorAll("input, textarea").forEach((input) => {
  input.addEventListener("focus", function () {
    this.style.transform = "translateY(-2px)";
  });

  input.addEventListener("blur", function () {
    this.style.transform = "translateY(0)";
  });
});

// Logout functionality
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async function () {
    // Show confirmation
    if (!confirm("Are you sure you want to logout?")) {
      return;
    }

    try {
      // Try to logout from server
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      // Clear all local data regardless of server response
      localStorage.clear();
      sessionStorage.clear();

      // Show success message
      alert("Logged out successfully!");

      // Redirect to login page
      window.location.href = "/html/login.html";
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear local data and redirect even if server error
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/html/login.html";
    }
  });
}
