import { useEffect, useState } from "react";

export default function LogoTopLeft() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const logoSize = isMobile ? 36 : 48;
  const padding = isMobile ? 8 : 12;

  return (
    <div style={{ ...styles.wrapper, top: padding, left: padding }}>
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
    border: "1px solid #00ff9930",
    boxShadow: "0 0 16px #00ff9915",
    objectFit: "cover",
    background: "#0a0a0a",
    transition: "all 0.3s ease",
  },
};
