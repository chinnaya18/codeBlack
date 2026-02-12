import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket, registerUser } from "../socket/leaderboard";
import { getUser } from "../services/auth";
import ProfileDropdown from "../components/ProfileDropdown";

export default function WaitingRoom() {
  const navigate = useNavigate();
  const user = getUser();
  const [users, setUsers] = useState([]);
  const [dots, setDots] = useState("");

  useEffect(() => {
    registerUser(user.username, user.role);

    socket.on("users:update", (userList) => {
      setUsers(userList);
    });

    socket.on("round:start", (data) => {
      navigate(`/arena?round=${data.round}`);
    });

    socket.on("user:removed", () => {
      localStorage.clear();
      navigate("/");
    });

    socket.on("state:sync", (state) => {
      if (state.roundStatus === "active" && state.currentRound > 0) {
        navigate(`/arena?round=${state.currentRound}`);
      }
    });

    // Animated waiting dots
    const dotInterval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 600);

    return () => {
      socket.off("users:update");
      socket.off("round:start");
      socket.off("user:removed");
      socket.off("state:sync");
      clearInterval(dotInterval);
    };
  }, [navigate, user.username, user.role]);

  return (
    <div style={styles.container}>
      {/* Top Bar */}
      <div style={styles.topBar}>
        <span style={styles.logo}>CODEBLACK</span>
        <span style={styles.waitingBadge}>WAITING ROOM</span>
        <ProfileDropdown />
      </div>

      {/* Center Content */}
      <div style={styles.center}>
        <div style={styles.pulseContainer}>
          <div style={styles.pulseRing} />
          <div style={styles.pulseRingOuter} />
        </div>

        <h1 style={styles.title}>WAITING FOR ADMIN TO START{dots}</h1>
        <p style={styles.subtitle}>
          You will be automatically redirected when the round begins
        </p>

        {/* Online Users */}
        <div style={styles.userSection}>
          <h3 style={styles.userTitle}>COMPETITORS ONLINE — {users.length}</h3>
          <div style={styles.userGrid}>
            {users.length === 0 ? (
              <p style={styles.noUsers}>No other competitors online yet</p>
            ) : (
              users.map((u) => (
                <div
                  key={u}
                  style={{
                    ...styles.userCard,
                    borderColor: u === user.username ? "#00ff9940" : "#1a1a1a",
                  }}
                >
                  <span style={styles.userDot} />
                  <span
                    style={{
                      ...styles.userName,
                      color: u === user.username ? "#00ff99" : "#999",
                    }}
                  >
                    {u}
                  </span>
                  {u === user.username && (
                    <span style={styles.youTag}>YOU</span>
                  )}
                </div>
              ))
            )}
          </div>
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
  waitingBadge: {
    color: "#888",
    fontSize: "10px",
    letterSpacing: "4px",
  },
  center: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "16px",
    padding: "20px",
  },
  pulseContainer: {
    position: "relative",
    width: "80px",
    height: "80px",
    marginBottom: "16px",
  },
  pulseRing: {
    position: "absolute",
    inset: "10px",
    border: "2px solid #00ff99",
    borderRadius: "50%",
    animation: "pulse 2s ease-in-out infinite",
  },
  pulseRingOuter: {
    position: "absolute",
    inset: 0,
    border: "1px solid #00ff9940",
    borderRadius: "50%",
    animation: "pulse 2s ease-in-out infinite 0.5s",
  },
  title: {
    color: "#00ff99",
    fontSize: "16px",
    letterSpacing: "4px",
    textAlign: "center",
    margin: 0,
    textShadow: "0 0 20px #00ff9920",
  },
  subtitle: {
    color: "#444",
    fontSize: "11px",
    marginTop: "4px",
  },
  userSection: {
    marginTop: "40px",
    border: "1px solid #1a3a2a",
    padding: "24px 28px",
    minWidth: "340px",
    maxWidth: "450px",
    background: "#0a0a0a",
  },
  userTitle: {
    color: "#555",
    fontSize: "10px",
    letterSpacing: "3px",
    margin: "0 0 16px",
    textAlign: "center",
  },
  userGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  noUsers: {
    color: "#333",
    fontSize: "12px",
    textAlign: "center",
    padding: "12px",
  },
  userCard: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 14px",
    background: "#0d0d0d",
    border: "1px solid #1a1a1a",
    transition: "all 0.3s",
    animation: "slideIn 0.4s ease forwards",
  },
  userDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#00ff99",
    boxShadow: "0 0 8px #00ff99",
    flexShrink: 0,
  },
  userName: {
    color: "#999",
    fontSize: "13px",
    flex: 1,
  },
  youTag: {
    fontSize: "8px",
    color: "#00ff99",
    background: "#00ff9915",
    padding: "2px 6px",
    letterSpacing: "1px",
  },
};
