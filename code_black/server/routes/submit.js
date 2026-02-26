const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const { getLLMScore } = require("../services/llmScoringService");
const problems = require("../data/problems");

router.post("/", authMiddleware, async (req, res) => {
  const { code, language, round } = req.body;
  const { username } = req.user;
  const gs = req.gameState;

  // Validate language
  const supportedLanguages = ["python", "javascript", "c", "java", "cpp"];
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

  // Check if already submitted for THIS specific question in the round
  const assignmentIdx = gs.problemAssignments?.[username]?.[round] || 0;
  const submissionKey = `${username}_round${round}_q${assignmentIdx}`;

  if (gs.submissions[submissionKey] && gs.submissions[submissionKey].status !== "error") {
    return res
      .status(400)
      .json({ message: "Already submitted this question" });
  }

  // Get the user's assigned problem
  const problemPool = problems[round];
  if (!problemPool || !problemPool[assignmentIdx]) {
    return res.status(400).json({ message: "Problem not found" });
  }

  const problem = problemPool[assignmentIdx];

  try {
    console.log(`[SUBMIT] Code submitted by ${username} and marked as pending`);

    // Store submission as pending
    gs.submissions[submissionKey] = {
      code,
      language,
      problemId: problem.id,
      problemIdx: assignmentIdx,
      timestamp: Date.now(),
      status: "pending"
    };

    // Check if there's a next question in this round
    if (assignmentIdx + 1 < problemPool.length) {
      gs.problemAssignments[username][round] = assignmentIdx + 1;
      const getUserProblem = req.app.get("getUserProblem");
      const nextProblem = getUserProblem(username, round);

      const userData = gs.onlineUsers[username];
      if (userData && userData.socketId) {
        req.io.to(userData.socketId).emit("problem:assigned", { round, problem: nextProblem });
      }

      return res.json({
        success: true,
        pending: true,
        hasNext: true,
        message: "Question 1 submitted. Loading Question 2..."
      });
    }

    res.json({ success: true, pending: true, hasNext: false, message: "Round finished. Awaiting AI evaluation." });
  } catch (err) {
    console.error("Submission error:", err);
    res.status(500).json({ message: "Submission failed", error: err.message });
  }
});

// Endpoint for users to get their own submissions to view code and feedback
router.get("/my-submissions", authMiddleware, (req, res) => {
  const { username } = req.user;
  const gs = req.gameState;

  const mySubs = [];
  Object.keys(gs.submissions).forEach(key => {
    if (key.startsWith(`${username}_round`)) {
      const round = parseInt(key.split("_round")[1], 10);
      mySubs.push({
        round,
        ...gs.submissions[key]
      });
    }
  });

  res.json({ submissions: mySubs });
});

// New function to handle auto-submission
async function autoSubmitOnLeaveOrEnd(username, round, gs, req) {
  const assignmentIdx = gs.problemAssignments?.[username]?.[round] || 0;
  const submissionKey = `${username}_round${round}_q${assignmentIdx}`;

  // Check if already submitted
  if (gs.submissions[submissionKey]) {
    console.log(`[AUTO-SUBMIT] User ${username} already submitted for round ${round}, question ${assignmentIdx}`);
    return;
  }

  // Get the user's assigned problem
  const problemPool = problems[round];
  if (!problemPool || !problemPool[assignmentIdx]) {
    console.error(`[AUTO-SUBMIT] Problem not found for user ${username}, round ${round}, question ${assignmentIdx}`);
    return;
  }

  const problem = problemPool[assignmentIdx];

  // Auto-submit empty code
  gs.submissions[submissionKey] = {
    code: "",
    language: "",
    problemId: problem.id,
    problemIdx: assignmentIdx,
    timestamp: Date.now(),
    status: "auto-submitted"
  };

  console.log(`[AUTO-SUBMIT] Empty submission recorded for user ${username}, round ${round}, question ${assignmentIdx}`);

  // Notify user if they are online
  const userData = gs.onlineUsers[username];
  if (userData && userData.socketId) {
    req.io.to(userData.socketId).emit("submission:auto-submitted", {
      round,
      problemId: problem.id,
      message: "Your code was auto-submitted as the round ended or you left."
    });
  }
}

// Export the router as the default export
module.exports = router;

// Export autoSubmitOnLeaveOrEnd as a named export
module.exports.autoSubmitOnLeaveOrEnd = autoSubmitOnLeaveOrEnd;
