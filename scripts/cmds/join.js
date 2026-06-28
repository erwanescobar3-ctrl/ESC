module.exports = {
  config: {
    name: "join",
    version: "3.1",
    author: "Christus",
    countDown: 5,
    role: 2,
    dev: true,
    shortDescription: "Rejoindre un groupe dans lequel le bot est présent",
    longDescription: "Liste paginée des groupes, répondre avec un numéro pour rejoindre, supporte le passage direct à une page ou suivant/précédent.",
    category: "owner",
    guide: { en: "{p}{n} [page|next|prev]" },
  },

  onStart: async function ({ api, event, args }) {
    try {
      const groupList = await api.getThreadList(200, null, ["INBOX"]);
      const filteredList = groupList.filter(g => g.isGroup && g.isSubscribed);

      if (!filteredList.length) return api.sendMessage("❌ Aucun groupe trouvé.", event.threadID);

      const pageSize = 15;
      const totalPages = Math.ceil(filteredList.length / pageSize);
      if (!global.joinPage) global.joinPage = {};
      const currentThread = event.threadID;

      let page = 1;
      if (args[0]) {
        const input = args[0].toLowerCase();
        if (input === "next") page = (global.joinPage[currentThread] || 1) + 1;
        else if (input === "prev") page = (global.joinPage[currentThread] || 1) - 1;
        else if (input.includes("/")) page = parseInt(input.split("/")[0]) || 1;
        else page = parseInt(input) || 1;
      }

      if (page < 1) page = 1;
      if (page > totalPages) page = totalPages;
      global.joinPage[currentThread] = page;

      const startIndex = (page - 1) * pageSize;
      const currentGroups = filteredList.slice(startIndex, startIndex + pageSize);

      const formatted = currentGroups.map((g, i) =>
        `┃ ${startIndex + i + 1}. 『${g.threadName || "Groupe sans nom"}』\n┃ 👥 ${g.participantIDs.length} membres\n┃ 🆔 ${g.threadID}\n┃`
      );

      const message = [
        "╭─────────────❃",
        "│ 🤝 REJOINDRE UN GROUPE",
        "│──────────────────",
        formatted.join("\n"),
        "│──────────────────",
        `│ 📄 Page ${page}/${totalPages} | Total: ${filteredList.length} groupes`,
        "│ 📌 Maximum de membres par groupe : 250",
        "╰───────────────✦",
        "",
        "👉 Répondez avec le numéro du groupe que vous voulez rejoindre."
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
      api.sendMessage("⚠️ Erreur lors de la récupération de la liste des groupes.", event.threadID);
    }
  },

  onReply: async function ({ api, event, Reply, args }) {
    const { author, list, page, pageSize } = Reply;
    if (event.senderID !== author) return;

    const groupIndex = parseInt(args[0], 10);
    if (isNaN(groupIndex) || groupIndex <= 0) {
      return api.sendMessage("⚠️ Numéro invalide. Répondez avec un numéro de groupe valide.", event.threadID, event.messageID);
    }

    const startIndex = (page - 1) * pageSize;
    const currentGroups = list.slice(startIndex, startIndex + pageSize);

    if (groupIndex > currentGroups.length) {
      return api.sendMessage("⚠️ Numéro hors de portée pour cette page.", event.threadID, event.messageID);
    }

    try {
      const selected = currentGroups[groupIndex - 1];
      const groupID = selected.threadID;
      const members = await api.getThreadInfo(groupID);

      if (members.participantIDs.includes(event.senderID)) {
        return api.sendMessage(`⚠️ Vous êtes déjà dans 『${selected.threadName}』`, event.threadID, event.messageID);
      }
      if (members.participantIDs.length >= 250) {
        return api.sendMessage(`🚫 Groupe complet : 『${selected.threadName}』`, event.threadID, event.messageID);
      }

      await api.addUserToGroup(event.senderID, groupID);
      api.sendMessage(`✅ Vous avez rejoint 『${selected.threadName}』`, event.threadID, event.messageID);

    } catch (e) {
      console.error(e);
      api.sendMessage("⚠️ Échec de l'ajout au groupe. Veuillez réessayer plus tard.", event.threadID, event.messageID);
    } finally {
      global.GoatBot.onReply.delete(event.messageID);
    }
  },
};
