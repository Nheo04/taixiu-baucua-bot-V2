require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

client.once('ready', () => {
  console.log(`✅ Bot đã đăng nhập với tên ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction);
      return;
    }

    if (interaction.isButton()) {
      // customId có dạng "prefix:channelId:..." -> tách lấy prefix để tìm đúng command xử lý
      const prefix = interaction.customId.split(':')[0];
      const command = [...client.commands.values()].find(c =>
        c.buttonPrefix === prefix || c.shopPrefix === prefix || c.buyPrefix === prefix
      );
      if (command) {
        if (prefix === command.shopPrefix && command.handleShopButton) await command.handleShopButton(interaction);
        else if (prefix === command.buyPrefix && command.handleShopButton) await command.handleShopButton(interaction);
        else if (command.handleButton) await command.handleButton(interaction);
      }
      return;
    }

    if (interaction.isModalSubmit()) {
      const prefix = interaction.customId.split(':')[0];
      const command = [...client.commands.values()].find(c => c.modalPrefix === prefix);
      if (command?.handleModal) await command.handleModal(interaction);
      return;
    }
  } catch (error) {
    console.error(error);
    const errorMessage = { content: '❌ Đã xảy ra lỗi khi thực hiện thao tác này!', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage).catch(() => {});
    } else if (interaction.isRepliable?.()) {
      await interaction.reply(errorMessage).catch(() => {});
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
