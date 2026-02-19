import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket, registerUser } from "../socket/leaderboard";
import { getUser } from "../services/auth";
import ProfileDropdown from "../components/ProfileDropdown";

export default function Leaderboard() {
  const navigate = useNavigate();
  const user = getUser();
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    registerUser(user.username, user.role);

    socket.on("leaderboard:update", (data) => {
      setLeaderboard(data);
    });

    socket.on("user:removed", () => {
      localStorage.clear();
      navigate("/");
    });

    socket.on("round:start", (data) => {
      navigate(`/arena?round=${data.round}`);
    });

    return () => {
      socket.off("leaderboard:update");
      socket.off("user:removed");
      socket.off("round:start");
    };
  }, [navigate, user.username, user.role]);

  const getRankStyle = (rank) => {
    if (rank === 1)
      return { color: "#ffd700", textShadow: "0 0 12px #ffd70050" };
    if (rank === 2)
      return { color: "#c0c0c0", textShadow: "0 0 12px #c0c0c050" };
    return { color: "#555" };
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    return `#${rank}`;
  };

  return (
    <div style={styles.container}>
      {/* Top Bar */}
      <div style={styles.topBar}>
        <span style={styles.logo}>CODEBLACK</span>
        <span style={styles.pageTitle}>LIVE LEADERBOARD</span>
        <ProfileDropdown />
      </div>

      {/* Content */}
      <div style={styles.content}>
        <div style={styles.tableWrapper}>
          {/* Table Header */}
          <div style={styles.tableHeader}>
            <span style={{ ...styles.headerCell, width: "80px" }}>RANK</span>
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
          </div>

          {/* Rows */}
          {leaderboard.length === 0 ? (
            <div style={styles.empty}>
              <p style={{ margin: 0 }}>No scores yet</p>
              <p style={{ fontSize: "11px", color: "#333", marginTop: "8px" }}>
                Scores will appear after submissions are evaluated
              </p>
            </div>
          ) : (
            leaderboard.map((entry, idx) => (
              <div
                key={entry.username}
                style={{
                  ...styles.row,
                  animationDelay: `${idx * 0.08}s`,
                  borderLeft:
                    entry.rank <= 3
                      ? `3px solid ${getRankStyle(entry.rank).color}`
                      : "3px solid transparent",
                  background:
                    entry.username === user.username
                      ? "#00ff9908"
                      : "transparent",
                }}
              >
                <span
                  style={{
                    ...styles.cell,
                    width: "80px",
                    ...getRankStyle(entry.rank),
                    fontWeight: "bold",
                    fontSize: "20px",
                  }}
                >
                  {getRankIcon(entry.rank)}
                </span>
                <span
                  style={{
                    ...styles.cell,
                    flex: 1,
                    textAlign: "left",
                    color: "#eee",
                    fontWeight:
                      entry.username === user.username ? "bold" : "normal",
                  }}
                >
                  {entry.username}
                  {entry.username === user.username && (
                    <span style={styles.youBadge}>YOU</span>
                  )}
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
                    color: "#00ff99",
                    fontWeight: "bold",
                    fontSize: "20px",
                    textShadow: "0 0 10px #00ff9920",
                  }}
                >
                  {entry.total}
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
    height: "100vh",
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
  logo: {
    color: "#00ff99",
    fontWeight: "bold",
    letterSpacing: "3px",
    fontSize: "16px",
    textShadow: "0 0 10px #00ff9930",
  },
  pageTitle: {
    color: "#555",
    fontSize: "10px",
    letterSpacing: "4px",
  },
  content: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    padding: "40px 20px",
    overflow: "auto",
  },
  tableWrapper: {
    width: "100%",
    maxWidth: "850px",
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
    borderBottom: "1px solid #0d0d0d",
    alignItems: "center",
    transition: "all 0.4s ease",
    animation: "slideIn 0.5s ease forwards",
    opacity: 0,
    transform: "translateX(-20px)",
  },
  cell: { textAlign: "center", fontSize: "14px" },
  youBadge: {
    marginLeft: "10px",
    fontSize: "8px",
    background: "#00ff9915",
    color: "#00ff99",
    padding: "2px 8px",
    letterSpacing: "2px",
    verticalAlign: "middle",
  },
  empty: {
    textAlign: "center",
    color: "#444",
    padding: "60px 20px",
    fontSize: "14px",
    letterSpacing: "2px",
  },
};
