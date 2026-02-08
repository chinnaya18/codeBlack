const axios = require("axios");

exports.analyzeLogic = async (code, problem) => {
  const res = await axios.post("http://ai:8000/logic", {
    code,
    problem,
  });
  return res.data;
};
