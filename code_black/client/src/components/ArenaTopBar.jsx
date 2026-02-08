export default function ArenaTopBar({ time, score }) {
  return (
    <div style={styles.bar}>
      <div style={styles.left}>CODEBLACK ARENA</div>

      <div style={styles.center}>
        TIME REMAINING: <span style={styles.time}>{time}</span>
      </div>

      <div style={styles.right}>
        SCORE: <span style={styles.score}>{score}</span>
      </div>
    </div>
  );
}

const styles = {
  bar: {
    height: "50px",
    width: "100%",
    backgroundColor: "#000",
    color: "#00ff99",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 20px",
    fontFamily: "monospace",
    borderBottom: "1px solid #00ff99",
    position: "fixed",
    top: 0,
    left: 0,
    zIndex: 1000,
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
  score: {
    color: "#00ff99",
    fontWeight: "bold",
  },
};
