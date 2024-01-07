const moongose = require("mongoose");

const NotifySchema = new moongose.Schema({
  GuildId: String,
  ChannelId: String,
  Status: Boolean,
});

module.exports = moongose.model("Notify", NotifySchema);
