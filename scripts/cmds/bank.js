const fs = require("fs-extra");
const path = require("path");

let fonts;
try {
  fonts = require('../../func/font.js');
} catch (error) {
  fonts = { bold: (msg) => msg };
}

function formatMoney(amount) {
  if (isNaN(amount) || amount === null || amount === undefined) return "$0";
  amount = Number(amount);
  if (amount === Infinity) return "$∞";
  if (amount === -Infinity) return "-$∞";
  if (!isFinite(amount)) return "$NaN";

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
    const scaled = (amount / scale.value).toFixed(2);
    const clean = scaled.endsWith(".00") ? scaled.slice(0, -3) : scaled;
    return `${amount < 0 ? "-" : ""}$${clean}${scale.suffix}`;
  }
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function parseAmount(raw, contextMax = 0) {
  if (!raw) return NaN;
  const s = String(raw).trim().toLowerCase();
  if (s === "all" || s === "max") return Math.floor(contextMax);
  if (s === "half") return Math.floor(contextMax / 2);
  const match = s.match(/^(\d+(?:\.\d+)?)([kmbtq]?)$/i);
  if (!match) return NaN;
  let num = parseFloat(match[1]);
  const suffix = (match[2] || "").toLowerCase();
  const mult = suffix === "k" ? 1e3
              : suffix === "m" ? 1e6
              : suffix === "b" ? 1e9
              : suffix === "t" ? 1e12
              : suffix === "q" ? 1e15
              : 1;
  const val = Math.floor(num * mult);
  return val > 0 ? val : NaN;
}

function getTransactionEmoji(type) {
  const emojis = {
    deposit: "💰", withdrawal: "💸", transfer_in: "📥", transfer_out: "📤",
    loan: "🏦", loan_repayment: "💳", savings_deposit: "🏛️", interest_earned: "📈",
    interest_charged: "📉", investment: "📊", dividend: "💰", salary: "💼",
    business_income: "🏢", rental_income: "🏠", gambling_win: "🎰", gambling_loss: "💸",
    stock_purchase: "📊", stock_sale: "📈", crypto_purchase: "₿", crypto_sale: "₿",
    bond_purchase: "🏛️", property_purchase: "🏠", vehicle_purchase: "🚗",
    luxury_purchase: "💎", insurance_purchase: "🛡️", vault_deposit: "🔐",
    vault_withdrawal: "🔓", daily_reward: "🎁", work: "💼", robbery_success: "🏴‍☠️",
    robbery_failed: "🚔", robbed: "⚠️"
  };
  return emojis[type] || "💼";
}

const marketData = {
  stocks: {
    "AAPL": { price: 150.25, change: 2.1, name: "Apple Inc." },
    "GOOGL": { price: 2800.50, change: 1.8, name: "Alphabet Inc." },
    "TSLA": { price: 800.75, change: -0.5, name: "Tesla Inc." },
    "MSFT": { price: 320.40, change: 1.2, name: "Microsoft Corp." },
    "AMZN": { price: 3200.00, change: 0.8, name: "Amazon.com Inc." },
    "META": { price: 330.00, change: 2.5, name: "Meta Platforms Inc." },
    "NVDA": { price: 450.00, change: 3.2, name: "NVIDIA Corp." },
    "NFLX": { price: 380.00, change: -1.1, name: "Netflix Inc." }
  },
  crypto: {
    "BTC": { price: 45000, change: 3.2, name: "Bitcoin" },
    "ETH": { price: 3200, change: 2.8, name: "Ethereum" },
    "BNB": { price: 400, change: 1.5, name: "Binance Coin" },
    "ADA": { price: 1.20, change: 4.1, name: "Cardano" },
    "DOT": { price: 25.50, change: 2.3, name: "Polkadot" },
    "LINK": { price: 28.00, change: 1.9, name: "Chainlink" },
    "MATIC": { price: 0.85, change: 5.1, name: "Polygon" },
    "SOL": { price: 120.00, change: 3.8, name: "Solana" }
  },
  bonds: {
    "US_TREASURY": { yield: 2.5, risk: "Low", term: "10 Year" },
    "CORPORATE": { yield: 3.8, risk: "Medium", term: "5 Year" },
    "MUNICIPAL": { yield: 2.1, risk: "Low", term: "7 Year" },
    "HIGH_YIELD": { yield: 6.2, risk: "High", term: "3 Year" }
  },
  properties: {
    "APARTMENT": { price: 250000, income: 2500, name: "City Apartment" },
    "HOUSE": { price: 500000, income: 4000, name: "Suburban House" },
    "MANSION": { price: 2000000, income: 15000, name: "Luxury Mansion" },
    "OFFICE": { price: 1000000, income: 8000, name: "Commercial Office" },
    "WAREHOUSE": { price: 750000, income: 6000, name: "Industrial Warehouse" },
    "MALL": { price: 5000000, income: 40000, name: "Shopping Mall" }
  },
  vehicles: {
    "TOYOTA": { price: 25000, depreciation: 0.85, name: "Toyota Camry" },
    "BMW": { price: 60000, depreciation: 0.70, name: "BMW M3" },
    "FERRARI": { price: 300000, depreciation: 0.90, name: "Ferrari 488" },
    "LAMBORGHINI": { price: 400000, depreciation: 0.85, name: "Lamborghini Huracan" },
    "ROLLS_ROYCE": { price: 500000, depreciation: 0.80, name: "Rolls-Royce Phantom" },
    "BUGATTI": { price: 3000000, depreciation: 0.75, name: "Bugatti Chiron" }
  },
  businesses: {
    "COFFEE_SHOP": { cost: 50000, income: 5000, employees: 3, name: "Coffee Shop" },
    "RESTAURANT": { cost: 150000, income: 12000, employees: 8, name: "Restaurant" },
    "TECH_STARTUP": { cost: 500000, income: 50000, employees: 20, name: "Tech Startup" },
    "HOTEL": { cost: 2000000, income: 150000, employees: 50, name: "Hotel Chain" },
    "BANK": { cost: 10000000, income: 800000, employees: 200, name: "Regional Bank" },
    "AIRLINE": { cost: 50000000, income: 3000000, employees: 1000, name: "Airline Company" }
  },
  luxury: {
    "ROLEX": { price: 15000, name: "Rolex Submariner" },
    "PAINTING": { price: 100000, name: "Van Gogh Replica" },
    "DIAMOND": { price: 50000, name: "5 Carat Diamond" },
    "YACHT": { price: 2000000, name: "Luxury Yacht" },
    "PRIVATE_JET": { price: 25000000, name: "Private Jet" },
    "ISLAND": { price: 100000000, name: "Private Island" }
  }
};

function calculatePortfolioValue(bank) {
  let total = 0;
  for (const [symbol, shares] of Object.entries(bank.stocks || {})) {
    total += shares * (marketData.stocks[symbol]?.price || 100);
  }
  for (const [coin, amount] of Object.entries(bank.crypto || {})) {
    total += amount * (marketData.crypto[coin]?.price || 1);
  }
  for (const [type, amount] of Object.entries(bank.bonds || {})) {
    total += amount;
  }
  return total;
}

function calculateRealEstateValue(bank) {
  return (bank.realEstate || []).reduce((sum, p) => sum + p.value, 0);
}

function calculateBusinessValue(bank) {
  return (bank.businesses || []).reduce((sum, b) => {
    const base = marketData.businesses[b.type]?.cost || 100000;
    return sum + base * b.level;
  }, 0);
}

function calculateVehicleValue(bank) {
  return (bank.vehicles || []).reduce((sum, v) => sum + v.currentValue, 0);
}

function calculateLuxuryValue(bank) {
  return (bank.luxury || []).reduce((sum, l) => sum + l.value, 0);
}

