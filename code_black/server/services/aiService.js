const axios = require("axios");

const AI_URL = process.env.AI_SERVICE || "http://localhost:8000";

exports.analyzeLogic = async (code, problem) => {
  try {
    const res = await axios.post(`${AI_URL}/analyze`, {
      stderr: "",
      code,
      problem,
    });
    return res.data;
  } catch (err) {
    console.error("AI service error:", err.message);
    return { error: "AI service unavailable" };
  }
};

exports.evaluateCode = async (code, language, testCases, timeLimit) => {
  try {
    const res = await axios.post(`${AI_URL}/evaluate`, {
      code,
      language,
      test_cases: testCases,
      time_limit: timeLimit,
    });
    return res.data;
  } catch (err) {
    console.error("AI service error:", err.message);
    return null;
  }
};

exports.healthCheck = async () => {
  try {
    const res = await axios.get(`${AI_URL}/health`, { timeout: 3000 });
    return res.data;
  } catch {
    return null;
  }
};
