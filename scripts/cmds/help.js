const { commands, aliases } = global.GoatBot;

// --- Fonction pour transformer un texte en style 𝑨𝒁 ---
function toAZStyle(text) {
  const azMap = {
    A:'𝑨', B:'𝑩', C:'𝑪', D:'𝑫', E:'𝑬', F:'𝑭', G:'𝑮', H:'𝑯', I:'𝑰', J:'𝑱',
    K:'𝑲', L:'𝑳', M:'𝑴', N:'𝑵', O:'𝑶', P:'𝑷', Q:'𝑸', R:'𝑹', S:'𝑺', T:'𝑻',
    U:'𝑼', V:'𝑽', W:'𝑾', X:'𝑿', Y:'𝒀', Z:'𝒁',
    a:'𝒂', b:'𝒃', c:'𝒄', d:'𝒅', e:'𝒆', f:'𝒇', g:'𝒈', h:'𝒉', i:'𝒊', j:'𝒋',
    k:'𝒌', l:'𝒍', m:'𝒎', n:'𝒏', o:'𝒐', p:'𝒑', q:'𝒒', r:'𝒓', s:'𝒔', t:'𝒕',
    u:'𝒖', v:'𝒗', w:'𝒘', x:'𝒙', y:'𝒚', z:'𝒛',
    ' ':' '
  };
  return text.split('').map(c => azMap[c] || c).join('');
}

module.exports = {
  config: {
    name: "help",
    version: "5.2",
    author: "Christus",
    countDown: 2,
    role: 0,
    shortDescription: { en: "Explorer toutes les commandes" },
    category: "info",
    guide: { en: "help <commande> ou help -ai <mot>" },
  },

  onStart: async function ({ message, args, event, usersData }) {
    try {
      const uid = event.senderID;
      let avatar = await usersData.getAvatarUrl(uid).catch(() => null);
      if (!avatar) avatar = "https://i.imgur.com/TPHk4Qu.png";

      const autoDelete = async (msgID, delay = 15000) => {
        setTimeout(async () => {
          try { await message.unsend(msgID); } catch {}
        }, delay);
      };

      // --- LISTE DES COMMANDES ---
      if(!args || args.length === 0) {
        let body = `
✄┈┈┈┈┈┈┈┈┈┈┈┈┈
┅┅┅┅┅༻❁༺┅┅┅┅┅
📚 𝑳𝑰𝑺𝑻𝑬 𝑫𝑬𝑺 𝑪𝑶𝑴𝑴𝑨𝑵𝑫𝑬𝑺
┅┅┅┅┅༻❁༺┅┅┅┅┅
`;

        const categories = {};
        for(let [name, cmd] of commands) {
          const cat = cmd.config.category || "Autres";
          if(!categories[cat]) categories[cat] = [];
          categories[cat].push(name);
        }

        for(const cat of Object.keys(categories).sort()) {
          const list = categories[cat]
            .sort()
            .map(c => `• ${toAZStyle(c)}`)
            .join("\n");

          body += `
✄┈┈┈┈┈┈┈┈┈┈┈┈┈
┅┅┅┅┅༻❁༺┅┅┅┅┅
📂 𝑪𝑨𝑻𝑬́𝑮𝑶𝑹𝑰𝑬 : ${toAZStyle(cat)}
┅┅┅┅┅༻❁༺┅┅┅┅┅
${list || "• 𝑨𝒖𝒄𝒖𝒏𝒆"}
┅┅┅┅┅༻❁༺┅┅┅┅┅
`;
        }

        body += `
✄┈┈┈┈┈┈┈┈┈┈┈┈┈
┅┅┅┅┅༻❁༺┅┅┅┅┅
📊 𝑻𝒐𝒕𝒂𝒍 : ${commands.size} 𝒄𝒐𝒎𝒎𝒂𝒏𝒅𝒆𝒔
┅┅┅┅┅༻❁༺┅┅┅┅┅

📌 .help <commande>
📌 .help -ai <mot>

✄┈┈┈┈┈┈┈┈┈┈┈┈┈
`;

        const res = await message.reply({ 
          body, 
          attachment: await global.utils.getStreamFromURL(avatar)
        });

        return autoDelete(res.messageID);
      }

    } catch(err) {
      console.error(err);
    }
  }
};
