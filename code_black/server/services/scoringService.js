/**
 * Scoring System (Fixed):
 * - Syntax error:        0 points
 * - Runtime error:       0 points
 * - Time limit exceeded: 0 points
 * - Partial correct:     (passed / total) * basePoints  (proportional)
 * - All correct:         basePoints + time bonus
 *
 * Time Bonus:
 * - Up to 20% bonus for early submission
 * - timeBonus = floor(timeRemainingFraction * 0.2 * basePoints)
 */
function calculateScore(basePoints, results, timeInfo = null) {
  let score = 0;
  let errorType = "none";
  const failedCases = [];
  const feedback = [];

  if (results.syntaxError) {
    score = 0;
    errorType = "Syntax Error";
    feedback.push(
      "Your code has syntax errors. Check for missing brackets, colons, or typos.",
    );
  } else if (results.runtimeError) {
    score = 0;
    errorType = "Runtime Error";
    feedback.push(
      "Your code crashed during execution. Check for division by zero, index errors, etc.",
    );
  } else if (results.timedOut) {
    score = 0;
    errorType = "Time Limit Exceeded";
    feedback.push(
      "Your code took too long. Optimize your algorithm for better time complexity.",
    );
  } else {
    const { testResults } = results;
    let passedCount = 0;

    testResults.forEach((tr, idx) => {
      if (tr.passed) {
        passedCount++;
      } else {
        failedCases.push({
          testCase: idx + 1,
          expected: tr.expected,
          got: tr.actual,
        });
      }
    });

    const totalCount = testResults.length;

    if (failedCases.length > 0) {
      // Proportional scoring: partial credit based on test cases passed
      score = Math.round((passedCount / totalCount) * basePoints);
      errorType = "Wrong Answer";
      feedback.push(`${passedCount}/${totalCount} test cases passed.`);
      feedback.push(
        `Partial score: ${score}/${basePoints} points.`,
      );
    } else {
      // All test cases passed - full points + time bonus
      score = basePoints;
      errorType = "Accepted";

      // Calculate time bonus
      let timeBonus = 0;
      if (timeInfo && timeInfo.roundEndTime && timeInfo.roundStartTime) {
        const totalDuration = timeInfo.roundEndTime - timeInfo.roundStartTime;
        const timeRemaining = Math.max(0, timeInfo.roundEndTime - Date.now());
        const timeRemainingFraction = timeRemaining / totalDuration;
        timeBonus = Math.floor(timeRemainingFraction * 0.2 * basePoints);
        score += timeBonus;
      }

      if (timeBonus > 0) {
        feedback.push(
          `All test cases passed! Full score + ${timeBonus} time bonus!`,
        );
      } else {
        feedback.push("All test cases passed! Great job!");
      }
    }
  }

  return {
    score,
    errorType,
    failedCases,
    feedback,
    totalCases: results.testResults ? results.testResults.length : 0,
    passedCases: results.testResults
      ? results.testResults.filter((t) => t.passed).length
      : 0,
  };
}

module.exports = { calculateScore };
