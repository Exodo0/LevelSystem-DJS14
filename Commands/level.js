const {
  EmbedBuilder,
  AttachmentBuilder,
  SlashCommandBuilder,
} = require("discord.js");
const UserLevel = require("../Schemas/UserLevel");
const { profileImage } = require("discord-arts");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("level")
    .setDescription("🔍 View your or another member´s level and exp progress")
    .addUserOption((option) =>
      option.setName("member").setDescription("Member which you'd like to view")
    ),

  async execute(interaction, client) {
    try {
      await interaction.deferReply();

      const targetMember =
        interaction.options.getMember("member") || interaction.member;

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
                `**${targetMember.user.username}** is not ranked yet. Start chatting to get ranked!`
              ),
          ],
        });
        return;
      }
      const background = user?.Background || null;
      const barColor = user?.BarColor || null;
      const borderColor = user?.BorderColor || null;

      const buffer = await profileImage(targetMember.id, {
        borderColor: borderColor,
        presenceStatus: targetMember.presence.status,
        customBackground: background,
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
        .setColor("#087996")
        .setImage("attachment://profile.png")
        .setTimestamp()
        .setFooter({ text: `Requested by: ${interaction.user.username}` });

      await interaction.followUp({
        embeds: [embed],
        files: [attachment],
      });
    } catch (error) {
      console.error(error);
      return;
    }
  },
};