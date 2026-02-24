require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const express = require("express");
const http = require("http");
const cors = require("cors");
const os = require("os");
const path = require("path");
const { Server } = require("socket.io");
const problems = require("./data/problems");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  pingInterval: 10000,
  pingTimeout: 20000,
});

app.use(cors());
app.use(express.json());

// ─── In-Memory Game State ───────────────────────────────────
const gameState = {
  onlineUsers: {},          // { username: { role, socketId, connected, points, disconnectTimer } }
  currentRound: 0,
  roundStatus: "waiting",   // "waiting" | "active" | "ended"
  roundEndTime: null,
  roundStartTime: null,
  roundTimer: null,
  submissions: {},
  removedUsers: new Set(),
  problemAssignments: {},   // { username: { 1: problemIndex, 2: problemIndex } }
  violations: {},           // { username: { fullscreen: count, tabSwitch: count } }
  tabKicked: [],            // [{ username, timestamp }] - users kicked for tab switching
};

const DISCONNECT_GRACE_MS = 60000; // 60 second grace period before removing user

// Make io and gameState available to routes
app.use((req, res, next) => {
  req.io = io;
  req.gameState = gameState;
  next();
});

// ─── Routes ─────────────────────────────────────────────────
app.use("/auth", require("./routes/auth"));
app.use("/submit", require("./routes/submit"));
app.use("/admin", require("./routes/admin"));

app.get("/", (req, res) => res.send("CODEBLACK server running"));

// ─── Helper Functions ───────────────────────────────────────
function getOnlineCompetitors() {
  return Object.entries(gameState.onlineUsers)
    .filter(([, d]) => d.role === "competitor" && d.connected)
    .map(([username]) => username);
}

function getAllCompetitors() {
  return Object.entries(gameState.onlineUsers)
    .filter(([, d]) => d.role === "competitor")
    .map(([username, d]) => ({
      username,
      connected: d.connected,
    }));
}

