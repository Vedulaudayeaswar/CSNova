// Realistic Floating Fish Aquarium
class RealisticAquarium {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.fishes = [];
    this.particles = [];
    this.time = 0;

    this.init();
    this.createEnvironment();
    this.createRealisticFish();
    this.createFloatingParticles();
    this.animate();
  }

  init() {
    const container = document.getElementById("aquarium");
    const width = container.clientWidth;
    const height = container.clientHeight;
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(0x0f1a2e, 0.9);
    container.appendChild(this.renderer.domElement);
    this.camera.position.z = 8;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  createEnvironment() {
    // Ethereal mist background
    const bgGeometry = new THREE.PlaneGeometry(20, 15);
    const bgMaterial = new THREE.MeshBasicMaterial({
      map: this.createGradientTexture("#1a2a4e", "#2e4a7e", "#0f1a3e"),
    });
    const background = new THREE.Mesh(bgGeometry, bgMaterial);
    background.position.z = -10;
    this.scene.add(background);

    // Enhanced lighting for golden shine
    const ambient = new THREE.AmbientLight(0xaaccff, 0.7);
    this.scene.add(ambient);

    // Main spotlight on the fish
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(5, 5, 8);
    this.scene.add(mainLight);

    // Accent light for golden glow
    const accentLight = new THREE.PointLight(0xffdd88, 1.5, 15);
    accentLight.position.set(-3, 2, 5);
    this.scene.add(accentLight);

    // Back light for rim lighting effect
    const backLight = new THREE.DirectionalLight(0xffeeaa, 0.8);
    backLight.position.set(-5, -3, -5);
    this.scene.add(backLight);
  }

  createGradientTexture(startColor, endColor, midColor) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    const gradient = ctx.createLinearGradient(0, 0, 512, 512);
    gradient.addColorStop(0, startColor);
    gradient.addColorStop(0.5, midColor);
    gradient.addColorStop(1, endColor);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    return new THREE.CanvasTexture(canvas);
  }

  createRealisticFish() {
    // Create one beautiful golden shining fish
    const goldenFish = {
      bodyColor: 0xffd700, // Pure gold
      bellyColor: 0xffed4e, // Bright shining gold
      size: 1.8, // Larger size for prominence
    };

    const fish = this.createFishGeometry(goldenFish);
    fish.position.set(0, 0, 2); // Start at center, slightly forward

    fish.userData = {
      speed: 0.015,
      floatHeight: 1.5,
      swayPhase: 0,
      rotationSpeed: 0.003,
      targetX: 0,
      targetY: 0,
      targetZ: 0,
    };
    fish.scale.setScalar(1.8); // Nice prominent size
    this.fishes.push(fish);
    this.scene.add(fish);
  }

  createFishGeometry(type) {
    const group = new THREE.Group();

    // Create realistic goldfish body with proper shape
    const bodyGeometry = new THREE.SphereGeometry(0.7, 32, 24);
    bodyGeometry.scale(2.2, 0.9, 1.3);

    // Advanced material with metallic golden look
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: type.bodyColor,
      metalness: 0.6,
      roughness: 0.2,
      emissive: 0x553300,
      emissiveIntensity: 0.4,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    group.add(body);

    // Realistic belly with gradient
    const bellyGeometry = new THREE.SphereGeometry(0.65, 32, 24);
    bellyGeometry.scale(1.9, 0.5, 1.2);
    bellyGeometry.translate(0, -0.25, 0);
    const bellyMaterial = new THREE.MeshStandardMaterial({
      color: type.bellyColor,
      metalness: 0.5,
      roughness: 0.3,
      emissive: 0x664400,
      emissiveIntensity: 0.5,
    });
    const belly = new THREE.Mesh(bellyGeometry, bellyMaterial);
    group.add(belly);

    // Realistic flowing tail fin (fan-shaped)
    const tailShape = new THREE.Shape();
    tailShape.moveTo(0, 0);
    tailShape.quadraticCurveTo(0.3, 0.4, 0.6, 0.5);
    tailShape.quadraticCurveTo(0.8, 0.3, 0.9, 0);
    tailShape.quadraticCurveTo(0.8, -0.3, 0.6, -0.5);
    tailShape.quadraticCurveTo(0.3, -0.4, 0, 0);

    const tailGeometry = new THREE.ExtrudeGeometry(tailShape, {
      depth: 0.05,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 3,
    });
    tailGeometry.rotateY(Math.PI * 0.5);
    tailGeometry.translate(-1.6, 0, 0);

    const tailMaterial = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      metalness: 0.4,
      roughness: 0.3,
      emissive: 0x442200,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    const tail = new THREE.Mesh(tailGeometry, tailMaterial);
    group.add(tail);

    // Top dorsal fin (more realistic shape)
    const dorsalShape = new THREE.Shape();
    dorsalShape.moveTo(0, 0);
    dorsalShape.quadraticCurveTo(0.15, 0.5, 0.2, 0.7);
    dorsalShape.quadraticCurveTo(0.3, 0.6, 0.35, 0);
    dorsalShape.lineTo(0, 0);

    const dorsalGeometry = new THREE.ExtrudeGeometry(dorsalShape, {
      depth: 0.03,
      bevelEnabled: false,
    });
    dorsalGeometry.rotateX(Math.PI * 0.5);
    dorsalGeometry.translate(-0.2, 0.7, 0);

    const dorsalMaterial = new THREE.MeshStandardMaterial({
      color: 0xff9900,
      metalness: 0.5,
      roughness: 0.25,
      emissive: 0x331100,
      emissiveIntensity: 0.2,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    const dorsal = new THREE.Mesh(dorsalGeometry, dorsalMaterial);
    group.add(dorsal);

    // Pectoral fins (side fins) - more detailed
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0);
    finShape.quadraticCurveTo(0.2, 0.15, 0.35, 0.2);
    finShape.quadraticCurveTo(0.4, 0.1, 0.42, 0);
    finShape.quadraticCurveTo(0.25, -0.05, 0, 0);

    const finGeometry = new THREE.ExtrudeGeometry(finShape, {
      depth: 0.02,
      bevelEnabled: false,
    });

    const finMaterial = new THREE.MeshStandardMaterial({
      color: 0xffcc44,
      metalness: 0.3,
      roughness: 0.4,
      emissive: 0x221100,
      emissiveIntensity: 0.15,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });

    // Left pectoral fin
    const leftFin = new THREE.Mesh(finGeometry, finMaterial);
    leftFin.rotation.y = Math.PI * 0.3;
    leftFin.rotation.z = -Math.PI * 0.1;
    leftFin.position.set(0.3, -0.1, 0.5);
    group.add(leftFin);

    // Right pectoral fin
    const rightFin = new THREE.Mesh(finGeometry, finMaterial);
    rightFin.rotation.y = -Math.PI * 0.3;
    rightFin.rotation.z = Math.PI * 0.1;
    rightFin.position.set(0.3, -0.1, -0.5);
    group.add(rightFin);

    // Cute eyes - LEFT EYE
    // Left eye white
    const leftEyeWhiteGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const eyeWhiteMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.1,
      roughness: 0.3,
    });
    const leftEyeWhite = new THREE.Mesh(leftEyeWhiteGeometry, eyeWhiteMaterial);
    leftEyeWhite.position.set(1.1, 0.3, 0.5);
    group.add(leftEyeWhite);

    // Left black pupil
    const leftPupilGeometry = new THREE.SphereGeometry(0.08, 16, 16);
    const pupilMaterial = new THREE.MeshStandardMaterial({
      color: 0x000000,
      metalness: 0.9,
      roughness: 0.1,
    });
    const leftPupil = new THREE.Mesh(leftPupilGeometry, pupilMaterial);
    leftPupil.position.set(1.18, 0.32, 0.52);
    group.add(leftPupil);

    // Left eye shine (cute sparkle)
    const leftShineGeometry = new THREE.SphereGeometry(0.04, 8, 8);
    const shineMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1.0,
    });
    const leftShine = new THREE.Mesh(leftShineGeometry, shineMaterial);
    leftShine.position.set(1.22, 0.35, 0.54);
    group.add(leftShine);

    // Cute eyes - RIGHT EYE
    // Right eye white
    const rightEyeWhiteGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const rightEyeWhite = new THREE.Mesh(
      rightEyeWhiteGeometry,
      eyeWhiteMaterial,
    );
    rightEyeWhite.position.set(1.1, 0.3, -0.5);
    group.add(rightEyeWhite);

    // Right black pupil
    const rightPupilGeometry = new THREE.SphereGeometry(0.08, 16, 16);
    const rightPupil = new THREE.Mesh(rightPupilGeometry, pupilMaterial);
    rightPupil.position.set(1.18, 0.32, -0.52);
    group.add(rightPupil);

    // Right eye shine (cute sparkle)
    const rightShineGeometry = new THREE.SphereGeometry(0.04, 8, 8);
    const rightShine = new THREE.Mesh(rightShineGeometry, shineMaterial);
    rightShine.position.set(1.22, 0.35, -0.54);
    group.add(rightShine);

    // Add subtle scales pattern using normal map simulation
    const scaleDetail = new THREE.Mesh(
      new THREE.SphereGeometry(0.68, 32, 24),
      new THREE.MeshStandardMaterial({
        color: 0xffdd88,
        metalness: 0.7,
        roughness: 0.15,
        emissive: 0x442200,
        emissiveIntensity: 0.2,
        transparent: true,
        opacity: 0.4,
      }),
    );
    scaleDetail.scale.set(2.15, 0.88, 1.28);
    group.add(scaleDetail);

    return group;
  }

  createFloatingParticles() {
    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 100;
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 15;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }

    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3),
    );
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x88ccff,
      size: 0.05,
      transparent: true,
      opacity: 0.6,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    this.scene.add(particles);
    this.particles.push(particles);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.time += 0.016;

    // Animate fish - Realistic swimming motion
    this.fishes.forEach((fish) => {
      const data = fish.userData;

      // Natural figure-8 swimming path
      const swimSpeed = this.time * 0.3;
      const pathRadius = 4;
      fish.position.x = Math.sin(swimSpeed * 0.5) * pathRadius;
      fish.position.y =
        Math.cos(swimSpeed * 0.7) * (pathRadius * 0.6) +
        Math.sin(this.time * 0.8) * 0.3;
      fish.position.z = Math.cos(swimSpeed * 0.5) * pathRadius;

      // Fish looks in direction of movement
      const prevX = Math.sin((swimSpeed - 0.05) * 0.5) * pathRadius;
      const prevZ = Math.cos((swimSpeed - 0.05) * 0.5) * pathRadius;
      fish.rotation.y = Math.atan2(
        fish.position.x - prevX,
        fish.position.z - prevZ,
      );

      // Natural body tilt during swimming
      fish.rotation.z = Math.sin(this.time * 2) * 0.12;
      fish.rotation.x =
        Math.cos(this.time * 1.8) * 0.08 + Math.sin(swimSpeed * 0.5) * 0.15;

      // Realistic tail movement - strong propulsion
      if (fish.children[2]) {
        fish.children[2].rotation.y = Math.sin(this.time * 6) * 0.5;
        fish.children[2].rotation.z = Math.sin(this.time * 6) * 0.3;
      }

      // Dorsal fin gentle sway
      if (fish.children[3]) {
        fish.children[3].rotation.x = Math.sin(this.time * 4) * 0.15;
      }

      // Pectoral fins (side fins) rowing motion
      if (fish.children[4]) {
        fish.children[4].rotation.z = Math.sin(this.time * 5) * 0.4 - 0.1;
      }
      if (fish.children[5]) {
        fish.children[5].rotation.z = Math.sin(this.time * 5) * 0.4 + 0.1;
      }

      // Subtle body flexing
      if (fish.children[0]) {
        fish.children[0].scale.x = 1 + Math.sin(this.time * 6) * 0.03;
      }
    });

    // Floating particles
    this.particles.forEach((particles) => {
      particles.rotation.y += 0.002;
      particles.position.y += 0.01;
      if (particles.position.y > 10) particles.position.y = -10;
    });

    // Camera gentle sway
    this.camera.position.x = Math.sin(this.time * 0.1) * 0.3;
    this.camera.position.y = Math.cos(this.time * 0.08) * 0.2;
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize everything
new RealisticAquarium();

