const mongoose = require("mongoose");

const UserLevelSchema = new mongoose.Schema({
  GuildId: String,
  UserId: String,
  Xp: Number,
  Level: Number,
  Background: String,
  BarColor: String,
  BorderColor: String,
});

module.exports = mongoose.model("UserLevel", UserLevelSchema);
