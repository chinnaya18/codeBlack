const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

// ─── Static User Accounts (30 competitors + admin) ─────────
const USERS = {};
for (let i = 1; i <= 30; i++) {
  USERS[`user${i}`] = { password: "pass123", role: "competitor" };
}
USERS.admin = { password: "admin123", role: "admin" };

router.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = USERS[username];

  if (!user || user.password !== password) {
    return res.status(401).json({ message: "Invalid username or password" });
  }

  if (req.gameState.removedUsers.has(username)) {
    return res
      .status(403)
      .json({ message: "You have been removed from the event" });
  }

  const token = jwt.sign(
    { username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "6h" },
  );

  res.json({ token, username, role: user.role });
});

module.exports = router;
