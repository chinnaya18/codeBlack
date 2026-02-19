import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser, registerUser as registerUserAPI, isLoggedIn, getUser } from "../services/auth";

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Auto-redirect if already logged in
  useEffect(() => {
    if (isLoggedIn()) {
      const user = getUser();
      navigate(user.role === "admin" ? "/admin" : "/waiting");
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (isRegister) {
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      if (password.length < 4) {
        setError("Password must be at least 4 characters");
        return;
      }
      if (username.trim().length < 2) {
        setError("Username must be at least 2 characters");
        return;
      }
    }

    setLoading(true);

    try {
      let data;
      if (isRegister) {
        data = await registerUserAPI(username.trim(), password);
        setSuccess(`Registration successful! Now login with your credentials.`);
        setUsername("");
        setPassword("");
        setConfirmPassword("");
        // Stay on register tab but show success - user will manually switch to login
      } else {
        data = await loginUser(username.trim(), password);
        if (data.role === "admin") {
          navigate("/admin");
        } else {
          navigate("/waiting");
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.particles} />

      <div style={styles.glowBox}>
        <img
          src={process.env.PUBLIC_URL + "/logo192.png"}
          alt="CodeBlack Logo"
          style={styles.logoImg}
        />
        <h1 style={styles.title}>CODEBLACK</h1>
        <p style={styles.subtitle}>COMPETITIVE CODING ARENA</p>
        <div style={styles.line} />

        {/* Toggle Tabs */}
        <div style={styles.tabRow}>
          <button
            onClick={() => { setIsRegister(false); setError(""); setSuccess(""); }}
            style={{
              ...styles.tab,
              ...(isRegister ? {} : styles.tabActive),
            }}
          >
            LOGIN
          </button>
          <button
            onClick={() => { setIsRegister(true); setError(""); setSuccess(""); }}
            style={{
              ...styles.tab,
              ...(isRegister ? styles.tabActive : {}),
            }}
          >
            REGISTER
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>USERNAME</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={styles.input}
              autoComplete="off"
              placeholder="Enter username"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>PASSWORD</label>
            <div style={styles.passwordWrapper}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={styles.input}
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                {showPassword ? "👁" : "👁‍🗨"}
              </button>
            </div>
          </div>

          {isRegister && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>CONFIRM PASSWORD</label>
              <div style={styles.passwordWrapper}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  style={styles.input}
                  placeholder="Confirm password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeBtn}
                >
                  {showConfirmPassword ? "👁" : "👁‍🗨"}
                </button>
              </div>
            </div>
          )}

          {error && <div style={styles.error}>{error}</div>}
          {success && <div style={styles.success}>{success}</div>}

          <button type="submit" style={styles.button} disabled={loading}>
            {loading
              ? (isRegister ? "REGISTERING..." : "AUTHENTICATING...")
              : (isRegister ? "CREATE ACCOUNT" : "ENTER ARENA")}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    height: "100vh",
    backgroundColor: "#050505",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'JetBrains Mono', monospace",
    overflow: "hidden",
    position: "relative",
  },
  particles: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(circle at 20% 80%, #00ff9908 0%, transparent 50%), radial-gradient(circle at 80% 20%, #00ff9905 0%, transparent 50%)",
    pointerEvents: "none",
  },
  glowBox: {
    border: "1px solid #00ff9925",
    padding: "48px",
    background: "linear-gradient(135deg, #0a0a0a 0%, #0d0d0d 100%)",
    boxShadow: "0 0 60px #00ff9908, inset 0 0 60px #00ff9903",
    position: "relative",
    zIndex: 1,
    minWidth: "380px",
    animation: "fadeIn 0.8s ease",
  },
  logoImg: {
    display: "block",
    margin: "0 auto 16px",
    height: 72,
    width: 72,
    borderRadius: "50%",
    border: "2px solid #00ff9930",
    objectFit: "cover",
    background: "#0a0a0a",
  },
  title: {
    fontSize: "2.8rem",
    color: "#00ff99",
    letterSpacing: "8px",
    margin: 0,
    textShadow: "0 0 30px #00ff9930",
    textAlign: "center",
  },
  subtitle: {
    color: "#444",
    fontSize: "10px",
    letterSpacing: "6px",
    textAlign: "center",
    marginTop: "8px",
  },
  line: {
    height: "1px",
    background: "linear-gradient(90deg, transparent, #00ff9930, transparent)",
    margin: "28px 0",
  },
  tabRow: {
    display: "flex",
    marginBottom: "20px",
    gap: "0",
    border: "1px solid #1a3a2a",
  },
  tab: {
    flex: 1,
    padding: "10px",
    background: "transparent",
    border: "none",
    color: "#555",
    fontSize: "11px",
    letterSpacing: "3px",
    cursor: "pointer",
    fontFamily: "'JetBrains Mono', monospace",
    transition: "all 0.3s",
  },
  tabActive: {
    background: "#00ff9915",
    color: "#00ff99",
    borderBottom: "2px solid #00ff99",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    color: "#555",
    fontSize: "9px",
    letterSpacing: "3px",
  },
  input: {
    backgroundColor: "#080808",
    border: "1px solid #1a3a2a",
    padding: "14px 40px 14px 16px",
    color: "#00ff99",
    fontSize: "14px",
    fontFamily: "'JetBrains Mono', monospace",
    outline: "none",
    transition: "all 0.3s",
    width: "100%",
    boxSizing: "border-box",
  },
  button: {
    backgroundColor: "#00ff99",
    color: "#000",
    border: "none",
    padding: "14px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "14px",
    fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: "3px",
    marginTop: "8px",
    transition: "all 0.3s",
  },
  error: {
    color: "#ff4444",
    fontSize: "12px",
    textAlign: "center",
    padding: "10px",
    border: "1px solid #ff444425",
    background: "#ff444408",
  },
  hint: {
    color: "#333",
    fontSize: "9px",
    textAlign: "center",
    marginTop: "24px",
    letterSpacing: "0.5px",
  },
  passwordWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  eyeBtn: {
    position: "absolute",
    right: "12px",
    background: "none",
    border: "none",
    color: "#00ff99",
    cursor: "pointer",
    fontSize: "16px",
    padding: "0",
    transition: "all 0.3s",
  },
  success: {
    color: "#00ff99",
    fontSize: "12px",
    textAlign: "center",
    padding: "10px",
    border: "1px solid #00ff9925",
    background: "#00ff9908",
    marginBottom: "12px",
  },
};
