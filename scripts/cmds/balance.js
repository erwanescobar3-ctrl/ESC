const fs = require("fs-extra");
const path = require("path");
const fetch = require("node-fetch");

let loadImage, createCanvas, registerFont;
let canvasAvailable = false;

try {
  const canvas = require("canvas");
  loadImage = canvas.loadImage;
  createCanvas = canvas.createCanvas;
  registerFont = canvas.registerFont;
  canvasAvailable = true;
} catch (error) {
  console.error("Canvas module not available:", error.message);
}

if (canvasAvailable && registerFont) {
  try {
    const fontDir = path.join(__dirname, 'assets', 'font');
    if (fs.existsSync(path.join(fontDir, 'BeVietnamPro-Bold.ttf'))) {
      registerFont(path.join(fontDir, 'BeVietnamPro-Bold.ttf'), { family: 'BeVietnamPro-Bold' });
    }
    if (fs.existsSync(path.join(fontDir, 'BeVietnamPro-Regular.ttf'))) {
      registerFont(path.join(fontDir, 'BeVietnamPro-Regular.ttf'), { family: 'BeVietnamPro-Regular' });
    }
  } catch (error) {
    console.log("Font registration error:", error.message);
  }

  try {
    const fontsDir = path.join(__dirname, "fonts");
    if (fs.existsSync(fontsDir)) {
      const fontFiles = fs.readdirSync(fontsDir);
      for (const fontFile of fontFiles) {
        if (fontFile.endsWith(".ttf") || fontFile.endsWith(".otf")) {
          const fontPath = path.join(fontsDir, fontFile);
          const fontName = path.basename(fontFile, path.extname(fontFile));
          registerFont(fontPath, { family: fontName });
        }
      }
    }
  } catch (error) {
    console.log("Custom fonts loading error:", error.message);
  }
}

if (canvasAvailable) {
  try {
    if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
      CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
        if (width < 2 * radius) radius = width / 2;
        if (height < 2 * radius) radius = height / 2;
        this.beginPath();
        this.moveTo(x + radius, y);
        this.arcTo(x + width, y, x + width, y + height, radius);
        this.arcTo(x + width, y + height, x, y + height, radius);
        this.arcTo(x, y + height, x, y, radius);
        this.arcTo(x, y, x + width, y, radius);
        this.closePath();
        return this;
      };
    }
  } catch (error) {
    console.log("Canvas context polyfill error:", error.message);
  }
}

const CONFIG = {
  currency: {
    symbol: "$",
    name: "Dollar",
    decimalPlaces: 2
  },
  transfer: {
    minAmount: 10,
    maxAmount: 1000000,
    taxRates: [
      { max: 1000, rate: 2 },
      { max: 10000, rate: 5 },
      { max: 50000, rate: 8 },
      { max: 100000, rate: 10 },
      { max: 500000, rate: 12 },
      { max: 1000000, rate: 15 }
    ],
    dailyLimit: 500000
  },
  dailyBonus: {
    baseAmount: 100,
    streakMultiplier: 0.1,
    maxStreak: 30,
    resetHours: 21
  },
  card: {
    width: 1000,
    height: 600,
    borderRadius: 0
  },
  tiers: [
    { name: "Starter", min: 0, max: 999, color: "#cd7f32", multiplier: 1.0 },
    { name: "Rookie", min: 1000, max: 4999, color: "#c0c0c0", multiplier: 1.1 },
    { name: "Pro", min: 5000, max: 19999, color: "#ffd700", multiplier: 1.2 },
    { name: "Elite", min: 20000, max: 49999, color: "#e5e4e2", multiplier: 1.3 },
    { name: "Master", min: 50000, max: 99999, color: "#0ff", multiplier: 1.5 },
    { name: "Legend", min: 100000, max: 499999, color: "#ff00ff", multiplier: 2.0 },
    { name: "God", min: 500000, max: Infinity, color: "#ff0000", multiplier: 3.0 }
  ]
};

