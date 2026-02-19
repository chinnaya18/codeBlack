import { useState, useEffect } from "react";

export default function SplashScreen({ onFinish }) {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // After 1.2s start fading out
    const fadeTimer = setTimeout(() => setFadeOut(true), 1200);
    // After 1.8s remove splash
    const hideTimer = setTimeout(() => {
      setVisible(false);
      onFinish();
    }, 1800);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [onFinish]);

  if (!visible) return null;

  return (
    <div style={{ ...styles.overlay, opacity: fadeOut ? 0 : 1 }}>
      <style>{blinkKeyframes}</style>
      <img
        src={process.env.PUBLIC_URL + "/logo192.png"}
        alt="CodeBlack Logo"
        style={styles.logo}
      />
      <h1 style={styles.title}>CODEBLACK</h1>
      <p style={styles.subtitle}>COMPETITIVE CODING ARENA</p>
    </div>
  );
}

const blinkKeyframes = `
@keyframes logoBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
@keyframes logoGlow {
  0%, 100% { box-shadow: 0 0 20px #00ff9930; }
  50% { box-shadow: 0 0 60px #00ff9960, 0 0 100px #00ff9920; }
}
@keyframes splashFadeIn {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
}
`;

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#050505",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99999,
    fontFamily: "'JetBrains Mono', monospace",
    transition: "opacity 0.6s ease",
  },
  logo: {
    height: 120,
    width: 120,
    borderRadius: "50%",
    border: "2px solid #00ff9940",
    objectFit: "cover",
    background: "#0a0a0a",
    animation: "logoBlink 0.8s ease-in-out infinite, logoGlow 1.2s ease-in-out infinite, splashFadeIn 0.5s ease",
    marginBottom: 24,
  },
  title: {
    fontSize: "2.8rem",
    color: "#00ff99",
    letterSpacing: "8px",
    margin: 0,
    textShadow: "0 0 30px #00ff9930",
    animation: "logoBlink 0.8s ease-in-out infinite",
  },
  subtitle: {
    color: "#444",
    fontSize: "10px",
    letterSpacing: "6px",
    marginTop: "8px",
  },
};
