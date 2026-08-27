const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const economy = require('../utils/economy');
const session = require('../utils/session');

const MIN_BET = 10;
const MAX_BET = 250000;
const ROUND_SECONDS = 30;
const TICK_SECONDS = 5;

const ANIMALS = [
  { value: 'nai', name: 'Nai', emoji: '🦌' },
  { value: 'bau', name: 'Bầu', emoji: '🎃' },
  { value: 'ga', name: 'Gà', emoji: '🐓' },
  { value: 'ca', name: 'Cá', emoji: '🐟' },
  { value: 'cua', name: 'Cua', emoji: '🦀' },
  { value: 'tom', name: 'Tôm', emoji: '🦐' },
];

function rollAnimal() {
  return ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
}

function animalByValue(value) {
  return ANIMALS.find(a => a.value === value);
}

function buildIntroEmbed(secondsLeft) {
  return new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle('🐟 Công Ty Lừa Đảo - Nhà cái đến từ Việt Nam! 🔥🔥🔥')
    .setDescription(
      'Chọn **Bầu, Cua, Tôm, Cá, Gà** hoặc **Nai** để đặt cược. ' +
      `Sau khi chọn, hãy nhập số gold bạn muốn cược (tối đa ${MAX_BET.toLocaleString('vi-VN')} 🪙).\n\n` +
      '**Tỉ lệ trả thưởng:** trúng bao nhiêu con trong 3 xúc xắc, ăn gấp bấy nhiêu lần tiền cược.\n\n' +
      '⚠️ **LƯU Ý:** Bạn có thể đặt nhiều cược vào các con khác nhau trong cùng 1 ván!\n' +
      `Ván chơi sẽ bắt đầu ngay lập tức và đếm ngược ${ROUND_SECONDS} giây.`
    )
    .addFields({ name: '⏳ Đếm ngược', value: `**${secondsLeft}** giây` })
    .setFooter({ text: 'Bấm nút bên dưới để đặt cược' });
}

function buildResultEmbed(rolls, betCount) {
  const diceDisplay = rolls.map(r => `${r.emoji} ${r.name}`).join('    ');
  return new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle('🐟 Công Ty Lừa Đảo — Đã mở bát!')
    .setDescription(
      `Kết quả 3 xúc xắc:\n${diceDisplay}\n\n` +
      `Tổng số lượt cược đã đặt: **${betCount}**\n` +
      'Ai đã đặt cược sẽ nhận được kết quả riêng ở tin nhắn chỉ mình bạn thấy được.'
    )
    .setFooter({ text: 'Dùng /baucua để bắt đầu ván mới' });
}

function buildComponents(channelId, disabled = false) {
  const row1 = new ActionRowBuilder().addComponents(
    ANIMALS.slice(0, 3).map(a =>
      new ButtonBuilder()
        .setCustomId(`bcbet:${channelId}:${a.value}`)
        .setLabel(a.name)
        .setEmoji(a.emoji)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled)
    )
  );
  const row2 = new ActionRowBuilder().addComponents(
    ANIMALS.slice(3, 6).map(a =>
      new ButtonBuilder()
        .setCustomId(`bcbet:${channelId}:${a.value}`)
        .setLabel(a.name)
        .setEmoji(a.emoji)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled)
    )
  );
  return [row1, row2];
}

async function tick(interaction, gameSession) {
  const secondsLeft = Math.max(0, Math.round((gameSession.endTime - Date.now()) / 1000));

  if (secondsLeft <= 0) {
    clearInterval(gameSession.intervalId);
    await resolveRound(interaction, gameSession);
    return;
  }

  try {
    await interaction.editReply({ embeds: [buildIntroEmbed(secondsLeft)] });
  } catch (err) {
    console.error('Lỗi khi cập nhật đếm ngược bầu cua:', err.message);
  }
}