function formatMoney(amount) {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return `${CONFIG.currency.symbol}0`;
  }
  amount = Number(amount);
  if (amount === Infinity) return `${CONFIG.currency.symbol}∞`;
  if (amount === -Infinity) return `${CONFIG.currency.symbol}-∞`;
  if (!isFinite(amount)) return `${CONFIG.currency.symbol}NaN`;
  const scales = [
    { value: 1e18, suffix: "Qi" },
    { value: 1e15, suffix: "Qa" },
    { value: 1e12, suffix: "T" },
    { value: 1e9, suffix: "B" },
    { value: 1e6, suffix: "M" },
    { value: 1e3, suffix: "K" }
  ];
  const scale = scales.find(s => Math.abs(amount) >= s.value);
  if (scale) {
    const scaledValue = amount / scale.value;
    const formatted = Math.abs(scaledValue).toFixed(CONFIG.currency.decimalPlaces);
    const cleanValue = formatted.endsWith(".00") ? formatted.slice(0, -3) : formatted;
    return `${amount < 0 ? "-" : ""}${CONFIG.currency.symbol}${cleanValue}${scale.suffix}`;
  }
  const parts = Math.abs(amount).toFixed(CONFIG.currency.decimalPlaces).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${amount < 0 ? "-" : ""}${CONFIG.currency.symbol}${parts.join(".")}`;
}

function getTierInfo(balance) {
  const validBalance = Number(balance) || 0;
  for (const tier of CONFIG.tiers) {
    if (validBalance >= tier.min && validBalance <= tier.max) {
      return {
        ...tier,
        nextTier: CONFIG.tiers[CONFIG.tiers.indexOf(tier) + 1] || null,
        progress: tier.max === Infinity ? 100 : Math.min(100, ((validBalance - tier.min) / (tier.max - tier.min)) * 100)
      };
    }
  }
  return {
    name: "Unknown",
    color: "#888888",
    multiplier: 1.0
  };
}

function calculateTax(amount) {
  let applicableRate = 0;
  for (const rate of CONFIG.transfer.taxRates) {
    if (amount <= rate.max) {
      applicableRate = rate.rate;
      break;
    }
  }
  if (applicableRate === 0) {
    applicableRate = CONFIG.transfer.taxRates[CONFIG.transfer.taxRates.length - 1].rate;
  }
  const tax = Math.ceil((amount * applicableRate) / 100);
  const total = amount + tax;
  return { rate: applicableRate, tax, total, netAmount: amount };
}

function generateTransactionID() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `TX${timestamp}${random}`.toUpperCase();
}

async function loadUserAvatar(usersData, targetID) {
  try {
    const avatarURL = await usersData.getAvatarUrl(targetID);
    if (!avatarURL) return null;
    const response = await fetch(avatarURL);
    if (!response.ok) return null;
    const buffer = await response.buffer();
    if (buffer.length < 100) return null;
    return await loadImage(buffer);
  } catch (error) {
    console.log("Avatar load error:", error.message);
    return null;
  }
}

let fonts;
try {
  fonts = require('../../func/font.js');
} catch (error) {
  console.log("Fonts module not found, using fallback");
}

module.exports = {
  config: {
    name: "balance",
    aliases: ["bal", "$", "cash"],
    version: "6.0",
    author: "Christus",
    countDown: 3,
    role: 0,
    description: canvasAvailable ? "Systeme economique avec carte stylisee" : "Systeme economique (mode texte)",
    category: "economy",
    guide: {
      fr: canvasAvailable ?
        "{pn} - voir ton solde\n{pn} @utilisateur - voir le solde d'un autre\n{pn} t @utilisateur montant - transferer de l'argent\n{pn} daily - bonus quotidien\n{pn} top [page] - classement\n{pn} rank - ton rang" :
        "{pn} - voir ton solde\n{pn} @utilisateur - voir le solde d'un autre\n{pn} t @utilisateur montant - transferer de l'argent\n{pn} daily - bonus quotidien\n{pn} top [page] - classement\n{pn} rank - ton rang"
    }
  },

  onStart: async function ({ message, event, args, usersData, api }) {
    const { senderID, mentions, messageReply, threadID } = event;
    const command = args[0]?.toLowerCase();

    if (command === "daily") {
      const userData = await usersData.get(senderID);
      const now = Date.now();
      const lastDaily = userData.lastDaily || 0;
      const dailyStreak = userData.dailyStreak || 0;
      const hoursSinceLast = (now - lastDaily) / (1000 * 60 * 60);
      if (hoursSinceLast < CONFIG.dailyBonus.resetHours) {
        const hoursLeft = Math.ceil(CONFIG.dailyBonus.resetHours - hoursSinceLast);
        const response = `⏰ Vous avez deja reclame votre bonus quotidien aujourd'hui !\n🔄 Prochain bonus dans ${hoursLeft} heures\n🔥 Streak actuel : ${dailyStreak} jours`;
        return message.reply(fonts?.bold ? fonts.bold(response) : response);
      }
      const baseBonus = CONFIG.dailyBonus.baseAmount;
      const streakBonus = Math.min(dailyStreak * CONFIG.dailyBonus.streakMultiplier * baseBonus, baseBonus * 5);
      const totalBonus = Math.round(baseBonus + streakBonus);
      const newStreak = hoursSinceLast < CONFIG.dailyBonus.resetHours * 2 ? dailyStreak + 1 : 1;
      await usersData.set(senderID, {
        money: (userData.money || 0) + totalBonus,
        lastDaily: now,
        dailyStreak: newStreak
      });
      const bonusMessage = `
🎉 BONUS QUOTIDIEN ! 🎉

💰 Bonus de base : ${formatMoney(baseBonus)}
🔥 Bonus de streak : ${formatMoney(streakBonus)}
🎁 Total recu : ${formatMoney(totalBonus)}

📈 Nouveau streak : ${newStreak} jour${newStreak !== 1 ? 's' : ''}
💸 Nouveau solde : ${formatMoney((userData.money || 0) + totalBonus)}

💡 Revenez demain pour un bonus plus grand !
      `.trim();
      return message.reply(fonts?.bold ? fonts.bold(bonusMessage) : bonusMessage);
    }

    if (command === "rank") {
      const userData = await usersData.get(senderID);
      const balance = userData.money || 0;
      const tierInfo = getTierInfo(balance);
      const allUsers = await usersData.getAll();
      const sortedUsers = allUsers.sort((a, b) => (b.money || 0) - (a.money || 0));
      const globalRank = sortedUsers.findIndex(user => user.userID === senderID) + 1;
      const totalUsers = sortedUsers.length;
      const rankMessage = `
🏆 INFORMATION DE RANG

👤 Joueur : ${userData.name || "Utilisateur"}
💰 Solde : ${formatMoney(balance)}
🥇 Rang : ${tierInfo.name}
📊 Classement global : #${globalRank} sur ${totalUsers}
📈 Progression vers le prochain rang : ${tierInfo.progress.toFixed(1)}%

💡 Prochain rang : ${tierInfo.nextTier ? tierInfo.nextTier.name : 'RANG MAX'}
🎯 Necessaire : ${tierInfo.nextTier ? formatMoney(tierInfo.nextTier.min - balance) : 'N/A'}

💎 Multiplicateur de rang : ${tierInfo.multiplier}x
      `.trim();
      return message.reply(fonts?.bold ? fonts.bold(rankMessage) : rankMessage);
    }

    if (command === "top") {
      const page = parseInt(args[1]) || 1;
      const perPage = 10;
      const allUsers = await usersData.getAll();
      const wealthyUsers = allUsers.filter(user => user.money > 0).sort((a, b) => (b.money || 0) - (a.money || 0));
      const totalPages = Math.ceil(wealthyUsers.length / perPage);
      const startIndex = (page - 1) * perPage;
      const endIndex = startIndex + perPage;
      const pageUsers = wealthyUsers.slice(startIndex, endIndex);
      if (pageUsers.length === 0) {
        const msg = "📭 Aucun utilisateur sur cette page !";
        return message.reply(fonts?.bold ? fonts.bold(msg) : msg);
      }
      let leaderboardText = `🏆 CLASSEMENT DES RICHES (Page ${page}/${totalPages}) 🏆\n\n`;
      pageUsers.forEach((user, index) => {
        const globalRank = startIndex + index + 1;
        const rankEmoji = ["🥇", "🥈", "🥉"][globalRank - 1] || `🏅`;
        const name = user.name || "Inconnu";
        const money = user.money || 0;
        const tier = getTierInfo(money);
        leaderboardText += `${rankEmoji} #${globalRank}. ${name}\n`;
        leaderboardText += `   💰 ${formatMoney(money)} | ${tier.name}\n`;
        leaderboardText += `   ───────────────\n`;
      });
      if (totalPages > 1) {
        leaderboardText += `\n📖 Utilisez : !balance top <page> pour naviguer`;
        leaderboardText += `\n👤 Votre position : #${wealthyUsers.findIndex(u => u.userID === senderID) + 1}`;
      }
      return message.reply(fonts?.bold ? fonts.bold(leaderboardText) : leaderboardText);
    }

    if (command === "transfer" || command === "send" || command === "pay" || command === "t") {
      let targetID = Object.keys(mentions)[0] || messageReply?.senderID || args[1];
      const amountRaw = args.find(a => !isNaN(parseFloat(a)) && parseFloat(a) > 0);
      const amount = parseFloat(amountRaw);
      if (!targetID || isNaN(amount)) {
        const usage = `
💸 Utilisation du transfert :
!balance transfer @utilisateur montant
Exemple : !bal transfer @John 1000

📊 Taux de taxe :
• ≤ $1,000 : 2%
• ≤ $10,000 : 5%
• ≤ $50,000 : 8%
• ≤ $100,000 : 10%
• ≤ $500,000 : 12%
• > $500,000 : 15%
        `.trim();
        return message.reply(fonts?.bold ? fonts.bold(usage) : usage);
      }
      if (targetID === senderID) {
        const msg = "❌ Vous ne pouvez pas vous envoyer de l'argent a vous-meme.";
        return message.reply(fonts?.bold ? fonts.bold(msg) : msg);
      }
      if (amount < CONFIG.transfer.minAmount) {
        const msg = `❌ Le montant minimum de transfert est ${formatMoney(CONFIG.transfer.minAmount)}.`;
        return message.reply(fonts?.bold ? fonts.bold(msg) : msg);
      }
      if (amount > CONFIG.transfer.maxAmount) {
        const msg = `❌ Le montant maximum de transfert est ${formatMoney(CONFIG.transfer.maxAmount)}.`;
        return message.reply(fonts?.bold ? fonts.bold(msg) : msg);
      }
      const [sender, receiver] = await Promise.all([
        usersData.get(senderID),
        usersData.get(targetID)
      ]);
      if (!receiver) {
        const msg = "❌ Utilisateur cible introuvable dans la base de donnees.";
        return message.reply(fonts?.bold ? fonts.bold(msg) : msg);
      }
      const taxInfo = calculateTax(amount);
      if ((sender.money || 0) < taxInfo.total) {
        const needed = taxInfo.total - (sender.money || 0);
        const msg = `
❌ Fonds insuffisants !

💵 Montant a envoyer : ${formatMoney(amount)}
🏛️ Taxe (${taxInfo.rate}%) : ${formatMoney(taxInfo.tax)}
💸 Total necessaire : ${formatMoney(taxInfo.total)}
💰 Votre solde : ${formatMoney(sender.money || 0)}
📉 Manque : ${formatMoney(needed)}
        `.trim();
        return message.reply(fonts?.bold ? fonts.bold(msg) : msg);
      }
      await Promise.all([
        usersData.set(senderID, { money: (sender.money || 0) - taxInfo.total }),
        usersData.set(targetID, { money: (receiver.money || 0) + amount })
      ]);
      const [senderName, receiverName] = await Promise.all([
        usersData.getName(senderID),
        usersData.getName(targetID)
      ]);
      const transactionID = generateTransactionID();
      const successMessage = `
✅ TRANSFERT REUSSI ! 💸
━━━━━━━━━━━━━━━━━━━━
📋 ID Transaction : ${transactionID}
👤 De : ${senderName}
🎯 Vers : ${receiverName}
━━━━━━━━━━━━━━━━━━━━
💰 Montant envoye : ${formatMoney(amount)}
🏛️ Taxe deduite : ${formatMoney(taxInfo.tax)} (${taxInfo.rate}%)
💸 Total debite : ${formatMoney(taxInfo.total)}
━━━━━━━━━━━━━━━━━━━━
📊 Nouveau solde expediteur : ${formatMoney((sender.money || 0) - taxInfo.total)}
💳 Nouveau solde destinataire : ${formatMoney((receiver.money || 0) + amount)}
━━━━━━━━━━━━━━━━━━━━
⏰ Heure : ${new Date().toLocaleTimeString()}
✅ Statut : Verifie et securise
      `.trim();
      return message.reply(fonts?.bold ? fonts.bold(successMessage) : successMessage);
    }

    let targetID = senderID;
    if (Object.keys(mentions).length > 0) targetID = Object.keys(mentions)[0];
    else if (messageReply) targetID = messageReply.senderID;

    const [userData, allUsers] = await Promise.all([
      usersData.get(targetID),
      usersData.getAll()
    ]);
    if (!userData) {
      const msg = "❌ Utilisateur introuvable.";
      return message.reply(fonts?.bold ? fonts.bold(msg) : msg);
    }
    const userName = userData.name || "Utilisateur";
    const balance = userData.money || 0;
    const tierInfo = getTierInfo(balance);
    const sortedUsers = allUsers.sort((a, b) => (b.money || 0) - (a.money || 0));
    const globalRank = sortedUsers.findIndex(user => user.userID === targetID) + 1;
    const totalUsers = sortedUsers.length;

    let avatarImage = null;
    if (canvasAvailable) {
      try {
        avatarImage = await loadUserAvatar(usersData, targetID);
      } catch (error) {
        console.log("Avatar load failed, using fallback");
      }
    }

    if (!canvasAvailable) {
      const fallbackMessage = `
💳 Information du compte

👤 Utilisateur : ${userName}
💰 Solde : ${formatMoney(balance)}
🏆 Rang : ${tierInfo.name}
📊 Classement : #${globalRank} sur ${totalUsers}
🎯 Progression : ${tierInfo.progress.toFixed(1)}% vers le prochain rang

💡 Commandes :
• !balance daily - Bonus quotidien
• !balance transfer - Envoyer de l'argent
• !balance top - Classement
      `.trim();
      return message.reply(fonts?.bold ? fonts.bold(fallbackMessage) : fallbackMessage);
    }

    const canvas = createCanvas(CONFIG.card.width, CONFIG.card.height);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, CONFIG.card.width, CONFIG.card.height);

    const margin = 60;
    const nameY = 120;
    const uidY = 180;
    const rankY = 260;
    const balanceLabelY = 360;
    const balanceValueY = 480;

    let nameFontSize = 64;
    let nameText = userName.toUpperCase();
    ctx.font = `bold ${nameFontSize}px "BeVietnamPro-Bold", "Arial", sans-serif`;
    while (ctx.measureText(nameText).width > CONFIG.card.width - 2 * margin && nameFontSize > 20) {
      nameFontSize -= 4;
      ctx.font = `bold ${nameFontSize}px "BeVietnamPro-Bold", "Arial", sans-serif`;
    }
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(nameText, CONFIG.card.width / 2, nameY);

    ctx.font = `32px "BeVietnamPro-Regular", "Arial", sans-serif`;
    ctx.fillStyle = "#aaaaaa";
    ctx.fillText(`UID: ${targetID}`, CONFIG.card.width / 2, uidY);

    ctx.font = `bold 36px "BeVietnamPro-Bold", "Arial", sans-serif`;
    ctx.fillStyle = "#ffcc00";
    ctx.fillText(`RANK: #${globalRank}`, CONFIG.card.width / 2, rankY);

    ctx.font = `bold 40px "BeVietnamPro-Regular", "Arial", sans-serif`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText("CURRENT BALANCE", CONFIG.card.width / 2, balanceLabelY);

    let balanceFontSize = 96;
    let balanceText = formatMoney(balance);
    ctx.font = `bold ${balanceFontSize}px "BeVietnamPro-Bold", "Arial", sans-serif`;
    while (ctx.measureText(balanceText).width > CONFIG.card.width - 2 * margin && balanceFontSize > 30) {
      balanceFontSize -= 8;
      ctx.font = `bold ${balanceFontSize}px "BeVietnamPro-Bold", "Arial", sans-serif`;
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillText(balanceText, CONFIG.card.width / 2, balanceValueY);

    if (avatarImage) {
      const avatarSize = 120;
      const avatarX = CONFIG.card.width - avatarSize - 50;
      const avatarY = 50;
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(avatarImage, avatarX, avatarY, avatarSize, avatarSize);
      ctx.restore();
    }

    const tmpDir = path.join(__dirname, "cache");
    if (!fs.existsSync(tmpDir)) {
      fs.ensureDirSync(tmpDir);
    }
    const filePath = path.join(tmpDir, `balance_${targetID}_${Date.now()}.png`);
    fs.writeFileSync(filePath, canvas.toBuffer("image/png"));

    const responseBody = `Solde de ${userName} : ${formatMoney(balance)}`;
    await message.reply({
      body: responseBody,
      attachment: fs.createReadStream(filePath)
    }, () => {
      fs.unlinkSync(filePath);
    });
  }
};
