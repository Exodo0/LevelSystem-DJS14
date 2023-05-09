const { EmbedBuilder, Client } = require("discord.js");
const User = require("../../Schemas/Ranking/RankingSchema");
const ChannelDB = require("../../Schemas/Ranking/RankingChannelSchema");

const cooldown = new Set();

module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    const guildId = message.guild.id;
    const userId = message.author.id;

    if (message.author.bot || !message.guild) return;
    if (cooldown.has(userId)) return;

    let user;

    try {
      const xpAmount = Math.floor(Math.random() * (25 - 15 + 1) + 15);

      user = await User.findOneAndUpdate(
        {
          guildId,
          userId,
        },
        {
          guildId,
          userId,
          $inc: { xp: xpAmount },
        },
        { upsert: true, new: true }
      );

      let { xp, level } = user;

      if (xp >= level * 100) {
        ++level;
        xp = 0;

        let notificationChannel = null;
        const channelDB = await ChannelDB.findOne({ guild: message.guild.id });
        if (channelDB) {
          try {
            notificationChannel = await client.channels.fetch(
              channelDB.channel
            );
          } catch (err) {
            console.log(err);
          }
        }
        if (!notificationChannel) {
          notificationChannel = message.channel;
        }

        const embed = new EmbedBuilder()
          .setTitle("🎉 Congratulations 🎉")
          .setThumbnail(message.author.avatarURL({ dynamic: true }))
          .addFields(
            {
              name: "User:",
              value: `${message.author.username}`,
              inline: true,
            },
            { name: "Level:", value: `${level}`, inline: true },
            {
              name: "Check the leaderboard using:",
              value: `\`/rank leadearboard\``,
            }
          )
          .setColor(user.hexAccentColor || "Random");

        notificationChannel.send({ embeds: [embed] });

        await User.updateOne(
          {
            guildId,
            userId,
          },
          {
            level,
            xp,
          }
        );
      }
    } catch (err) {
      console.log(err);
    }

    cooldown.add(message.author.id);

    setTimeout(() => {
      cooldown.delete(message.author.id);
    }, 60 * 1000);
  },
};
