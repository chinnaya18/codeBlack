import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../services/auth";

export default function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await loginUser(username, password);

      // Store JWT securely (basic version)
      localStorage.setItem("token", data.token);

      // Redirect to Coding Arena
      navigate("/rounds");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>CODEBLACK</h1>
      <p style={styles.subtitle}>Secure Login</p>

      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          style={styles.input}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={styles.input}
        />

        {error && <div style={styles.error}>{error}</div>}

        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? "Authenticating..." : "LOGIN"}
        </button>
      </form>
    </div>
  );
}

/* ───────────── STYLES ───────────── */

const styles = {
  container: {
    height: "100vh",
    backgroundColor: "#050505",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "#00ff99",
    fontFamily: "monospace",
  },
  title: {
    fontSize: "3rem",
    letterSpacing: "0.3rem",
  },
  subtitle: {
    marginBottom: "2rem",
    opacity: 0.7,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    width: "300px",
    gap: "1rem",
  },
  input: {
    backgroundColor: "black",
    border: "1px solid #00ff99",
    padding: "0.75rem",
    color: "#00ff99",
    fontSize: "1rem",
  },
  button: {
    backgroundColor: "#00ff99",
    color: "black",
    border: "none",
    padding: "0.75rem",
    fontWeight: "bold",
    cursor: "pointer",
  },
  error: {
    color: "red",
    fontSize: "0.9rem",
  },
};
