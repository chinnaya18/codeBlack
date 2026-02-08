const express = require("express");
const router = express.Router();

// Dummy AI checker
router.post("/submit", (req, res) => {
  const { code } = req.body;

  let penalty = 0;
  let errorType = "none";

  if (code.includes("syntax_error")) {
    penalty = 15;
    errorType = "Syntax Error";
  } else if (code.includes("runtime_error")) {
    penalty = 10;
    errorType = "Runtime Error";
  } else if (code.includes("logic_error")) {
    penalty = 5;
    errorType = "Logical Error";
  }

  res.json({
    penalty,
    errorType,
  });
});

module.exports = router;