// ============================================
// USER AUTHENTICATION SYSTEM
// Uses localStorage (browser storage)
// For production: upgrade to Node.js + SQLite backend
// ============================================

class UserAuth {
  constructor() {
    this.usersKey = "cssnova_users";
    this.currentUserKey = "cssnova_current_user";
    this.checkCurrentUser();
  }

  // Get all registered users
  getUsers() {
    const users = localStorage.getItem(this.usersKey);
    return users ? JSON.parse(users) : [];
  }

  // Save users to localStorage
  saveUsers(users) {
    localStorage.setItem(this.usersKey, JSON.stringify(users));
  }

  // Register new user
  register(username, email, password, confirmPassword) {
    // Validation
    if (!username || !email || !password || !confirmPassword) {
      return { success: false, message: "All fields are required!" };
    }

    if (password !== confirmPassword) {
      return { success: false, message: "Passwords do not match!" };
    }

    if (password.length < 6) {
      return {
        success: false,
        message: "Password must be at least 6 characters!",
      };
    }

    const users = this.getUsers();

    // Check if user already exists
    if (users.find((u) => u.email === email)) {
      return { success: false, message: "Email already registered!" };
    }

    if (users.find((u) => u.username === username)) {
      return { success: false, message: "Username already taken!" };
    }

    // Create new user
    const newUser = {
      id: Date.now(),
      username: username,
      email: email,
      password: password, // In production, hash this!
      registeredAt: new Date().toISOString(),
      lastLogin: null,
      loginCount: 0,
    };

    users.push(newUser);
    this.saveUsers(users);

    return {
      success: true,
      message: `Welcome aboard C$SNOVA, ${username}! 🌊`,
      user: newUser,
    };
  }

