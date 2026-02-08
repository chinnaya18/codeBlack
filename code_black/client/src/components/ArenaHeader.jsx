export default function ArenaHeader({ timeLeft, points }) {
  return (
    <div style={styles.header}>
      <div style={styles.left}>CODEBLACK ARENA</div>

      <div style={styles.center}>
        TIME REMAINING: <span style={styles.time}>{timeLeft}</span>
      </div>

      <div style={styles.right}>
        POINTS: <span style={styles.points}>{points}</span>
      </div>
    </div>
  );
}

const styles = {
  header: {
    height: "50px",
    backgroundColor: "#000",
    color: "#00ff99",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 20px",
    fontFamily: "monospace",
    borderBottom: "1px solid #00ff99",
  },
  left: {
    fontWeight: "bold",
    letterSpacing: "2px",
  },
  center: {
    fontSize: "14px",
  },
  right: {
    fontSize: "14px",
  },
  time: {
    color: "#ff5555",
    fontWeight: "bold",
  },
  points: {
    color: "#00ff99",
    fontWeight: "bold",
  },
};
