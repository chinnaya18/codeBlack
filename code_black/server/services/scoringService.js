/**
 * Scoring System:
 * - Syntax error:       -50
 * - Runtime error:      -30
 * - Time limit exceeded: -20
 * - Failed test case:   -10 per case
 * - Correct solution:   Full points
 */
function calculateScore(basePoints, results) {
  let score = basePoints;
  let errorType = "none";
  const failedCases = [];
  const feedback = [];

  if (results.syntaxError) {
    score -= 50;
    errorType = "Syntax Error";
    feedback.push(
      "Your code has syntax errors. Check for missing brackets, colons, or typos.",
    );
  } else if (results.runtimeError) {
    score -= 30;
    errorType = "Runtime Error";
    feedback.push(
      "Your code crashed during execution. Check for division by zero, index errors, etc.",
    );
  } else if (results.timedOut) {
    score -= 20;
    errorType = "Time Limit Exceeded";
    feedback.push(
      "Your code took too long. Optimize your algorithm for better time complexity.",
    );
  } else {
    const { testResults } = results;
    let passedCount = 0;

    testResults.forEach((tr, idx) => {
      if (!tr.passed) {
        score -= 10;
        failedCases.push({
          testCase: idx + 1,
          expected: tr.expected,
          got: tr.actual,
        });
      } else {
        passedCount++;
      }
    });

    if (failedCases.length > 0) {
      errorType = "Wrong Answer";
      feedback.push(`${passedCount}/${testResults.length} test cases passed.`);
    } else {
      errorType = "Accepted";
      feedback.push("All test cases passed! Great job!");
    }
  }

  score = Math.max(score, 0);

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
