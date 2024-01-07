const {
  EmbedBuilder,
  SlashCommandBuilder,
  ChannelType,
} = require("discord.js");
const NotifySchema = require("../Schemas/NotifySchema");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ranking-notify")
    .setDescription("🔍 Setup a channel to notify when a user levels up.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("set")
        .setDescription("Set a channel to notify when a user levels up.")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Channel to notify when a user levels up.")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Remove a channel to notify when a user levels up.")
    ),

  async execute(interaction, client) {
    try {
      await interaction.deferReply();
      const sub = interaction.options.getSubcommand();

      if (sub === "set") {
        const channel = interaction.options.getChannel("channel");
        const guildId = interaction.guild.id;

        // Verificar si ya hay una configuración para el canal en la base de datos
        const existingConfig = await NotifySchema.findOne({ GuildId: guildId });

        if (existingConfig) {
          // Actualizar la configuración existente
          existingConfig.ChannelId = channel.id;
          await existingConfig.save();

          await interaction.followUp({
            embeds: [
              new EmbedBuilder()
                .setColor("#087996")
                .setDescription(`Notification channel updated to ${channel}.`),
            ],
          });
        } else {
          // Crear una nueva configuración si no existe
          const newConfig = new NotifySchema({
            GuildId: guildId,
            ChannelId: channel.id,
            Status: true,
          });
          await newConfig.save();

          await interaction.followUp({
            embeds: [
              new EmbedBuilder()
                .setColor("#087996")
                .setDescription(`Notification channel set to ${channel}.`),
            ],
          });
        }
      } else if (sub === "remove") {
        const guildId = interaction.guild.id;

        // Buscar y actualizar el ChannelId a null
        const updatedConfig = await NotifySchema.findOneAndUpdate(
          { GuildId: guildId },
          { ChannelId: null },
          { new: true }
        );

        if (updatedConfig) {
          await interaction.followUp({
            embeds: [
              new EmbedBuilder()
                .setColor("#087996")
                .setDescription("Notification channel removed."),
            ],
          });
        } else {
          await interaction.followUp({
            embeds: [
              new EmbedBuilder()
                .setColor("Red")
                .setDescription("No notification channel configured."),
            ],
          });
        }
      }
    } catch (error) {
      console.error(error);
    }
  },
};
