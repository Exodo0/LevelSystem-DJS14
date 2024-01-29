const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const UserLevel = require("../Schemas/UserLevel");
const Notify = require("../../Schemas/NotifySchema");
const { profileImage } = require("discord-arts");
const cooldown = new Set();

module.exports = {
  name: "messageCreate",
  description: "Ranking system",

  async execute(message, client) {
    const guildId = message.guild.id;
    const userId = message.author.id;

    if (message.author.bot || !message.guild || cooldown.has(userId)) return;

    let user;
    let rankingChannel;

    try {
      rankingChannel = await Notify.findOne(
        { GuildId: guildId },
        { ChannelId: 1, Status: 1 }
      );

      if (!rankingChannel) {
        const newNotify = new Notify({
          GuildId: guildId,
          ChannelId: null,
          Status: true,
        });

        rankingChannel = await newNotify.save();
      }

      if (!rankingChannel.Status) {
        rankingChannel.Status = true;
        await rankingChannel.save();
        return;
      }
    } catch (err) {
      console.log(err);
    }

    const xpAmount = Math.floor(Math.random() * (25 - 15 + 1) + 15);

    user = await UserLevel.findOneAndUpdate(
      {
        GuildId: guildId,
        UserId: userId,
      },
      {
        $inc: { Xp: xpAmount },
        $setOnInsert: { Level: 0 },
      },
      { upsert: true, new: true }
    );

    let { Xp, Level } = user;

    if (Xp >= Level * 100) {
      cooldown.add(userId);

      ++Level;
      Xp = 0;

      let notificationChannel = null;

      if (rankingChannel && rankingChannel.ChannelId !== null) {
        try {
          notificationChannel = await client.channels.fetch(
            rankingChannel.ChannelId
          );
        } catch (err) {
          console.log(err);
        }
      }

      if (!notificationChannel) {
        notificationChannel = message.channel;
      }

      const buffer = await profileImage(userId, {
        customTag: `You level up to: ${Level}!`,
      });

      const attachment = new AttachmentBuilder(buffer, {
        name: "profile.png",
      });

      const embed = new EmbedBuilder()
        .setImage("attachment://profile.png")
        .setColor("Aqua")
        .setTimestamp();

      notificationChannel.send({
        embeds: [embed],
        files: [attachment],
      });

      await UserLevel.updateOne(
        {
          GuildId: guildId,
          UserId: userId,
        },
        {
          Level: Level,
          Xp: Xp,
        }
      );

      setTimeout(() => {
        cooldown.delete(userId);
      }, 60000);
    }
  },
};

