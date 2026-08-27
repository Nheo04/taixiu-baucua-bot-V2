const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economy = require('../utils/economy');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('chuyenxu')
    .setDescription('Chuyen xu cho nguoi choi khac')
    .addUserOption(option =>
      option.setName('nguoinhan')
        .setDescription('Nguoi ban muon chuyen xu den')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('sotien')
        .setDescription('So xu muon chuyen')
        .setRequired(true)
        .setMinValue(1)),

  async execute(interaction) {
    const senderId = interaction.user.id;
    const receiver = interaction.options.getUser('nguoinhan');
    const amount = interaction.options.getInteger('sotien');

    // Chặn các trường hợp không hợp lệ
    if (receiver.id === senderId) {
      return interaction.reply({
        content: '❌ Bạn không thể chuyển xu cho chính mình.',
        ephemeral: true,
      });
    }

    if (receiver.bot) {
      return interaction.reply({
        content: '❌ Không thể chuyển xu cho bot.',
        ephemeral: true,
      });
    }

    const senderBalance = economy.getBalance(senderId);
    if (amount > senderBalance) {
      return interaction.reply({
        content: `❌ Bạn không đủ xu! Số dư hiện tại: **${senderBalance}** xu.`,
        ephemeral: true,
      });
    }

    // Thực hiện chuyển: trừ người gửi, cộng người nhận
    const newSenderBalance = economy.addBalance(senderId, -amount);
    const newReceiverBalance = economy.addBalance(receiver.id, amount);

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('💸 Chuyển xu thành công')
      .setDescription(
        `**${interaction.user.username}** đã chuyển **${amount}** xu cho **${receiver.username}**.`
      )
      .addFields(
        { name: `Số dư của ${interaction.user.username}`, value: `${newSenderBalance} xu`, inline: true },
        { name: `Số dư của ${receiver.username}`, value: `${newReceiverBalance} xu`, inline: true },
      );

    await interaction.reply({ embeds: [embed] });
  },
};
