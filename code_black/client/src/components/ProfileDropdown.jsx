import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getUser, logout } from "../services/auth";

export default function ProfileDropdown() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const user = getUser();
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div style={styles.container} ref={dropdownRef}>
      <button style={styles.trigger} onClick={() => setOpen(!open)}>
        <span style={styles.avatar}>
          {user.username?.[0]?.toUpperCase() || "?"}
        </span>
        <span style={styles.username}>{user.username}</span>
        <span style={styles.arrow}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={styles.dropdown}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={styles.bigAvatar}>
                {user.username?.[0]?.toUpperCase()}
              </div>
              <div>
                <div style={styles.cardName}>{user.username}</div>
                <div style={styles.cardRole}>
                  {user.role === "admin" ? "⚡ Admin" : "🎮 Competitor"}
                </div>
              </div>
            </div>
            <div style={styles.divider} />
            <button style={styles.logoutBtn} onClick={handleLogout}>
              ⏻ LOGOUT
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { position: "relative" },
  trigger: {
    background: "transparent",
    border: "1px solid #00ff9940",
    color: "#00ff99",
    padding: "6px 14px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "12px",
    transition: "all 0.3s",
  },
  avatar: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #00ff99, #00cc77)",
    color: "#000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
    fontSize: "13px",
  },
  username: { color: "#00ff99" },
  arrow: { fontSize: "8px", color: "#555" },
  dropdown: {
    position: "absolute",
    top: "100%",
    right: 0,
    marginTop: "8px",
    zIndex: 2000,
    animation: "fadeIn 0.2s ease",
  },
  card: {
    background: "#111",
    border: "1px solid #1a3a2a",
    padding: "20px",
    minWidth: "220px",
    fontFamily: "'JetBrains Mono', monospace",
    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  bigAvatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #00ff99, #00cc77)",
    color: "#000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
    fontSize: "18px",
  },
  cardName: {
    color: "#00ff99",
    fontWeight: "bold",
    fontSize: "16px",
  },
  cardRole: {
    color: "#888",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "2px",
    marginTop: "2px",
  },
  divider: {
    height: "1px",
    background: "linear-gradient(90deg, transparent, #1a3a2a, transparent)",
    margin: "16px 0",
  },
  logoutBtn: {
    background: "transparent",
    border: "1px solid #ff444440",
    color: "#ff4444",
    padding: "8px 16px",
    cursor: "pointer",
    width: "100%",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "12px",
    letterSpacing: "2px",
    transition: "all 0.3s",
  },
};
