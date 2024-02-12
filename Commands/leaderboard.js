const {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} = require("discord.js");
const UserLevel = require("../../Modules/DataBase/Ranking/UserLevel");
const canvafy = require("canvafy");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("🔍 View the server's leaderboard"),

  /**
   *
   * @param {ChatInputCommandInteraction} interaction
   * @param {Client} client
   */
  async execute(interaction, client) {
    try {
      await interaction.deferReply();

      const users = await UserLevel.find({
        GuildId: interaction.guild.id,
      }).sort({ Level: -1 });

      if (users.length === 0) {
        await interaction.followUp({
          content: "There are no users in the ranking yet.",
        });
        return;
      }

      const usersData = await Promise.all(
        users.map(async (user, index) => {
          const fetchedUser = await client.users.fetch(user.UserId);
          return {
            top: index + 1,
            tag: fetchedUser.username,
            avatar: fetchedUser.displayAvatarURL({
              format: "png",
              dynamic: true,
            }),
            score: user.Level.toString(),
          };
        })
      ).catch((error) => {
        console.error(error);
      });

      const top = await new canvafy.Top()
        .setOpacity(0.5)
        .setScoreMessage("Level")
        .setBackground(
          "image",
          "https://img.freepik.com/free-photo/ultra-detailed-nebula-abstract-wallpaper-4_1562-749.jpg"
        )
        .setUsersData(usersData)
        .build();

      await interaction.followUp({
        files: [
          {
            attachment: top,
            name: `top-${interaction.user.id}.png`,
          },
        ],
      });
    } catch (error) {
      console.error(error);
      interaction.followUp({
        content: "There was an error while executing this command.",
        ephemeral: true,
      });
    }
  },
};