  // Login user
  login(email, password) {
    if (!email || !password) {
      return { success: false, message: "Email and password are required!" };
    }

    const users = this.getUsers();
    const user = users.find((u) => u.email === email);

    if (!user) {
      return {
        success: false,
        message: "Account not found. Please register first!",
      };
    }

    if (user.password !== password) {
      return { success: false, message: "Incorrect password!" };
    }

    // Update user stats
    user.loginCount = (user.loginCount || 0) + 1;
    user.lastLogin = new Date().toISOString();
    this.saveUsers(users);

    // Set current user
    localStorage.setItem(this.currentUserKey, JSON.stringify(user));

    // Create personalized welcome message
    const isReturning = user.loginCount > 1;
    const message = isReturning
      ? `Welcome back, Captain ${user.username}! 🌊\nThis is your ${this.getOrdinal(user.loginCount)} voyage with us!`
      : `Welcome aboard C$SNOVA, ${user.username}! 🌊\nYour first voyage begins now!`;

    return {
      success: true,
      message: message,
      user: user,
      isReturning: isReturning,
    };
  }

  // Check if user is already logged in
  checkCurrentUser() {
    const currentUser = localStorage.getItem(this.currentUserKey);
    if (currentUser) {
      const user = JSON.parse(currentUser);
      // Could auto-redirect to main page or show welcome message
      console.log(`Active session: ${user.username}`);
    }
  }

