const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const UserLevel = require("../Schemas/UserLevel");
const Notify = require("../../Schemas/NotifySchema");
const { profileImage } = require("discord-arts");
const cooldown = new Set();

module.exports = {
  name: "messageCreate",
  description: "📂 Add Level and Notify",

  async execute(message, client) {
    const guildId = message.guild.id;
    const userId = message.author.id;

    if (cooldown.has(userId)) return;

    let user;
    let rankingChannel;
    if (message.author.bot) return;

    try {
      rankingChannel = await Notify.findOne(
        { GuildId: guildId },
        { ChannelId: 1, Status: 1 }
      );

      if (!rankingChannel) {
        const newNotify = new Notify({
          GuildId: guildId,
          ChannelId: null,
          Status: false,
        });
        rankingChannel = await newNotify.save();
      }
      if (!rankingChannel.Status) {
        rankingChannel.Status = true;
        await rankingChannel.save();
        return;
      }
    } catch (error) {
      console.error(error);
      return;
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

    console.log(
      `User talking: ${message.author.tag} | XP: ${Xp} | Level: ${Level} And earned ${xpAmount} XP.`
    );

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

      // Check if the bot has permissions to send messages in the channel
      if (
        notificationChannel
          .permissionsFor(client.user)
          .has(PermissionFlagsBits.SendMessages)
      ) {
        const buffer = await profileImage(userId, {
          customTag: `You level up to: ${Level}!`,
        });

        const attachment = new AttachmentBuilder(buffer, {
          name: "profile.png",
        });

        notificationChannel.send({
          files: [attachment],
        });
      } else {
        const buffer = await profileImage(userId, {
          customTag: `You level up to: ${Level}!`,
        });

        message.author.send({
          content: `You level up to: ${Level}!`,
          files: [new AttachmentBuilder(buffer, { name: "profile.png" })],
        });
      }

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
    } else {
      cooldown.add(userId);
      console.log(`User: ${message.author.tag} | Cooldown activated.`);
      setTimeout(() => {
        cooldown.delete(userId);
        console.log(`User: ${message.author.tag} | Cooldown deactivated.`);
      }, 60000);
    }
  },
};
