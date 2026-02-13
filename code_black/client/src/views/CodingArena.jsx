import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ArenaTopBar from "../components/ArenaTopBar";
import CodeEditor from "../components/CodeEditor";
import FullscreenLockdown from "../components/FullscreenLockdown";
import { submitCode } from "../services/submit";
import { socket, registerUser } from "../socket/leaderboard";
import { getUser } from "../services/auth";

export default function CodingArena() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const user = getUser();
  const ROUND = Number(params.get("round")) || 1;

  const [timeLeft, setTimeLeft] = useState("--:--:--");
  const [endTime, setEndTime] = useState(null);
  const [problem, setProblem] = useState(null);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("python");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [editorLocked, setEditorLocked] = useState(false);
  const [roundActive, setRoundActive] = useState(true);

  // Refs for auto-submit on round end
  const codeRef = useRef(code);
  const languageRef = useRef(language);
  const submittedRef = useRef(submitted);
  codeRef.current = code;
  languageRef.current = language;
  submittedRef.current = submitted;

  // Register on socket and listen for events
  useEffect(() => {
    registerUser(user.username, user.role);

    socket.on("round:start", (data) => {
      if (data.round !== ROUND) {
        navigate(`/arena?round=${data.round}`);
      }
      setEndTime(data.endTime);
      setRoundActive(true);
      setEditorLocked(false);
      setSubmitted(false);
      setResult(null);
      // Problem will arrive via 'problem:assigned' event
    });

    // Receive individually assigned problem
    socket.on("problem:assigned", (data) => {
      if (data.problem) {
        setProblem(data.problem);
      }
    });

    socket.on("round:end", () => {
      setRoundActive(false);
      setEditorLocked(true);
      // Auto-submit if not already submitted
      if (!submittedRef.current && codeRef.current.trim()) {
        autoSubmit();
      }
    });

    socket.on("user:removed", () => {
      localStorage.clear();
      navigate("/");
    });

    socket.on("state:sync", (state) => {
      if (state.roundStatus === "active" && state.currentRound > 0) {
        setEndTime(state.roundEndTime);
        setRoundActive(true);
        if (state.problem) {
          setProblem(state.problem);
        }
      } else if (state.roundStatus === "ended") {
        setRoundActive(false);
        setEditorLocked(true);
      } else if (state.currentRound === 0 && state.roundStatus === "waiting") {
        navigate("/waiting");
      }
    });

    socket.on("event:reset", () => {
      navigate("/waiting");
    });

    return () => {
      socket.off("round:start");
      socket.off("problem:assigned");
      socket.off("round:end");
      socket.off("user:removed");
      socket.off("state:sync");
      socket.off("event:reset");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, ROUND, user.username, user.role]);

  // Timer
  useEffect(() => {
    if (!endTime) return;

    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((endTime - now) / 1000));

      if (diff <= 0) {
        setTimeLeft("00:00:00");
        setRoundActive(false);
        setEditorLocked(true);
        return;
      }

      const h = String(Math.floor(diff / 3600)).padStart(2, "0");
      const m = String(Math.floor((diff % 3600) / 60)).padStart(2, "0");
      const s = String(diff % 60).padStart(2, "0");
      setTimeLeft(`${h}:${m}:${s}`);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  // Auto-submit helper
  const autoSubmit = async () => {
    try {
      const res = await submitCode(codeRef.current, languageRef.current, ROUND);
      setResult(res);
      setSubmitted(true);
    } catch {
      // Silent fail on auto-submit
    }
  };

  // Manual submit
  const handleSubmit = useCallback(async () => {
    if (submitted || submitting) return;
    setSubmitting(true);

    try {
      const res = await submitCode(code, language, ROUND);
      setResult(res);
      setSubmitted(true);
      setEditorLocked(true);
    } catch (err) {
      setResult({ errorType: "Error", feedback: [err.message], score: 0 });
    } finally {
      setSubmitting(false);
    }
  }, [code, language, ROUND, submitted, submitting]);

  return (
    <FullscreenLockdown roundActive={roundActive}>
    <div style={styles.container}>
      <ArenaTopBar time={timeLeft} score={result?.score} round={ROUND} />

      <div style={styles.content}>
        {/* ─── Problem Panel ─── */}
        <div style={styles.problemPanel}>
          <div style={styles.problemHeader}>
            <h2 style={styles.problemTitle}>
              {problem?.title || `Round ${ROUND} Problem`}
            </h2>
            <span style={styles.pointsBadge}>{problem?.points || 100} pts</span>
          </div>
          <div style={styles.problemBody}>
            <pre style={styles.problemText}>
              {problem?.description || "Waiting for problem to load..."}
            </pre>
          </div>
        </div>

        {/* ─── Editor Panel ─── */}
        <div style={styles.editorPanel}>
          {/* Toolbar */}
          <div style={styles.editorToolbar}>
            <div style={styles.toolbarLeft}>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                style={styles.langSelect}
                disabled={editorLocked}
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
              </select>
              <span style={styles.modeLabel}>
                {ROUND === 1 ? "BLUR MODE" : "BLACKOUT MODE"}
              </span>
            </div>

            <div style={styles.toolbarRight}>
              {!submitted && roundActive && (
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !code.trim()}
                  style={{
                    ...styles.submitBtn,
                    opacity: submitting || !code.trim() ? 0.5 : 1,
                  }}
                >
                  {submitting ? "⏳ EVALUATING..." : "▶ SUBMIT CODE"}
                </button>
              )}
            </div>
          </div>

          {/* Code Editor */}
          <div style={styles.editorWrapper}>
            <CodeEditor
              language={language}
              locked={editorLocked}
              onCodeChange={setCode}
              code={code}
              round={ROUND}
            />
          </div>

          {/* ─── Result Panel ─── */}
          {result && (
            <div
              style={{
                ...styles.resultPanel,
                borderColor:
                  result.errorType === "Accepted" ? "#00ff99" : "#ff4444",
              }}
            >
              <div style={styles.resultHeader}>
                <span
                  style={{
                    ...styles.resultBadge,
                    background:
                      result.errorType === "Accepted"
                        ? "#00ff9915"
                        : "#ff444415",
                    color:
                      result.errorType === "Accepted" ? "#00ff99" : "#ff4444",
                    borderColor:
                      result.errorType === "Accepted"
                        ? "#00ff9940"
                        : "#ff444440",
                  }}
                >
                  {result.errorType}
                </span>
                <span style={styles.resultScore}>
                  Score: {result.score}/{problem?.points || 100}
                </span>
              </div>

              {result.passedCases !== undefined && (
                <div style={styles.testProgress}>
                  <div style={styles.testBar}>
                    <div
                      style={{
                        ...styles.testFill,
                        width: `${result.totalCases > 0 ? (result.passedCases / result.totalCases) * 100 : 0}%`,
                        background:
                          result.passedCases === result.totalCases
                            ? "#00ff99"
                            : "#ff9900",
                      }}
                    />
                  </div>
                  <span style={styles.testText}>
                    {result.passedCases}/{result.totalCases} test cases passed
                  </span>
                </div>
              )}

              {result.feedback &&
                result.feedback.map((f, i) => (
                  <p key={i} style={styles.feedbackText}>
                    {f}
                  </p>
                ))}

              <button
                onClick={() => navigate("/leaderboard")}
                style={styles.leaderboardBtn}
              >
                VIEW LEADERBOARD →
              </button>
            </div>
          )}

          {/* Round Ended Overlay */}
          {!roundActive && !result && (
            <div style={styles.roundEndOverlay}>
              <h2 style={{ color: "#ff4444", margin: 0, letterSpacing: "3px" }}>
                ROUND ENDED
              </h2>
              <p style={{ color: "#555", marginTop: "8px", fontSize: "12px" }}>
                Submissions are closed
              </p>
              <button
                onClick={() => navigate("/leaderboard")}
                style={styles.leaderboardBtn}
              >
                VIEW LEADERBOARD →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
    </FullscreenLockdown>
  );
}

const styles = {
  container: {
    height: "100vh",
    backgroundColor: "#0a0a0a",
    fontFamily: "'JetBrains Mono', monospace",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  content: {
    display: "flex",
    flex: 1,
    marginTop: "56px",
    overflow: "hidden",
  },
  // ─── Problem Panel ───
  problemPanel: {
    width: "35%",
    minWidth: "300px",
    borderRight: "1px solid #1a3a2a",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#080808",
  },
  problemHeader: {
    padding: "16px 20px",
    borderBottom: "1px solid #1a3a2a",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexShrink: 0,
  },
  problemTitle: {
    color: "#00ff99",
    fontSize: "15px",
    margin: 0,
    letterSpacing: "1px",
  },
  pointsBadge: {
    background: "#00ff9910",
    border: "1px solid #00ff9925",
    color: "#00ff99",
    padding: "4px 12px",
    fontSize: "11px",
    letterSpacing: "1px",
  },
  problemBody: {
    padding: "20px",
    overflow: "auto",
    flex: 1,
  },
  problemText: {
    color: "#bbb",
    fontSize: "13px",
    lineHeight: "1.9",
    whiteSpace: "pre-wrap",
    margin: 0,
    fontFamily: "'JetBrains Mono', monospace",
  },
  // ─── Editor Panel ───
  editorPanel: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  editorToolbar: {
    height: "44px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 16px",
    borderBottom: "1px solid #1a1a1a",
    backgroundColor: "#0d0d0d",
    flexShrink: 0,
  },
  toolbarLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  langSelect: {
    background: "#080808",
    border: "1px solid #2a2a2a",
    color: "#00ff99",
    padding: "6px 12px",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "11px",
    cursor: "pointer",
    outline: "none",
  },
  modeLabel: {
    color: "#444",
    fontSize: "9px",
    letterSpacing: "2px",
    border: "1px solid #1a1a1a",
    padding: "3px 8px",
  },
  toolbarRight: { display: "flex", gap: "8px" },
  submitBtn: {
    background: "linear-gradient(135deg, #00ff99, #00cc77)",
    color: "#000",
    border: "none",
    padding: "8px 20px",
    fontWeight: "bold",
    cursor: "pointer",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "11px",
    letterSpacing: "1px",
    transition: "all 0.3s",
  },
  editorWrapper: {
    flex: 1,
    overflow: "hidden",
  },
  // ─── Result Panel ───
  resultPanel: {
    padding: "16px 20px",
    borderTop: "1px solid",
    background: "#080808",
    animation: "slideUp 0.4s ease",
    flexShrink: 0,
  },
  resultHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },
  resultBadge: {
    padding: "5px 14px",
    border: "1px solid",
    fontSize: "12px",
    fontWeight: "bold",
    letterSpacing: "2px",
  },
  resultScore: {
    color: "#00ff99",
    fontSize: "18px",
    fontWeight: "bold",
  },
  testProgress: {
    marginBottom: "12px",
  },
  testBar: {
    height: "4px",
    background: "#1a1a1a",
    borderRadius: "2px",
    overflow: "hidden",
    marginBottom: "6px",
  },
  testFill: {
    height: "100%",
    transition: "width 0.8s ease",
    borderRadius: "2px",
  },
  testText: {
    color: "#777",
    fontSize: "11px",
  },
  feedbackText: {
    color: "#999",
    fontSize: "12px",
    margin: "4px 0",
    lineHeight: "1.6",
  },
  roundEndOverlay: {
    padding: "32px",
    textAlign: "center",
    borderTop: "1px solid #ff444430",
    background: "#080808",
    flexShrink: 0,
  },
  leaderboardBtn: {
    marginTop: "16px",
    background: "transparent",
    border: "1px solid #00ff9940",
    color: "#00ff99",
    padding: "10px 24px",
    cursor: "pointer",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "11px",
    letterSpacing: "2px",
    transition: "all 0.3s",
  },
};
