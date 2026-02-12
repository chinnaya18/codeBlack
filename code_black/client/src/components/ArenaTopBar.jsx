import ProfileDropdown from "./ProfileDropdown";

export default function ArenaTopBar({ time, score, round }) {
  return (
    <div style={styles.bar}>
      <div style={styles.left}>
        <span style={styles.logo}>CODEBLACK</span>
        {round && <span style={styles.round}>ROUND {round}</span>}
      </div>

      <div style={styles.center}>
        <span style={styles.timerLabel}>TIME REMAINING</span>
        <span style={styles.time}>{time}</span>
      </div>

      <div style={styles.right}>
        {score !== undefined && (
          <div style={styles.scoreBox}>
            <span style={styles.scoreLabel}>SCORE</span>
            <span style={styles.score}>{score}</span>
          </div>
        )}
        <ProfileDropdown />
      </div>
    </div>
  );
}

const styles = {
  bar: {
    height: "56px",
    width: "100%",
    backgroundColor: "#0a0a0a",
    color: "#00ff99",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 20px",
    fontFamily: "'JetBrains Mono', monospace",
    borderBottom: "1px solid #1a3a2a",
    position: "fixed",
    top: 0,
    left: 0,
    zIndex: 1000,
    boxSizing: "border-box",
  },
  left: { display: "flex", alignItems: "center", gap: "16px" },
  logo: {
    fontWeight: "bold",
    letterSpacing: "3px",
    fontSize: "16px",
    textShadow: "0 0 10px #00ff9930",
  },
  round: {
    background: "#00ff9915",
    border: "1px solid #00ff9930",
    padding: "3px 12px",
    fontSize: "10px",
    letterSpacing: "2px",
  },
  center: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  timerLabel: {
    fontSize: "8px",
    letterSpacing: "3px",
    opacity: 0.5,
  },
  time: {
    color: "#ff5555",
    fontWeight: "bold",
    fontSize: "22px",
    letterSpacing: "3px",
    textShadow: "0 0 10px #ff555530",
  },
  right: { display: "flex", alignItems: "center", gap: "16px" },
  scoreBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  scoreLabel: {
    fontSize: "8px",
    letterSpacing: "3px",
    opacity: 0.5,
  },
  score: {
    color: "#00ff99",
    fontWeight: "bold",
    fontSize: "20px",
    textShadow: "0 0 10px #00ff9930",
  },
};
