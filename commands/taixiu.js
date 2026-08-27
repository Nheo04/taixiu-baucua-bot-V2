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
const ROUND_SECONDS = 45;
const TICK_SECONDS = 5; // sửa tin nhắn mỗi 5s để tránh bị Discord rate-limit

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const NUMBER_ROWS = [[3, 4, 5, 6, 7], [8, 9, 10, 11, 12], [13, 14, 15, 16, 17], [18]];

function rollDie() {
  return Math.floor(Math.random() * 6) + 1;
}

function describeBet(bet) {
  if (bet.type === 'range') return bet.value === 'tai' ? 'Tài (11-18)' : 'Xỉu (3-10)';
  if (bet.type === 'parity') return bet.value === 'chan' ? 'Chẵn' : 'Lẻ';
  return `Số ${bet.value}`;
}

function buildIntroEmbed(secondsLeft) {
  return new EmbedBuilder()
    .setColor(0xe67e22)
    .setTitle('🎰 Tài Xỉu Nekō - Nhà cái đến từ Châu Á! 🔥🔥🔥')
    .setDescription(
      'Chọn **Tài (11-18)**, **Xỉu (3-10)**, **Chẵn/Lẻ** hoặc **số cụ thể (3-18)** để đặt cược. ' +
      `Sau khi chọn, hãy nhập số gold bạn muốn cược (tối đa ${MAX_BET.toLocaleString('vi-VN')} 🪙).\n\n` +
      '**Tỉ lệ trả thưởng:**\n' +
      '• Tài/Xỉu/Chẵn/Lẻ: 1:1\n' +
      '• Số cụ thể (3-18): 1:10\n\n' +
      '⚠️ **LƯU Ý:** Bạn có thể đặt nhiều cược khác nhau trong cùng 1 ván!\n' +
      `Ván chơi sẽ bắt đầu ngay lập tức và đếm ngược ${ROUND_SECONDS} giây.`
    )
    .addFields({ name: '⏳ Đếm ngược', value: `**${secondsLeft}** giây` })
    .setFooter({ text: 'Bấm nút bên dưới để đặt cược' });
}

function buildResultEmbed(dice, total, rangeResult, parityResult, betCount) {
  const diceDisplay = dice.map(d => DICE_FACES[d - 1]).join('  ');
  return new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle('🎲 Tài Xỉu Nekō — Đã có kết quả!')
    .setDescription(
      `${diceDisplay}   =   **${total}**\n\n` +
      `Tài/Xỉu: **${rangeResult === 'tai' ? 'Tài' : 'Xỉu'}**\n` +
      `Chẵn/Lẻ: **${parityResult === 'chan' ? 'Chẵn' : 'Lẻ'}**\n\n` +
      `Tổng số lượt cược đã đặt: **${betCount}**\n` +
      'Ai đã đặt cược sẽ nhận được kết quả riêng ở tin nhắn chỉ mình bạn thấy được.'
    )
    .setFooter({ text: 'Dùng /taixiu để bắt đầu ván mới' });
}

function buildComponents(channelId, disabled = false) {
  const typeRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`txbet:${channelId}:range:xiu`)
      .setLabel('Xỉu (3-10)')
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`txbet:${channelId}:range:tai`)
      .setLabel('Tài (11-18)')
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`txbet:${channelId}:parity:chan`)
      .setLabel('Chẵn')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`txbet:${channelId}:parity:le`)
      .setLabel('Lẻ')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
  );

  const numberRows = NUMBER_ROWS.map(row =>
    new ActionRowBuilder().addComponents(
      row.map(n =>
        new ButtonBuilder()
          .setCustomId(`txbet:${channelId}:number:${n}`)
          .setLabel(`Số ${n}`)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(disabled)
      )
    )
  );

  return [typeRow, ...numberRows];
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
    // Nếu message bị xoá hoặc lỗi mạng, không cần crash cả vòng lặp
    console.error('Lỗi khi cập nhật đếm ngược taixiu:', err.message);
  }
}

