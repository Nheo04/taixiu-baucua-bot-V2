const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economy = require('../utils/economy');

const DAILY_AMOUNT = 500;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('diemdanh')
    .setDescription('Diem danh nhan xu mien phi moi ngay'),

  async execute(interaction) {
    const userId = interaction.user.id;
    if (!economy.canClaimDaily(userId)) {
      return interaction.reply({
        content: '⏳ Bạn đã điểm danh hôm nay rồi, quay lại sau 24 giờ nhé!',
        ephemeral: true,
      });
    }
    const newBalance = economy.claimDaily(userId, DAILY_AMOUNT);
    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('🎁 Điểm danh thành công')
      .setDescription(`Bạn nhận được **${DAILY_AMOUNT}** xu.\nSố dư hiện tại: **${newBalance}** xu.`);
    await interaction.reply({ embeds: [embed] });
  },
};
