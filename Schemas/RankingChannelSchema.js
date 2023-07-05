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
  image: {
    type: String,
    default:
      "https://wallpapertag.com/wallpaper/full/e/c/6/477550-most-popular-hubble-ultra-deep-field-wallpaper-1920x1200.jpg",
    required: false,
  },
  status: {
    type: Boolean,
    default: true,
    required: false,
  },
});

const ChannelDB = mongoose.model("ChannelDB", rankingChannelSchema);

module.exports = ChannelDB;