async function resolveRound(interaction, gameSession) {
  session.endSession(gameSession.channelId);
  gameSession.ended = true;

  const rolls = [rollAnimal(), rollAnimal(), rollAnimal()];

  // 1. Sửa tin nhắn gốc để mọi người trong kênh thấy kết quả công khai
  try {
    await interaction.editReply({
      embeds: [buildResultEmbed(rolls, gameSession.bets.length)],
      components: buildComponents(gameSession.channelId, true),
    });
  } catch (err) {
    console.error('Lỗi khi công bố kết quả bầu cua:', err.message);
  }

  // 2. Gửi kết quả riêng cho từng lượt cược
  for (const bet of gameSession.bets) {
    const matches = rolls.filter(r => r.value === bet.value).length;
    const chosenAnimal = animalByValue(bet.value);

    let resultLine;
    if (matches > 0) {
      const grossProfit = bet.amount * matches;
      const netProfit = Math.floor(grossProfit * 0.95);
      const payout = bet.amount + netProfit;
      const newBalance = economy.addBalance(bet.userId, payout);
      resultLine = `🎉 **THẮNG!** Trúng ${matches} con, lãi **${netProfit}** xu sau thuế 5% (nhận lại tổng ${payout} xu).\nSố dư hiện tại: **${newBalance}** xu.`;
    } else {
      const newBalance = economy.getBalance(bet.userId);
      resultLine = `😢 **THUA** **${bet.amount}** xu.\nSố dư hiện tại: **${newBalance}** xu.`;
    }

    const diceDisplay = rolls.map(r => `${r.emoji} ${r.name}`).join(' ');
    const content =
      `🎲 ${diceDisplay}\n` +
      `Cược của bạn: ${chosenAnimal.emoji} **${chosenAnimal.name}** — ${bet.amount} xu\n\n${resultLine}`;

    try {
      await bet.interaction.followUp({ content, ephemeral: true });
    } catch (err) {
      console.error(`Không gửi được kết quả bầu cua cho user ${bet.userId}:`, err.message);
    }
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('baucua')
    .setDescription('Bat dau mot van Bau Cua Tom Ca cho ca kenh cung choi'),

  buttonPrefix: 'bcbet',
  modalPrefix: 'bcmodal',

  async execute(interaction) {
    const channelId = interaction.channelId;

    if (session.getSession(channelId)) {
      return interaction.reply({
        content: '⚠️ Đang có 1 ván Bầu Cua diễn ra trong kênh này, đợi ván này kết thúc rồi hẵng mở ván mới nhé!',
        ephemeral: true,
      });
    }

    const endTime = Date.now() + ROUND_SECONDS * 1000;
    await interaction.reply({
      embeds: [buildIntroEmbed(ROUND_SECONDS)],
      components: buildComponents(channelId),
    });

    const newSession = {
      gameType: 'baucua',
      channelId,
      endTime,
      bets: [], // { userId, username, value, amount, interaction }
      ended: false,
    };
    session.createSession(channelId, newSession);

    newSession.intervalId = setInterval(() => tick(interaction, newSession), TICK_SECONDS * 1000);
  },

  async handleButton(interaction) {
    const [, channelId, value] = interaction.customId.split(':');
    const gameSession = session.getSession(channelId);

    if (!gameSession || gameSession.ended) {
      return interaction.reply({
        content: '⚠️ Ván chơi đã kết thúc hoặc không tồn tại. Dùng lệnh /baucua để bắt đầu ván mới.',
        ephemeral: true,
      });
    }

    const animal = animalByValue(value);
    const modal = new ModalBuilder()
      .setCustomId(`bcmodal:${channelId}:${value}`)
      .setTitle(`Cược vào ${animal.name} ${animal.emoji}`);

    const amountInput = new TextInputBuilder()
      .setCustomId('amount')
      .setLabel(`Số gold muốn cược (${MIN_BET} - ${MAX_BET})`)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ví dụ: 1000')
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(amountInput));
    await interaction.showModal(modal);
  },

  async handleModal(interaction) {
    const [, channelId, value] = interaction.customId.split(':');
    const gameSession = session.getSession(channelId);

    if (!gameSession || gameSession.ended) {
      return interaction.reply({
        content: '⚠️ Ván chơi đã kết thúc trước khi bạn kịp đặt cược, rất tiếc!',
        ephemeral: true,
      });
    }

    const raw = interaction.fields.getTextInputValue('amount').trim();
    const amount = Number(raw);

    if (!Number.isInteger(amount) || amount < MIN_BET || amount > MAX_BET) {
      return interaction.reply({
        content: `❌ Số tiền không hợp lệ. Nhập số nguyên từ ${MIN_BET} đến ${MAX_BET}.`,
        ephemeral: true,
      });
    }

    const balance = economy.getBalance(interaction.user.id);
    if (amount > balance) {
      return interaction.reply({
        content: `❌ Bạn không đủ xu! Số dư hiện tại: **${balance}** xu.`,
        ephemeral: true,
      });
    }

    economy.addBalance(interaction.user.id, -amount);

    gameSession.bets.push({
      userId: interaction.user.id,
      username: interaction.user.username,
      value,
      amount,
      interaction,
    });

    const animal = animalByValue(value);
    await interaction.reply({
      content: `✅ Đã đặt cược **${amount}** xu vào ${animal.emoji} **${animal.name}**. Chờ kết quả khi ván kết thúc nhé!`,
      ephemeral: true,
    });
  },
};
