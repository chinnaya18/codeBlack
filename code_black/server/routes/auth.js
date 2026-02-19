const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const router = express.Router();

// ─── Dynamic User Store (in-memory) + admin account ─────────
const USERS = {};
// Admin is always available
USERS.admin = { password: "admin123", role: "admin", hashed: false };

// ─── Register ───────────────────────────────────────────────
router.post("/register", (req, res) => {
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

    if (USERS[trimmed]) {
      return res.status(409).json({ message: "Username already exists. Please login instead." });
    }

    // Hash password and store
    const hashedPassword = bcrypt.hashSync(password, 10);
    USERS[trimmed] = { password: hashedPassword, role: "competitor", hashed: true };

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
router.post("/login", (req, res) => {
  try {
    const { username, password } = req.body;
    const trimmed = (username || "").trim().toLowerCase();
    const user = USERS[trimmed];

    if (!user) {
      return res.status(401).json({ message: "User not found. Please register first." });
    }

    // Compare password
    let passwordValid = false;
    if (user.hashed) {
      passwordValid = bcrypt.compareSync(password, user.password);
    } else {
      // Plain text (admin account)
      passwordValid = (user.password === password);
    }

    if (!passwordValid) {
      return res.status(401).json({ message: "Invalid password" });
    }

    if (req.gameState.removedUsers.has(trimmed)) {
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