function getLeaderboard() {
  return Object.entries(gameState.onlineUsers)
    .filter(([, d]) => d.role === "competitor")
    .map(([username, d]) => {
      let violationPenalty = 0;
      const v = gameState.violations[username] || { fullscreen: 0, tabSwitch: 0 };
      const totalViolations = v.fullscreen + v.tabSwitch;

      if (totalViolations === 1) violationPenalty = 5;
      else if (totalViolations === 2) violationPenalty = 20;
      else if (totalViolations >= 3) violationPenalty = 50;

      let total = d.points.round1 + d.points.round2 - violationPenalty;
      if (total < 0) total = 0;

      return {
        username,
        round1: d.points.round1,
        round2: d.points.round2,
        violationPenalty,
        total,
        connected: d.connected,
      };
    })
    .sort((a, b) => b.total - a.total)
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

/**
 * Assign a random problem from the pool for a given round to a user.
 * If already assigned, returns the existing assignment.
 */
function assignProblem(username, roundNum) {
  if (!gameState.problemAssignments[username]) {
    gameState.problemAssignments[username] = {};
  }
  if (gameState.problemAssignments[username][roundNum] !== undefined) {
    return gameState.problemAssignments[username][roundNum];
  }
  const pool = problems[roundNum];
  if (!pool || pool.length === 0) return null;
  const startIndex = 0; // Always start at the first problem sequentially
  gameState.problemAssignments[username][roundNum] = startIndex;
  return startIndex;
}

/**
 * Get the sanitized problem (no test cases) for a user in a round.
 */
function getUserProblem(username, roundNum) {
  const idx = gameState.problemAssignments[username]?.[roundNum];
  if (idx === undefined || idx === null) return null;
  const pool = problems[roundNum];
  if (!pool || !pool[idx]) return null;
  const p = pool[idx];
  return {
    title: p.title,
    description: p.description,
    points: p.points,
    timeLimit: p.timeLimit,
    sampleTestCase: p.sampleTestCase || null,
  };
}

app.set("getLeaderboard", getLeaderboard);
app.set("getOnlineCompetitors", getOnlineCompetitors);
app.set("getAllCompetitors", getAllCompetitors);
app.set("assignProblem", assignProblem);
app.set("getUserProblem", getUserProblem);

// ─── Socket.IO ──────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("user:register", ({ username, role }) => {
    if (gameState.removedUsers.has(username)) {
      socket.emit("user:removed");
      return;
    }

    // Clear any pending disconnect timer
    if (gameState.onlineUsers[username]?.disconnectTimer) {
      clearTimeout(gameState.onlineUsers[username].disconnectTimer);
      gameState.onlineUsers[username].disconnectTimer = null;
    }

    if (!gameState.onlineUsers[username]) {
      gameState.onlineUsers[username] = {
        role,
        socketId: socket.id,
        connected: true,
        points: { round1: 0, round2: 0 },
        disconnectTimer: null,
      };
    } else {
      gameState.onlineUsers[username].socketId = socket.id;
      gameState.onlineUsers[username].connected = true;
    }

    // Initialize violations if not present
    if (role === "competitor" && !gameState.violations[username]) {
      gameState.violations[username] = { fullscreen: 0, tabSwitch: 0 };
    }

    // If there's an active round, assign a problem to this user (if not already assigned)
    let problem = null;
    if (gameState.currentRound > 0 && role === "competitor") {
      if (gameState.roundStatus === "active") {
        assignProblem(username, gameState.currentRound);
        problem = getUserProblem(username, gameState.currentRound);
      } else if (gameState.roundStatus === "ended") {
        problem = getUserProblem(username, gameState.currentRound);
      }
    }

    socket.emit("state:sync", {
      currentRound: gameState.currentRound,
      roundStatus: gameState.roundStatus,
      roundEndTime: gameState.roundEndTime,
      problem,
    });

    io.emit("users:update", getOnlineCompetitors());
    io.emit("leaderboard:update", getLeaderboard());
    console.log(`👤 User registered: ${username} (${role})`);
  });

  function handleViolation(username, type) {
    const v = gameState.violations[username];
    if (!v) return;

    if (type === "fullscreen") v.fullscreen++;
    if (type === "tab_switch") v.tabSwitch++;

    const total = v.fullscreen + v.tabSwitch;
    console.log(`🖥️ [VIOLATION] ${type} by ${username} (total: ${total})`);

    io.emit("violation:update", {
      username,
      count: total,
      fullscreen: v.fullscreen,
      tabSwitch: v.tabSwitch,
      type: type,
    });

    if (total >= 4) {
      console.log(`⛔ [KICK] 4th Violation by ${username} — Removing from competition`);

      gameState.removedUsers.add(username);
      gameState.tabKicked.push({ username, timestamp: Date.now() });

      if (gameState.onlineUsers[username]) {
        gameState.onlineUsers[username].points = { round1: 0, round2: 0 };
      }

      const userData = gameState.onlineUsers[username];
      if (userData && userData.socketId) {
        io.to(userData.socketId).emit("user:kicked", { reason: "Too many violations" });
      }

      io.emit("violation:update", {
        username,
        count: total,
        fullscreen: v.fullscreen,
        tabSwitch: v.tabSwitch,
        type: "max_violations",
        kicked: true,
      });

      io.emit("user:tab_kicked", {
        username,
        timestamp: Date.now(),
      });

      if (gameState.onlineUsers[username]?.disconnectTimer) {
        clearTimeout(gameState.onlineUsers[username].disconnectTimer);
      }
      delete gameState.onlineUsers[username];
      io.emit("users:update", getOnlineCompetitors());
    }

    io.emit("leaderboard:update", getLeaderboard());
  }

  // Track fullscreen violations
  socket.on("violation:fullscreen", ({ username }) => handleViolation(username, "fullscreen"));

  // Track tab switch violations
  socket.on("violation:tab_switch", ({ username }) => handleViolation(username, "tab_switch"));

  socket.on("disconnect", () => {
    for (const [username, data] of Object.entries(gameState.onlineUsers)) {
      if (data.socketId === socket.id) {
        // Don't remove immediately - use grace period
        data.connected = false;
        console.log(`User disconnected (${DISCONNECT_GRACE_MS / 1000}s grace): ${username}`);

        // Update UI immediately to show disconnected status
        io.emit("users:update", getOnlineCompetitors());

        // Set timer to fully remove after grace period
        data.disconnectTimer = setTimeout(() => {
          if (gameState.onlineUsers[username] && !gameState.onlineUsers[username].connected) {
            // Keep user data if they have submissions (preserves scores)
            if (gameState.roundStatus === "active" || Object.keys(gameState.submissions).some(k => k.startsWith(username))) {
              // Mark as offline but keep in system for leaderboard
              console.log(`User timeout but keeping for scores: ${username}`);
            } else {
              delete gameState.onlineUsers[username];
              console.log(`User fully removed after timeout: ${username}`);
            }
            io.emit("users:update", getOnlineCompetitors());
            io.emit("leaderboard:update", getLeaderboard());
          }
        }, DISCONNECT_GRACE_MS);

        break;
      }
    }
  });
});

// ─── Get LAN IP Address ─────────────────────────────────────
function getLanIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}



// ─── Health Check Endpoint ──────────────────────────────────
app.get("/health", async (req, res) => {
  res.json({
    server: "ok",
    uptime: process.uptime(),
    competitors: getOnlineCompetitors().length,
    currentRound: gameState.currentRound,
    roundStatus: gameState.roundStatus,
  });
});

// ─── Start Server ───────────────────────────────────────────
const PORT = process.env.SERVER_PORT || 5000;

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n❌ Port ${PORT} is already in use!`);
    console.error(`   Run stop.bat first, or kill the process on port ${PORT}.\n`);
    console.error(`   Retrying in 3 seconds...\n`);
    setTimeout(() => {
      server.close();
      server.listen(PORT, "0.0.0.0");
    }, 3000);
  } else {
    console.error("Server error:", err);
  }
});

server.listen(PORT, "0.0.0.0", () => {
  const lanIP = getLanIP();
  console.log(`\n🖤 CODEBLACK server running`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Network: http://${lanIP}:${PORT}\n`);
});
