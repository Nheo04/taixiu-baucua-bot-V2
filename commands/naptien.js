const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const economy = require('../utils/economy');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('naptien')
    .setDescription('[Admin] Cong xu cho mot nguoi choi')
    .addUserOption(option =>
      option.setName('nguoinhan')
        .setDescription('Nguoi ban muon cong xu')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('sotien')
        .setDescription('So xu muon cong (dung so am de tru xu)')
        .setRequired(true))
    // Ẩn lệnh này khỏi người không có quyền quản trị (chỉ mang tính gợi ý UI,
    // vẫn phải kiểm tra quyền thật trong code bên dưới)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    // Kiểm tra quyền admin thật sự — chặn trường hợp lệnh được dùng ở nơi
    // không áp dụng setDefaultMemberPermissions (ví dụ DM, hoặc admin server
    // đã tự chỉnh quyền lệnh này cho role khác)
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: '❌ Chỉ quản trị viên (Administrator) mới được dùng lệnh này.',
        ephemeral: true,
      });
    }

    const receiver = interaction.options.getUser('nguoinhan');
    const amount = interaction.options.getInteger('sotien');

    if (receiver.bot) {
      return interaction.reply({
        content: '❌ Không thể cộng xu cho bot.',
        ephemeral: true,
      });
    }

    if (amount === 0) {
      return interaction.reply({
        content: '❌ Số tiền phải khác 0.',
        ephemeral: true,
      });
    }

    const newBalance = economy.addBalance(receiver.id, amount);

    const embed = new EmbedBuilder()
      .setColor(amount > 0 ? 0x2ecc71 : 0xe74c3c)
      .setTitle(amount > 0 ? '💰 Đã nạp xu' : '📉 Đã trừ xu')
      .setDescription(
        `${amount > 0 ? 'Cộng' : 'Trừ'} **${Math.abs(amount)}** xu cho **${receiver.username}**.`
      )
      .addFields({ name: `Số dư mới của ${receiver.username}`, value: `${newBalance} xu` })
      .setFooter({ text: `Thực hiện bởi: ${interaction.user.username}` });

    await interaction.reply({ embeds: [embed] });
  },
};
