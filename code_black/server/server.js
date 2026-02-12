require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const problems = require("./data/problems");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

// ─── In-Memory Game State ───────────────────────────────────
const gameState = {
  onlineUsers: {},
  currentRound: 0,
  roundStatus: "waiting",
  roundEndTime: null,
  roundTimer: null,
  submissions: {},
  removedUsers: new Set(),
};

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
    .filter(([, d]) => d.role === "competitor")
    .map(([username]) => username);
}

function getLeaderboard() {
  return Object.entries(gameState.onlineUsers)
    .filter(([, d]) => d.role === "competitor")
    .map(([username, d]) => ({
      username,
      round1: d.points.round1,
      round2: d.points.round2,
      total: d.points.round1 + d.points.round2,
    }))
    .sort((a, b) => b.total - a.total)
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

app.set("getLeaderboard", getLeaderboard);
app.set("getOnlineCompetitors", getOnlineCompetitors);

// ─── Socket.IO ──────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("user:register", ({ username, role }) => {
    if (gameState.removedUsers.has(username)) {
      socket.emit("user:removed");
      return;
    }

    if (!gameState.onlineUsers[username]) {
      gameState.onlineUsers[username] = {
        role,
        socketId: socket.id,
        points: { round1: 0, round2: 0 },
      };
    } else {
      gameState.onlineUsers[username].socketId = socket.id;
    }

    // Send current state to newly connected user
    const problem =
      gameState.currentRound > 0 && problems[gameState.currentRound]
        ? {
            title: problems[gameState.currentRound].title,
            description: problems[gameState.currentRound].description,
            points: problems[gameState.currentRound].points,
            timeLimit: problems[gameState.currentRound].timeLimit,
          }
        : null;

    socket.emit("state:sync", {
      currentRound: gameState.currentRound,
      roundStatus: gameState.roundStatus,
      roundEndTime: gameState.roundEndTime,
      problem,
    });

    io.emit("users:update", getOnlineCompetitors());
    io.emit("leaderboard:update", getLeaderboard());
  });

  socket.on("disconnect", () => {
    for (const [username, data] of Object.entries(gameState.onlineUsers)) {
      if (data.socketId === socket.id) {
        delete gameState.onlineUsers[username];
        io.emit("users:update", getOnlineCompetitors());
        io.emit("leaderboard:update", getLeaderboard());
        console.log("User disconnected:", username);
        break;
      }
    }
  });
});

// ─── Start Server ───────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`CODEBLACK server running on port ${PORT}`);
});