  // Logout user
  logout() {
    localStorage.removeItem(this.currentUserKey);
  }

  // Get current logged-in user
  getCurrentUser() {
    const user = localStorage.getItem(this.currentUserKey);
    return user ? JSON.parse(user) : null;
  }

  // Helper: Convert number to ordinal (1st, 2nd, 3rd, etc.)
  getOrdinal(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
}

const auth = new UserAuth();

// Form switching
document.querySelectorAll(".switch-link").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const target = link.dataset.target;

    document.querySelectorAll(".form-card").forEach((card) => {
      card.classList.remove("active");
    });

    if (target === "login") {
      document.getElementById("loginCard").classList.add("active");
    } else if (target === "register") {
      document.getElementById("registerCard").classList.add("active");
    }
  });
});

// Form submissions with authentication
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = e.target.querySelector('input[type="email"]').value;
  const password = e.target.querySelector('input[type="password"]').value;

  const btn = document.querySelector(".login-btn");
  const originalText = btn.innerHTML;

  btn.innerHTML = "Checking credentials...";
  btn.style.opacity = "0.7";
  btn.disabled = true;

  try {
    // Call backend API for login
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();

    if (result.success) {
      btn.innerHTML = "⚓ Welcome Aboard!";

      // Store user info in localStorage
      localStorage.setItem("user", JSON.stringify(result.user));
      localStorage.setItem("cssnova_current_user", JSON.stringify(result.user));

      setTimeout(() => {
        window.location.href = "/html/index.html";
      }, 800);
    } else {
      btn.innerHTML = "❌ " + (result.error || result.message);
      btn.style.background =
        "linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)";

      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.style.background =
          "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)";
        btn.style.opacity = "1";
        btn.disabled = false;
      }, 2000);
    }
  } catch (error) {
    console.error("Login error:", error);
    btn.innerHTML = "❌ Connection error";
    btn.style.background = "linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)";

    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.style.background =
        "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)";
      btn.style.opacity = "1";
      btn.disabled = false;
    }, 2000);
  }
});

