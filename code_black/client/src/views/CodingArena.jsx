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
  const [isFocusMode, setIsFocusMode] = useState(false);

  // Keyboard shortcut for Zen Mode
  useEffect(() => {
    const handleKeydown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setIsFocusMode(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

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
      if (res.hasNext) {
        setCode("");
        return;
      }
      if (res.pending) {
        setResult({
          errorType: "Pending",
          score: "?",
          feedback: ["Code saved. Awaiting AI evaluation at the end of the round."],
        });
      } else {
        setResult(res);
      }
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

      if (res.hasNext) {
        setCode("");
        return; // Don't lock them out!
      }

      if (res.pending) {
        setResult({
          errorType: "Pending",
          score: "?",
          feedback: ["Code saved. Awaiting AI evaluation at the end of the round."],
        });
      } else {
        setResult(res);
      }
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
          {!isFocusMode && (
            <div style={styles.problemPanel}>
              <div style={styles.problemHeader}>
                <h2 style={styles.problemTitle}>
                  <span style={styles.glitchText}>{problem?.title || `Round ${ROUND} Problem`}</span>
                </h2>
                <span style={styles.pointsBadge}>{problem?.points || 100} pts</span>
              </div>
              <div style={styles.problemBody}>
                <div style={styles.scanline}></div>
                <pre style={styles.problemText}>
                  {problem?.description || "Waiting for problem to load..."}
                </pre>
              </div>
              <div style={styles.problemFooter}>
                <button
                  onClick={() => setIsFocusMode(true)}
                  style={styles.focusBtn}
                  title="Shortcut: Ctrl+F"
                >
                  ZEN MODE [ENTER]
                </button>
              </div>
            </div>
          )}

          {/* ─── Editor Panel ─── */}
          <div style={{ ...styles.editorPanel, position: 'relative' }}>
            {isFocusMode && (
              <button
                onClick={() => setIsFocusMode(false)}
                style={styles.exitFocusBtn}
              >
                EXIT ZEN MODE
              </button>
            )}

            {/* Toolbar */}
            <div style={styles.editorToolbar}>
              <div style={styles.toolbarLeft}>
                <div style={styles.langSelectWrapper}>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    style={{ ...styles.langSelect, opacity: editorLocked ? 0.5 : 1 }}
                    disabled={editorLocked}
                  >
                    <option value="python">Python (-5 pts)</option>
                    <option value="javascript">JavaScript (-5 pts)</option>
                    <option value="java">Java (-3 pts)</option>
                    <option value="c">C (no penalty)</option>
                  </select>
                  <span style={styles.langSelectArrow}>▼</span>
                </div>
                <div style={styles.modeIndicator}>
                  <div style={styles.pulseDot}></div>
                  <span style={styles.modeLabel}>
                    {ROUND === 1 ? "BLUR PHASE" : "BLACKOUT PHASE"}
                  </span>
                </div>
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
                    {result.errorType.toUpperCase()}
                  </span>
                  <span style={styles.resultScore}>
                    {result.score} <span style={{ fontSize: '12px', opacity: 0.5 }}>/ {problem?.points || 100} PTS</span>
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
                          boxShadow: `0 0 10px ${result.passedCases === result.totalCases ? "#00ff9950" : "#ff990050"}`,
                        }}
                      />
                    </div>
                    <span style={styles.testText}>
                      {result.passedCases} OF {result.totalCases} TEST CASES PASSED
                    </span>
                  </div>
                )}

                {result.feedback && (
                  <div style={styles.feedbackContainer}>
                    {result.feedback.map((f, i) => (
                      <p key={i} style={styles.feedbackText}>
                        {f}
                      </p>
                    ))}
                  </div>
                )}

                {/* Error Breakdown */}
                {result.errorBreakdown && (
                  (result.errorBreakdown.syntaxErrors || 0) > 0 ||
                  (result.errorBreakdown.runtimeErrors || 0) > 0 ||
                  (result.errorBreakdown.logicalErrors || 0) > 0
                ) && (
                    <div style={styles.breakdownBox}>
                      <div style={styles.breakdownHeader}>ERROR BREAKDOWN</div>
                      <div style={styles.breakdownGrid}>
                        {result.errorBreakdown.syntaxErrors > 0 && (
                          <div style={styles.breakdownItem}>
                            <span style={styles.breakdownLabel}>SYNTAX</span>
                            <span style={styles.breakdownValue}>-{result.errorBreakdown.syntaxErrors * (result.errorBreakdown.syntaxPenaltyPerError || 0)}</span>
                          </div>
                        )}
                        {result.errorBreakdown.runtimeErrors > 0 && (
                          <div style={styles.breakdownItem}>
                            <span style={styles.breakdownLabel}>RUNTIME</span>
                            <span style={styles.breakdownValue}>-{result.errorBreakdown.runtimeErrors * (result.errorBreakdown.runtimePenaltyPerError || 0)}</span>
                          </div>
                        )}
                        {result.errorBreakdown.logicalErrors > 0 && (
                          <div style={styles.breakdownItem}>
                            <span style={styles.breakdownLabel}>LOGICAL</span>
                            <span style={styles.breakdownValue}>-{result.errorBreakdown.logicalErrors * (result.errorBreakdown.logicalPenaltyPerError || 0)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                <button
                  onClick={() => navigate("/leaderboard")}
                  style={styles.leaderboardBtn}
                >
                  FINISH & VIEW LEADERBOARD →
                </button>
              </div>
            )}

            {/* Round Ended Overlay */}
            {!roundActive && !result && (
              <div style={styles.roundEndOverlay}>
                <div style={styles.roundEndIcon}>⌛</div>
                <h2 style={{ color: "#ff4444", margin: "0 0 12px 0", letterSpacing: "5px", fontWeight: '900' }}>
                  ROUND EXPIRED
                </h2>
                <p style={{ color: "#666", marginTop: "8px", fontSize: "11px", letterSpacing: '1px' }}>
                  SYNCHRONIZING FINAL SUBMISSIONS...
                </p>
                <button
                  onClick={() => navigate("/leaderboard")}
                  style={styles.leaderboardBtn}
                >
                  GO TO RANKINGS →
                </button>
              </div>
            )}
          </div>
        </div>

        <style>{`
        @keyframes scan {
          0% { top: -100px; }
          100% { top: 100%; }
        }
        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.5; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.5; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      </div>
    </FullscreenLockdown>
  );
}

const styles = {
  container: {
    height: "100vh",
    backgroundColor: "#050505",
    fontFamily: "'JetBrains Mono', monospace",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    color: "#fff",
  },
  content: {
    display: "flex",
    flex: 1,
    marginTop: "56px",
    overflow: "hidden",
    position: 'relative',
  },
  // ─── Problem Panel ───
  problemPanel: {
    width: "35%",
    minWidth: "350px",
    borderRight: "1px solid #111",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#070707",
    zIndex: 5,
  },
  problemHeader: {
    padding: "20px 24px",
    borderBottom: "1px solid #111",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  problemTitle: {
    color: "#00ff99",
    fontSize: "14px",
    margin: 0,
    letterSpacing: "2px",
    textTransform: 'uppercase',
  },
  glitchText: {
    textShadow: "0 0 5px rgba(0,255,153,0.3)",
  },
  pointsBadge: {
    background: "rgba(0,255,153,0.05)",
    border: "1px solid rgba(0,255,153,0.2)",
    color: "#00ff99",
    padding: "4px 10px",
    fontSize: "10px",
    letterSpacing: "1px",
    borderRadius: '2px',
  },
  problemBody: {
    padding: "24px",
    overflow: "auto",
    flex: 1,
    position: 'relative',
  },
  scanline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: '100px',
    background: 'linear-gradient(to bottom, transparent, rgba(0,255,153,0.05), transparent)',
    animation: 'scan 4s linear infinite',
    pointerEvents: 'none',
  },
  problemText: {
    color: "#888",
    fontSize: "13px",
    lineHeight: "1.8",
    whiteSpace: "pre-wrap",
    margin: 0,
    fontFamily: "'JetBrains Mono', monospace",
  },
  problemFooter: {
    padding: "16px 24px",
    borderTop: "1px solid #111",
  },
  focusBtn: {
    width: '100%',
    background: 'transparent',
    border: '1px solid #222',
    color: '#444',
    padding: '8px',
    fontSize: '9px',
    letterSpacing: '2px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  // ─── Editor Panel ───
  editorPanel: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#000",
  },
  exitFocusBtn: {
    position: 'absolute',
    top: '60px',
    left: '20px',
    zIndex: 100,
    background: 'rgba(0,0,0,0.8)',
    border: '1px solid #333',
    color: '#555',
    padding: '6px 12px',
    fontSize: '10px',
    letterSpacing: '2px',
    cursor: 'pointer',
  },
  editorToolbar: {
    height: "48px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 20px",
    borderBottom: "1px solid #111",
    backgroundColor: "#080808",
  },
  toolbarLeft: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
  },
  langSelectWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  langSelect: {
    background: "#050505",
    border: "1px solid #00ff9940",
    color: "#00ff99",
    padding: "6px 28px 6px 12px",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "11px",
    cursor: "pointer",
    outline: "none",
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
    borderRadius: "2px",
    boxShadow: "0 0 10px #00ff9915",
    transition: "all 0.3s",
  },
  langSelectArrow: {
    position: "absolute",
    right: "8px",
    color: "#00ff99",
    fontSize: "8px",
    pointerEvents: "none",
  },
  modeIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  pulseDot: {
    width: '6px',
    height: '6px',
    background: '#00ff99',
    borderRadius: '50%',
    animation: 'pulse 2s infinite',
    boxShadow: '0 0 8px #00ff99',
  },
  modeLabel: {
    color: "#555",
    fontSize: "10px",
    letterSpacing: "2px",
    textTransform: 'uppercase',
  },
  toolbarRight: { display: "flex", gap: "8px" },
  submitBtn: {
    background: "linear-gradient(135deg, #00ff99, #00cc77)",
    color: "#000",
    border: "none",
    padding: "8px 24px",
    fontWeight: "900",
    cursor: "pointer",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "10px",
    letterSpacing: "1px",
    transition: "all 0.3s",
    boxShadow: '0 4px 15px rgba(0,255,153,0.2)',
  },
  editorWrapper: {
    flex: 1,
    overflow: "hidden",
  },
  // ─── Result Panel ───
  resultPanel: {
    padding: "24px 32px",
    borderTop: "2px solid #00ff99",
    background: "#050505",
    animation: "slideUp 0.6s cubic-bezier(0.23, 1, 0.32, 1)",
    maxHeight: '400px',
    overflowY: 'auto',
  },
  resultHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  resultBadge: {
    padding: "6px 16px",
    border: "1px solid #555",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "3px",
  },
  resultScore: {
    color: "#00ff99",
    fontSize: "24px",
    fontWeight: "900",
  },
  testProgress: {
    marginBottom: "20px",
  },
  testBar: {
    height: "2px",
    background: "#111",
    borderRadius: "1px",
    overflow: "hidden",
    marginBottom: "8px",
  },
  testFill: {
    height: "100%",
    transition: "width 1s cubic-bezier(0.65, 0, 0.35, 1)",
  },
  testText: {
    color: "#444",
    fontSize: "9px",
    letterSpacing: '1px',
    fontWeight: '700',
  },
  feedbackContainer: {
    background: 'rgba(255,255,255,0.02)',
    padding: '16px',
    borderRadius: '4px',
    marginBottom: '20px',
    border: '1px solid #111',
  },
  feedbackText: {
    color: "#888",
    fontSize: "12px",
    margin: "4px 0",
    lineHeight: "1.6",
  },
  breakdownBox: {
    marginTop: "20px",
    padding: "16px",
    background: "rgba(255,68,68,0.03)",
    border: "1px solid rgba(255,68,68,0.1)",
    borderRadius: "4px",
  },
  breakdownHeader: {
    color: "#ff4444",
    fontSize: "10px",
    fontWeight: "900",
    marginBottom: "12px",
    letterSpacing: "2px",
  },
  breakdownGrid: {
    display: 'flex',
    gap: '24px',
  },
  breakdownItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  breakdownLabel: {
    fontSize: '9px',
    color: '#666',
    letterSpacing: '1px',
  },
  breakdownValue: {
    fontSize: '14px',
    color: '#ff4444',
    fontWeight: '700',
  },
  roundEndOverlay: {
    padding: "60px 40px",
    textAlign: "center",
    background: "#050505",
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundEndIcon: {
    fontSize: '48px',
    marginBottom: '20px',
    opacity: 0.5,
  },
  leaderboardBtn: {
    marginTop: "24px",
    background: "transparent",
    border: "1px solid #00ff9930",
    color: "#00ff99",
    padding: "12px 32px",
    cursor: "pointer",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "11px",
    letterSpacing: "3px",
    transition: "all 0.3s",
    textTransform: 'uppercase',
  },
};
