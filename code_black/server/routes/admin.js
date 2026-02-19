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
  const getAllCompetitors = req.app.get("getAllCompetitors");

  res.json({
    currentRound: gs.currentRound,
    roundStatus: gs.roundStatus,
    roundEndTime: gs.roundEndTime,
    onlineUsers: getOnlineCompetitors(),
    allCompetitors: getAllCompetitors(),
    leaderboard: getLeaderboard(),
    removedUsers: [...gs.removedUsers],
    violations: gs.violations || {},
    problemAssignments: gs.problemAssignments || {},
    tabKicked: gs.tabKicked || [],
  });
});

// Start a round with random problem assignment
router.post("/start-round", authMiddleware, adminOnly, (req, res) => {
  const gs = req.gameState;
  const { round } = req.body;
  const roundNum = round || (gs.currentRound === 0 ? 1 : gs.currentRound + 1);

  const problemPool = problems[roundNum];
  if (!problemPool || problemPool.length === 0) {
    return res.status(400).json({ message: "No problems available for this round" });
  }

  const duration = 30 * 60 * 1000; // 30 minutes per round
  const startTime = Date.now();
  const endTime = startTime + duration;

  gs.currentRound = roundNum;
  gs.roundStatus = "active";
  gs.roundStartTime = startTime;
  gs.roundEndTime = endTime;

  // Clear any existing timer
  if (gs.roundTimer) clearTimeout(gs.roundTimer);
  if (gs.roundCheckInterval) clearInterval(gs.roundCheckInterval);

  // Auto-end round when time expires (primary timer)
  gs.roundTimer = setTimeout(() => {
    if (gs.roundStatus === "active") {
      gs.roundStatus = "ended";
      req.io.emit("round:end", { round: roundNum });
      req.io.emit("leaderboard:update", req.app.get("getLeaderboard")());
      console.log(`Round ${roundNum} auto-ended by timer.`);
    }
  }, duration);

  // Secondary check every 5 seconds to enforce time strictly
  gs.roundCheckInterval = setInterval(() => {
    if (gs.roundEndTime && Date.now() >= gs.roundEndTime && gs.roundStatus === "active") {
      gs.roundStatus = "ended";
      clearInterval(gs.roundCheckInterval);
      gs.roundCheckInterval = null;
      req.io.emit("round:end", { round: roundNum });
      req.io.emit("leaderboard:update", req.app.get("getLeaderboard")());
      console.log(`Round ${roundNum} force-ended by interval check.`);
    }
  }, 5000);

  const assignProblem = req.app.get("assignProblem");
  const getUserProblem = req.app.get("getUserProblem");

  // Broadcast round start to all (for navigation in WaitingRoom)
  req.io.emit("round:start", { round: roundNum, endTime });

  // Assign random problems individually to each online competitor
  for (const [username, userData] of Object.entries(gs.onlineUsers)) {
    if (userData.role === "competitor" && userData.connected) {
      assignProblem(username, roundNum);
      const problem = getUserProblem(username, roundNum);

      if (userData.socketId) {
        req.io.to(userData.socketId).emit("problem:assigned", {
          round: roundNum,
          problem,
        });
      }
    }
  }

  res.json({ success: true, round: roundNum, endTime });
});

// End current round manually
router.post("/end-round", authMiddleware, adminOnly, (req, res) => {
  const gs = req.gameState;

  if (gs.roundStatus !== "active") {
    return res.status(400).json({ message: "No active round to end" });
  }

  if (gs.roundTimer) clearTimeout(gs.roundTimer);
  if (gs.roundCheckInterval) clearInterval(gs.roundCheckInterval);
  gs.roundCheckInterval = null;
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

  // Clear any disconnect timer
  if (userData?.disconnectTimer) {
    clearTimeout(userData.disconnectTimer);
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
  if (gs.roundCheckInterval) clearInterval(gs.roundCheckInterval);
  gs.roundCheckInterval = null;

  gs.currentRound = 0;
  gs.roundStatus = "waiting";
  gs.roundEndTime = null;
  gs.roundStartTime = null;
  gs.submissions = {};
  gs.removedUsers.clear();
  gs.problemAssignments = {};
  gs.violations = {};
  gs.tabKicked = [];

  for (const user of Object.values(gs.onlineUsers)) {
    user.points = { round1: 0, round2: 0 };
  }

  req.io.emit("event:reset");
  req.io.emit("leaderboard:update", req.app.get("getLeaderboard")());

  res.json({ success: true });
});

module.exports = router;