document
  .getElementById("registerForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = e.target.querySelectorAll('input[type="text"]')[0].value;
    const email = e.target.querySelector('input[type="email"]').value;
    const passwords = e.target.querySelectorAll('input[type="password"]');
    const password = passwords[0].value;
    const confirmPassword = passwords[1].value;
    const termsAccepted = e.target.querySelector(
      'input[type="checkbox"]',
    ).checked;

    if (!termsAccepted) {
      alert("Please accept the Terms & Conditions to continue!");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords don't match!");
      return;
    }

    const btn = document.querySelector(".register-btn");
    const originalText = btn.innerHTML;

    btn.innerHTML = "Creating account...";
    btn.style.opacity = "0.7";
    btn.disabled = true;

    try {
      // Call backend API for registration
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ username, email, password }),
      });

      const result = await response.json();

      if (result.success) {
        btn.innerHTML = "✓ Account Created!";

        setTimeout(() => {
          alert(`Account ready! You can now login with:\n📧 ${email}`);

          // Switch to login form
          document.getElementById("loginCard").classList.add("active");
          document.getElementById("registerCard").classList.remove("active");

          // Pre-fill email in login form
          document.querySelector('#loginForm input[type="email"]').value =
            email;

          btn.innerHTML = originalText;
          btn.style.opacity = "1";
          btn.disabled = false;

          // Reset form
          e.target.reset();
        }, 800);
      } else {
        btn.innerHTML = "❌ " + (result.error || result.message);
        btn.style.background =
          "linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)";

        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.style.background =
            "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)";
          btn.style.opacity = "1";
          btn.disabled = false;
        }, 2500);
      }
    } catch (error) {
      console.error("Registration error:", error);
      btn.innerHTML = "❌ Connection error";
      btn.style.background =
        "linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)";

      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.style.background =
          "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)";
        btn.style.opacity = "1";
        btn.disabled = false;
      }, 2500);
    }
  });

// Handle window resize
window.addEventListener("resize", () => {
  const container = document.getElementById("aquarium");
  const width = container.clientWidth;
  const height = container.clientHeight;
  // Update camera and renderer if aquarium instance exists
});

// ========== GOOGLE OAUTH FUNCTIONS ==========

/**
 * Handle Google Sign-In callback
 * This function is called automatically by Google Sign-In
 */
window.handleGoogleSignIn = async function (response) {
  const credential = response.credential;

  try {
    // Show loading state
    const loginBtn = document.querySelector(".login-btn");
    if (loginBtn) {
      loginBtn.innerHTML = "🔄 Authenticating with Google...";
      loginBtn.disabled = true;
      loginBtn.style.opacity = "0.7";
    }

    // Send token to backend for verification
    const result = await fetch("/api/auth/google", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ token: credential }),
    });

    const data = await result.json();

    if (data.success) {
      // Store user info in localStorage
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("cssnova_current_user", JSON.stringify(data.user));
      localStorage.setItem("isGoogleAuth", "true");

      // Show success message
      if (loginBtn) {
        loginBtn.innerHTML = "✅ Google Sign-In Successful!";
        loginBtn.style.background =
          "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)";
      }

      // Redirect to home page after 1 second
      setTimeout(() => {
        window.location.href = "/html/index.html";
      }, 1000);
    } else {
      throw new Error(data.error || "Authentication failed");
    }
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    const loginBtn = document.querySelector(".login-btn");
    if (loginBtn) {
      loginBtn.innerHTML = "❌ Google Sign-In Failed";
      loginBtn.style.background =
        "linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)";

      setTimeout(() => {
        loginBtn.innerHTML = "Login";
        loginBtn.style.background =
          "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)";
        loginBtn.style.opacity = "1";
        loginBtn.disabled = false;
      }, 2500);
    }
    alert("Google Sign-In failed: " + error.message);
  }
};

/**
 * Check if user is already authenticated
 */
