const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const { evaluateCode, healthCheck } = require("../services/aiService");
const { runCode } = require("../services/codeRunner");
const { calculateScore } = require("../services/scoringService");
const problems = require("../data/problems");

router.post("/", authMiddleware, async (req, res) => {
  const { code, language, round } = req.body;
  const { username } = req.user;
  const gs = req.gameState;

  // Validate language
  const supportedLanguages = ["python", "javascript", "c", "java"];
  if (!supportedLanguages.includes(language)) {
    return res.status(400).json({ message: "Unsupported language: " + language });
  }

  // Validation — check round time hasn't expired
  if (gs.roundStatus !== "active") {
    return res
      .status(400)
      .json({ message: "No active round. Submissions are closed." });
  }

  if (gs.roundEndTime && Date.now() > gs.roundEndTime) {
    return res
      .status(400)
      .json({ message: "Round time has expired. Submissions are closed." });
  }

  if (gs.currentRound !== round) {
    return res.status(400).json({ message: "Invalid round" });
  }

  // Check if already submitted for this round
  const submissionKey = `${username}_round${round}`;
  if (gs.submissions[submissionKey]) {
    return res
      .status(400)
      .json({ message: "Already submitted for this round" });
  }

  // Get the user's assigned problem
  const assignmentIdx = gs.problemAssignments?.[username]?.[round];
  if (assignmentIdx === undefined || assignmentIdx === null) {
    return res.status(400).json({ message: "No problem assigned to you for this round" });
  }

  const problemPool = problems[round];
  if (!problemPool || !problemPool[assignmentIdx]) {
    return res.status(400).json({ message: "Problem not found" });
  }

  const problem = problemPool[assignmentIdx];

  try {
    let aiResult = null;

    // ── Try AI Service first (preferred) ──
    try {
      const health = await healthCheck();
      if (health && health.status === "ok") {
        console.log(`[SUBMIT] Using AI service for ${language} evaluation`);
        aiResult = await evaluateCode(
          code,
          language,
          problem.testCases,
          problem.timeLimit || 5000
        );
      }
    } catch (aiErr) {
      console.warn("[SUBMIT] AI service unavailable, using local runner:", aiErr.message);
    }

    // ── Fallback: local code runner if AI service is down ──
    if (!aiResult) {
      console.log(`[SUBMIT] Falling back to local runner for ${language}`);
      aiResult = await runLocally(code, language, problem);
    }

    // ── Calculate score using AI result ──
    const timeInfo = {
      roundStartTime: gs.roundStartTime,
      roundEndTime: gs.roundEndTime,
    };

    const scoring = calculateScore(problem.points, aiResult, timeInfo, language);

    // Store submission
    gs.submissions[submissionKey] = {
      code,
      language,
      problemId: problem.id,
      result: scoring,
      timestamp: Date.now(),
    };

    // Update user points
    const roundKey = `round${round}`;
    if (gs.onlineUsers[username]) {
      gs.onlineUsers[username].points[roundKey] = scoring.score;
    }

    // Broadcast leaderboard update
    const getLeaderboard = req.app.get("getLeaderboard");
    req.io.emit("leaderboard:update", getLeaderboard());

    res.json({ success: true, ...scoring });
  } catch (err) {
    console.error("Submission error:", err);
    res.status(500).json({ message: "Evaluation failed", error: err.message });
  }
});

/**
 * Fallback: run code locally when AI service is unavailable.
 * Produces the same result shape as the AI service.
 */
async function runLocally(code, language, problem) {
  const result = {
    compilation_error: false,
    syntax_error: false,
    runtime_error: false,
    timed_out: false,
    syntax_error_count: 0,
    runtime_error_count: 0,
    logical_error_count: 0,
    error_details: "",
    test_results: [],
  };

  for (const tc of problem.testCases) {
    const run = await runCode(language, code, tc.input, problem.timeLimit || 5000);

    if (run.compilationError) {
      result.compilation_error = true;
      result.syntax_error = true;
      result.syntax_error_count = countErrors(run.stderr);
      result.error_details = run.stderr;
      break;
    }

    if (run.timedOut) {
      result.timed_out = true;
      break;
    }

    if (run.exitCode !== 0 && run.stderr) {
      const isSyntax = /SyntaxError|IndentationError|error:.*expected/i.test(run.stderr);
      if (isSyntax) {
        result.syntax_error = true;
        result.syntax_error_count = countErrors(run.stderr);
        result.error_details = run.stderr;
        break;
      } else {
        result.runtime_error = true;
        result.runtime_error_count = 1;
        result.error_details = run.stderr;
        break;
      }
    }

    const actual = run.stdout.replace(/\r\n/g, "\n").trim();
    const expected = tc.expected.replace(/\r\n/g, "\n").trim();
    result.test_results.push({ passed: actual === expected, expected, actual });
  }

  // Count logical errors
  result.logical_error_count = result.test_results.filter(t => !t.passed).length;

  return result;
}

function countErrors(stderr) {
  if (!stderr) return 1;
  const errorLines = stderr.split("\n").filter(l => /error/i.test(l));
  return Math.max(1, errorLines.length);
}

module.exports = router;
