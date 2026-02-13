import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket, registerUser } from "../socket/leaderboard";
import { getUser } from "../services/auth";
import { fetchWithAuth } from "../services/api";
import ProfileDropdown from "../components/ProfileDropdown";

export default function AdminLeaderboard() {
  const navigate = useNavigate();
  const user = getUser();
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    if (user.role !== "admin") {
      navigate("/");
      return;
    }

    registerUser(user.username, user.role);

    // Fetch initial state
    const fetchState = async () => {
      try {
        const data = await fetchWithAuth("/admin/state");
        setLeaderboard(data.leaderboard || []);
      } catch (err) {
        console.error("Failed to fetch state:", err);
      }
    };
    fetchState();

    socket.on("leaderboard:update", (lb) => {
      setLeaderboard(lb);
    });

    return () => {
      socket.off("leaderboard:update");
    };
  }, [navigate, user.role, user.username]);

  const getRankStyle = (rank) => {
    if (rank === 1)
      return {
        color: "#ffd700",
        textShadow: "0 0 20px #ffd70080",
        fontSize: "28px",
      };
    if (rank === 2)
      return {
        color: "#c0c0c0",
        textShadow: "0 0 16px #c0c0c060",
        fontSize: "24px",
      };
    return { color: "#555", fontSize: "16px" };
  };

  const getRankLabel = (rank) => {
    if (rank === 1) return "🏆 WINNER";
    if (rank === 2) return "🥈 RUNNER-UP";
    return `#${rank}`;
  };

  const getRowBorder = (rank) => {
    if (rank === 1) return "2px solid #ffd700";
    if (rank === 2) return "2px solid #c0c0c0";
    return "1px solid #1a1a1a";
  };

  const getRowBg = (rank) => {
    if (rank === 1) return "linear-gradient(135deg, #ffd70008, #0a0a0a)";
    if (rank === 2) return "linear-gradient(135deg, #c0c0c008, #0a0a0a)";
    return "#0d0d0d";
  };

  return (
    <div style={styles.container}>
      {/* Top Bar */}
      <div style={styles.topBar}>
        <div style={styles.topLeft}>
          <button onClick={() => navigate("/admin")} style={styles.backBtn}>
            ← BACK
          </button>
          <span style={styles.logo}>CODEBLACK</span>
        </div>
        <span style={styles.pageTitle}>FINAL LEADERBOARD</span>
        <ProfileDropdown />
      </div>

      {/* Winner Podium */}
      {leaderboard.length >= 2 && (
        <div style={styles.podium}>
          {/* Runner-up */}
          <div style={styles.podiumCard}>
            <div style={styles.podiumRank2}>🥈</div>
            <div style={styles.podiumName}>{leaderboard[1]?.username}</div>
            <div style={styles.podiumScore2}>{leaderboard[1]?.total} pts</div>
            <div style={styles.podiumLabel2}>RUNNER-UP</div>
          </div>

          {/* Winner */}
          <div style={{ ...styles.podiumCard, ...styles.podiumWinner }}>
            <div style={styles.podiumRank1}>🏆</div>
            <div style={{ ...styles.podiumName, color: "#ffd700" }}>
              {leaderboard[0]?.username}
            </div>
            <div style={styles.podiumScore1}>{leaderboard[0]?.total} pts</div>
            <div style={styles.podiumLabel1}>WINNER</div>
          </div>

          {/* Runner-up */}
          {leaderboard.length >= 3 && (
            <div style={styles.podiumCard}>
              <div style={styles.podiumRank3}>#3</div>
              <div style={styles.podiumName}>{leaderboard[2]?.username}</div>
              <div style={styles.podiumScore3}>{leaderboard[2]?.total} pts</div>
              <div style={styles.podiumLabel3}>3RD PLACE</div>
            </div>
          )}
        </div>
      )}

      {/* Full Table */}
      <div style={styles.content}>
        <div style={styles.tableWrapper}>
          <div style={styles.tableHeader}>
            <span style={{ ...styles.headerCell, width: "120px" }}>RANK</span>
            <span style={{ ...styles.headerCell, flex: 1, textAlign: "left" }}>
              COMPETITOR
            </span>
            <span style={{ ...styles.headerCell, width: "100px" }}>
              ROUND 1
            </span>
            <span style={{ ...styles.headerCell, width: "100px" }}>
              ROUND 2
            </span>
            <span style={{ ...styles.headerCell, width: "120px" }}>TOTAL</span>
            <span style={{ ...styles.headerCell, width: "140px" }}>STATUS</span>
          </div>

          {leaderboard.length === 0 ? (
            <div style={styles.empty}>
              <p style={{ margin: 0 }}>No scores yet</p>
            </div>
          ) : (
            leaderboard.map((entry, idx) => (
              <div
                key={entry.username}
                style={{
                  ...styles.row,
                  border: getRowBorder(entry.rank),
                  background: getRowBg(entry.rank),
                  animationDelay: `${idx * 0.08}s`,
                }}
              >
                <span
                  style={{
                    ...styles.cell,
                    width: "120px",
                    ...getRankStyle(entry.rank),
                    fontWeight: "bold",
                  }}
                >
                  {getRankLabel(entry.rank)}
                </span>
                <span
                  style={{
                    ...styles.cell,
                    flex: 1,
                    textAlign: "left",
                    color: entry.rank <= 2 ? "#fff" : "#ccc",
                    fontWeight: entry.rank <= 2 ? "bold" : "normal",
                    fontSize: entry.rank <= 2 ? "16px" : "14px",
                  }}
                >
                  {entry.username}
                </span>
                <span
                  style={{
                    ...styles.cell,
                    width: "100px",
                    color: entry.round1 > 0 ? "#00ff99" : "#2a2a2a",
                  }}
                >
                  {entry.round1}
                </span>
                <span
                  style={{
                    ...styles.cell,
                    width: "100px",
                    color: entry.round2 > 0 ? "#00ff99" : "#2a2a2a",
                  }}
                >
                  {entry.round2}
                </span>
                <span
                  style={{
                    ...styles.cell,
                    width: "120px",
                    color: entry.rank <= 2 ? "#ffd700" : "#00ff99",
                    fontWeight: "bold",
                    fontSize: entry.rank <= 2 ? "22px" : "18px",
                    textShadow:
                      entry.rank <= 2 ? "0 0 12px #ffd70040" : "none",
                  }}
                >
                  {entry.total}
                </span>
                <span
                  style={{
                    ...styles.cell,
                    width: "140px",
                  }}
                >
                  {entry.rank === 1 && (
                    <span style={styles.winnerBadge}>🏆 WINNER</span>
                  )}
                  {entry.rank === 2 && (
                    <span style={styles.runnerBadge}>🥈 RUNNER-UP</span>
                  )}
                  {entry.rank > 2 && (
                    <span style={styles.participantBadge}>PARTICIPANT</span>
                  )}
                </span>
              </div>
            ))
          )}
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
    display: "flex",
    flexDirection: "column",
  },
  topBar: {
    height: "56px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 20px",
    borderBottom: "1px solid #1a3a2a",
    flexShrink: 0,
  },
  topLeft: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  backBtn: {
    background: "transparent",
    border: "1px solid #333",
    color: "#888",
    padding: "6px 14px",
    cursor: "pointer",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "10px",
    letterSpacing: "1px",
    transition: "all 0.3s",
  },
  logo: {
    color: "#00ff99",
    fontWeight: "bold",
    letterSpacing: "3px",
    fontSize: "16px",
    textShadow: "0 0 10px #00ff9930",
  },
  pageTitle: {
    color: "#ffd700",
    fontSize: "12px",
    letterSpacing: "4px",
    textShadow: "0 0 10px #ffd70030",
  },
  podium: {
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-end",
    gap: "20px",
    padding: "40px 20px 30px",
    borderBottom: "1px solid #1a1a1a",
  },
  podiumCard: {
    textAlign: "center",
    padding: "24px 32px",
    border: "1px solid #2a2a2a",
    background: "#0a0a0a",
    minWidth: "180px",
  },
  podiumWinner: {
    border: "2px solid #ffd700",
    background: "linear-gradient(135deg, #ffd70008, #0a0a0a)",
    transform: "scale(1.1)",
    boxShadow: "0 0 30px #ffd70015",
  },
  podiumRank1: { fontSize: "48px", marginBottom: "8px" },
  podiumRank2: { fontSize: "36px", marginBottom: "8px" },
  podiumRank3: {
    fontSize: "28px",
    marginBottom: "8px",
    color: "#cd7f32",
    fontWeight: "bold",
  },
  podiumName: {
    color: "#eee",
    fontSize: "16px",
    fontWeight: "bold",
    letterSpacing: "2px",
    marginBottom: "4px",
  },
  podiumScore1: {
    color: "#ffd700",
    fontSize: "28px",
    fontWeight: "bold",
    textShadow: "0 0 10px #ffd70040",
  },
  podiumScore2: {
    color: "#c0c0c0",
    fontSize: "22px",
    fontWeight: "bold",
  },
  podiumScore3: {
    color: "#cd7f32",
    fontSize: "18px",
    fontWeight: "bold",
  },
  podiumLabel1: {
    color: "#ffd700",
    fontSize: "10px",
    letterSpacing: "3px",
    marginTop: "8px",
    fontWeight: "bold",
  },
  podiumLabel2: {
    color: "#c0c0c0",
    fontSize: "9px",
    letterSpacing: "3px",
    marginTop: "8px",
  },
  podiumLabel3: {
    color: "#cd7f32",
    fontSize: "9px",
    letterSpacing: "3px",
    marginTop: "8px",
  },
  content: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    padding: "30px 20px",
    overflow: "auto",
  },
  tableWrapper: {
    width: "100%",
    maxWidth: "950px",
  },
  tableHeader: {
    display: "flex",
    padding: "14px 20px",
    borderBottom: "1px solid #1a3a2a",
    color: "#444",
    fontSize: "9px",
    letterSpacing: "2px",
  },
  headerCell: { textAlign: "center" },
  row: {
    display: "flex",
    padding: "16px 20px",
    marginBottom: "4px",
    alignItems: "center",
    transition: "all 0.4s ease",
    animation: "slideIn 0.5s ease forwards",
    opacity: 0,
    transform: "translateX(-20px)",
  },
  cell: { textAlign: "center", fontSize: "14px" },
  winnerBadge: {
    background: "#ffd70015",
    border: "1px solid #ffd70040",
    color: "#ffd700",
    padding: "4px 12px",
    fontSize: "9px",
    letterSpacing: "2px",
    fontWeight: "bold",
  },
  runnerBadge: {
    background: "#c0c0c015",
    border: "1px solid #c0c0c040",
    color: "#c0c0c0",
    padding: "4px 12px",
    fontSize: "9px",
    letterSpacing: "2px",
    fontWeight: "bold",
  },
  participantBadge: {
    color: "#333",
    fontSize: "9px",
    letterSpacing: "2px",
  },
  empty: {
    textAlign: "center",
    color: "#444",
    padding: "60px 20px",
    fontSize: "14px",
    letterSpacing: "2px",
  },
};