async function checkAuthentication() {
  try {
    const response = await fetch("/api/auth/check", {
      credentials: "include",
    });
    const data = await response.json();

    if (data.authenticated) {
      // User is already logged in, redirect to home
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("cssnova_current_user", JSON.stringify(data.user));
      window.location.href = "/html/index.html";
    }
  } catch (error) {
    console.log("Not authenticated:", error);
  }
}

// Check authentication on page load
checkAuthentication();

// ========== FORGOT PASSWORD FUNCTIONS ==========

let currentForgotEmail = "";

// Handle Forgot Password link click
document.querySelector(".forgot-link")?.addEventListener("click", (e) => {
  e.preventDefault();
  switchForm("forgotPassword");
  resetForgotPasswordFlow();
});

// Reset forgot password flow to step 1
function resetForgotPasswordFlow() {
  currentForgotEmail = "";
  document
    .querySelectorAll(".forgot-step")
    .forEach((step) => step.classList.add("hidden"));
  document.querySelector('[data-step="1"]').classList.remove("hidden");
  document.getElementById("forgotEmail").value = "";
  document.getElementById("otpInput").value = "";
  document.getElementById("newPassword").value = "";
  document.getElementById("confirmPassword").value = "";
}

// Switch between forms
function switchForm(target) {
  const loginCard = document.getElementById("loginCard");
  const registerCard = document.getElementById("registerCard");
  const forgotPasswordCard = document.getElementById("forgotPasswordCard");

  loginCard.classList.remove("active");
  registerCard.classList.remove("active");
  forgotPasswordCard.classList.remove("active");

  if (target === "login") {
    loginCard.classList.add("active");
  } else if (target === "register") {
    registerCard.classList.add("active");
  } else if (target === "forgotPassword") {
    forgotPasswordCard.classList.add("active");
  }
}

// Update existing switch-link handlers
document.querySelectorAll(".switch-link").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const target = link.getAttribute("data-target");
    switchForm(target);
  });
});

// Step 1: Send OTP
document
  .getElementById("forgotPasswordForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("forgotEmail").value;
    const btn = e.target.querySelector(".forgot-btn");
    const originalText = btn.innerHTML;

    try {
      btn.innerHTML = "🔄 Sending OTP...";
      btn.disabled = true;
      btn.style.opacity = "0.7";

      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (result.success) {
        currentForgotEmail = email;

        // Show success and move to step 2
        btn.innerHTML = "✅ OTP Sent!";
        btn.style.background =
          "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)";

        setTimeout(() => {
          document.querySelector('[data-step="1"]').classList.add("hidden");
          document.querySelector('[data-step="2"]').classList.remove("hidden");
          document.getElementById("otpEmailDisplay").textContent = email;

          btn.innerHTML = originalText;
          btn.style.background =
            "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)";
          btn.style.opacity = "1";
          btn.disabled = false;
        }, 1500);

        // For development: show OTP in console
        if (result.otp) {
          console.log("Development OTP:", result.otp);
          alert(`Development mode - OTP: ${result.otp}`);
        }
      } else {
        btn.innerHTML = "❌ " + (result.error || "Failed to send OTP");
        btn.style.background =
          "linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)";

        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.style.background =
            "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)";
          btn.style.opacity = "1";
          btn.disabled = false;
        }, 2500);
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      btn.innerHTML = "❌ Connection error";
      btn.style.background =
        "linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)";

      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.style.background =
          "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)";
        btn.style.opacity = "1";
        btn.disabled = false;
      }, 2500);
    }
  });

// Step 2: Verify OTP
document
  .getElementById("verifyOtpForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const otp = document.getElementById("otpInput").value;
    const btn = e.target.querySelector(".verify-otp-btn");
    const originalText = btn.innerHTML;

    if (otp.length !== 5) {
      alert("Please enter a 5-digit OTP");
      return;
    }

    try {
      btn.innerHTML = "🔄 Verifying...";
      btn.disabled = true;
      btn.style.opacity = "0.7";

      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: currentForgotEmail,
          otp,
        }),
      });

      const result = await response.json();

      if (result.success) {
        btn.innerHTML = "✅ Verified!";
        btn.style.background =
          "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)";

        setTimeout(() => {
          document.querySelector('[data-step="2"]').classList.add("hidden");
          document.querySelector('[data-step="3"]').classList.remove("hidden");

          btn.innerHTML = originalText;
          btn.style.background =
            "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)";
          btn.style.opacity = "1";
          btn.disabled = false;
        }, 1500);
      } else {
        btn.innerHTML = "❌ " + (result.error || "Invalid OTP");
        btn.style.background =
          "linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)";

        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.style.background =
            "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)";
          btn.style.opacity = "1";
          btn.disabled = false;
        }, 2500);
      }
    } catch (error) {
      console.error("OTP verification error:", error);
      btn.innerHTML = "❌ Connection error";
      btn.style.background =
        "linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)";

      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.style.background =
          "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)";
        btn.style.opacity = "1";
        btn.disabled = false;
      }, 2500);
    }
  });

