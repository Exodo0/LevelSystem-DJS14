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
    .setDescription("🏆 Configure Rankings or Check Levels.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("setup")
        .setDescription("🛠 Start configuring our ranking system.")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("🗒 Where should I send the level up notifications?")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addAttachmentOption((option) =>
          option
            .setName("image")
            .setDescription("🖼 Add your custom image as the background")
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("status")
        .setDescription(
          "🛠 Configure whether to enable or disable the leveling system."
        )
        .addStringOption((option) =>
          option
            .setName("turn")
            .setDescription("⚙️ Choose an option.")
            .setRequired(true)
            .addChoices(
              { name: "on", value: "on" },
              { name: "off", value: "off" }
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("view")
        .setDescription("🔎 Check the Level of a User or Your Own")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("👤 Which User's Level Do You Want to Check?")
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("leaderboard")
        .setDescription("📈 Check the Global Server Leaderboard.")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("delete").setDescription("🗑 Delete the Ranking System")
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
                .setTitle("⭕️ We Have a Problem.")
                .setColor("Red")
                .setDescription(
                  `It seems you don't have the necessary permissions: ${PermissionFlagsBits.ManageGuild} Contact an Administrator for assistance.`
                )
                .setThumbnail(guild.iconURL({ dynamic: true })),
            ],
          });

        const channelDB = await ChannelDB.findOne({ guild: guild.id });

        if (channelDB) {
          const Exist = new EmbedBuilder()
            .setTitle("⭕️ We Have a Problem.")
            .setColor("Red")
            .setFields(
              {
                name: "💠 The channel has already been previously configured.",
                value: `It is located in: <#${channelDB.channel}>`,
              },
              {
                name: "💠 If you want to change it, you will have to delete it and reconfigure it using:",
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
            image ||
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
                .setTitle("⭕️ We Have a Problem.")
                .setColor("Red")
                .setDescription(
                  `It seems I couldn't save the channel correctly. The developer has been notified. Please try again in the next 10 minutes.`
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
          // Generate the leaderboard table
          const table = new AsciiTable("Ranking");
          table.setHeading("Position", "User", "Level", "XP");

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
            .setTitle(`📊 Server Leaderboard: ${guild.name}`)
            .setColor("Random")
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .setDescription("```" + table.toString() + "```")
            .setFooter(
              { text: `Requested by: ${interaction.user.tag}` },
              { iconURL: interaction.user.displayAvatarURL({ dynamic: true }) }
            );

          interaction.reply({ embeds: [embed] });
        } else {
          // There are no registered users in the leaderboard
          const noRankingEmbed = new EmbedBuilder()
            .setTitle("📊 Leaderboard")
            .setColor("Random")
            .setDescription("There is currently no leaderboard available.")
            .setFooter(
              { text: `Requested by: ${interaction.user.tag}` },
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
                .setTitle("⭕️ We Have a Problem.")
                .setColor("Red")
                .setDescription(
                  `It seems you don't have the necessary permissions: ${PermissionFlagsBits.ManageGuild}. Contact an administrator for assistance.`
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
                .setTitle("⭕️ We Have a Problem.")
                .setColor("Red")
                .setDescription(
                  `It seems this server has not configured any channel yet. Contact an administrator to resolve this.`
                )
                .setThumbnail(guild.iconURL({ dynamic: true })),
            ],
          });
        }

        const deletedChannelDB = await ChannelDB.findOneAndDelete({
          channel: interaction.channel.id,
        });

        if (!deletedChannelDB) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle("⭕️ We Have a Problem.")
                .setColor("Red")
                .setDescription(
                  `I encountered an error while trying to delete the configured channel. Please try again in the next 10 minutes as our developer will be working to resolve it.`
                )
                .setThumbnail(guild.iconURL({ dynamic: true })),
            ],
          });
        }

        interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("💠 Configuration Successfully Deleted.")
              .setColor("Aqua")
              .setFields({
                name: "💠 Deleted by moderator:",
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

        await channelDB3.save(); // Guardar los cambios en la base de datos

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
