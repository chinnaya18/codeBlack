import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export default function LogoTopLeft() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const logoSize = isMobile ? 36 : 48;
  const topPadding = isMobile ? 16 : 20;
  const leftPadding = isMobile ? 16 : 20;

  const hideLogoRoutes = ["/arena", "/leaderboard", "/admin", "/admin/leaderboard"];
  if (hideLogoRoutes.includes(location.pathname)) return null;

  return (
    <div style={{ ...styles.wrapper, top: topPadding, left: leftPadding }}>
      <img
        src={process.env.PUBLIC_URL + "/logo192.png"}
        alt="CodeBlack Logo"
        style={{ ...styles.logo, height: logoSize, width: logoSize }}
      />
    </div>
  );
}

const styles = {
  wrapper: {
    position: "fixed",
    zIndex: 9999,
    pointerEvents: "none",
    transition: "all 0.3s ease",
  },
  logo: {
    borderRadius: "50%",
    border: "2px solid #00ff9940",
    boxShadow: "0 0 20px #00ff9920",
    objectFit: "cover",
    background: "#0a0a0a",
    transition: "all 0.3s ease",
  },
};