module.exports = {
  config: {
    name: "bank",
    aliases: ["banking", "finance"],
    version: "5.0",
    author: "Christus",
    countDown: 0,
    role: 0,
    description: "Systeme bancaire complet avec 50+ fonctionnalites",
    category: "economy",
    guide: {
      fr: "{pn} help - Affiche toutes les commandes bancaires"
    }
  },

  onStart: async function ({ message, args, event, usersData, api }) {
    const { senderID } = event;
    const sub = (args[0] || "").toLowerCase();

    let user = await usersData.get(senderID);
    if (!user.data.bank) {
      user.data.bank = {
        balance: 0, savings: 0, vault: 0, loan: 0, loanDate: null,
        creditScore: 750, bankLevel: 1, multiplier: 1.0, premium: false,
        streak: 0, lastDaily: null, lastWork: null, lastRob: null,
        lastInterest: Date.now(), lotteryTickets: 0, achievements: [],
        reputation: 0, skills: { gambling: 0, trading: 0, business: 0, investing: 0 },
        stocks: {}, crypto: {}, bonds: {}, realEstate: [], businesses: [],
        vehicles: [], luxury: [], insurance: {}, transactions: []
      };
    }
    const bank = user.data.bank;
    const wallet = user.money || 0;

    const save = async () => {
      user.data.bank = bank;
      await usersData.set(senderID, user);
    };

    try {
      if (sub === "help" || !sub) {
        const helpText = `
${fonts.bold("🏦 BANKING SYSTEM")}
━━━━━━━━━━━━━━━━
${fonts.bold("💎 The Ultimate Financial Experience 💎")}

${fonts.bold("💰 BASIC BANKING")} ${fonts.bold("━━━━━━━━━━━━━")}
🏦 bank balance - Check your complete financial overview
💵 bank deposit <amount> - Secure your money in the bank
💸 bank withdraw <amount> - Access your funds instantly
📤 bank transfer <@user> <amount> - Send money to friends
💳 bank loan <amount> - Get financing for your dreams
🔄 bank repay <amount> - Build your credit score
🏛️ bank savings <amount> - Grow your wealth safely
📊 bank interest - Calculate your earnings
💰 bank collect - Claim your interest rewards
📋 bank history - View your transaction timeline
🎁 bank daily - Claim daily bonuses (24h cooldown)
💼 bank work - Earn money through various jobs

${fonts.bold("📈 INVESTMENTS")} ${fonts.bold("━━━━━━━━━━━━━")}
🚀 bank invest - Explore investment opportunities
📊 bank stocks [list/buy/sell] - Trade blue-chip stocks
₿ bank crypto [list/buy/sell] - Cryptocurrency trading
🏛️ bank bonds [list/buy] - Government bonds
📊 bank portfolio - View your investment portfolio
📈 bank market - Live market prices & trends
💰 bank dividend - Collect investment dividends

${fonts.bold("🏢 BUSINESS & REAL ESTATE")} ${fonts.bold("━━━━━━━━━━━━━")}
🏢 bank business [list/buy/collect] - Build your empire
🏠 bank property [list/buy] - Premium properties
💰 bank rent - Collect passive rental income

${fonts.bold("💎 LUXURY")} ${fonts.bold("━━━━━━━━━━━━━")}
💎 bank luxury [list/buy] - Exclusive collectibles
🚗 bank car [list/buy] - Luxury vehicles

${fonts.bold("🎰 GAMING")} ${fonts.bold("━━━━━━━━━━━━━")}
🎲 bank gamble <amount> - High-risk, high-reward games
🎫 bank lottery [buy/check] - Weekly lottery draws
🎰 bank slots <amount> - Vegas-style slot machines
🃏 bank blackjack <amount> - Classic card game
🎯 bank roulette <amount> <bet> - European roulette

${fonts.bold("⭐ PREMIUM & SOCIAL")} ${fonts.bold("━━━━━━━━━━━━━")}
💎 bank premium [buy] - 2x earnings & exclusive perks
🔐 bank vault [deposit/withdraw] - Ultra-secure storage
🛡️ bank insurance [list/buy] - Protect your assets
📊 bank credit - Monitor your credit score
🏆 bank achievements - Unlock rewards & titles
🏆 bank leaderboard - Compete with top users
🏴‍☠️ bank rob <@user> - Risky robbery attempts
`;
        return message.reply(fonts.bold(helpText));
      }

      if (sub === "balance" || sub === "bal") {
        const portfolioValue = calculatePortfolioValue(bank);
        const realEstateValue = calculateRealEstateValue(bank);
        const businessValue = calculateBusinessValue(bank);
        const vehicleValue = calculateVehicleValue(bank);
        const luxuryValue = calculateLuxuryValue(bank);

        const totalLiquid = bank.balance + bank.savings + bank.vault + wallet;
        const totalAssets = portfolioValue + realEstateValue + businessValue + vehicleValue + luxuryValue;
        const totalWealth = totalLiquid + totalAssets;

        let wealthTier = "👤 Beginner";
        let tierEmoji = "🔰";
        if (totalWealth >= 1e9) { wealthTier = "💎 Billionaire"; tierEmoji = "👑"; }
        else if (totalWealth >= 1e6) { wealthTier = "🏆 Millionaire"; tierEmoji = "⭐"; }
        else if (totalWealth >= 1e5) { wealthTier = "💰 Wealthy"; tierEmoji = "✨"; }
        else if (totalWealth >= 1e4) { wealthTier = "📈 Rising"; tierEmoji = "🚀"; }

        let creditRating = "Poor";
        let creditEmoji = "🔴";
        if (bank.creditScore >= 800) { creditRating = "Excellent"; creditEmoji = "🟢"; }
        else if (bank.creditScore >= 740) { creditRating = "Very Good"; creditEmoji = "🟢"; }
        else if (bank.creditScore >= 670) { creditRating = "Good"; creditEmoji = "🟡"; }
        else if (bank.creditScore >= 580) { creditRating = "Fair"; creditEmoji = "🟠"; }

        const balanceText = `
${fonts.bold("💳 FINANCIAL DASHBOARD")} ${tierEmoji}
━━━━━━━━━━━━━
${fonts.bold(wealthTier)} • ${fonts.bold("Level " + bank.bankLevel)}${bank.premium ? " • 💎 Premium" : ""}

${fonts.bold("💰 LIQUID ASSETS")} ${fonts.bold("━━━━━━━━━━━━━")}
💵 Wallet: ${fonts.bold(formatMoney(wallet))}
🏦 Bank: ${fonts.bold(formatMoney(bank.balance))}
🏛️ Savings: ${fonts.bold(formatMoney(bank.savings))} ${bank.savings > 0 ? "(+3% monthly)" : ""}
🔐 Vault: ${fonts.bold(formatMoney(bank.vault))} ${bank.vault > 0 ? "(+1% monthly)" : ""}
├─ ${fonts.bold("Total Liquid: " + formatMoney(totalLiquid))}

${fonts.bold("📊 ASSET PORTFOLIO")} ${fonts.bold("━━━━━━━━━━━━━")}
📈 Investments: ${fonts.bold(formatMoney(portfolioValue))}
🏠 Real Estate: ${fonts.bold(formatMoney(realEstateValue))}
🏢 Businesses: ${fonts.bold(formatMoney(businessValue))}
🚗 Vehicles: ${fonts.bold(formatMoney(vehicleValue))}
💎 Luxury: ${fonts.bold(formatMoney(luxuryValue))}
├─ ${fonts.bold("Total Assets: " + formatMoney(totalAssets))}

${fonts.bold("🏆 WEALTH SUMMARY")} ${fonts.bold("━━━━━━━━━━━━━")}
💎 ${fonts.bold("Net Worth: " + formatMoney(totalWealth))}
${creditEmoji} Credit Score: ${fonts.bold(bank.creditScore + "/850")} (${creditRating})
🎯 Max Loan: ${fonts.bold(formatMoney(bank.creditScore * 1000))}
⚡ Earnings Multiplier: ${fonts.bold(bank.multiplier + "x")}${bank.premium ? " (Premium Boost!)" : ""}

${fonts.bold("📈 PERFORMANCE METRICS")} ${fonts.bold("━━━━━━━━━━━━━")}
🔥 Daily Streak: ${fonts.bold(bank.streak + " days")} ${bank.streak >= 7 ? "🎉" : ""}
🏆 Achievements: ${fonts.bold((bank.achievements?.length || 0) + "/100")} ${bank.achievements?.length >= 10 ? "⭐" : ""}
⭐ Reputation: ${fonts.bold(bank.reputation)} ${bank.reputation >= 100 ? "👑" : ""}
💸 Active Loan: ${fonts.bold(bank.loan > 0 ? formatMoney(bank.loan) : "None ✅")}

${fonts.bold("🎲 GAMING STATS")} ${fonts.bold("━━━━━━━━━━━━━")}
🎰 Gambling Skill: ${fonts.bold(bank.skills?.gambling || 0)}
📊 Trading Skill: ${fonts.bold(bank.skills?.trading || 0)}
🏢 Business Skill: ${fonts.bold(bank.skills?.business || 0)}
📈 Investing Skill: ${fonts.bold(bank.skills?.investing || 0)}`;
        return message.reply(balanceText);
      }

      if (sub === "deposit" || sub === "dep") {
        const amount = parseAmount(args[1], wallet);
        if (!amount || amount <= 0) {
          return message.reply(fonts.bold(`
💰 DEPOSIT HELP
━━━━━━━━━━━━━

Usage: bank deposit <amount>
Example: bank deposit 5000

Your current wallet: ${formatMoney(wallet)}
`));
        }
        if (wallet < amount) {
          return message.reply(fonts.bold(`❌ Insufficient funds. You have ${formatMoney(wallet)}.`));
        }
        user.money = wallet - amount;
        bank.balance += amount;
        bank.transactions.push({ type: "deposit", amount, date: Date.now(), description: "Cash deposit" });
        if (!bank.achievements.includes("First Deposit")) bank.achievements.push("First Deposit");
        if (amount >= 1000000 && !bank.achievements.includes("Million Dollar Deposit")) bank.achievements.push("Million Dollar Deposit");
        await save();
        return message.reply(fonts.bold(`
💰 DEPOSIT SUCCESSFUL!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💵 Amount Deposited: ${formatMoney(amount)}
🏦 New Bank Balance: ${formatMoney(bank.balance)}
💳 Remaining Wallet: ${formatMoney(user.money)}
`));
      }

      if (sub === "withdraw" || sub === "wd") {
        const amount = parseAmount(args[1], bank.balance);
        if (!amount || amount <= 0) {
          return message.reply(fonts.bold(`
💸 WITHDRAWAL HELP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Usage: bank withdraw <amount>
Example: bank withdraw 5000

Your current bank balance: ${formatMoney(bank.balance)}
`));
        }
        if (bank.balance < amount) {
          return message.reply(fonts.bold(`❌ Insufficient bank funds. You have ${formatMoney(bank.balance)}.`));
        }
        user.money = (user.money || 0) + amount;
        bank.balance -= amount;
        bank.transactions.push({ type: "withdrawal", amount, date: Date.now(), description: "Cash withdrawal" });
        await save();
        return message.reply(fonts.bold(`
💸 WITHDRAWAL SUCCESSFUL!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💵 Amount Withdrawn: ${formatMoney(amount)}
💳 New Wallet Balance: ${formatMoney(user.money)}
🏦 Remaining Bank Balance: ${formatMoney(bank.balance)}
`));
      }

      if (sub === "transfer" || sub === "send") {
        const targetUID = Object.keys(event.mentions)[0];
        const amount = parseAmount(args[2], bank.balance);
        if (!targetUID) return message.reply(fonts.bold("❌ Please mention a user to transfer to."));
        if (targetUID === senderID) return message.reply(fonts.bold("❌ You cannot transfer to yourself."));
        if (!amount || amount <= 0) return message.reply(fonts.bold("❌ Invalid amount."));
        if (bank.balance < amount) return message.reply(fonts.bold(`❌ Insufficient funds. You have ${formatMoney(bank.balance)}.`));

        let targetUser = await usersData.get(targetUID);
        if (!targetUser) return message.reply(fonts.bold("❌ Target user not found."));
        if (!targetUser.data.bank) {
          targetUser.data.bank = {
            balance: 0, savings: 0, vault: 0, loan: 0, loanDate: null,
            creditScore: 750, bankLevel: 1, multiplier: 1.0, premium: false,
            streak: 0, lastDaily: null, lastWork: null, lastRob: null,
            lastInterest: Date.now(), lotteryTickets: 0, achievements: [],
            reputation: 0, skills: { gambling: 0, trading: 0, business: 0, investing: 0 },
            stocks: {}, crypto: {}, bonds: {}, realEstate: [], businesses: [],
            vehicles: [], luxury: [], insurance: {}, transactions: []
          };
        }
        const targetBank = targetUser.data.bank;
        bank.balance -= amount;
        targetBank.balance += amount;
        bank.transactions.push({ type: "transfer_out", amount, target: targetUID, date: Date.now() });
        targetBank.transactions.push({ type: "transfer_in", amount, source: senderID, date: Date.now() });
        await usersData.set(senderID, user);
        await usersData.set(targetUID, targetUser);
        return message.reply(fonts.bold(`✅ Transferred ${formatMoney(amount)} to ${targetUser.name}. New balance: ${formatMoney(bank.balance)}`));
      }

      if (sub === "loan") {
        const amount = parseInt(args[1]);
        if (!amount || amount <= 0) {
          const maxLoan = bank.creditScore * 1000;
          return message.reply(fonts.bold(`
💳 LOAN INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your Credit Score: ${bank.creditScore}
Maximum Loan: ${formatMoney(maxLoan)}
Interest Rate: 5% per week
Current Loan: ${bank.loan > 0 ? formatMoney(bank.loan) : "None"}

Usage: bank loan <amount>
Example: bank loan 50000
`));
        }
        if (bank.loan > 0) return message.reply(fonts.bold(`❌ You already have an active loan of ${formatMoney(bank.loan)}. Repay it first.`));
        const maxLoan = bank.creditScore * 1000;
        if (amount > maxLoan) return message.reply(fonts.bold(`❌ Maximum loan: ${formatMoney(maxLoan)}`));
        if (amount < 1000) return message.reply(fonts.bold("❌ Minimum loan is $1,000."));
        bank.balance += amount;
        bank.loan = amount;
        bank.loanDate = Date.now();
        bank.transactions.push({ type: "loan", amount, date: Date.now(), description: "Bank loan approved" });
        await save();
        return message.reply(fonts.bold(`✅ Loan approved! ${formatMoney(amount)} added. Balance: ${formatMoney(bank.balance)}`));
      }

      if (sub === "repay") {
        const amount = parseInt(args[1]);
        if (bank.loan <= 0) return message.reply(fonts.bold("❌ No active loan."));
        if (!amount || amount <= 0) return message.reply(fonts.bold(`❌ Invalid amount. Outstanding loan: ${formatMoney(bank.loan)}`));
        if (bank.balance < amount) return message.reply(fonts.bold(`❌ Insufficient funds. You have ${formatMoney(bank.balance)}.`));
        const repayAmount = Math.min(amount, bank.loan);
        bank.balance -= repayAmount;
        bank.loan -= repayAmount;
        if (bank.loan === 0) {
          bank.loanDate = null;
          bank.creditScore = Math.min(850, bank.creditScore + 10);
        }
        bank.transactions.push({ type: "loan_repayment", amount: repayAmount, date: Date.now() });
        await save();
        const msg = bank.loan === 0 ? "✅ Loan fully repaid! Credit score +10." : `✅ Repaid ${formatMoney(repayAmount)}. Remaining loan: ${formatMoney(bank.loan)}`;
        return message.reply(fonts.bold(msg));
      }

      if (sub === "savings" || sub === "save") {
        const amount = parseAmount(args[1], bank.balance);
        if (!amount || amount <= 0) return message.reply(fonts.bold("❌ Invalid amount. Use: bank savings <amount>"));
        if (bank.balance < amount) return message.reply(fonts.bold(`❌ Insufficient funds. You have ${formatMoney(bank.balance)}.`));
        bank.balance -= amount;
        bank.savings += amount;
        bank.transactions.push({ type: "savings_deposit", amount, date: Date.now() });
        await save();
        return message.reply(fonts.bold(`✅ Saved ${formatMoney(amount)}. Savings balance: ${formatMoney(bank.savings)} (3% monthly interest).`));
      }

      if (sub === "interest") {
        const now = Date.now();
        const last = bank.lastInterest ? new Date(bank.lastInterest).getTime() : now;
        const hoursPassed = (now - last) / (1000 * 60 * 60);
        if (hoursPassed < 1) {
          const minsLeft = 60 - Math.floor(hoursPassed * 60);
          return message.reply(fonts.bold(`⏰ Interest can be calculated every hour. Wait ${minsLeft} more minutes.`));
        }
        const savingsRate = 0.03 / (30 * 24);
        const vaultRate = 0.01 / (30 * 24);
        const loanRate = 0.05 / (7 * 24);
        const savingsInterest = Math.floor(bank.savings * savingsRate * hoursPassed);
        const vaultInterest = Math.floor(bank.vault * vaultRate * hoursPassed);
        const loanInterest = Math.floor(bank.loan * loanRate * hoursPassed);
        const net = savingsInterest + vaultInterest - loanInterest;
        return message.reply(fonts.bold(`
📊 Interest Preview
━━━━━━━━━━━
⏰ Time: ${Math.floor(hoursPassed)} hours
💰 Savings interest: +${formatMoney(savingsInterest)}
💰 Vault interest: +${formatMoney(vaultInterest)}
💸 Loan interest: -${formatMoney(loanInterest)}
📈 Net change: ${formatMoney(net)}

Use 'bank collect' to apply.
`));
      }

      if (sub === "collect") {
        const now = Date.now();
        const last = bank.lastInterest ? new Date(bank.lastInterest).getTime() : 0;
        const hoursPassed = (now - last) / (1000 * 60 * 60);
        if (hoursPassed < 1) {
          const minsLeft = 60 - Math.floor(hoursPassed * 60);
          return message.reply(fonts.bold(`⏰ Interest can be collected every hour. Wait ${minsLeft} more minutes.`));
        }
        const savingsRate = 0.03 / (30 * 24);
        const vaultRate = 0.01 / (30 * 24);
        const loanRate = 0.05 / (7 * 24);
        const savingsInterest = Math.floor(bank.savings * savingsRate * hoursPassed);
        const vaultInterest = Math.floor(bank.vault * vaultRate * hoursPassed);
        const loanInterest = Math.floor(bank.loan * loanRate * hoursPassed);
        const net = savingsInterest + vaultInterest - loanInterest;
        bank.savings += savingsInterest;
        bank.vault += vaultInterest;
        bank.loan += loanInterest;
        bank.lastInterest = Date.now();
        if (savingsInterest) bank.transactions.push({ type: "interest_earned", amount: savingsInterest, date: now });
        if (vaultInterest) bank.transactions.push({ type: "interest_earned", amount: vaultInterest, date: now });
        if (loanInterest) bank.transactions.push({ type: "interest_charged", amount: loanInterest, date: now });
        await save();
        return message.reply(fonts.bold(`
💰 Interest Collected!
━━━━━━━━━━━
⏰ Time: ${Math.floor(hoursPassed)} hours
💰 Savings interest: +${formatMoney(savingsInterest)}
💰 Vault interest: +${formatMoney(vaultInterest)}
💸 Loan interest: -${formatMoney(loanInterest)}
📈 Net change: ${formatMoney(net)}

🏛️ New savings: ${formatMoney(bank.savings)}
🔐 New vault: ${formatMoney(bank.vault)}
💳 New loan: ${formatMoney(bank.loan)}
`));
      }

      if (sub === "history") {
        const txs = bank.transactions.slice(-15).reverse();
        if (txs.length === 0) return message.reply(fonts.bold("📋 No transaction history."));
        let historyText = "📋 Last 15 Transactions\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        for (const tx of txs) {
          const date = new Date(tx.date).toLocaleDateString();
          historyText += `${getTransactionEmoji(tx.type)} ${tx.type}: ${formatMoney(tx.amount)} (${date})\n`;
        }
        return message.reply(historyText);
      }

      if (sub === "daily") {
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        if (bank.lastDaily && now - new Date(bank.lastDaily).getTime() < oneDay) {
          const timeLeft = oneDay - (now - new Date(bank.lastDaily).getTime());
          const hours = Math.floor(timeLeft / (60 * 60 * 1000));
          const mins = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
          return message.reply(fonts.bold(`⏰ Daily reward already claimed! Next in ${hours}h ${mins}m.`));
        }
        if (bank.lastDaily && now - new Date(bank.lastDaily).getTime() < 2 * oneDay) bank.streak++;
        else bank.streak = 1;
        const baseReward = 1000;
        const streakBonus = Math.min(bank.streak * 100, 2000);
        const levelBonus = bank.bankLevel * 500;
        const total = Math.floor((baseReward + streakBonus + levelBonus) * bank.multiplier);
        bank.balance += total;
        bank.lastDaily = new Date();
        bank.transactions.push({ type: "daily_reward", amount: total, date: now });
        await save();
        return message.reply(fonts.bold(`
🎁 Daily Reward Claimed!
━━━━━━━━━━━
💰 Received: ${formatMoney(total)}
🔥 Streak: ${bank.streak} days
⚡ Multiplier: ${bank.multiplier}x
`));
      }

      if (sub === "work") {
        const now = Date.now();
        const cooldown = 4 * 60 * 60 * 1000;
        if (bank.lastWork && now - new Date(bank.lastWork).getTime() < cooldown) {
          const timeLeft = cooldown - (now - new Date(bank.lastWork).getTime());
          const hours = Math.floor(timeLeft / (60 * 60 * 1000));
          const mins = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
          return message.reply(fonts.bold(`⏰ Work cooldown! Rest ${hours}h ${mins}m.`));
        }
        const jobs = [
          { name: "Delivery Driver", min: 500, max: 1500 },
          { name: "Data Entry", min: 300, max: 800 },
          { name: "Freelancer", min: 1000, max: 3000 },
          { name: "Consultant", min: 2000, max: 5000 },
          { name: "Manager", min: 3000, max: 7000 }
        ];
        const job = jobs[Math.floor(Math.random() * jobs.length)];
        const salary = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min;
        const skillBonus = bank.skills.business * 100;
        const total = Math.floor((salary + skillBonus) * bank.multiplier);
        bank.balance += total;
        bank.lastWork = new Date();
        bank.skills.business += 1;
        bank.transactions.push({ type: "work", amount: total, description: job.name, date: now });
        await save();
        return message.reply(fonts.bold(`
💼 Work Completed!
━━━━━━━━━━━
Job: ${job.name}
💰 Earned: ${formatMoney(total)}
📈 Business skill increased! (${bank.skills.business})
`));
      }

      if (sub === "stocks") {
        const action = args[1]?.toLowerCase();
        if (!action || action === "list") {
          let list = "📈 Stock Market\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
          for (const [sym, data] of Object.entries(marketData.stocks)) {
            const changeEmoji = data.change >= 0 ? "📈" : "📉";
            list += `${changeEmoji} ${sym} - $${data.price} (${data.change > 0 ? '+' : ''}${data.change}%) - ${data.name}\n`;
          }
          list += `\nYour holdings:\n`;
          if (Object.keys(bank.stocks).length === 0) list += "None\n";
          else {
            for (const [sym, shares] of Object.entries(bank.stocks)) {
              const value = shares * (marketData.stocks[sym]?.price || 0);
              list += `• ${sym}: ${shares} shares (${formatMoney(value)})\n`;
            }
          }
          list += `\nUsage: stocks buy <symbol> <shares> | stocks sell <symbol> <shares>`;
          return message.reply(fonts.bold(list));
        }
        const symbol = args[2]?.toUpperCase();
        const shares = parseInt(args[3]);
        if (!symbol || !marketData.stocks[symbol]) return message.reply(fonts.bold("❌ Invalid stock symbol."));
        if (!shares || shares <= 0) return message.reply(fonts.bold("❌ Enter positive number of shares."));
        const price = marketData.stocks[symbol].price;
        const cost = price * shares;
        if (action === "buy") {
          if (bank.balance < cost) return message.reply(fonts.bold(`❌ Insufficient funds. Need ${formatMoney(cost)}.`));
          bank.balance -= cost;
          bank.stocks[symbol] = (bank.stocks[symbol] || 0) + shares;
          bank.transactions.push({ type: "stock_purchase", symbol, shares, amount: cost, date: Date.now() });
          await save();
          return message.reply(fonts.bold(`✅ Bought ${shares} shares of ${symbol} for ${formatMoney(cost)}.`));
        }
        if (action === "sell") {
          const owned = bank.stocks[symbol] || 0;
          if (owned < shares) return message.reply(fonts.bold(`❌ You own ${owned} shares.`));
          bank.stocks[symbol] -= shares;
          if (bank.stocks[symbol] === 0) delete bank.stocks[symbol];
          bank.balance += cost;
          bank.transactions.push({ type: "stock_sale", symbol, shares, amount: cost, date: Date.now() });
          await save();
          return message.reply(fonts.bold(`✅ Sold ${shares} shares of ${symbol} for ${formatMoney(cost)}.`));
        }
      }

      if (sub === "crypto") {
        const action = args[1]?.toLowerCase();
        if (!action || action === "list") {
          let list = "₿ Cryptocurrency Market\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
          for (const [sym, data] of Object.entries(marketData.crypto)) {
            const changeEmoji = data.change >= 0 ? "📈" : "📉";
            list += `${changeEmoji} ${sym} - $${data.price} (${data.change > 0 ? '+' : ''}${data.change}%) - ${data.name}\n`;
          }
          list += `\nYour holdings:\n`;
          if (Object.keys(bank.crypto).length === 0) list += "None\n";
          else {
            for (const [sym, amount] of Object.entries(bank.crypto)) {
              const value = amount * (marketData.crypto[sym]?.price || 0);
              list += `• ${sym}: ${amount} coins (${formatMoney(value)})\n`;
            }
          }
          list += `\nUsage: crypto buy <symbol> <amount> | crypto sell <symbol> <amount>`;
          return message.reply(fonts.bold(list));
        }
        const symbol = args[2]?.toUpperCase();
        const amountCoin = parseFloat(args[3]);
        if (!symbol || !marketData.crypto[symbol]) return message.reply(fonts.bold("❌ Invalid crypto symbol."));
        if (!amountCoin || amountCoin <= 0) return message.reply(fonts.bold("❌ Enter positive amount."));
        const price = marketData.crypto[symbol].price;
        const cost = price * amountCoin;
        if (action === "buy") {
          if (bank.balance < cost) return message.reply(fonts.bold(`❌ Insufficient funds. Need ${formatMoney(cost)}.`));
          bank.balance -= cost;
          bank.crypto[symbol] = (bank.crypto[symbol] || 0) + amountCoin;
          bank.transactions.push({ type: "crypto_purchase", symbol, amount: amountCoin, value: cost, date: Date.now() });
          await save();
          return message.reply(fonts.bold(`✅ Bought ${amountCoin} ${symbol} for ${formatMoney(cost)}.`));
        }
        if (action === "sell") {
          const owned = bank.crypto[symbol] || 0;
          if (owned < amountCoin) return message.reply(fonts.bold(`❌ You own ${owned} ${symbol}.`));
          bank.crypto[symbol] -= amountCoin;
          if (bank.crypto[symbol] === 0) delete bank.crypto[symbol];
          bank.balance += cost;
          bank.transactions.push({ type: "crypto_sale", symbol, amount: amountCoin, value: cost, date: Date.now() });
          await save();
          return message.reply(fonts.bold(`✅ Sold ${amountCoin} ${symbol} for ${formatMoney(cost)}.`));
        }
      }

      if (sub === "bonds") {
        const action = args[1]?.toLowerCase();
        if (!action || action === "list") {
          let list = "🏛️ Bond Market\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
          for (const [type, data] of Object.entries(marketData.bonds)) {
            list += `📊 ${type.replace(/_/g, ' ')} - Yield: ${data.yield}%, Risk: ${data.risk}, Term: ${data.term}\n`;
          }
          list += `\nYour holdings:\n`;
          if (Object.keys(bank.bonds).length === 0) list += "None\n";
          else {
            for (const [type, amt] of Object.entries(bank.bonds)) {
              list += `• ${type.replace(/_/g, ' ')}: ${formatMoney(amt)}\n`;
            }
          }
          list += `\nUsage: bonds buy <type> <amount>`;
          return message.reply(fonts.bold(list));
        }
        if (action === "buy") {
          const type = args[2]?.toUpperCase();
          const amount = parseInt(args[3]);
          if (!type || !marketData.bonds[type]) return message.reply(fonts.bold("❌ Invalid bond type."));
          if (!amount || amount <= 0) return message.reply(fonts.bold("❌ Enter positive amount."));
          if (bank.balance < amount) return message.reply(fonts.bold(`❌ Insufficient funds. Need ${formatMoney(amount)}.`));
          bank.balance -= amount;
          bank.bonds[type] = (bank.bonds[type] || 0) + amount;
          bank.transactions.push({ type: "bond_purchase", amount, description: type, date: Date.now() });
          await save();
          return message.reply(fonts.bold(`✅ Bought ${formatMoney(amount)} in ${type.replace(/_/g, ' ')} bonds.`));
        }
      }

      if (sub === "portfolio") {
        const portfolioValue = calculatePortfolioValue(bank);
        let lines = [];
        if (Object.keys(bank.stocks).length) {
          lines.push("📈 Stocks:");
          for (const [sym, shares] of Object.entries(bank.stocks)) {
            const value = shares * (marketData.stocks[sym]?.price || 0);
            lines.push(`   ${sym}: ${shares} shares (${formatMoney(value)})`);
          }
        }
        if (Object.keys(bank.crypto).length) {
          lines.push("₿ Crypto:");
          for (const [sym, amount] of Object.entries(bank.crypto)) {
            const value = amount * (marketData.crypto[sym]?.price || 0);
            lines.push(`   ${sym}: ${amount} coins (${formatMoney(value)})`);
          }
        }
        if (Object.keys(bank.bonds).length) {
          lines.push("🏛️ Bonds:");
          for (const [type, amt] of Object.entries(bank.bonds)) {
            lines.push(`   ${type.replace(/_/g, ' ')}: ${formatMoney(amt)}`);
          }
        }
        if (lines.length === 0) lines.push("Your investment portfolio is empty.");
        lines.push(`\nTotal Portfolio Value: ${formatMoney(portfolioValue)}`);
        return message.reply(fonts.bold(lines.join("\n")));
      }

      if (sub === "market") {
        const marketText = `
📊 Global Market Overview
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 Top Stocks:
• AAPL: $150.25 (+2.1%) - Apple Inc.
• GOOGL: $2,800.50 (+1.8%) - Alphabet Inc.
• TSLA: $800.75 (-0.5%) - Tesla Inc.
• MSFT: $320.40 (+1.2%) - Microsoft Corp.

₿ Top Crypto:
• BTC: $45,000 (+3.2%) - Bitcoin
• ETH: $3,200 (+2.8%) - Ethereum
• BNB: $400 (+1.5%) - Binance Coin
• ADA: $1.20 (+4.1%) - Cardano

🏛️ Bond Yields:
• US Treasury: 2.5% (10 Year)
• Corporate: 3.8% (5 Year)
• Municipal: 2.1% (7 Year)
• High Yield: 6.2% (3 Year)

📊 Market Sentiment: Bullish
💹 Trading Volume: High
🔥 Trending: Tech Stocks, DeFi Tokens
`;
        return message.reply(fonts.bold(marketText));
      }

      if (sub === "dividend") {
        let total = 0;
        for (const [sym, shares] of Object.entries(bank.stocks || {})) {
          total += shares * 5;
        }
        for (const [type, amount] of Object.entries(bank.bonds || {})) {
          const yieldRate = marketData.bonds[type]?.yield || 2.5;
          total += amount * (yieldRate / 100) / 12;
        }
        if (total === 0) return message.reply(fonts.bold("💰 No dividends to collect. Invest in stocks or bonds."));
        const totalFloor = Math.floor(total);
        bank.balance += totalFloor;
        bank.transactions.push({ type: "dividend", amount: totalFloor, date: Date.now() });
        await save();
        return message.reply(fonts.bold(`💰 Collected ${formatMoney(totalFloor)} in dividends from your investments!`));
      }

      if (sub === "business") {
        const action = args[1]?.toLowerCase();
        if (!action || action === "list") {
          let list = "🏢 Business Opportunities\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
          for (const [key, data] of Object.entries(marketData.businesses)) {
            list += `• ${data.name} - Cost: ${formatMoney(data.cost)}, Monthly Income: ${formatMoney(data.income)}, Employees: ${data.employees}\n`;
          }
          list += `\nYour businesses:\n`;
          if (bank.businesses.length === 0) list += "None\n";
          else {
            bank.businesses.forEach((b, i) => {
              list += `${i+1}. ${b.name} (Level ${b.level}) - Revenue: ${formatMoney(b.revenue)}/month\n`;
            });
          }
          list += `\nUsage: business buy <type> | business collect`;
          return message.reply(fonts.bold(list));
        }
        if (action === "buy") {
          const type = args[2]?.toUpperCase();
          const biz = marketData.businesses[type];
          if (!biz) return message.reply(fonts.bold("❌ Invalid business type."));
          if (bank.balance < biz.cost) return message.reply(fonts.bold(`❌ Insufficient funds. Need ${formatMoney(biz.cost)}.`));
          bank.balance -= biz.cost;
          bank.businesses.push({
            type, name: biz.name, level: 1, revenue: biz.income,
            employees: biz.employees, established: Date.now(), lastCollected: Date.now()
          });
          bank.transactions.push({ type: "business_purchase", amount: biz.cost, description: biz.name, date: Date.now() });
          await save();
          return message.reply(fonts.bold(`✅ Purchased ${biz.name} for ${formatMoney(biz.cost)}. Monthly income: ${formatMoney(biz.income)}.`));
        }
        if (action === "collect") {
          let total = 0;
          const now = Date.now();
          bank.businesses.forEach(b => {
            const hours = (now - (b.lastCollected || b.established)) / (1000 * 60 * 60);
            const income = Math.floor((b.revenue / 30 / 24) * hours * b.level);
            if (income > 0) {
              total += income;
              b.lastCollected = now;
            }
          });
          if (total === 0) return message.reply(fonts.bold("💼 No business income to collect yet."));
          bank.balance += total;
          bank.transactions.push({ type: "business_income", amount: total, date: now });
          await save();
          return message.reply(fonts.bold(`💼 Collected ${formatMoney(total)} from your businesses.`));
        }
      }

      if (sub === "property" || sub === "realestate") {
        const action = args[1]?.toLowerCase();
        if (!action || action === "list") {
          let list = "🏠 Real Estate Market\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
          for (const [key, data] of Object.entries(marketData.properties)) {
            list += `• ${data.name} - Price: ${formatMoney(data.price)}, Monthly Rent: ${formatMoney(data.income)}\n`;
          }
          list += `\nYour properties:\n`;
          if (bank.realEstate.length === 0) list += "None\n";
          else {
            bank.realEstate.forEach((p, i) => {
              list += `${i+1}. ${p.name} - Value: ${formatMoney(p.value)}, Rent: ${formatMoney(p.income)}/month\n`;
            });
          }
          list += `\nUsage: property buy <type> | rent`;
          return message.reply(fonts.bold(list));
        }
        if (action === "buy") {
          const type = args[2]?.toUpperCase();
          const prop = marketData.properties[type];
          if (!prop) return message.reply(fonts.bold("❌ Invalid property type."));
          if (bank.balance < prop.price) return message.reply(fonts.bold(`❌ Insufficient funds. Need ${formatMoney(prop.price)}.`));
          bank.balance -= prop.price;
          bank.realEstate.push({
            type, name: prop.name, value: prop.price, income: prop.income,
            purchased: Date.now(), lastRentCollected: Date.now()
          });
          bank.transactions.push({ type: "property_purchase", amount: prop.price, description: prop.name, date: Date.now() });
          await save();
          return message.reply(fonts.bold(`✅ Purchased ${prop.name} for ${formatMoney(prop.price)}. Monthly rent: ${formatMoney(prop.income)}.`));
        }
      }

      if (sub === "rent") {
        if (bank.realEstate.length === 0) return message.reply(fonts.bold("🏠 You don't own any properties."));
        let total = 0;
        const now = Date.now();
        bank.realEstate.forEach(p => {
          const hours = (now - (p.lastRentCollected || p.purchased)) / (1000 * 60 * 60);
          const rent = Math.floor((p.income / 30 / 24) * hours);
          if (rent > 0) {
            total += rent;
            p.lastRentCollected = now;
          }
        });
        if (total === 0) return message.reply(fonts.bold("🏠 No rent to collect yet."));
        bank.balance += total;
        bank.transactions.push({ type: "rental_income", amount: total, date: now });
        await save();
        return message.reply(fonts.bold(`🏠 Collected ${formatMoney(total)} in rental income.`));
      }

      if (sub === "luxury") {
        const action = args[1]?.toLowerCase();
        if (!action || action === "list") {
          let list = "💎 Luxury Collection\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
          for (const [key, data] of Object.entries(marketData.luxury)) {
            list += `• ${data.name} - Price: ${formatMoney(data.price)}\n`;
          }
          list += `\nYour collection:\n`;
          if (bank.luxury.length === 0) list += "None\n";
          else {
            bank.luxury.forEach((l, i) => {
              list += `${i+1}. ${l.name} - Value: ${formatMoney(l.value)}\n`;
            });
          }
          list += `\nUsage: luxury buy <type>`;
          return message.reply(fonts.bold(list));
        }
        if (action === "buy") {
          const type = args[2]?.toUpperCase();
          const item = marketData.luxury[type];
          if (!item) return message.reply(fonts.bold("❌ Invalid luxury item."));
          if (bank.balance < item.price) return message.reply(fonts.bold(`❌ Insufficient funds. Need ${formatMoney(item.price)}.`));
          bank.balance -= item.price;
          bank.luxury.push({ type, name: item.name, value: item.price, purchased: Date.now() });
          bank.transactions.push({ type: "luxury_purchase", amount: item.price, description: item.name, date: Date.now() });
          await save();
          return message.reply(fonts.bold(`✅ Purchased ${item.name} for ${formatMoney(item.price)}.`));
        }
      }

      if (sub === "car") {
        const action = args[1]?.toLowerCase();
        if (!action || action === "list") {
          let list = "🚗 Luxury Vehicles\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
          for (const [key, data] of Object.entries(marketData.vehicles)) {
            const dep = Math.round((1 - data.depreciation) * 100);
            list += `• ${data.name} - Price: ${formatMoney(data.price)}, Annual Depreciation: ${dep}%\n`;
          }
          list += `\nYour vehicles:\n`;
          if (bank.vehicles.length === 0) list += "None\n";
          else {
            bank.vehicles.forEach((v, i) => {
              list += `${i+1}. ${v.name} - Current Value: ${formatMoney(v.currentValue)}\n`;
            });
          }
          list += `\nUsage: car buy <type>`;
          return message.reply(fonts.bold(list));
        }
        if (action === "buy") {
          const type = args[2]?.toUpperCase();
          const vehicle = marketData.vehicles[type];
          if (!vehicle) return message.reply(fonts.bold("❌ Invalid vehicle type."));
          if (bank.balance < vehicle.price) return message.reply(fonts.bold(`❌ Insufficient funds. Need ${formatMoney(vehicle.price)}.`));
          bank.balance -= vehicle.price;
          bank.vehicles.push({
            type, name: vehicle.name, purchasePrice: vehicle.price, currentValue: vehicle.price,
            depreciation: vehicle.depreciation, purchased: Date.now()
          });
          bank.transactions.push({ type: "vehicle_purchase", amount: vehicle.price, description: vehicle.name, date: Date.now() });
          await save();
          return message.reply(fonts.bold(`✅ Purchased ${vehicle.name} for ${formatMoney(vehicle.price)}.`));
        }
      }

      if (sub === "gamble") {
        const amount = parseInt(args[1]);
        if (!amount || amount <= 0) return message.reply(fonts.bold("❌ Enter valid amount."));
        if (bank.balance < amount) return message.reply(fonts.bold(`❌ Insufficient funds. You have ${formatMoney(bank.balance)}.`));
        const winChance = 0.45 + (bank.skills.gambling * 0.01);
        const win = Math.random() < winChance;
        let winnings = 0;
        if (win) {
          const multiplier = Math.random() < 0.1 ? 3 : 2;
          winnings = amount * multiplier;
          bank.balance += winnings - amount;
          bank.skills.gambling += 1;
        } else {
          bank.balance -= amount;
        }
        bank.transactions.push({ type: win ? "gambling_win" : "gambling_loss", amount: win ? winnings - amount : amount, date: Date.now() });
        await save();
        const result = win ? `🎉 You won ${formatMoney(winnings - amount)}!` : `💸 You lost ${formatMoney(amount)}!`;
        return message.reply(fonts.bold(`🎰 Gamble\n━━━━━━━━━━━\n${result}\nGambling skill: ${bank.skills.gambling}`));
      }

      if (sub === "slots") {
        const amount = parseInt(args[1]);
        if (!amount || amount <= 0) return message.reply(fonts.bold("❌ Enter valid amount."));
        if (bank.balance < amount) return message.reply(fonts.bold(`❌ Insufficient funds. You have ${formatMoney(bank.balance)}.`));
        const symbols = ["🍒", "🍋", "🍊", "🍇", "🔔", "💎", "7️⃣", "⭐"];
        const s1 = symbols[Math.floor(Math.random() * symbols.length)];
        const s2 = symbols[Math.floor(Math.random() * symbols.length)];
        const s3 = symbols[Math.floor(Math.random() * symbols.length)];
        let multiplier = 0;
        if (s1 === s2 && s2 === s3) {
          if (s1 === "7️⃣") multiplier = 50;
          else if (s1 === "💎") multiplier = 25;
          else if (s1 === "⭐") multiplier = 15;
          else multiplier = 10;
        } else if (s1 === s2 || s2 === s3 || s1 === s3) {
          multiplier = 2;
        }
        let winnings = 0;
        if (multiplier > 0) {
          winnings = amount * multiplier;
          bank.balance += winnings - amount;
        } else {
          bank.balance -= amount;
        }
        bank.transactions.push({ type: winnings > 0 ? "gambling_win" : "gambling_loss", amount: winnings > 0 ? winnings - amount : amount, date: Date.now() });
        await save();
        const slotLine = `┌─────────────┐\n│ ${s1} │ ${s2} │ ${s3} │\n└─────────────┘`;
        const result = winnings > 0 ? `🎉 You won ${formatMoney(winnings - amount)}!` : `💸 You lost ${formatMoney(amount)}!`;
        return message.reply(fonts.bold(`🎰 Slots\n${slotLine}\n\n${result}\nBalance: ${formatMoney(bank.balance)}`));
      }

      if (sub === "blackjack") {
        const amount = parseInt(args[1]);
        if (!amount || amount <= 0) return message.reply(fonts.bold("❌ Enter valid amount."));
        if (bank.balance < amount) return message.reply(fonts.bold(`❌ Insufficient funds. You have ${formatMoney(bank.balance)}.`));
        const getCard = () => Math.min(Math.floor(Math.random() * 13) + 1, 10);
        const player = getCard() + getCard();
        const dealer = getCard() + getCard();
        let result, winnings = 0;
        if (player === 21) { result = "🎉 BLACKJACK!"; winnings = amount * 2.5; }
        else if (player > 21) { result = "💸 BUST!"; }
        else if (dealer > 21) { result = "🎉 DEALER BUST!"; winnings = amount * 2; }
        else if (player > dealer) { result = "🎉 WIN!"; winnings = amount * 2; }
        else if (player === dealer) { result = "🤝 PUSH!"; winnings = amount; }
        else { result = "💸 LOSE!"; }
        if (winnings > 0) bank.balance += winnings - amount;
        else bank.balance -= amount;
        bank.transactions.push({ type: winnings > amount ? "gambling_win" : winnings === amount ? "gambling_push" : "gambling_loss", amount: Math.abs(winnings - amount), date: Date.now() });
        await save();
        const msg = `🃏 Blackjack\n━━━━━━━━━━━\nYour cards: ${player}\nDealer cards: ${dealer}\n\n${result}\n${winnings > 0 ? `You won ${formatMoney(winnings - amount)}!` : `You lost ${formatMoney(amount)}!`}\nBalance: ${formatMoney(bank.balance)}`;
        return message.reply(fonts.bold(msg));
      }

      if (sub === "roulette") {
        const amount = parseInt(args[1]);
        const bet = args[2]?.toLowerCase();
        if (!amount || amount <= 0) return message.reply(fonts.bold("❌ Enter valid amount."));
        if (!bet) return message.reply(fonts.bold("❌ Choose: red/black/odd/even/high/low or number 0-36."));
        if (bank.balance < amount) return message.reply(fonts.bold(`❌ Insufficient funds. You have ${formatMoney(bank.balance)}.`));
        const num = Math.floor(Math.random() * 37);
        const isRed = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(num);
        const isBlack = num !== 0 && !isRed;
        const isOdd = num > 0 && num % 2 === 1;
        const isEven = num > 0 && num % 2 === 0;
        const isHigh = num >= 19 && num <= 36;
        const isLow = num >= 1 && num <= 18;
        let win = false, multiplier = 0;
        if (bet === "red" && isRed) { win = true; multiplier = 2; }
        else if (bet === "black" && isBlack) { win = true; multiplier = 2; }
        else if (bet === "odd" && isOdd) { win = true; multiplier = 2; }
        else if (bet === "even" && isEven) { win = true; multiplier = 2; }
        else if (bet === "high" && isHigh) { win = true; multiplier = 2; }
        else if (bet === "low" && isLow) { win = true; multiplier = 2; }
        else if (bet === num.toString()) { win = true; multiplier = 36; }
        let winnings = 0;
        if (win) { winnings = amount * multiplier; bank.balance += winnings - amount; }
        else { bank.balance -= amount; }
        bank.transactions.push({ type: win ? "gambling_win" : "gambling_loss", amount: win ? winnings - amount : amount, date: Date.now() });
        await save();
        const color = num === 0 ? "🟢" : isRed ? "🔴" : "⚫";
        const result = win ? `🎉 You won ${formatMoney(winnings - amount)}!` : `💸 You lost ${formatMoney(amount)}!`;
        return message.reply(fonts.bold(`🎯 Roulette\n━━━━━━━━━━━\nWinning number: ${color} ${num}\nYour bet: ${bet}\n\n${result}\nBalance: ${formatMoney(bank.balance)}`));
      }

      if (sub === "lottery") {
        const action = args[1]?.toLowerCase();
        if (!action || action === "buy") {
          const tickets = parseInt(args[2]) || 1;
          const cost = 100 * tickets;
          if (bank.balance < cost) return message.reply(fonts.bold(`❌ Insufficient funds. Need ${formatMoney(cost)}.`));
          bank.balance -= cost;
          bank.lotteryTickets += tickets;
          await save();
          return message.reply(fonts.bold(`🎫 Bought ${tickets} lottery tickets for ${formatMoney(cost)}. Total tickets: ${bank.lotteryTickets}`));
        }
        if (action === "check") {
          if (!bank.lotteryTickets) return message.reply(fonts.bold("🎫 You have no lottery tickets."));
          const winChance = Math.min(bank.lotteryTickets * 0.01, 0.5);
          if (Math.random() < winChance) {
            const prize = Math.floor(Math.random() * 1000000) + 50000;
            bank.balance += prize;
            bank.lotteryTickets = 0;
            bank.transactions.push({ type: "lottery_win", amount: prize, date: Date.now() });
            await save();
            return message.reply(fonts.bold(`🎊 LOTTERY WINNER! You won ${formatMoney(prize)}!`));
          } else {
            return message.reply(fonts.bold(`🎫 No winning tickets this time. Tickets remaining: ${bank.lotteryTickets}`));
          }
        }
      }

      if (sub === "premium") {
        if (args[1]?.toLowerCase() === "buy") {
          const cost = 1000000;
          if (bank.balance < cost) return message.reply(fonts.bold(`❌ Premium costs ${formatMoney(cost)}.`));
          bank.balance -= cost;
          bank.premium = true;
          bank.multiplier = 2.0;
          await save();
          return message.reply(fonts.bold("💎 Premium activated! You now have 2x earnings on all activities."));
        }
        const status = bank.premium ? "✅ Active" : "❌ Inactive";
        return message.reply(fonts.bold(`💎 Premium Membership\n━━━━━━━━━━━\nStatus: ${status}\nMultiplier: ${bank.multiplier}x\nCost: $1,000,000\n\nUse 'premium buy' to upgrade.`));
      }

      if (sub === "vault") {
        const action = args[1]?.toLowerCase();
        const amount = parseAmount(args[2], action === "deposit" ? bank.balance : bank.vault);
        if (!action) {
          return message.reply(fonts.bold(`🔐 Secure Vault\n━━━━━━━━━━━\nVault Balance: ${formatMoney(bank.vault)}\nBank Balance: ${formatMoney(bank.balance)}\n\nUsage: vault deposit <amount> | vault withdraw <amount>`));
        }
        if (!amount || amount <= 0) return message.reply(fonts.bold("❌ Enter valid amount."));
        if (action === "deposit") {
          if (bank.balance < amount) return message.reply(fonts.bold(`❌ Insufficient funds. You have ${formatMoney(bank.balance)}.`));
          bank.balance -= amount;
          bank.vault += amount;
          bank.transactions.push({ type: "vault_deposit", amount, date: Date.now() });
          await save();
          return message.reply(fonts.bold(`🔐 Deposited ${formatMoney(amount)} to vault. Vault: ${formatMoney(bank.vault)}`));
        }
        if (action === "withdraw") {
          if (bank.vault < amount) return message.reply(fonts.bold(`❌ Insufficient vault funds. You have ${formatMoney(bank.vault)}.`));
          bank.vault -= amount;
          bank.balance += amount;
          bank.transactions.push({ type: "vault_withdrawal", amount, date: Date.now() });
          await save();
          return message.reply(fonts.bold(`🔓 Withdrew ${formatMoney(amount)} from vault. Bank balance: ${formatMoney(bank.balance)}`));
        }
      }

      if (sub === "insurance") {
        const action = args[1]?.toLowerCase();
        const types = {
          "LIFE": { cost: 10000, coverage: 100000, name: "Life Insurance" },
          "HEALTH": { cost: 5000, coverage: 50000, name: "Health Insurance" },
          "PROPERTY": { cost: 15000, coverage: 200000, name: "Property Insurance" },
          "BUSINESS": { cost: 25000, coverage: 500000, name: "Business Insurance" },
          "THEFT": { cost: 8000, coverage: 75000, name: "Theft Protection" }
        };
        if (!action || action === "list") {
          let list = "🛡️ Insurance Policies\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
          for (const [key, data] of Object.entries(types)) {
            list += `• ${data.name} - Cost: ${formatMoney(data.cost)} (Coverage: ${formatMoney(data.coverage)}) - Owned: ${bank.insurance[key] ? "✅" : "❌"}\n`;
          }
          list += `\nUsage: insurance buy <type>`;
          return message.reply(fonts.bold(list));
        }
        if (action === "buy") {
          const type = args[2]?.toUpperCase();
          const ins = types[type];
          if (!ins) return message.reply(fonts.bold("❌ Invalid insurance type."));
          if (bank.insurance[type]) return message.reply(fonts.bold("❌ You already have this insurance."));
          if (bank.balance < ins.cost) return message.reply(fonts.bold(`❌ Insufficient funds. Need ${formatMoney(ins.cost)}.`));
          bank.balance -= ins.cost;
          bank.insurance[type] = { active: true, coverage: ins.coverage, purchased: Date.now() };
          bank.transactions.push({ type: "insurance_purchase", amount: ins.cost, description: ins.name, date: Date.now() });
          await save();
          return message.reply(fonts.bold(`✅ Purchased ${ins.name} with ${formatMoney(ins.coverage)} coverage.`));
        }
      }

      if (sub === "credit") {
        let rating = "Poor";
        if (bank.creditScore >= 800) rating = "Excellent";
        else if (bank.creditScore >= 740) rating = "Very Good";
        else if (bank.creditScore >= 670) rating = "Good";
        else if (bank.creditScore >= 580) rating = "Fair";
        const msg = `📊 Credit Score Report\n━━━━━━━━━━━\nScore: ${bank.creditScore}/850 (${rating})\nMax Loan: ${formatMoney(bank.creditScore * 1000)}\nInterest Rate: ${bank.creditScore >= 750 ? "5%" : bank.creditScore >= 650 ? "7%" : "10%"}\n\nTips: Pay loans on time to increase score.`;
        return message.reply(fonts.bold(msg));
      }

      if (sub === "achievements") {
        const list = bank.achievements.length ? bank.achievements.join(", ") : "None yet.";
        return message.reply(fonts.bold(`🏆 Achievements\n━━━━━━━━━━━\nUnlocked: ${list}`));
      }

      if (sub === "leaderboard") {
        const allUsers = await usersData.getAll();
        const entries = [];
        for (const [uid, u] of Object.entries(allUsers)) {
          const b = u.data?.bank;
          if (b) {
            const wealth = (b.balance || 0) + (b.savings || 0) + (b.vault || 0);
            entries.push({ name: u.name || uid, wealth });
          }
        }
        entries.sort((a, b) => b.wealth - a.wealth);
        const top10 = entries.slice(0, 10).map((e, i) => `${i+1}. ${e.name} – ${formatMoney(e.wealth)}`).join("\n");
        const msg = `🏆 Leaderboard\n━━━━━━━━━━━\n${top10 || "No data yet."}`;
        return message.reply(fonts.bold(msg));
      }

      if (sub === "rob") {
        const targetUID = Object.keys(event.mentions)[0];
        if (!targetUID) return message.reply(fonts.bold("❌ Please mention a user to rob."));
        if (targetUID === senderID) return message.reply(fonts.bold("❌ You can't rob yourself."));
        const now = Date.now();
        const cooldown = 6 * 60 * 60 * 1000;
        if (bank.lastRob && now - new Date(bank.lastRob).getTime() < cooldown) {
          const hours = Math.floor((cooldown - (now - new Date(bank.lastRob).getTime())) / (60 * 60 * 1000));
          return message.reply(fonts.bold(`⏰ Rob cooldown! Wait ${hours} more hours.`));
        }
        const targetUser = await usersData.get(targetUID);
        if (!targetUser) return message.reply(fonts.bold("❌ Target user not found."));
        if (!targetUser.data.bank) targetUser.data.bank = { balance: 0 };
        const targetBank = targetUser.data.bank;
        const robbable = targetBank.balance || 0;
        if (robbable <= 100) return message.reply(fonts.bold("❌ This user doesn't have enough money to rob."));
        if (targetBank.insurance?.THEFT) return message.reply(fonts.bold("🛡️ This user has theft protection!"));
        const successChance = 0.5;
        if (Math.random() < successChance) {
          const stolen = Math.floor(robbable * (Math.random() * 0.3 + 0.1));
          bank.balance += stolen;
          targetBank.balance -= stolen;
          bank.lastRob = now;
          bank.transactions.push({ type: "robbery_success", amount: stolen, target: targetUID, date: now });
          targetBank.transactions.push({ type: "robbed", amount: stolen, source: senderID, date: now });
          user.data.bank = bank;
          targetUser.data.bank = targetBank;
          await usersData.set(senderID, user);
          await usersData.set(targetUID, targetUser);
          return message.reply(fonts.bold(`💰 Robbery successful! You stole ${formatMoney(stolen)}!`));
        } else {
          const fine = Math.min(bank.balance * 0.1, 10000);
          bank.balance -= fine;
          bank.lastRob = now;
          bank.transactions.push({ type: "robbery_failed", amount: fine, date: now });
          await save();
          return message.reply(fonts.bold(`🚔 Robbery failed! You were caught and fined ${formatMoney(fine)}.`));
        }
      }

      return message.reply(fonts.bold("❓ Unknown command. Use 'bank help' to see all commands."));

    } catch (err) {
      console.error("Bank command error:", err);
      return message.reply(fonts.bold(`❌ An error occurred: ${err.message}`));
    }
  }
};
