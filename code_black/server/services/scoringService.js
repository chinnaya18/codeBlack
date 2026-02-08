module.exports = (base, penalty) => {
  const score = base - penalty;
  return score < 0 ? 0 : score;
};
