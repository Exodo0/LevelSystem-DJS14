const {
  AttachmentBuilder,
  SlashCommandBuilder,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  ChatInputCommandInteraction,
} = require("discord.js");
const AsciiTable = require("ascii-table");
const table = new AsciiTable().setHeading("#", "User", "Level", "XP");
const { Rank } = require("canvacord");
const User = require("../../Schemas/Ranking/RankingSchema");
const ChannelDB = require("../../Schemas/Ranking/RankingChannelSchema");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ranking")
    .setDescription("🏆 Configura los Ranking o Revisa los niveles.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("setup")
        .setDescription(
          "🛠 Comencemos a configurar nuestro sistema de rankings."
        )
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("🗒 Donde enviare los avisos de aumento de nivel?")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addAttachmentOption((option) =>
          option
            .setName("image")
            .setDescription("🖼 Agrega tu imagen personalizada al background")
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("status")
        .setDescription(
          "🛠 Configura si quieres desactivar o activar el sistema de niveles."
        )
        .addStringOption((option) =>
          option
            .setName("turn")
            .setDescription("⚙️ Elige una opcion.")
            .setRequired(true)
            .addChoices(
              { name: "on", value: "activate" },
              { name: "off", value: "disabled" }
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("view")
        .setDescription("🔎 Revisa el Nivel de Algun Usuario o El tuyo")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("👤 A que Usuario Quieres Revisar?")
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("leaderboard")
        .setDescription("📈 Revisa el Ranking Global del Servidor.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("delete")
        .setDescription("🗑 Borra el Sistema de Rankings")
    ),

  /**
   * @param { Client } client
   * @param { ChatInputCommandInteraction} interaction
   */

  async execute(interaction, client) {
    const { options, guild } = interaction;

    switch (options.getSubcommand()) {
      case "setup":
        const channel = options.getChannel("channel");
        const image = options.getAttachment("image");

        if (
          !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)
        )
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle("⭕️ Tenemos un Problema.")
                .setColor("Red")
                .setDescription(
                  `Al parecer no cuentas con los permisos necesarios: ${PermissionFlagsBits.ManageGuild} Contacta a un Administrador para que te Asesore.`
                )
                .setThumbnail(guild.iconURL({ dynamic: true })),
            ],
          });

        const channelDB = await ChannelDB.findOne({ guild: guild.id });

        if (channelDB) {
          const Exist = new EmbedBuilder()
            .setTitle("⭕️ Tenemos un Problema.")
            .setColor("Red")
            .setFields(
              {
                name: "💠 El canal ya fue previamente configurado.",
                value: `Se encuentra en: <#${channelDB.channel}>`,
              },
              {
                name: "💠 Si quieres cambiarlo tendrás que eliminarlo y volver a configurarlo usando:",
                value: "`/ranking delete`",
              }
            );
          return interaction.reply({
            embeds: [Exist],
            ephemeral: true,
          });
        }

        const completedEmbed = new EmbedBuilder()
          .setColor("Green")
          .setImage(
            image.proxyURL ||
              "https://wallpapertag.com/wallpaper/full/e/c/6/477550-most-popular-hubble-ultra-deep-field-wallpaper-1920x1200.jpg"
          )
          .setFields(
            {
              name: "💠 Ranking Announcement Channel Successfully Configured",
              value: `Moderator: <@${interaction.member.id}>`,
            },
            {
              name: "Configured Channel:",
              value: `<#${channel.id}>`,
              inline: true,
            },
            {
              name: "If you added a background image",
              value:
                "You will see it in this embed, or you will see the default image.",
            }
          )
          .setTimestamp();

        interaction.reply({
          embeds: [completedEmbed],
        });

        const newChannelDB = new ChannelDB({
          guild: guild.id,
          channel: channel.id,
          image: image?.proxyURL || "default-image-url",
        });

        const savedChannelDB = await newChannelDB.save();

        if (!savedChannelDB) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle("⭕️ Tenemos un Problema.")
                .setColor("Red")
                .setDescription(
                  `Al parecer no pude guardar correctamente el canal. Fue notificado al desarrollador. Por favor, vuelve a intentarlo en los próximos 10 minutos.`
                )
                .setThumbnail(guild.iconURL({ dynamic: true })),
            ],
          });
        }

        break;

      case "view":
        const member = options.getMember("user") || interaction.member;
        let channelDBS;
        let user;
        const guildId = member.guild.id;
        const userId = member.user.id;
        user = await User.findOne({ guildId, userId });

        if (!user) {
          user = {
            level: 1,
            xp: 0,
          };
        }

        channelDBS = await ChannelDB.findOne({ guild: guildId });

        const rank = new Rank()
          .setAvatar(member.user.displayAvatarURL())
          .setCurrentXP(user.xp)
          .setLevel(user.level)
          .setRank(0, 0, false)
          .setRequiredXP(user.level * 100)
          .setStatus("online")
          .setProgressBar("#75ff7e", "COLOR")
          .setUsername(member.user.username)
          .setBackground(
            "IMAGE",
            channelDBS?.image ||
              "https://wallpapertag.com/wallpaper/full/e/c/6/477550-most-popular-hubble-ultra-deep-field-wallpaper-1920x1200.jpg"
          );

        rank.build().then((data) => {
          interaction.reply({
            files: [new AttachmentBuilder(data, { name: "rank.png" })],
          });
        });
        break;

      case "leaderboard":
        const users = await User.find({ guildId: guild.id })
          .sort({ level: -1 })
          .limit(10);

        const startIndex = 0;

        if (users.length) {
          // Generar la tabla de clasificación
          const table = new AsciiTable("Ranking");
          table.setHeading("Posición", "Usuario", "Nivel", "XP");

          users.forEach((user, position) => {
            const member = interaction.guild.members.cache.get(user.userId);
            table.addRow(
              startIndex + position + 1,
              member ? member.user.username : "Unknown User",
              user.level,
              user.xp
            );
          });

          const embed = new EmbedBuilder()
            .setTitle(`📊 Leaderboard del Servidor: ${guild.name}`)
            .setColor("Random")
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .setDescription("```" + table.toString() + "```")
            .setFooter(
              { text: `Pedido por: ${interaction.user.tag}` },
              { iconURL: interaction.user.displayAvatarURL({ dynamic: true }) }
            );

          interaction.reply({ embeds: [embed] });
        } else {
          // No hay usuarios registrados en la tabla de clasificación
          const noRankingEmbed = new EmbedBuilder()
            .setTitle("📊 Leaderboard")
            .setColor("Random")
            .setDescription(
              "No hay una tabla de clasificación disponible actualmente."
            )
            .setFooter(
              { text: `Requested by ${interaction.user.tag}` },
              { iconURL: interaction.user.displayAvatarURL({ dynamic: true }) }
            );

          interaction.reply({ embeds: [noRankingEmbed] });
        }
        break;
      case "delete":
        if (
          !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)
        )
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle("⭕️ Tenemos un Problema.")
                .setColor("Red")
                .setDescription(
                  `Al parecer no cuentas con los permisos necesarios: ${PermissionFlagsBits.ManageGuild} Contacta a un Administrador para que te Asesore.`
                )
                .setThumbnail(guild.iconURL({ dynamic: true })),
            ],
          });

        const channelDB2 = await ChannelDB.findOne(
          { guild: guild.id },
          { channel: interaction.channel.id }
        );

        if (!channelDB2) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle("⭕️ Tenemos un Problema.")
                .setColor("Red")
                .setDescription(
                  `Al parecer este servidor aun no configura ningun canal. Contacta a un administrador para que lo solucione.`
                )
                .setThumbnail(guild.iconURL({ dynamic: true })),
            ],
          });
        }

        const deletedChannelDB = await ChannelDB.findOneAndDelete({
          guild: guild.id,
        });

        if (!deletedChannelDB) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle("⭕️ Tenemos un Problema.")
                .setColor("Red")
                .setDescription(
                  `Obtuve un error al intentar borrar el canal configurado. Intentalo en los proxmios 10 minutos nuestro desarrollador estara trabajando para solucionarlo`
                )
                .setThumbnail(guild.iconURL({ dynamic: true })),
            ],
          });
        }

        interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("💠 Hecho Borrado con exito la configuracion.")
              .setColor("Aqua")
              .setFields({
                name: "💠 Borrado por el moderador:",
                value: `<@${interaction.member.id}>`,
              })
              .setThumbnail(guild.iconURL({ dynamic: true })),
          ],
          ephemeral: true,
        });
        break;
      case "status":
        const status = interaction.options.getString("turn");
        const channelDB3 = await ChannelDB.findOne({ guild: guild.id });

        if (status === "on") {
          channelDB3.status = true;
        } else if (status === "off") {
          channelDB3.status = false;
        }

        await channelDB3.save();

        const statusText = channelDB3.status ? "on" : "off";

        const embed = new EmbedBuilder()
          .setTitle("💠 System Configuration Complete")
          .setThumbnail(guild.iconURL({ dynamic: true }))
          .setColor("Random")
          .setFields(
            { name: "Moderator:", value: `${interaction.user.username}` },
            {
              name: "The leveling system has been configured as:",
              value: `Leveling: ${statusText}`,
            }
          )
          .setTimestamp();

        interaction.reply({ embeds: [embed], ephemeral: true });
        break;
    }
  },
};
