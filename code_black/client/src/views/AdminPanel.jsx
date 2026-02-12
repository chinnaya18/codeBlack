import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket, registerUser } from "../socket/leaderboard";
import { getUser } from "../services/auth";
import { fetchWithAuth } from "../services/api";
import ProfileDropdown from "../components/ProfileDropdown";

export default function AdminPanel() {
  const navigate = useNavigate();
  const user = getUser();

  const [gameState, setGameState] = useState({
    currentRound: 0,
    roundStatus: "waiting",
    onlineUsers: [],
    leaderboard: [],
    removedUsers: [],
  });
  const [loading, setLoading] = useState({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (user.role !== "admin") {
      navigate("/");
      return;
    }

    registerUser(user.username, user.role);
    fetchState();

    socket.on("users:update", (users) => {
      setGameState((prev) => ({ ...prev, onlineUsers: users }));
    });

    socket.on("leaderboard:update", (lb) => {
      setGameState((prev) => ({ ...prev, leaderboard: lb }));
    });

    return () => {
      socket.off("users:update");
      socket.off("leaderboard:update");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, user.role, user.username]);

  const fetchState = async () => {
    try {
      const data = await fetchWithAuth("/admin/state");
      setGameState(data);
    } catch (err) {
      console.error("Failed to fetch state:", err);
    }
  };

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  };

  const startRound = async (round) => {
    setLoading((prev) => ({ ...prev, [`start${round}`]: true }));
    try {
      await fetchWithAuth("/admin/start-round", {
        method: "POST",
        body: JSON.stringify({ round }),
      });
      showMessage(`Round ${round} started successfully!`);
      fetchState();
    } catch (err) {
      showMessage(`Error: ${err.message}`);
    } finally {
      setLoading((prev) => ({ ...prev, [`start${round}`]: false }));
    }
  };

  const endRound = async () => {
    setLoading((prev) => ({ ...prev, endRound: true }));
    try {
      await fetchWithAuth("/admin/end-round", { method: "POST" });
      showMessage("Round ended!");
      fetchState();
    } catch (err) {
      showMessage(`Error: ${err.message}`);
    } finally {
      setLoading((prev) => ({ ...prev, endRound: false }));
    }
  };

  const removeUser = async (username) => {
    if (!window.confirm(`Remove ${username} from the event?`)) return;
    try {
      await fetchWithAuth("/admin/remove-user", {
        method: "POST",
        body: JSON.stringify({ username }),
      });
      showMessage(`${username} has been removed`);
      fetchState();
    } catch (err) {
      showMessage(`Error: ${err.message}`);
    }
  };

  const resetEvent = async () => {
    if (!window.confirm("Reset the entire event? All scores will be lost."))
      return;
    try {
      await fetchWithAuth("/admin/reset", { method: "POST" });
      showMessage("Event has been reset!");
      fetchState();
    } catch (err) {
      showMessage(`Error: ${err.message}`);
    }
  };

  const getStatusColor = () => {
    switch (gameState.roundStatus) {
      case "active":
        return "#00ff99";
      case "ended":
        return "#ff9900";
      default:
        return "#555";
    }
  };

  const getStatusIcon = () => {
    switch (gameState.roundStatus) {
      case "active":
        return "●";
      case "ended":
        return "■";
      default:
        return "○";
    }
  };

  return (
    <div style={styles.container}>
      {/* Top Bar */}
      <div style={styles.topBar}>
        <span style={styles.logo}>CODEBLACK</span>
        <span style={styles.adminBadge}>⚡ ADMIN CONTROL</span>
        <ProfileDropdown />
      </div>

      {/* Toast Message */}
      {message && <div style={styles.toast}>{message}</div>}

      <div style={styles.content}>
        {/* ─── Event Status ─── */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>EVENT STATUS</h3>
          <div style={styles.statusGrid}>
            <div style={styles.statusCard}>
              <span style={styles.statusLabel}>ROUND</span>
              <span style={styles.statusValue}>
                {gameState.currentRound || "—"}
              </span>
            </div>
            <div style={styles.statusCard}>
              <span style={styles.statusLabel}>STATUS</span>
              <span
                style={{
                  ...styles.statusValue,
                  color: getStatusColor(),
                  fontSize: "18px",
                }}
              >
                {getStatusIcon()} {gameState.roundStatus.toUpperCase()}
              </span>
            </div>
            <div style={styles.statusCard}>
              <span style={styles.statusLabel}>COMPETITORS</span>
              <span style={styles.statusValue}>
                {gameState.onlineUsers.length}
              </span>
            </div>
          </div>
        </div>

        {/* ─── Controls ─── */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>CONTROLS</h3>
          <div style={styles.controlGrid}>
            <button
              onClick={() => startRound(1)}
              disabled={gameState.roundStatus === "active"}
              style={{
                ...styles.controlBtn,
                ...styles.greenBtn,
                opacity: gameState.roundStatus === "active" ? 0.3 : 1,
              }}
            >
              {loading.start1 ? "STARTING..." : "▶ START ROUND 1"}
            </button>
            <button
              onClick={() => startRound(2)}
              disabled={
                gameState.roundStatus === "active" || gameState.currentRound < 1
              }
              style={{
                ...styles.controlBtn,
                ...styles.greenBtn,
                opacity:
                  gameState.roundStatus === "active" ||
                  gameState.currentRound < 1
                    ? 0.3
                    : 1,
              }}
            >
              {loading.start2 ? "STARTING..." : "▶ START ROUND 2"}
            </button>
            <button
              onClick={endRound}
              disabled={gameState.roundStatus !== "active"}
              style={{
                ...styles.controlBtn,
                ...styles.orangeBtn,
                opacity: gameState.roundStatus !== "active" ? 0.3 : 1,
              }}
            >
              {loading.endRound ? "ENDING..." : "■ END ROUND"}
            </button>
            <button
              onClick={resetEvent}
              style={{ ...styles.controlBtn, ...styles.redBtn }}
            >
              ⟲ RESET EVENT
            </button>
          </div>
        </div>

        {/* ─── Bottom Grid: Users + Leaderboard ─── */}
        <div style={styles.bottomGrid}>
          {/* Online Users */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>
              ONLINE COMPETITORS ({gameState.onlineUsers.length})
            </h3>
            <div style={styles.list}>
              {gameState.onlineUsers.length === 0 ? (
                <p style={styles.emptyText}>No competitors online</p>
              ) : (
                gameState.onlineUsers.map((u) => (
                  <div key={u} style={styles.userRow}>
                    <div style={styles.userInfo}>
                      <span style={styles.userDot} />
                      <span style={styles.userName}>{u}</span>
                    </div>
                    <button
                      onClick={() => removeUser(u)}
                      style={styles.removeBtn}
                    >
                      ✕ REMOVE
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Leaderboard */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>LEADERBOARD</h3>
            <div style={styles.list}>
              {gameState.leaderboard.length === 0 ? (
                <p style={styles.emptyText}>No scores yet</p>
              ) : (
                gameState.leaderboard.map((entry) => (
                  <div key={entry.username} style={styles.lbRow}>
                    <span style={styles.lbRank}>#{entry.rank}</span>
                    <span style={styles.lbName}>{entry.username}</span>
                    <span style={styles.lbScores}>
                      R1:{entry.round1} R2:{entry.round2}
                    </span>
                    <span style={styles.lbTotal}>{entry.total}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#050505",
    fontFamily: "'JetBrains Mono', monospace",
  },
  topBar: {
    height: "56px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 20px",
    borderBottom: "1px solid #1a1a1a",
  },
  logo: {
    color: "#00ff99",
    fontWeight: "bold",
    letterSpacing: "3px",
    fontSize: "16px",
    textShadow: "0 0 10px #00ff9930",
  },
  adminBadge: {
    color: "#ff4444",
    fontSize: "10px",
    letterSpacing: "3px",
    border: "1px solid #ff444430",
    padding: "4px 14px",
  },
  toast: {
    position: "fixed",
    top: "72px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "#0d0d0d",
    border: "1px solid #00ff9940",
    color: "#00ff99",
    padding: "10px 28px",
    zIndex: 2000,
    fontSize: "12px",
    letterSpacing: "1px",
    animation: "fadeIn 0.3s ease",
    boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
  },
  content: {
    padding: "24px",
    maxWidth: "1200px",
    margin: "0 auto",
  },
  section: {
    border: "1px solid #1a1a1a",
    padding: "20px",
    marginBottom: "20px",
    background: "#0a0a0a",
  },
  sectionTitle: {
    color: "#555",
    fontSize: "9px",
    letterSpacing: "3px",
    margin: "0 0 16px",
  },
  statusGrid: {
    display: "flex",
    gap: "16px",
  },
  statusCard: {
    flex: 1,
    background: "#0d0d0d",
    border: "1px solid #1a1a1a",
    padding: "20px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  statusLabel: {
    color: "#444",
    fontSize: "8px",
    letterSpacing: "2px",
  },
  statusValue: {
    color: "#00ff99",
    fontSize: "28px",
    fontWeight: "bold",
  },
  controlGrid: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },
  controlBtn: {
    padding: "12px 24px",
    border: "none",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "11px",
    letterSpacing: "2px",
    cursor: "pointer",
    fontWeight: "bold",
    transition: "all 0.3s",
  },
  greenBtn: {
    background: "linear-gradient(135deg, #00ff99, #00cc77)",
    color: "#000",
  },
  orangeBtn: { background: "#ff9900", color: "#000" },
  redBtn: {
    background: "transparent",
    border: "1px solid #ff4444",
    color: "#ff4444",
  },
  bottomGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
  },
  list: { display: "flex", flexDirection: "column", gap: "6px" },
  userRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 14px",
    background: "#0d0d0d",
    border: "1px solid #1a1a1a",
    transition: "all 0.3s",
  },
  userInfo: { display: "flex", alignItems: "center", gap: "10px" },
  userDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#00ff99",
    boxShadow: "0 0 8px #00ff99",
  },
  userName: { color: "#ccc", fontSize: "13px" },
  removeBtn: {
    background: "transparent",
    border: "1px solid #ff444440",
    color: "#ff4444",
    padding: "4px 12px",
    cursor: "pointer",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "9px",
    letterSpacing: "1px",
    transition: "all 0.3s",
  },
  emptyText: {
    color: "#2a2a2a",
    fontSize: "12px",
    textAlign: "center",
    padding: "20px",
  },
  lbRow: {
    display: "flex",
    alignItems: "center",
    padding: "10px 14px",
    background: "#0d0d0d",
    border: "1px solid #1a1a1a",
    gap: "12px",
    animation: "slideIn 0.4s ease forwards",
  },
  lbRank: {
    color: "#00ff99",
    fontWeight: "bold",
    width: "40px",
    fontSize: "14px",
  },
  lbName: { color: "#ccc", flex: 1, fontSize: "13px" },
  lbScores: { color: "#555", fontSize: "10px", letterSpacing: "1px" },
  lbTotal: {
    color: "#00ff99",
    fontWeight: "bold",
    fontSize: "18px",
    width: "50px",
    textAlign: "right",
  },
};
