const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const { runCode } = require("../services/codeRunner");
const { calculateScore } = require("../services/scoringService");
const problems = require("../data/problems");

router.post("/", authMiddleware, async (req, res) => {
  const { code, language, round } = req.body;
  const { username } = req.user;
  const gs = req.gameState;

  // Validation
  if (gs.roundStatus !== "active") {
    return res
      .status(400)
      .json({ message: "No active round. Submissions are closed." });
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

  // Get the user's assigned problem (random assignment)
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
    let syntaxError = false;
    let runtimeError = false;
    let timedOut = false;
    const testResults = [];

    for (const tc of problem.testCases) {
      const result = await runCode(language, code, tc.input, problem.timeLimit);

      if (result.timedOut) {
        timedOut = true;
        break;
      }

      if (result.stderr) {
        const stderrLower = result.stderr.toLowerCase();
        if (
          stderrLower.includes("syntaxerror") ||
          stderrLower.includes("syntax error")
        ) {
          syntaxError = true;
          break;
        }
        if (result.stderr && !result.stdout) {
          runtimeError = true;
          break;
        }
      }

      testResults.push({
        passed: result.stdout === tc.expected,
        expected: tc.expected,
        actual: result.stdout,
      });
    }

    // Pass time info for time bonus calculation
    const timeInfo = {
      roundStartTime: gs.roundStartTime,
      roundEndTime: gs.roundEndTime,
    };

    const scoring = calculateScore(problem.points, {
      syntaxError,
      runtimeError,
      timedOut,
      testResults,
    }, timeInfo);

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

module.exports = router;
