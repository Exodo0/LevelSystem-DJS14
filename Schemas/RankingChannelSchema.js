const mongoose = require("mongoose");

const rankingChannelSchema = new mongoose.Schema({
  guild: {
    type: String,
    required: true,
  },
  channel: {
    type: String,
    required: true,
  },
});

const ChannelDB = mongoose.model("ChannelDB", rankingChannelSchema);

module.exports = ChannelDB;
