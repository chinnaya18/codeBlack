const express = require("express");
const jwt = require("jsonwebtoken");

const router = express.Router();

// Dummy login (NO DB)
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  // Dummy credentials
  if (username === "admin" && password === "admin123") {
    const token = jwt.sign(
      { username, role: "ADMIN" },
      process.env.JWT_SECRET,
      { expiresIn: "3h" },
    );

    return res.json({ token });
  }

  return res.status(401).json({
    message: "Invalid username or password",
  });
});

module.exports = router;
