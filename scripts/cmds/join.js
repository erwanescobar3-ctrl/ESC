~cmd install join.js module.exports = {
  config: {
    name: "join",
    version: "3.4",
    author: "Christus",
    countDown: 5,
    role: 2,
    dev: true,
    shortDescription: "Rejoindre un groupe",
    longDescription: "Liste paginée avec les vrais noms de groupe",
    category: "owner",
    guide: { fr: "{p}{n} [page|next|prev]" },
  },

  onStart: async function ({ api, event, args }) {
    try {
      const groupList = await api.getThreadList(200, null, ["INBOX"]);
      const filteredList = groupList.filter(g => g.isGroup && g.isSubscribed);
      if (!filteredList.length) return api.sendMessage("❌ Aucun groupe trouvé.", event.threadID);

      const pageSize = 10;
      const totalPages = Math.ceil(filteredList.length / pageSize);
      if (!global.joinPage) global.joinPage = {};

      const currentThread = event.threadID;
      let page = 1;
      if (args[0]) {
        const input = args[0].toLowerCase();
        if (input === "next") page = (global.joinPage[currentThread] || 1) + 1;
        else if (input === "prev") page = (global.joinPage[currentThread] || 1) - 1;
        else if (!isNaN(input)) page = parseInt(input) || 1;
      }
      if (page < 1) page = 1;
      if (page > totalPages) page = totalPages;
      global.joinPage[currentThread] = page;

      const startIndex = (page - 1) * pageSize;
      const currentGroups = filteredList.slice(startIndex, startIndex + pageSize);

      // 1. On va chercher le vrai nom de chaque groupe
      const groupsWithName = await Promise.all(
        currentGroups.map(async (g, i) => {
          const info = await api.getThreadInfo(g.threadID);
          return {
            num: startIndex + i + 1,
            name: info.threadName, // Le vrai nom du GC
            members: info.participantIDs.length,
            id: g.threadID
          };
        })
      );

      const formatted = groupsWithName.map(g =>
        `╠ ${g.num}. ${g.name}\n╠ 👥 ${g.members} membres | 🆔 ${g.id}`
      ).join("\n╟──────────────────\n");

      const message = [
        "╭─── 🤝 GROUPES DU BOT ───╮",
        formatted,
        "╟─────────────────────────╢",
        `╠ 📄 Page ${page}/${totalPages} | Total: ${filteredList.length}`,
        "╰─────────────────────────╯",
        "",
        "👉 Réponds avec le numéro pour rejoindre"
      ].join("\n");

      const sentMessage = await api.sendMessage(message, event.threadID);
      global.GoatBot.onReply.set(sentMessage.messageID, {
        commandName: "join",
        messageID: sentMessage.messageID,
        author: event.senderID,
        list: filteredList,
        page,
        pageSize
      });
    } catch (e) {
      console.error(e);
      api.sendMessage("⚠️ Erreur lors de la récupération des groupes.", event.threadID);
    }
  },

  onReply: async function ({ api, event, Reply }) {
    const { author, list, page, pageSize } = Reply;
    if (event.senderID!== author) return;

    const groupIndex = parseInt(event.body, 10);
    if (isNaN(groupIndex) || groupIndex <= 0) return api.sendMessage("⚠️ Numéro invalide.", event.threadID, event.messageID);

    const startIndex = (page - 1) * pageSize;
    const currentGroups = list.slice(startIndex, startIndex + pageSize);
    if (groupIndex > currentGroups.length) return api.sendMessage("⚠️ Numéro hors de portée.", event.threadID, event.messageID);

    try {
      const selected = currentGroups[groupIndex - 1];
      const info = await api.getThreadInfo(selected.threadID);
      const name = info.threadName;
      const members = info.participantIDs;

      if (members.includes(event.senderID)) return api.sendMessage(`⚠️ Tu es déjà dans `, event.threadID, event.messageID);
      if (members.length >= 250) return api.sendMessage(`🚫 Groupe complet : `, event.threadID, event.messageID);

      await api.addUserToGroup(event.senderID, selected.threadID);
      api.sendMessage(`✅ Rejoint : `, event.threadID, event.messageID);
      global.GoatBot.onReply.delete(Reply.messageID);
    } catch (e) {
      console.error(e);
      api.sendMessage(`❌ Impossible de rejoindre le groupe.`, event.threadID, event.messageID);
    }
  }
}