// Step 3: Reset Password
document
  .getElementById("resetPasswordForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const btn = e.target.querySelector(".reset-password-btn");
    const originalText = btn.innerHTML;

    if (newPassword !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    if (newPassword.length < 6) {
      alert("Password must be at least 6 characters long!");
      return;
    }

    try {
      btn.innerHTML = "🔄 Resetting Password...";
      btn.disabled = true;
      btn.style.opacity = "0.7";

      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: currentForgotEmail,
          new_password: newPassword,
        }),
      });

      const result = await response.json();

      if (result.success) {
        btn.innerHTML = "✅ Password Reset Successful!";
        btn.style.background =
          "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)";

        setTimeout(() => {
          switchForm("login");
          resetForgotPasswordFlow();
          alert(
            "Password reset successful! Please login with your new password.",
          );

          btn.innerHTML = originalText;
          btn.style.background =
            "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)";
          btn.style.opacity = "1";
          btn.disabled = false;
        }, 2000);
      } else {
        btn.innerHTML = "❌ " + (result.error || "Password reset failed");
        btn.style.background =
          "linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)";

        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.style.background =
            "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)";
          btn.style.opacity = "1";
          btn.disabled = false;
        }, 2500);
      }
    } catch (error) {
      console.error("Password reset error:", error);
      btn.innerHTML = "❌ Connection error";
      btn.style.background =
        "linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)";

      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.style.background =
          "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)";
        btn.style.opacity = "1";
        btn.disabled = false;
      }, 2500);
    }
  });

// Resend OTP
document
  .querySelector(".resend-otp-link")
  ?.addEventListener("click", async (e) => {
    e.preventDefault();

    if (!currentForgotEmail) return;

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: currentForgotEmail }),
      });

      const result = await response.json();

      if (result.success) {
        alert("New OTP sent to your email!");
        // For development: show OTP in console
        if (result.otp) {
          console.log("Development OTP:", result.otp);
          alert(`Development mode - OTP: ${result.otp}`);
        }
      } else {
        alert("Failed to resend OTP: " + result.error);
      }
    } catch (error) {
      console.error("Resend OTP error:", error);
      alert("Failed to resend OTP");
    }
  });

/**
 * Load Google Client ID dynamically from backend
 * This prevents exposing credentials in frontend code
 */
async function loadGoogleClientId() {
  try {
    const response = await fetch('/api/auth/config');
    const config = await response.json();
    
    if (config.client_id && config.has_google_auth) {
      // Set the client ID in the Google Sign-In button
      const googleButton = document.getElementById('g_id_onload');
      if (googleButton) {
        googleButton.setAttribute('data-client_id', config.client_id);
        // Force Google Sign-In to re-initialize with the new client ID
        if (window.google && window.google.accounts) {
          google.accounts.id.initialize({
            client_id: config.client_id,
            callback: handleGoogleSignIn
          });
          google.accounts.id.renderButton(
            document.querySelector('.g_id_signin'),
            { theme: 'outline', size: 'large', text: 'sign_in_with' }
          );
        }
      }
    } else {
      console.warn('Google OAuth not configured');
      // Hide Google Sign-In button if not configured
      const googleContainer = document.getElementById('g_id_onload');
      const googleButton = document.querySelector('.g_id_signin');
      if (googleContainer) googleContainer.style.display = 'none';
      if (googleButton) googleButton.style.display = 'none';
    }
  } catch (error) {
    console.error('Failed to load Google auth config:', error);
  }
}

// Load Google Client ID when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadGoogleClientId);
} else {
  loadGoogleClientId();
}
