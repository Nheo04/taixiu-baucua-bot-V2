const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'economy.json');
const STARTING_BALANCE = 1000;
const MAX_ENERGY = 10;
const ENERGY_INTERVAL_MS = 15 * 60 * 1000;

function loadData() {
  const dir = path.dirname(DATA_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, JSON.stringify({}), 'utf8');
  }
  const raw = fs.readFileSync(DATA_PATH, 'utf8');
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function ensureUser(data, userId) {
  if (!data[userId]) {
    data[userId] = {
      balance: STARTING_BALANCE,
      lastDaily: 0,
      energy: MAX_ENERGY,
      energyUpdatedAt: Date.now(),
      luckLevel: 0,
      shieldLevel: 0,
      coinTier: 'bronze',
    };
  }
  const user = data[userId];
  user.energy ??= MAX_ENERGY;
  user.energyUpdatedAt ??= Date.now();
  user.luckLevel ??= 0;
  user.shieldLevel ??= 0;
  user.coinTier ??= 'bronze';
  return user;
}

function refreshEnergy(user) {
  const recovered = Math.floor((Date.now() - user.energyUpdatedAt) / ENERGY_INTERVAL_MS);
  if (recovered > 0) {
    user.energy = Math.min(MAX_ENERGY, user.energy + recovered);
    user.energyUpdatedAt = user.energy >= MAX_ENERGY
      ? Date.now()
      : user.energyUpdatedAt + recovered * ENERGY_INTERVAL_MS;
  }
}

function getBalance(userId) {
  const data = loadData();
  const user = ensureUser(data, userId);
  saveData(data);
  return user.balance;
}

function getPlayer(userId) {
  const data = loadData();
  const user = ensureUser(data, userId);
  refreshEnergy(user);
  saveData(data);
  return { ...user };
}

function consumeEnergy(userId) {
  const data = loadData();
  const user = ensureUser(data, userId);
  refreshEnergy(user);
  if (user.energy <= 0) {
    saveData(data);
    return false;
  }
  user.energy -= 1;
  user.energyUpdatedAt = Date.now();
  saveData(data);
  return true;
}

function buyUpgrade(userId, type, cost) {
  const data = loadData();
  const user = ensureUser(data, userId);
  refreshEnergy(user);
  if (user.balance < cost) {
    saveData(data);
    return { ok: false, missing: cost - user.balance };
  }
  user.balance -= cost;
  if (type === 'luck') user.luckLevel += 1;
  if (type === 'shield') user.shieldLevel += 1;
  if (type === 'silver') user.coinTier = 'silver';
  if (type === 'gold') user.coinTier = 'gold';
  saveData(data);
  return { ok: true, player: { ...user } };
}

function addBalance(userId, amount) {
  const data = loadData();
  const user = ensureUser(data, userId);
  user.balance += amount;
  saveData(data);
  return user.balance;
}

function debitBalance(userId, amount) {
  const data = loadData();
  const user = ensureUser(data, userId);
  const actualAmount = Math.min(user.balance, Math.max(0, amount));
  user.balance -= actualAmount;
  saveData(data);
  return { balance: user.balance, amount: actualAmount };
}

function canClaimDaily(userId) {
  const data = loadData();
  const user = ensureUser(data, userId);
  saveData(data);
  return Date.now() - (user.lastDaily || 0) >= 24 * 60 * 60 * 1000;
}

function claimDaily(userId, amount) {
  const data = loadData();
  const user = ensureUser(data, userId);
  user.balance += amount;
  user.lastDaily = Date.now();
  saveData(data);
  return user.balance;
}

module.exports = {
  getBalance,
  getPlayer,
  consumeEnergy,
  buyUpgrade,
  addBalance,
  debitBalance,
  canClaimDaily,
  claimDaily,
  STARTING_BALANCE,
  MAX_ENERGY,
  ENERGY_INTERVAL_MS,
};
