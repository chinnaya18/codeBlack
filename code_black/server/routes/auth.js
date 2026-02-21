const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { db, doc, setDoc, getDoc } = require("../firebase");
const router = express.Router();

// ─── Auto-Create Admin ──────────────────────────────────────
const initAdmin = async () => {
  try {
    const adminRef = doc(db, "users", "admin");
    const adminSnap = await getDoc(adminRef);

    if (!adminSnap.exists()) {
      await setDoc(adminRef, {
        username: "admin",
        password: "admin123", // No hash for admin simplicity
        role: "admin"
      });
      console.log("🛠️ Default Admin account created in Firebase");
    }
  } catch (err) {
    console.error("Failed to init admin:", err);
  }
};
initAdmin();

// ─── Register ───────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const trimmed = username.trim().toLowerCase();

    if (trimmed.length < 2) {
      return res.status(400).json({ message: "Username must be at least 2 characters" });
    }

    if (password.length < 4) {
      return res.status(400).json({ message: "Password must be at least 4 characters" });
    }

    if (trimmed === "admin") {
      return res.status(400).json({ message: "This username is reserved" });
    }

    const userRef = doc(db, "users", trimmed);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return res.status(409).json({ message: "Username already exists. Please login instead." });
    }

    // Hash password and store
    const hashedPassword = bcrypt.hashSync(password, 10);
    const newUser = {
      username: trimmed,
      password: hashedPassword,
      role: "competitor"
    };

    await setDoc(userRef, newUser);

    const token = jwt.sign(
      { username: trimmed, role: "competitor" },
      process.env.JWT_SECRET,
      { expiresIn: "6h" }
    );

    res.json({ token, username: trimmed, role: "competitor" });
  } catch (err) {
    console.error("[REGISTER] Error:", err.message);
    res.status(500).json({ message: "Registration failed: " + err.message });
  }
});

// ─── Login ──────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const trimmed = (username || "").trim().toLowerCase();

    const userRef = doc(db, "users", trimmed);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return res.status(401).json({ message: "User not found. Please register first." });
    }

    const user = userSnap.data();

    // Compare password
    let passwordValid = false;
    if (user.role === "admin") {
      // Plain text (admin account)
      passwordValid = (user.password === password);
    } else {
      passwordValid = bcrypt.compareSync(password, user.password);
    }

    if (!passwordValid) {
      return res.status(401).json({ message: "Invalid password" });
    }

    if (req.gameState && req.gameState.removedUsers && req.gameState.removedUsers.has(trimmed)) {
      return res
        .status(403)
        .json({ message: "You have been removed from the event" });
    }

    const token = jwt.sign(
      { username: trimmed, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "6h" },
    );

    res.json({ token, username: trimmed, role: user.role });
  } catch (err) {
    console.error("[LOGIN] Error:", err.message);
    res.status(500).json({ message: "Login failed: " + err.message });
  }
});

module.exports = router;

