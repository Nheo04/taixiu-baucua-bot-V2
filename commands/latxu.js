const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const economy = require('../utils/economy');

const COINS = {
  bronze: { name: '🪙 Xu Đồng', win: 10, loss: 10, chance: 50 },
  silver: { name: '🥈 Xu Bạc', win: 30, loss: 25, chance: 55 },
  gold: { name: '🥇 Xu Vàng', win: 80, loss: 60, chance: 60 },
};
const UPGRADES = {
  luck: { label: '🍀 May Mắn', baseCost: 100 },
  shield: { label: '🛡️ Bảo Hiểm', baseCost: 120 },
};

function formatNumber(value) {
  return value.toLocaleString('vi-VN');
}

function energyBar(energy) {
  return `${'⚡'.repeat(energy)}${'⚫'.repeat(economy.MAX_ENERGY - energy)}`;
}

function playerEmbed(interaction, player, status = 'Sẵn sàng cho một lượt thử vận may!') {
  const coin = COINS[player.coinTier];
  const chance = Math.min(100, coin.chance + player.luckLevel);
  const penalty = Math.max(0, coin.loss - player.shieldLevel * 2);
  return new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle('🎰 MINIGAME: LẬT ĐỒNG XU MAY MẮN 🎰')
    .setThumbnail(interaction.user.displayAvatarURL({ extension: 'png', size: 128 }))
    .setDescription(status)
    .addFields(
      { name: '💰 Số dư', value: `**${formatNumber(player.balance)}** xu`, inline: true },
      { name: '🪙 Loại xu', value: coin.name, inline: true },
      { name: '⚡ Thể lực', value: `${energyBar(player.energy)} (${player.energy}/10)`, inline: false },
      { name: '📊 Cấu hình', value: `Thắng **+${coin.win}** | Phạt **-${penalty}** | May mắn **+${player.luckLevel}%** | Giảm phạt **${player.shieldLevel * 2}** xu`, inline: false },
    )
    .setFooter({ text: 'Mỗi lượt tốn 1 Thể lực • Hồi 1 Thể lực mỗi 15 phút' });
}

function controls(userId) {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`ltflip:${userId}`).setLabel('Tung Đồng Xu').setEmoji('🪙').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`ltshop:${userId}`).setLabel('Nâng Cấp').setEmoji('🛠️').setStyle(ButtonStyle.Primary),
  )];
}

function shopComponents(userId, player) {
  const nextLuckCost = Math.floor(UPGRADES.luck.baseCost * Math.pow(player.luckLevel + 1, 1.5));
  const nextShieldCost = Math.floor(UPGRADES.shield.baseCost * Math.pow(player.shieldLevel + 1, 1.5));
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`ltbuy:${userId}:luck`).setLabel(`May Mắn ${formatNumber(nextLuckCost)}`).setEmoji('🍀').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`ltbuy:${userId}:shield`).setLabel(`Bảo Hiểm ${formatNumber(nextShieldCost)}`).setEmoji('🛡️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`ltbuy:${userId}:silver`).setLabel('Xu Bạc 500').setEmoji('🥈').setStyle(ButtonStyle.Secondary).setDisabled(player.coinTier !== 'bronze'),
    new ButtonBuilder().setCustomId(`ltbuy:${userId}:gold`).setLabel('Xu Vàng 2.000').setEmoji('🥇').setStyle(ButtonStyle.Secondary).setDisabled(player.coinTier === 'gold'),
  )];
}

module.exports = {
  data: new SlashCommandBuilder().setName('latxu').setDescription('Lat dong xu may man de nhan xu'),
  buttonPrefix: 'ltflip',
  shopPrefix: 'ltshop',
  buyPrefix: 'ltbuy',

  async execute(interaction) {
    const player = economy.getPlayer(interaction.user.id);
    await interaction.reply({ embeds: [playerEmbed(interaction, player)], components: controls(interaction.user.id) });
  },

  async handleButton(interaction) {
    const [, userId, type] = interaction.customId.split(':');
    if (interaction.user.id !== userId) return interaction.reply({ content: '🔒 Đây là bảng điều khiển của người chơi khác.', ephemeral: true });
    const player = economy.getPlayer(userId);
    if (type === 'shop' || interaction.customId.startsWith('ltshop:')) {
      return interaction.reply({ embeds: [playerEmbed(interaction, player, '🛠️ **CỬA HÀNG NÂNG CẤP**\nGiá nâng cấp tăng theo cấp hiện tại: giá gốc × cấp tiếp theo^1.5')], components: shopComponents(userId, player), ephemeral: true });
    }
    if (!economy.consumeEnergy(userId)) {
      return interaction.reply({ embeds: [playerEmbed(interaction, player, '⚡ Bạn đã kiệt sức! Hãy nghỉ ngơi chờ thể lực hồi lại nhé.')], ephemeral: true });
    }
    const afterEnergy = economy.getPlayer(userId);
    const coin = COINS[afterEnergy.coinTier];
    const chance = Math.min(100, coin.chance + afterEnergy.luckLevel);
    const won = Math.random() * 100 < chance;
    const penalty = Math.max(0, coin.loss - afterEnergy.shieldLevel * 2);
    const amount = won ? coin.win : penalty;
    const result = won ? economy.addBalance(userId, amount) : economy.debitBalance(userId, amount).balance;
    const status = won
      ? `✨ **KẾT QUẢ: MẶT TIỀN!**\nBạn nhận được **+${amount} xu** 🪙`
      : `💀 **KẾT QUẢ: MẶT ĐẦU LÂU!**\nBạn bị mất **-${amount} xu** 💸`;
    await interaction.update({ embeds: [playerEmbed(interaction, { ...afterEnergy, balance: result }, status)], components: controls(userId) });
  },

  async handleShopButton(interaction) {
    const [, userId, type] = interaction.customId.split(':');
    if (interaction.user.id !== userId) return interaction.reply({ content: '🔒 Đây là cửa hàng của người chơi khác.', ephemeral: true });
    const player = economy.getPlayer(userId);
    let cost;
    if (type === 'luck') cost = Math.floor(100 * Math.pow(player.luckLevel + 1, 1.5));
    else if (type === 'shield') cost = Math.floor(120 * Math.pow(player.shieldLevel + 1, 1.5));
    else if (type === 'silver') cost = 500;
    else if (type === 'gold') cost = 2000;
    else return interaction.reply({ content: '❌ Nâng cấp không hợp lệ.', ephemeral: true });
    const result = economy.buyUpgrade(userId, type, cost);
    if (!result.ok) return interaction.reply({ content: `💸 Bạn không đủ xu! Cần thêm **${formatNumber(result.missing)} xu** nữa.`, ephemeral: true });
    await interaction.update({ embeds: [playerEmbed(interaction, result.player, `✅ Đã mua **${UPGRADES[type]?.label || COINS[result.player.coinTier].name}** với giá **${formatNumber(cost)} xu**.`)], components: controls(userId) });
  },
};