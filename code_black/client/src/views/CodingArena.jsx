import { useEffect, useState } from "react";
import ArenaHeader from "../components/ArenaHeader";
import ArenaTopBar from "../components/ArenaTopBar";


import CodeEditor from "../components/CodeEditor";
import { submitCode } from "../services/submit";
import { socket } from "../socket/leaderboard";
import { useSearchParams } from "react-router-dom";

export default function CodingArena() {
  const [params] = useSearchParams();

  // ROUND COMES FROM URL: /arena?round=1 or /arena?round=2
  const ROUND = Number(params.get("round")) || 1;

  // ⏱️ TIME SETTINGS
  const TOTAL_TIME = ROUND === 1 ? 90 * 60 : 60 * 60; // Round 1 = 1.5h, Round 2 = 1h
  const SUBMIT_ENABLE_TIME = ROUND === 1 ? 60 * 60 : 0;

  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [points, setPoints] = useState(50);
  const [code, setCode] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [editorLocked, setEditorLocked] = useState(false);
  const [errorType, setErrorType] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (s) => {
    const h = String(Math.floor(s / 3600)).padStart(2, "0");
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const sec = String(s % 60).padStart(2, "0");
    return `${h}:${m}:${sec}`;
  };

  const canSubmit = TOTAL_TIME - timeLeft >= SUBMIT_ENABLE_TIME;

  const handleSubmit = async () => {
    const res = await submitCode(code);

    const finalPoints = Math.max(points - res.penalty, 0);

    setPoints(finalPoints);
    setErrorType(res.errorType);
    setSubmitted(true);
    setEditorLocked(true);

    // 🔴 PUSH SCORE TO LEADERBOARD
    socket.emit("score:update", {
      username: "admin", // later from JWT
      score: finalPoints,
    });
  };
  return (
    <div style={{ height: "100vh", backgroundColor: "black" }}>
      <ArenaTopBar time={formatTime(timeLeft)} score={points} />

      {/* Editor must be pushed down */}
      <div style={{ marginTop: "50px" }}>
        <CodeEditor
          round={ROUND}
          locked={editorLocked}
          onCodeChange={setCode}
        />
      </div>

      {canSubmit && !submitted && (
        <button onClick={handleSubmit} style={styles.submit}>
          SUBMIT
        </button>
      )}
    </div>
  );


  return (
    <div style={{ height: "100vh", background: "#111" }}>
      <ArenaHeader timeLeft={formatTime(timeLeft)} points={points} />

      <CodeEditor round={ROUND} locked={editorLocked} onCodeChange={setCode} />

      {canSubmit && !submitted && (
        <button onClick={handleSubmit} style={styles.submit}>
          SUBMIT
        </button>
      )}

      {submitted && (
        <div style={styles.result}>AI RESULT: {errorType || "No Errors"}</div>
      )}
    </div>
  );
}

const styles = {
  submit: {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    backgroundColor: "#00ff99",
    color: "#000",
    padding: "12px 24px",
    fontWeight: "bold",
    cursor: "pointer",
    border: "none",
  },
  result: {
    position: "fixed",
    bottom: "20px",
    left: "20px",
    color: "#ff5555",
    fontFamily: "monospace",
  },
};
