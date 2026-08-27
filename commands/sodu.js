const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economy = require('../utils/economy');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sodu')
    .setDescription('Xem so du xu cua ban'),

  async execute(interaction) {
    const balance = economy.getBalance(interaction.user.id);
    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('💰 Số dư')
      .setDescription(`${interaction.user.username}, bạn hiện có **${balance}** xu.`);
    await interaction.reply({ embeds: [embed] });
  },
};