async function resolveRound(interaction, gameSession) {
  session.endSession(gameSession.channelId);
  gameSession.ended = true;

  const dice = [rollDie(), rollDie(), rollDie()];
  const total = dice.reduce((a, b) => a + b, 0);
  const rangeResult = total >= 11 ? 'tai' : 'xiu';
  const parityResult = total % 2 === 0 ? 'chan' : 'le';

  // 1. Sửa tin nhắn gốc để mọi người trong kênh thấy kết quả công khai
  try {
    await interaction.editReply({
      embeds: [buildResultEmbed(dice, total, rangeResult, parityResult, gameSession.bets.length)],
      components: buildComponents(gameSession.channelId, true),
    });
  } catch (err) {
    console.error('Lỗi khi công bố kết quả taixiu:', err.message);
  }

  // 2. Gửi kết quả riêng cho từng lượt cược
  for (const bet of gameSession.bets) {
    let win = false;
    let multiplier = 0;

    if (bet.type === 'range') {
      win = bet.value === rangeResult;
      multiplier = 1;
    } else if (bet.type === 'parity') {
      win = bet.value === parityResult;
      multiplier = 1;
    } else if (bet.type === 'number') {
      win = Number(bet.value) === total;
      multiplier = 10;
    }

    let resultLine;
    if (win) {
      const profit = bet.amount * multiplier;
      const newBalance = economy.addBalance(bet.userId, bet.amount + profit);
      resultLine = `🎉 **THẮNG!** Lãi **${profit}** xu (nhận lại tổng ${bet.amount + profit} xu).\nSố dư hiện tại: **${newBalance}** xu.`;
    } else {
      const newBalance = economy.getBalance(bet.userId);
      resultLine = `😢 **THUA** **${bet.amount}** xu.\nSố dư hiện tại: **${newBalance}** xu.`;
    }

    const diceDisplay = dice.map(d => DICE_FACES[d - 1]).join(' ');
    const content =
      `🎲 ${diceDisplay} = **${total}** (${rangeResult === 'tai' ? 'Tài' : 'Xỉu'} / ${parityResult === 'chan' ? 'Chẵn' : 'Lẻ'})\n` +
      `Cược của bạn: **${describeBet(bet)}** — ${bet.amount} xu\n\n${resultLine}`;

    try {
      await bet.interaction.followUp({ content, ephemeral: true });
    } catch (err) {
      console.error(`Không gửi được kết quả tài xỉu cho user ${bet.userId}:`, err.message);
    }
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('taixiu')
    .setDescription('Bat dau mot van Tai Xiu cho ca kenh cung choi'),

  buttonPrefix: 'txbet',
  modalPrefix: 'txmodal',

  async execute(interaction) {
    const channelId = interaction.channelId;

    if (session.getSession(channelId)) {
      return interaction.reply({
        content: '⚠️ Đang có 1 ván Tài Xỉu diễn ra trong kênh này, đợi ván này kết thúc rồi hẵng mở ván mới nhé!',
        ephemeral: true,
      });
    }

    const endTime = Date.now() + ROUND_SECONDS * 1000;
    await interaction.reply({
      embeds: [buildIntroEmbed(ROUND_SECONDS)],
      components: buildComponents(channelId),
    });

    const newSession = {
      gameType: 'taixiu',
      channelId,
      endTime,
      bets: [], // { userId, username, type, value, amount, interaction }
      ended: false,
    };
    session.createSession(channelId, newSession);

    newSession.intervalId = setInterval(() => tick(interaction, newSession), TICK_SECONDS * 1000);
  },

  // Người chơi bấm 1 trong các nút cược -> hiện modal nhập số tiền
  async handleButton(interaction) {
    const [, channelId, type, value] = interaction.customId.split(':');
    const gameSession = session.getSession(channelId);

    if (!gameSession || gameSession.ended) {
      return interaction.reply({
        content: '⚠️ Ván chơi đã kết thúc hoặc không tồn tại. Dùng lệnh /taixiu để bắt đầu ván mới.',
        ephemeral: true,
      });
    }

    const modal = new ModalBuilder()
      .setCustomId(`txmodal:${channelId}:${type}:${value}`)
      .setTitle('Nhập số tiền cược');

    const amountInput = new TextInputBuilder()
      .setCustomId('amount')
      .setLabel(`Số gold muốn cược (${MIN_BET} - ${MAX_BET})`)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ví dụ: 1000')
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(amountInput));
    await interaction.showModal(modal);
  },

  // Người chơi nhập số tiền xong -> lưu lượt cược vào phiên chơi
  async handleModal(interaction) {
    const [, channelId, type, value] = interaction.customId.split(':');
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

    // Trừ xu ngay khi đặt cược để "khoá" tiền, tránh cược vượt quá số dư thực có
    economy.addBalance(interaction.user.id, -amount);

    gameSession.bets.push({
      userId: interaction.user.id,
      username: interaction.user.username,
      type,
      value,
      amount,
      interaction, // giữ lại để gửi kết quả riêng khi ván kết thúc
    });

    await interaction.reply({
      content: `✅ Đã đặt cược **${amount}** xu vào **${describeBet({ type, value })}**. Chờ kết quả khi ván kết thúc nhé!`,
      ephemeral: true,
    });
  },
};
