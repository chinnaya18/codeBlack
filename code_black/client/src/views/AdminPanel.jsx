import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket, registerUser } from "../socket/leaderboard";
import { getUser } from "../services/auth";
import { fetchWithAuth } from "../services/api";
import ProfileDropdown from "../components/ProfileDropdown";
import { evaluateCodeLocally } from "../services/aiEvaluation";

export default function AdminPanel() {
  const navigate = useNavigate();
  const user = getUser();

  const [gameState, setGameState] = useState({
    currentRound: 0,
    roundStatus: "waiting",
    onlineUsers: [],
    leaderboard: [],
    removedUsers: [],
    violations: {},
    tabKicked: [],
  });
  const [loading, setLoading] = useState({});
  const [message, setMessage] = useState("");
  const [submissions, setSubmissions] = useState([]);
  const [viewedCode, setViewedCode] = useState(null);
  const [overrideScore, setOverrideScore] = useState("");
  const [manualFeedback, setManualFeedback] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    if (user.role !== "admin") {
      navigate("/");
      return;
    }

    registerUser(user.username, user.role);
    fetchState();

    socket.on("users:update", (users) => {
      setGameState((prev) => ({ ...prev, onlineUsers: users }));
    });

    socket.on("leaderboard:update", (lb) => {
      setGameState((prev) => ({ ...prev, leaderboard: lb }));
    });

    socket.on("violation:update", ({ username, count, fullscreen, tabSwitch, type, kicked }) => {
      setGameState((prev) => ({
        ...prev,
        violations: { ...prev.violations, [username]: { count, fullscreen: fullscreen || 0, tabSwitch: tabSwitch || 0, kicked: kicked || false } },
      }));
    });

    socket.on("user:tab_kicked", ({ username, timestamp }) => {
      setGameState((prev) => ({
        ...prev,
        tabKicked: [...(prev.tabKicked || []), { username, timestamp }],
      }));
    });

    return () => {
      socket.off("users:update");
      socket.off("leaderboard:update");
      socket.off("violation:update");
      socket.off("user:tab_kicked");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, user.role, user.username]);

  const fetchState = async () => {
    try {
      const data = await fetchWithAuth("/admin/state");
      setGameState(data);

      // Also fetch submissions
      const subData = await fetchWithAuth("/admin/submissions");
      if (subData.submissions) setSubmissions(subData.submissions);
    } catch (err) {
      if (err.message.includes("Unauthorized")) {
        console.error("Session expired. Redirecting to login.");
        return;
      }
      console.error("Failed to fetch state:", err);
    }
  };

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  };

  const startRound = async (round) => {
    setLoading((prev) => ({ ...prev, [`start${round}`]: true }));
    try {
      await fetchWithAuth("/admin/start-round", {
        method: "POST",
        body: JSON.stringify({ round }),
      });
      showMessage(`Round ${round} started successfully!`);
      fetchState();
    } catch (err) {
      if (err.message.includes("Unauthorized")) {
        console.error("Session expired. Redirecting to login.");
        return;
      }
      showMessage(`Error: ${err.message}`);
    } finally {
      setLoading((prev) => ({ ...prev, [`start${round}`]: false }));
    }
  };

  const endRound = async () => {
    setLoading((prev) => ({ ...prev, endRound: true }));
    try {
      await fetchWithAuth("/admin/end-round", { method: "POST" });
      showMessage("Round ended!");
      fetchState();
    } catch (err) {
      showMessage(`Error: ${err.message}`);
    } finally {
      setLoading((prev) => ({ ...prev, endRound: false }));
    }
  };

  const removeUser = async (username) => {
    if (!window.confirm(`Remove ${username} from the event?`)) return;
    try {
      await fetchWithAuth("/admin/remove-user", {
        method: "POST",
        body: JSON.stringify({ username }),
      });
      showMessage(`${username} has been removed`);
      fetchState();
    } catch (err) {
      showMessage(`Error: ${err.message}`);
    }
  };

  const resetEvent = async () => {
    if (!window.confirm("Reset the entire event? All scores will be lost."))
      return;
    try {
      await fetchWithAuth("/admin/reset", { method: "POST" });
      showMessage("Event has been reset!");
      fetchState();
    } catch (err) {
      showMessage(`Error: ${err.message}`);
    }
  };

  const revokeKick = async (username) => {
    if (!window.confirm(`Revoke kick for ${username}? They will be able to rejoin.`)) return;
    try {
      await fetchWithAuth("/admin/revoke-kick", {
        method: "POST",
        body: JSON.stringify({ username }),
      });
      showMessage(`Kick revoked for ${username}. They can rejoin now.`);
      fetchState();
    } catch (err) {
      showMessage(`Error: ${err.message}`);
    }
  };

  const evaluateAll = async () => {
    setLoading((prev) => ({ ...prev, evaluate: true }));
    try {
      // 1. Fetch pending submissions from state
      const subData = await fetchWithAuth("/admin/submissions");
      const pendingSubs = subData.submissions?.filter(s => s.status === "pending") || [];

      if (pendingSubs.length === 0) {
        showMessage("No pending submissions to evaluate.");
        setLoading((prev) => ({ ...prev, evaluate: false }));
        return;
      }

      showMessage(`Evaluating ${pendingSubs.length} submissions locally...`);

      // 2. Evaluate locally
      const results = [];
      let encounteredError = null;

      for (const sub of pendingSubs) {
        try {
          const problem = sub.problem || { description: "Solve the problem." };
          const scoring = await evaluateCodeLocally(sub.code, sub.language, problem);
          results.push({
            submissionKey: sub.submissionKey,
            scoring
          });
        } catch (err) {
          console.error(`Failed to evaluate ${sub.username}:`, err);
          encounteredError = err;
        }
      }

      if (encounteredError && results.length < pendingSubs.length) {
        alert(`Warning: Failed to evaluate some submissions:\n\n${encounteredError.message}\n\nMake sure Ollama is running: ollama serve && ollama run qwen2.5:7b-instruct`);
      }

      // 3. Save evaluations to server
      const res = await fetchWithAuth("/admin/save-evaluations", {
        method: "POST",
        body: JSON.stringify({ results })
      });

      showMessage(res.message);
      fetchState();
    } catch (err) {
      showMessage(`Error: ${err.message}`);
    } finally {
      setLoading((prev) => ({ ...prev, evaluate: false }));
    }
  };

  const approveEvaluation = async (submissionKey, finalScore) => {
    setLoading((prev) => ({ ...prev, [`approve_${submissionKey}`]: true }));
    try {
      const res = await fetchWithAuth("/admin/approve-evaluation", {
        method: "POST",
        body: JSON.stringify({ submissionKey, finalScore }),
      });
      showMessage(res.message);
      setViewedCode(null);
      fetchState();
    } catch (err) {
      showMessage(`Error: ${err.message}`);
    } finally {
      setLoading((prev) => ({ ...prev, [`approve_${submissionKey}`]: false }));
    }
  };

  const manualEvaluate = async (submissionKey, score, feedback) => {
    setLoading((prev) => ({ ...prev, [`manual_${submissionKey}`]: true }));
    try {
      const res = await fetchWithAuth("/admin/manual-evaluate", {
        method: "POST",
        body: JSON.stringify({ submissionKey, score, feedback }),
      });
      showMessage(res.message);
      setViewedCode(null);
      setOverrideScore("");
      setManualFeedback("");
      fetchState();
    } catch (err) {
      showMessage(`Error: ${err.message}`);
    } finally {
      setLoading((prev) => ({ ...prev, [`manual_${submissionKey}`]: false }));
    }
  };

  const evaluateOne = async (sub) => {
    const key = sub.submissionKey;
    setLoading((prev) => ({ ...prev, [`aiOne_${key}`]: true }));
    try {
      const res = await fetchWithAuth("/admin/evaluate-one", {
        method: "POST",
        body: JSON.stringify({ submissionKey: key }),
      });
      showMessage(res.message);
      // Refresh the modal with new data
      const subData = await fetchWithAuth("/admin/submissions");
      if (subData.submissions) {
        setSubmissions(subData.submissions);
        const updated = subData.submissions.find(s => s.submissionKey === key);
        if (updated) setViewedCode(updated);
      }
    } catch (err) {
      showMessage(`Error: ${err.message}`);
    } finally {
      setLoading((prev) => ({ ...prev, [`aiOne_${key}`]: false }));
    }
  };

  const getStatusColor = () => {
    switch (gameState.roundStatus) {
      case "active":
        return "#00ff99";
      case "ended":
        return "#ff9900";
      default:
        return "#555";
    }
  };

  const getStatusIcon = () => {
    switch (gameState.roundStatus) {
      case "active":
        return "●";
      case "ended":
        return "■";
      default:
        return "○";
    }
  };

  return (
    <div style={styles.container}>
      {/* Top Bar */}
      <div style={styles.topBar}>
        <span style={styles.logo}>CODEBLACK</span>
        <span style={styles.adminBadge}>⚡ ADMIN CONTROL</span>
        <ProfileDropdown />
      </div>

      {/* Toast Message */}
      {message && <div style={styles.toast}>{message}</div>}

      <div style={styles.content}>
        {/* ─── Event Status ─── */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>EVENT STATUS</h3>
          <div style={styles.statusGrid}>
            <div style={styles.statusCard}>
              <span style={styles.statusLabel}>ROUND</span>
              <span style={styles.statusValue}>
                {gameState.currentRound || "—"}
              </span>
            </div>
            <div style={styles.statusCard}>
              <span style={styles.statusLabel}>STATUS</span>
              <span
                style={{
                  ...styles.statusValue,
                  color: getStatusColor(),
                  fontSize: "18px",
                }}
              >
                {getStatusIcon()} {gameState.roundStatus.toUpperCase()}
              </span>
            </div>
            <div style={styles.statusCard}>
              <span style={styles.statusLabel}>COMPETITORS</span>
              <span style={styles.statusValue}>
                {gameState.onlineUsers.length}
              </span>
            </div>
          </div>
        </div>

        {/* ─── Controls ─── */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>CONTROLS</h3>
          <div style={styles.controlGrid}>
            <button
              onClick={() => startRound(1)}
              disabled={gameState.roundStatus === "active"}
              style={{
                ...styles.controlBtn,
                ...styles.greenBtn,
                opacity: gameState.roundStatus === "active" ? 0.3 : 1,
              }}
            >
              {loading.start1 ? "STARTING..." : "▶ START ROUND 1"}
            </button>
            <button
              onClick={() => startRound(2)}
              disabled={
                gameState.roundStatus === "active" || gameState.currentRound < 1
              }
              style={{
                ...styles.controlBtn,
                ...styles.greenBtn,
                opacity:
                  gameState.roundStatus === "active" ||
                    gameState.currentRound < 1
                    ? 0.3
                    : 1,
              }}
            >
              {loading.start2 ? "STARTING..." : "▶ START ROUND 2"}
            </button>
            <button
              onClick={endRound}
              disabled={gameState.roundStatus !== "active"}
              style={{
                ...styles.controlBtn,
                ...styles.orangeBtn,
                opacity: gameState.roundStatus !== "active" ? 0.3 : 1,
              }}
            >
              {loading.endRound ? "ENDING..." : "■ END ROUND"}
            </button>
            <button
              onClick={resetEvent}
              style={{ ...styles.controlBtn, ...styles.redBtn }}
            >
              ⟲ RESET EVENT
            </button>
            <button
              onClick={evaluateAll}
              style={{ ...styles.controlBtn, ...styles.blueBtn }}
            >
              {loading.evaluate ? "EVALUATING (AI)..." : "🤖 AI EVALUATE ALL PENDING"}
            </button>
          </div>
          {/* Ollama Config */}
          <div style={{ marginTop: "12px", background: "#0d0d0d", border: "1px solid #1a1a1a", padding: "12px 16px" }}>
            <div style={{ color: "#444", fontSize: "9px", letterSpacing: "2px", marginBottom: "10px" }}>🦙 OLLAMA CONFIG</div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="URL (default: http://localhost:11434)"
                defaultValue={localStorage.getItem("OLLAMA_URL") || ""}
                style={{ padding: "6px 10px", background: "#111", border: "1px solid #2a2a2a", color: "#aaa", flex: 1, fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", minWidth: "150px" }}
                onChange={(e) => {
                  if (e.target.value) localStorage.setItem("OLLAMA_URL", e.target.value);
                  else localStorage.removeItem("OLLAMA_URL");
                }}
              />
              <input
                type="text"
                placeholder="Model (default: qwen2.5:7b-instruct)"
                defaultValue={localStorage.getItem("OLLAMA_MODEL") || ""}
                style={{ padding: "6px 10px", background: "#111", border: "1px solid #2a2a2a", color: "#00ff99", flex: 1, fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", minWidth: "150px" }}
                onChange={(e) => {
                  if (e.target.value) localStorage.setItem("OLLAMA_MODEL", e.target.value);
                  else localStorage.removeItem("OLLAMA_MODEL");
                }}
              />
            </div>
          </div>
        </div>

        {/* ─── Bottom Grid: Users + Leaderboard ─── */}
        <div style={styles.bottomGrid}>
          {/* Online Users */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>
              ONLINE COMPETITORS ({gameState.onlineUsers.length})
            </h3>
            <div style={styles.list}>
              {gameState.onlineUsers.length === 0 ? (
                <p style={styles.emptyText}>No competitors online</p>
              ) : (
                gameState.onlineUsers.map((u) => (
                  <div key={u} style={styles.userRow}>
                    <div style={styles.userInfo}>
                      <span style={styles.userDot} />
                      <span style={styles.userName}>{u}</span>
                      {gameState.violations[u] && gameState.violations[u].fullscreen > 0 && (
                        <span style={{
                          color: "#ff9900",
                          fontSize: "9px",
                          fontWeight: "bold",
                          border: "1px solid #ff990040",
                          padding: "1px 6px",
                          marginLeft: "6px",
                          letterSpacing: "1px",
                        }}>
                          🖥️ {gameState.violations[u].fullscreen} FULLSCREEN
                        </span>
                      )}
                      {gameState.violations[u] && gameState.violations[u].tabSwitch > 0 && (
                        <span style={{
                          color: "#00ffff",
                          fontSize: "9px",
                          fontWeight: "bold",
                          border: "1px solid #00ffff40",
                          padding: "1px 6px",
                          marginLeft: "6px",
                          letterSpacing: "1px",
                        }}>
                          🔄 {gameState.violations[u].tabSwitch} TAB SWITCH
                        </span>
                      )}
                      {gameState.violations[u] && gameState.violations[u].kicked && (
                        <span style={{
                          color: "#ff4444",
                          fontSize: "9px",
                          fontWeight: "bold",
                          border: "1px solid #ff444440",
                          padding: "1px 6px",
                          marginLeft: "6px",
                          letterSpacing: "1px",
                          background: "#ff444410",
                        }}>
                          ⛔ KICKED
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => removeUser(u)}
                      style={styles.removeBtn}
                    >
                      ✕ REMOVE
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Leaderboard */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>LEADERBOARD</h3>
            <div style={styles.list}>
              {gameState.leaderboard.length === 0 ? (
                <p style={styles.emptyText}>No scores yet</p>
              ) : (
                <>
                  {gameState.leaderboard.slice(0, 5).map((entry) => (
                    <div key={entry.username} style={styles.lbRow}>
                      <span style={styles.lbRank}>#{entry.rank}</span>
                      <span style={styles.lbName}>
                        {entry.username}
                        {entry.rank === 1 && " 🥇"}
                        {entry.rank === 2 && " 🥈"}
                      </span>
                      <span style={styles.lbScores}>
                        R1:{entry.round1} R2:{entry.round2}
                      </span>
                      <span style={styles.lbTotal}>
                        {entry.total}
                        {entry.violationPenalty > 0 && <span style={{ color: "#ff4444", fontSize: "10px", marginLeft: "4px" }}>(-{entry.violationPenalty} pts)</span>}
                      </span>
                    </div>
                  ))}
                  <button
                    onClick={() => navigate("/admin/leaderboard")}
                    style={styles.viewFullLbBtn}
                  >
                    VIEW FULL LEADERBOARD →
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ─── Submissions Panel ─── */}
        <div style={styles.section}>
          {/* Header + filter tabs */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
            <h3 style={{ ...styles.sectionTitle, margin: 0 }}>SUBMISSIONS ({submissions.length})</h3>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {[
                { key: "all",       label: "ALL",      color: "#555" },
                { key: "pending",   label: "🟠 PENDING",  color: "#ff9900" },
                { key: "ai_pending",label: "🟡 REVIEW",   color: "#ffcc00" },
                { key: "evaluated", label: "🟢 DONE",     color: "#00ff99" },
              ].map(({ key, label, color }) => {
                const count = key === "all" ? submissions.length : submissions.filter(s => s.status === key).length;
                return (
                  <button
                    key={key}
                    onClick={() => setFilterStatus(key)}
                    style={{ padding: "4px 12px", background: filterStatus === key ? color + "22" : "transparent", border: `1px solid ${filterStatus === key ? color : "#2a2a2a"}`, color: filterStatus === key ? color : "#444", fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", letterSpacing: "1px", cursor: "pointer", fontWeight: "bold" }}
                  >
                    {label} ({count})
                  </button>
                );
              })}
            </div>
          </div>
          <div style={styles.list}>
            {submissions.filter(s => filterStatus === "all" || s.status === filterStatus).length === 0 ? (
              <p style={styles.emptyText}>No submissions</p>
            ) : (
              submissions.filter(s => filterStatus === "all" || s.status === filterStatus).map((sub, idx) => {
                const dotColor = sub.status === "pending" ? "#ff9900" : sub.status === "ai_pending" ? "#ffcc00" : "#00ff99";
                return (
                  <div key={idx} style={{ ...styles.userRow, borderLeft: `3px solid ${dotColor}30` }}>
                    <div style={styles.userInfo}>
                      <span style={{ ...styles.userDot, background: dotColor, boxShadow: `0 0 8px ${dotColor}` }} />
                      <div>
                        <span style={styles.userName}>{sub.username}</span>
                        <span style={{ color: "#555", fontSize: "10px", marginLeft: "8px" }}>R{sub.round}{sub.problemIdx !== undefined ? ` Q${sub.problemIdx + 1}` : ""} · {sub.language?.toUpperCase()}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "10px", color: dotColor, fontWeight: "bold", letterSpacing: "1px", minWidth: "90px", textAlign: "right" }}>
                        {sub.status === "pending" ? "PENDING" :
                         sub.status === "ai_pending" ? `⏳ ${sub.result?.score ?? 0} pts` :
                         `✓ ${sub.result?.score ?? 0} pts`}
                      </span>
                      <button onClick={() => { setViewedCode(sub); setOverrideScore(""); setManualFeedback(""); }} style={styles.revokeBtn}>
                        VIEW
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Code View Modal */}
        {viewedCode && (
          <div style={styles.modalOverlay} onClick={() => setViewedCode(null)}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h3 style={{ margin: 0, color: "#00ff99", letterSpacing: "2px", fontWeight: "bold" }}>
                  {viewedCode.username.toUpperCase()}'S CODE (ROUND {viewedCode.round}{viewedCode.problemIdx !== undefined ? ` Q${viewedCode.problemIdx + 1}` : ""})
                </h3>
                <button onClick={() => setViewedCode(null)} style={styles.closeBtn}>✕</button>
              </div>

              <div style={{ padding: "20px", background: "#050505", borderBottom: "1px solid #222" }}>
                {/* Status badge */}
                <div style={{ marginBottom: "14px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "10px", letterSpacing: "2px", padding: "5px 12px", border: `1px solid ${ viewedCode.status === "evaluated" ? "#00ff9940" : viewedCode.status === "ai_pending" ? "#ffcc0040" : "#ff990040"}`, color: viewedCode.status === "evaluated" ? "#00ff99" : viewedCode.status === "ai_pending" ? "#ffcc00" : "#ff9900", fontWeight: "bold" }}>
                    {viewedCode.status === "evaluated" ? "✓ FINALIZED" : viewedCode.status === "ai_pending" ? "🤖 AI REVIEW PENDING" : "⏳ AWAITING EVALUATION"}
                  </span>
                  <span style={{ color: "#666", fontSize: "12px" }}>{viewedCode.language?.toUpperCase()} · R{viewedCode.round}{viewedCode.problemIdx !== undefined ? ` Q${viewedCode.problemIdx + 1}` : ""}</span>
                </div>

                {/* AI feedback (shown for ai_pending and evaluated) */}
                {(viewedCode.status === "ai_pending" || viewedCode.status === "evaluated") && viewedCode.result?.feedback?.length > 0 && (
                  <div style={{ marginBottom: "14px", padding: "12px 16px", background: "#1a1a1a", border: "1px solid #333" }}>
                    {viewedCode.result.feedback.map((f, i) => <div key={i} style={{ color: "#aaa", fontSize: "12px", lineHeight: "1.8" }}>{f}</div>)}
                    {viewedCode.result?.manualScore && <div style={{ color: "#aaa", fontSize: "11px", marginTop: "6px" }}>✏️ Manually scored</div>}
                    {viewedCode.result?.modelUsed && <div style={{ color: "#00ccff", fontSize: "11px", marginTop: "6px" }}>🦙 {viewedCode.result.modelUsed}</div>}
                  </div>
                )}

                {/* Finalized score display */}
                {viewedCode.status === "evaluated" && (
                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ color: "#00ccff", fontSize: "14px", fontWeight: "bold" }}>
                      AI Score: {viewedCode.result?.aiScore ?? "N/A"} / 100
                    </div>
                    <div style={{ color: "#ffcc00", fontSize: "14px", fontWeight: "bold" }}>
                      Manual Score: {viewedCode.result?.manualScore ?? "N/A"} / 100
                    </div>
                    <div style={{ color: "#00ff99", fontSize: "22px", fontWeight: "bold", marginTop: "10px", letterSpacing: "1px" }}>
                      Final Score: {viewedCode.result?.finalScore ?? 0} <span style={{ color: "#333", fontSize: "13px" }}>/ 100 PTS</span>
                    </div>
                  </div>
                )}

                {/* AI eval button for pending */}
                {(viewedCode.status === "pending") && (
                  <div style={{ marginBottom: "16px" }}>
                    <button
                      onClick={() => evaluateOne(viewedCode)}
                      disabled={loading[`aiOne_${viewedCode.submissionKey}`]}
                      style={{ padding: "9px 20px", background: "linear-gradient(135deg, #00d2ff22, #3a7bd522)", border: "1px solid #00d2ff50", color: "#00d2ff", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", letterSpacing: "2px", fontWeight: "bold", cursor: "pointer", width: "100%", marginBottom: "8px" }}
                    >
                      {loading[`aiOne_${viewedCode.submissionKey}`] ? "⏳ RUNNING AI..." : "🤖 RUN AI EVALUATION"}
                    </button>
                  </div>
                )}

                {/* AI proposed score review (ai_pending) */}
                {viewedCode.status === "ai_pending" && (
                  <div style={{ marginBottom: "16px", padding: "12px 14px", background: "#0d0d0d", border: "1px solid #ffcc0030" }}>
                    <div style={{ color: "#ffcc00", fontSize: "10px", letterSpacing: "1px", marginBottom: "10px", fontWeight: "bold" }}>AI PROPOSED: {viewedCode.result?.score ?? 0} pts — Accept or modify below</div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <input
                        type="number" min="0" max="100"
                        placeholder={viewedCode.result?.score ?? 0}
                        value={overrideScore}
                        onChange={(e) => setOverrideScore(e.target.value)}
                        style={{ width: "70px", padding: "7px", background: "#111", border: "1px solid #ffcc0060", color: "#ffcc00", fontFamily: "'JetBrains Mono', monospace", fontSize: "18px", fontWeight: "bold", textAlign: "center" }}
                      />
                      <span style={{ color: "#333" }}>/ 100</span>
                      <button
                        onClick={() => approveEvaluation(viewedCode.submissionKey, overrideScore !== "" ? Number(overrideScore) : (viewedCode.result?.score ?? 0))}
                        disabled={loading[`approve_${viewedCode.submissionKey}`]}
                        style={{ flex: 1, padding: "8px 16px", background: "linear-gradient(135deg, #00ff99, #00cc77)", border: "none", color: "#000", fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", letterSpacing: "2px", fontWeight: "bold", cursor: "pointer" }}
                      >
                        {loading[`approve_${viewedCode.submissionKey}`] ? "SAVING..." : "✓ APPROVE & FINALIZE"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Manual score section — available for pending and ai_pending and re-override evaluated */}
                <div style={{ padding: "12px 14px", background: "#080808", border: "1px solid #1a1a1a" }}>
                  <div style={{ color: "#444", fontSize: "9px", letterSpacing: "2px", marginBottom: "10px" }}>✏️ MANUAL SCORE {viewedCode.status === "evaluated" ? "(OVERRIDE)" : ""}</div>
                  <input
                    type="text"
                    placeholder="Feedback note (optional)"
                    value={manualFeedback}
                    onChange={(e) => setManualFeedback(e.target.value)}
                    style={{ width: "100%", marginBottom: "10px", padding: "7px 10px", background: "#111", border: "1px solid #2a2a2a", color: "#ccc", fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", boxSizing: "border-box" }}
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <input
                      type="number" min="0" max="100"
                      placeholder="0–100"
                      value={overrideScore}
                      onChange={(e) => setOverrideScore(e.target.value)}
                      style={{ width: "70px", padding: "7px", background: "#111", border: "1px solid #2a2a2a", color: "#fff", fontFamily: "'JetBrains Mono', monospace", fontSize: "18px", fontWeight: "bold", textAlign: "center" }}
                    />
                    <span style={{ color: "#333" }}>/ 100</span>
                    <button
                      onClick={() => manualEvaluate(viewedCode.submissionKey, overrideScore !== "" ? Number(overrideScore) : 0, manualFeedback)}
                      disabled={overrideScore === "" || loading[`manual_${viewedCode.submissionKey}`]}
                      style={{ flex: 1, padding: "8px 16px", background: overrideScore !== "" ? "linear-gradient(135deg, #ff9900, #cc7700)" : "#1a1a1a", border: `1px solid ${overrideScore !== "" ? "#ff9900" : "#2a2a2a"}`, color: overrideScore !== "" ? "#000" : "#444", fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", letterSpacing: "2px", fontWeight: "bold", cursor: overrideScore !== "" ? "pointer" : "not-allowed" }}
                    >
                      {loading[`manual_${viewedCode.submissionKey}`] ? "SAVING..." : "✏️ SET MANUAL SCORE"}
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ padding: "20px", flex: 1, overflow: "auto" }}>
                <pre style={{ margin: 0, color: "#ccc", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", whiteSpace: "pre-wrap" }}>
                  {viewedCode.code}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* ─── Disqualified Users (Tab Switch Kicks) ─── */}
        {(gameState.tabKicked?.length > 0 || gameState.removedUsers?.length > 0) && (
          <div style={{ ...styles.section, border: "1px solid #ff444430" }}>
            <h3 style={{ ...styles.sectionTitle, color: "#ff4444" }}>
              ⛔ DISQUALIFIED / REMOVED USERS
            </h3>
            <div style={styles.list}>
              {(gameState.tabKicked || []).map((entry, idx) => (
                <div key={`kicked-${idx}`} style={{
                  ...styles.userRow,
                  borderLeft: "3px solid #ff4444",
                  background: "#1a0808",
                }}>
                  <div style={styles.userInfo}>
                    <span style={{ ...styles.userDot, background: "#ff4444", boxShadow: "0 0 8px #ff4444" }} />
                    <span style={{ ...styles.userName, color: "#ff6666" }}>{entry.username}</span>
                    <span style={{
                      color: "#ff4444",
                      fontSize: "9px",
                      fontWeight: "bold",
                      border: "1px solid #ff444440",
                      background: "#ff444415",
                      padding: "1px 8px",
                      marginLeft: "8px",
                      letterSpacing: "1px",
                    }}>
                      🔄 TAB SWITCH — AUTO KICKED
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ color: "#555", fontSize: "10px" }}>
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                    <button
                      onClick={() => revokeKick(entry.username)}
                      style={styles.revokeBtn}
                    >
                      ↩ REVOKE
                    </button>
                  </div>
                </div>
              ))}
              {(gameState.removedUsers || []).filter(u =>
                !(gameState.tabKicked || []).some(k => k.username === u)
              ).map((u) => (
                <div key={`removed-${u}`} style={{
                  ...styles.userRow,
                  borderLeft: "3px solid #ff9900",
                  background: "#1a1008",
                }}>
                  <div style={styles.userInfo}>
                    <span style={{ ...styles.userDot, background: "#ff9900", boxShadow: "0 0 8px #ff9900" }} />
                    <span style={{ ...styles.userName, color: "#ff9900" }}>{u}</span>
                    <span style={{
                      color: "#ff9900",
                      fontSize: "9px",
                      fontWeight: "bold",
                      border: "1px solid #ff990040",
                      padding: "1px 8px",
                      marginLeft: "8px",
                      letterSpacing: "1px",
                    }}>
                      MANUALLY REMOVED
                    </span>
                  </div>
                  <button
                    onClick={() => revokeKick(u)}
                    style={styles.revokeBtn}
                  >
                    ↩ REVOKE
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#050505",
    fontFamily: "'JetBrains Mono', monospace",
  },
  topBar: {
    height: "56px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 20px",
    borderBottom: "1px solid #1a1a1a",
  },
  logo: {
    color: "#00ff99",
    fontWeight: "bold",
    letterSpacing: "3px",
    fontSize: "16px",
    textShadow: "0 0 10px #00ff9930",
  },
  adminBadge: {
    color: "#ff4444",
    fontSize: "10px",
    letterSpacing: "3px",
    border: "1px solid #ff444430",
    padding: "4px 14px",
  },
  toast: {
    position: "fixed",
    top: "72px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "#0d0d0d",
    border: "1px solid #00ff9940",
    color: "#00ff99",
    padding: "10px 28px",
    zIndex: 2000,
    fontSize: "12px",
    letterSpacing: "1px",
    animation: "fadeIn 0.3s ease",
    boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
  },
  content: {
    padding: "24px",
    maxWidth: "1200px",
    margin: "0 auto",
  },
  section: {
    border: "1px solid #1a1a1a",
    padding: "20px",
    marginBottom: "20px",
    background: "#0a0a0a",
  },
  sectionTitle: {
    color: "#555",
    fontSize: "9px",
    letterSpacing: "3px",
    margin: "0 0 16px",
  },
  statusGrid: {
    display: "flex",
    gap: "16px",
  },
  statusCard: {
    flex: 1,
    background: "#0d0d0d",
    border: "1px solid #1a1a1a",
    padding: "20px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  statusLabel: {
    color: "#444",
    fontSize: "8px",
    letterSpacing: "2px",
  },
  statusValue: {
    color: "#00ff99",
    fontSize: "28px",
    fontWeight: "bold",
  },
  controlGrid: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },
  controlBtn: {
    padding: "12px 24px",
    border: "none",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "11px",
    letterSpacing: "2px",
    cursor: "pointer",
    fontWeight: "bold",
    transition: "all 0.3s",
  },
  greenBtn: {
    background: "linear-gradient(135deg, #00ff99, #00cc77)",
    color: "#000",
  },
  orangeBtn: { background: "#ff9900", color: "#000" },
  redBtn: {
    background: "transparent",
    border: "1px solid #ff4444",
    color: "#ff4444",
  },
  bottomGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    maxHeight: "350px",
    overflowY: "auto",
    paddingRight: "6px"
  },
  userRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 14px",
    background: "#0d0d0d",
    border: "1px solid #1a1a1a",
    transition: "all 0.3s",
  },
  userInfo: { display: "flex", alignItems: "center", gap: "10px" },
  userDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#00ff99",
    boxShadow: "0 0 8px #00ff99",
  },
  userName: { color: "#ccc", fontSize: "13px" },
  removeBtn: {
    background: "transparent",
    border: "1px solid #ff444440",
    color: "#ff4444",
    padding: "4px 12px",
    cursor: "pointer",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "9px",
    letterSpacing: "1px",
    transition: "all 0.3s",
  },
  revokeBtn: {
    background: "#00ff9915",
    border: "1px solid #00ff9940",
    color: "#00ff99",
    padding: "4px 14px",
    cursor: "pointer",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "9px",
    letterSpacing: "1px",
    fontWeight: "bold",
    transition: "all 0.3s",
  },
  emptyText: {
    color: "#2a2a2a",
    fontSize: "12px",
    textAlign: "center",
    padding: "20px",
  },
  lbRow: {
    display: "flex",
    alignItems: "center",
    padding: "10px 14px",
    background: "#0d0d0d",
    border: "1px solid #1a1a1a",
    gap: "12px",
    animation: "slideIn 0.4s ease forwards",
  },
  lbRank: {
    color: "#00ff99",
    fontWeight: "bold",
    width: "40px",
    fontSize: "14px",
  },
  lbName: { color: "#ccc", flex: 1, fontSize: "13px" },
  lbScores: { color: "#555", fontSize: "10px", letterSpacing: "1px" },
  lbTotal: {
    color: "#00ff99",
    fontWeight: "bold",
    fontSize: "18px",
    width: "50px",
    textAlign: "right",
  },
  viewFullLbBtn: {
    marginTop: "12px",
    width: "100%",
    background: "linear-gradient(135deg, #ffd70020, #0a0a0a)",
    border: "1px solid #ffd70040",
    color: "#ffd700",
    padding: "12px 24px",
    cursor: "pointer",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "11px",
    letterSpacing: "2px",
    fontWeight: "bold",
    transition: "all 0.3s",
    textAlign: "center",
  },
  blueBtn: {
    background: "linear-gradient(135deg, #00d2ff, #3a7bd5)",
    color: "#000",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0, right: 0, bottom: 0,
    background: "rgba(0,0,0,0.8)",
    zIndex: 3000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px"
  },
  modalContent: {
    width: "100%",
    maxWidth: "800px",
    background: "#0a0a0a",
    border: "1px solid #222",
    display: "flex",
    flexDirection: "column",
    maxHeight: "90vh",
    boxShadow: "0 0 40px rgba(0,0,0,0.5)"
  },
  modalHeader: {
    padding: "20px",
    borderBottom: "1px solid #222",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#080808"
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#fff",
    fontSize: "18px",
    cursor: "pointer"
  }
};
