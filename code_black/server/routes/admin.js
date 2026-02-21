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

// Revoke a kick/removal decision — allow user back into competition
router.post("/revoke-kick", authMiddleware, adminOnly, (req, res) => {
  const { username } = req.body;
  const gs = req.gameState;

  if (!username) {
    return res.status(400).json({ message: "Username is required" });
  }

  // Remove from removedUsers set
  gs.removedUsers.delete(username);

  // Remove from tabKicked list
  gs.tabKicked = (gs.tabKicked || []).filter(k => k.username !== username);

  // Clear kicked flag from violations
  if (gs.violations[username]) {
    gs.violations[username].kicked = false;
    gs.violations[username].tabSwitch = 0;
  }

  // Notify the user's socket if they are still connected
  // They will need to re-login, but the block is removed
  req.io.emit("user:kick_revoked", { username });

  // Update admin views
  req.io.emit("users:update", req.app.get("getOnlineCompetitors")());

  res.json({ success: true, message: `Kick decision revoked for ${username}` });
});

// Get all submissions for reviewing code later
router.get("/submissions", authMiddleware, adminOnly, (req, res) => {
  const gs = req.gameState;
  // Return an array of all submissions mapped with username
  const subs = Object.entries(gs.submissions).map(([key, data]) => {
    const parts = key.split("_round");
    return {
      username: parts[0],
      round: parseInt(parts[1], 10),
      ...data
    };
  });
  res.json({ submissions: subs });
});

// Evaluate all pending submissions in parallel!
router.post("/evaluate-all", authMiddleware, adminOnly, async (req, res) => {
  const gs = req.gameState;
  const { getLLMScore } = require("../services/llmScoringService");
  const getLeaderboard = req.app.get("getLeaderboard");

  const pendingKeys = Object.keys(gs.submissions).filter(k => gs.submissions[k].status === "pending");

  if (pendingKeys.length === 0) {
    return res.json({ message: "No pending submissions to evaluate", count: 0 });
  }

  // We map the pending submissions to parallel promises
  const promises = pendingKeys.map(async (key) => {
    const sub = gs.submissions[key];
    const parts = key.split("_round");
    const username = parts[0];
    const round = parseInt(parts[1], 10);

    // Find problem definition based on what the user was solving when they submitted
    const problemPool = problems[round];
    const assignmentIdx = sub.problemIdx ?? 0;
    const problem = problemPool?.[assignmentIdx];

    if (!problem) {
      sub.status = "error";
      return;
    }

    try {
      const scoring = await getLLMScore(sub.code, sub.language, problem);
      sub.result = scoring;
      sub.status = "evaluated";

      const roundKey = `round${round}`;
      if (gs.onlineUsers[username]) {
        gs.onlineUsers[username].points[roundKey] += scoring.score;
      }
    } catch (err) {
      console.error(`Error evaluating ${username}:`, err);
      sub.status = "error";
    }
  });

  try {
    // Run them all in parallel!
    await Promise.all(promises);

    // Broadcast the updated leaderboard with the new scores
    req.io.emit("leaderboard:update", getLeaderboard());

    res.json({ success: true, count: pendingKeys.length, message: `Evaluated ${pendingKeys.length} submissions in parallel.` });
  } catch (err) {
    res.status(500).json({ message: "Evaluation encountered errors", error: err.message });
  }
});

module.exports = router;
