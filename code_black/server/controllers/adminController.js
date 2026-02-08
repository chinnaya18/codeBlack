const EventState = require("../models/EventState");

exports.startRound = async (req, res) => {
  const { round, duration } = req.body;

  const endTime = new Date(Date.now() + duration);

  await EventState.findOneAndUpdate(
    {},
    {
      activeRound: round,
      submissionsLocked: false,
      roundEndsAt: endTime,
    },
    { upsert: true },
  );

  req.io.emit("round:update", { round, endTime });
  res.json({ success: true });
};

exports.lockSubmissions = async (req, res) => {
  await EventState.updateOne({}, { submissionsLocked: true });
  req.io.emit("submissions:locked");
  res.json({ locked: true });
};
