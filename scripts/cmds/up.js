const os = require("os");
const { uptime } = require("process");

module.exports = {
  config: {
    name: "uptime",
    version: "1.0",
    author: "Stack",
    shortDescription: "Affiche l'uptime du bot",
    category: "info"
  },

  onStart: async function ({ api, message }) {
    const botID = api.getCurrentUserID();
    const cmds = Object.keys(global.client.commands).length;
    const users = Object.keys(global.data.user).length;
    const threads = Object.keys(global.data.thread).length;

    const uptimeSeconds = Math.floor(uptime());
    const days = Math.floor(uptimeSeconds / (3600 * 24));
    const hours = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;

    const nodeVersion = process.version;
    const platform = process.platform;
    const cpu = os.cpus()[0].model;
    const cores = os.cpus().length;
    const ram = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2);
    const usedRam = (process.memoryUsage().rss / (1024 * 1024)).toFixed(2);

    let msg = `╔══════════════════════╗\n`;
    msg += `⚡ 𝗦𝗧𝗔𝗖𝗞'𝗦 𝗨𝗣𝗧𝗜𝗠𝗘 ⚡\n`'𝗦 𝗨𝗣𝗧𝗜𝗠𝗘 ⚡\n`;
    msg += `╚══════════════════════╝\n`;
    msg += `⏳ 𝗨𝗽𝘁𝗶𝗺𝗲\n`;
    msg += `┌───────────────────\n`;
    msg += `│ ⏱️ ${days > 0 ? days + '`│ ⏱️ ${days > 0 ? days + 'd ' : ''}${hours > 0 ? hours + 'h ' : ''}${minutes}m ${seconds}s\n`'}${minutes}m ${seconds}s\n`;
    msg += `│ 🤖 ID: ${botID}\n`;
    msg += `│ 📦 Cmds: ${cmds}\n`;
    msg += `│ 👥 Users: ${users}\n`;
    msg += `│ 💬 Threads: ${threads}\n`;
    msg += `└───────────────────\n`;
    msg += `🧠 𝗡𝗼𝗱𝗲.𝗷𝘀\n`;
    msg += `┌───────────────────\n`;
    msg += `│ 🟢 Node: ${nodeVersion}\n`;
    msg += `│ ⚙️ Platform: ${platform}\n`;
    msg += `└───────────────────\n`;
    msg += `💾 𝗕𝗼𝘁 𝗠𝗲𝗺𝗼𝗿𝘆\n`;
    msg += `┌───────────────────\n`;
    msg += `│ Heap Used: ${usedRam} MB\n`;
    msg += `│ Heap Total: ${ram} GB\n`;
    msg += `└───────────────────\n`;
    msg += `🖥️ 𝗦𝘆𝘀𝘁𝗲𝗺\n`;
    msg += `┌───────────────────\n`;
    msg += `│ 🏷️ ${os.hostname()}\n`;
    msg += `│ 🐧 ${os.type()} ${os.release()}\n`;
    msg += `│ 🏗️ ${os.arch()}\n`;
    msg += `└───────────────────\n`;
    msg += `🔥 𝗛𝗮𝗿𝗱𝘄𝗮𝗿𝗲\n`;
    msg += `┌───────────────────\n`;
    msg += `│ 🧠 CPU: ${cpu}\n`;
    msg += `│ ⚡ ${cores} Cores\n`;
    msg += `│ 💾 RAM: ${usedRam} / ${ram} GB\n`;
    msg += `└───────────────────\n`;
    msg += `🚀 𝗦𝘁𝗮𝘁𝘂𝘀: ONLINE & STABLE\n`;
    msg += `⚔️ Powered by Stack'`⚔️ Powered by Stack's`;

    api.sendMessage(msg, message.threadID);
  }
};
