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

  const problem = problems[round];
  if (!problem) {
    return res.status(400).json({ message: "Problem not found" });
  }

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

    const scoring = calculateScore(problem.points, {
      syntaxError,
      runtimeError,
      timedOut,
      testResults,
    });

    // Store submission
    gs.submissions[submissionKey] = {
      code,
      language,
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
