const {
  EmbedBuilder,
  SlashCommandBuilder,
  AttachmentBuilder,
} = require("discord.js");
const UserLevel = require("../Schemas/UserLevel");
const { profileImage } = require("discord-arts");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("card-barcolor")
    .setDescription("🔍 Change bar color on your card.")
    .addStringOption((option) =>
      option
        .setName("color")
        .setDescription("Bar Color (HEX format only)")
        .setRequired(true)
    ),

    async execute(interaction, client) {
    try {
      await interaction.deferReply();
      const color = interaction.options.getString("color");

      const colorRegex = /^#(?:[0-9a-fA-F]{3}){1,2}$/;
      if (!color.match(colorRegex)) {
        await interaction.followUp({
          embeds: [
            new EmbedBuilder()
              .setColor("Red")
              .setDescription(
                "Invalid color format. Please provide a HEX color."
              ),
          ],
        });
        return;
      }

      const targetMember = interaction.member;
      const user = await UserLevel.findOne({
        GuildId: targetMember.guild.id,
        UserId: targetMember.user.id,
      });

      if (!user) {
        await interaction.followUp({
          embeds: [
            new EmbedBuilder()
              .setColor("Red")
              .setDescription(
                "You are not ranked yet. Start chatting to get ranked!"
              ),
          ],
        });
        return;
      }
      const background = user?.Background || null;
      const borderColor = user?.BorderColor || null;
      const backgroundBlur = user?.Blur || null;

      const buffer = await profileImage(targetMember.id, {
        customBackground: background,
        borderColor: borderColor,
        moreBackgroundBlur: backgroundBlur,
        rankData: {
          currentXp: user.Xp || 0,
          requiredXp: user.Level * 100 || 0,
          level: user.Level || 0,
          barColor: color,
        },
      });

      await interaction.followUp({
        content: "Here's a preview of your new bar color",
        // embeds: [
        //   new EmbedBuilder()
        //     .setColor("#087996")
        //     .setDescription("Here's a preview of your new bar color:")
        //     .setImage("attachment://profile.png"),
        // ],
        files: [new AttachmentBuilder(buffer, { name: "profile.png" })],
      });

      await UserLevel.findOneAndUpdate(
        {
          GuildId: targetMember.guild.id,
          UserId: targetMember.user.id,
        },
        {
          BarColor: color,
        },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.error(err);
    }
  },
};

