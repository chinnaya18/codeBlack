const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const problems = require("../data/problems");

// Admin-only middleware
const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

// Get current game state
router.get("/state", authMiddleware, adminOnly, (req, res) => {
  const gs = req.gameState;
  const getLeaderboard = req.app.get("getLeaderboard");
  const getOnlineCompetitors = req.app.get("getOnlineCompetitors");

  res.json({
    currentRound: gs.currentRound,
    roundStatus: gs.roundStatus,
    roundEndTime: gs.roundEndTime,
    onlineUsers: getOnlineCompetitors(),
    leaderboard: getLeaderboard(),
    removedUsers: [...gs.removedUsers],
  });
});

// Start a round
router.post("/start-round", authMiddleware, adminOnly, (req, res) => {
  const gs = req.gameState;
  const { round } = req.body;
  const roundNum = round || (gs.currentRound === 0 ? 1 : gs.currentRound + 1);

  if (roundNum > 2) {
    return res.status(400).json({ message: "No more rounds available" });
  }

  const problem = problems[roundNum];
  if (!problem) {
    return res.status(400).json({ message: "Problem not found for round" });
  }

  const duration = roundNum === 1 ? 90 * 60 * 1000 : 60 * 60 * 1000;
  const endTime = Date.now() + duration;

  gs.currentRound = roundNum;
  gs.roundStatus = "active";
  gs.roundEndTime = endTime;

  // Clear any existing timer
  if (gs.roundTimer) clearTimeout(gs.roundTimer);

  // Auto-end round when time expires
  gs.roundTimer = setTimeout(() => {
    gs.roundStatus = "ended";
    req.io.emit("round:end", { round: roundNum });
    req.io.emit("leaderboard:update", req.app.get("getLeaderboard")());
  }, duration);

  // Broadcast round start
  req.io.emit("round:start", {
    round: roundNum,
    endTime,
    problem: {
      title: problem.title,
      description: problem.description,
      points: problem.points,
      timeLimit: problem.timeLimit,
    },
  });

  res.json({ success: true, round: roundNum, endTime });
});

// End current round manually
router.post("/end-round", authMiddleware, adminOnly, (req, res) => {
  const gs = req.gameState;

  if (gs.roundStatus !== "active") {
    return res.status(400).json({ message: "No active round to end" });
  }

  if (gs.roundTimer) clearTimeout(gs.roundTimer);
  gs.roundStatus = "ended";

  req.io.emit("round:end", { round: gs.currentRound });
  req.io.emit("leaderboard:update", req.app.get("getLeaderboard")());

  res.json({ success: true });
});

// Remove a user
router.post("/remove-user", authMiddleware, adminOnly, (req, res) => {
  const { username } = req.body;
  const gs = req.gameState;

  if (!username || username === "admin") {
    return res.status(400).json({ message: "Invalid user" });
  }

  gs.removedUsers.add(username);

  // Notify the removed user via socket
  const userData = gs.onlineUsers[username];
  if (userData && userData.socketId) {
    req.io.to(userData.socketId).emit("user:removed");
  }

  delete gs.onlineUsers[username];

  req.io.emit("users:update", req.app.get("getOnlineCompetitors")());
  req.io.emit("leaderboard:update", req.app.get("getLeaderboard")());

  res.json({ success: true });
});

// Reset entire event
router.post("/reset", authMiddleware, adminOnly, (req, res) => {
  const gs = req.gameState;

  if (gs.roundTimer) clearTimeout(gs.roundTimer);

  gs.currentRound = 0;
  gs.roundStatus = "waiting";
  gs.roundEndTime = null;
  gs.submissions = {};
  gs.removedUsers.clear();

  for (const user of Object.values(gs.onlineUsers)) {
    user.points = { round1: 0, round2: 0 };
  }

  req.io.emit("event:reset");
  req.io.emit("leaderboard:update", req.app.get("getLeaderboard")());

  res.json({ success: true });
});

module.exports = router;
