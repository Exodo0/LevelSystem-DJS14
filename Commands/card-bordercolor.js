const {
  EmbedBuilder,
  AttachmentBuilder,
  SlashCommandBuilder,
} = require("discord.js");
const UserLevel = require("../Schemas/UserLevel");
const { profileImage } = require("discord-arts");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("card-bordercolor")
    .setDescription("🔍 Change border color on your card.")
    .addStringOption((option) =>
      option
        .setName("color")
        .setDescription("Border Color (HEX format only)")
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
      const backgroundBlur = user?.Blur || null;
      const barColor = user?.BarColor || null;

      const buffer = await profileImage(targetMember.id, {
        customBackground: background,
        borderColor: color,
        moreBackgroundBlur: backgroundBlur,
        rankData: {
          currentXp: user.Xp,
          requiredXp: user.Level * 100,
          level: user.Level,
          barColor: barColor,
        },
      });

      await interaction.followUp({
        content: "Border color changed successfully.",
        // embeds: [
        //   new EmbedBuilder()
        //     .setColor("#087996")
        //     .setDescription("Here's a preview of your new border color:")
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
          BorderColor: color,
        },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.error(err);
    }
  },
};

