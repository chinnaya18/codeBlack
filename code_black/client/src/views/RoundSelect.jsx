import { useNavigate } from "react-router-dom";

export default function RoundSelect() {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>SELECT ROUND</h1>

      <button style={styles.button} onClick={() => navigate("/arena?round=1")}>
        ROUND 1 (Blur Mode)
      </button>

      <button style={styles.button} onClick={() => navigate("/arena?round=2")}>
        ROUND 2 (Blackout Mode)
      </button>
    </div>
  );
}

const styles = {
  container: {
    height: "100vh",
    background: "#000",
    color: "#00ff99",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "monospace",
  },
  title: {
    marginBottom: "30px",
    letterSpacing: "3px",
  },
  button: {
    background: "#00ff99",
    color: "#000",
    border: "none",
    padding: "15px 30px",
    margin: "10px",
    fontSize: "16px",
    cursor: "pointer",
    width: "250px",
  },
};
