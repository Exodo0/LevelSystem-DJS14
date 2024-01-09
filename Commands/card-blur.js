const {
  EmbedBuilder,
  AttachmentBuilder,
  SlashCommandBuilder,
} = require("discord.js");
const UserLevel = require("../Schemas/UserLevel");
const { profileImage } = require("discord-arts");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("card-blur")
    .setDescription("🔍 Add a blur to your card")
    .addNumberOption((option) =>
      option
        .setName("value")
        .setDescription("Blur value (0-10)")
        .setMinValue(0)
        .setMaxValue(10)
        .setRequired(true)
    ),
  async execute(interaction, client) {
    try {
      await interaction.deferReply();

      const blur = interaction.options.getNumber("value");
      const targetMember =
        interaction.options.getMember("member") || interaction.member;

      const user = await UserLevel.findOneAndUpdate(
        {
          GuildId: targetMember.guild.id,
          UserId: targetMember.user.id,
        },
        {
          Blur: Math.min(10, Math.max(0, blur)),
        },
        { upsert: true, new: true }
      );

      if (!user) {
        return await interaction.followUp({
          embeds: [
            new EmbedBuilder()
              .setColor("Red")
              .setDescription(
                `**${targetMember.user.username}** is not ranked yet. Start chatting to get ranked!`
              ),
          ],
        });
      }

      const background = user?.Background || null;
      const barColor = user?.BarColor || null;
      const borderColor = user?.BorderColor || null;

      const buffer = await profileImage(targetMember.id, {
        borderColor: borderColor,
        presenceStatus: targetMember.presence.status,
        customBackground: background,
        moreBackgroundBlur: blur,
        rankData: {
          currentXp: user.Xp,
          requiredXp: user.Level * 100,
          level: user.Level,
          barColor: barColor,
        },
      });

      const attachment = new AttachmentBuilder(buffer, {
        name: "profile.png",
      });

      const embed = new EmbedBuilder()
        .setDescription("Here's a preview of your new blur value:")
        .setImage("attachment://profile.png")
        .setColor("Aqua")
        .setTimestamp();

      await interaction.followUp({
        embeds: [embed],
        files: [attachment],
      });
    } catch (error) {
      console.error(error);
    }
  },
};
