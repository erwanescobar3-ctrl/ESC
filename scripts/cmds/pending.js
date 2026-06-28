const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const ownerInfo = {
  name: "𝐶𝐻𝑅𝐼𝑆𝑇𝑈𝑆",
  facebook: "https://www.facebook.com/Anos.Christus",
  telegram: "ᏉᎾᏆᎧ ᎿᎬᏁ",
  supportGroup: "🌚🌚⚡"
};

module.exports = {
  config: {
    name: "pending",
    version: "2.0",
    author: "Christus",
    countDown: 5,
    role: 2,
    shortDescription: {
      en: "Approuver ou refuser les discussions en attente"
    },
    longDescription: {
      en: "Répondez avec les numéros des discussions pour approuver ou répondez avec c[numéro(s)] / cancel[numéro(s)] pour refuser."
    },
    category: "admin"
  },

  langs: {
    en: {
      invaildNumber: "%1 n'est pas un numéro valide",
      cancelSuccess: "Refusé %1 discussion(s) !",
      approveSuccess: "Approuvé avec succès %1 discussion(s) !",
      cantGetPendingList: "Impossible d'obtenir la liste des discussions en attente !",
      returnListPending:
        "»「EN ATTENTE」«❮ Total des discussions en attente : %1 ❯\n\n%2\n\n💡 Guide :\n- Approuver : répondez avec les numéros (ex : 1 2 3)\n- Refuser : répondez avec c[numéro(s)] ou cancel[numéro(s)] (ex : c 1 2 ou cancel 3 4)",
      returnListClean: "「EN ATTENTE」Il n'y a aucune discussion en attente"
    }
  },

  onReply: async function ({ api, event, Reply, getLang }) {
    if (String(event.senderID) !== String(Reply.author)) return;
    const { body, threadID, messageID } = event;
    let count = 0;
    const BOT_UID = api.getCurrentUserID();
    const API_ENDPOINT = "https://xsaim8x-xxx-api.onrender.com/api/botconnect";

    const lowerBody = body.trim().toLowerCase();

    if (lowerBody.startsWith("c") || lowerBody.startsWith("cancel")) {
      
      const trimmed = body.replace(/^(c|cancel)\s*/i, "").trim();
      const index = trimmed.split(/\s+/).filter(Boolean);

      if (index.length === 0)
        return api.sendMessage(
          "Veuillez fournir au moins un numéro de discussion à refuser.",
          threadID,
          messageID
        );

      for (const i of index) {
        if (isNaN(i) || i <= 0 || i > Reply.pending.length) {
          api.sendMessage(getLang("invaildNumber", i), threadID);
          continue;
        }

        const targetThreadID = Reply.pending[parseInt(i) - 1].threadID;
        try {
          await api.removeUserFromGroup(BOT_UID, targetThreadID);
          count++;
        } catch (error) {
          console.error(`⚠️ Impossible de retirer le bot de la discussion ${targetThreadID} :`, error.message);
        }
      }

      return api.sendMessage(getLang("cancelSuccess", count), threadID, messageID);
    }

    else {
      const index = body.split(/\s+/).filter(Boolean);
      if (index.length === 0)
        return api.sendMessage("Veuillez fournir au moins un numéro de discussion à approuver.", threadID, messageID);

      for (const i of index) {
        if (isNaN(i) || i <= 0 || i > Reply.pending.length) {
          api.sendMessage(getLang("invaildNumber", i), threadID);
          continue;
        }

        const targetThread = Reply.pending[parseInt(i) - 1].threadID;
        const prefix = global.utils.getPrefix(targetThread);
        const nickNameBot = global.GoatBot.config.nickNameBot || "Sakura Bot";

        try {
          await api.changeNickname(nickNameBot, targetThread, BOT_UID);
        } catch (err) {
          console.warn(`⚠️ Le changement de pseudo a échoué pour ${targetThread} :`, err.message);
        }

        try {
          const apiUrl = `${API_ENDPOINT}?botuid=${BOT_UID}&prefix=${encodeURIComponent(prefix)}`;
          const tmpDir = path.join(__dirname, "..", "cache");
          await fs.ensureDir(tmpDir);
          const imagePath = path.join(tmpDir, `botconnect_image_${targetThread}.png`);

          const response = await axios.get(apiUrl, { responseType: "arraybuffer" });
          fs.writeFileSync(imagePath, response.data);

          const textMsg = [
            "✅ 𝐆𝐫𝐨𝐮𝐩𝐞 𝐂𝐨𝐧𝐧𝐞𝐜𝐭𝐞́ 𝐀𝐯𝐞𝐜 𝐒𝐮𝐜𝐜𝐞̀𝐬 🎊",
            `🔹 𝐏𝐫𝐞𝐟𝐢𝐱 𝐝𝐮 𝐁𝐨𝐭: ${prefix}`,
            `🔸 𝐓𝐚𝐩𝐞𝐳: ${prefix}help 𝐩𝐨𝐮𝐫 𝐯𝐨𝐢𝐫 𝐭𝐨𝐮𝐬 𝐥𝐞𝐬 𝐜𝐨𝐦𝐦𝐚𝐧𝐝𝐞𝐬`,
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
            `👑 𝐏𝐫𝐨𝐩𝐫𝐢𝐞́𝐭𝐚𝐢𝐫𝐞: ${ownerInfo.name}`,
            `🌐 𝐅𝐚𝐜𝐞𝐛𝐨𝐨𝐤: ${ownerInfo.facebook}`,
            `✈️ 𝐓𝐞𝐥𝐞𝐠𝐫𝐚𝐦: ${ownerInfo.telegram}`,
            `🤖 𝐒𝐮𝐩𝐩𝐨𝐫𝐭 𝐆𝐂: ${ownerInfo.supportGroup}`
          ].join("\n");

          await api.sendMessage(
            {
              body: textMsg,
              attachment: fs.createReadStream(imagePath)
            },
            targetThread
          );

          fs.unlinkSync(imagePath);
        } catch (err) {
          console.error(`⚠️ Erreur lors de l'envoi du message botconnect vers ${targetThread}:`, err);

          const fallbackMsg = [
            "❌ Échec de génération d'image. Voici les informations :",
            "✅ Groupe Connecté Avec Succès 🎊",
            `🔹 Préfixe: ${prefix}`,
            `🔸 Tapez: ${prefix}help pour les commandes`,
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
            `👑 Propriétaire: ${ownerInfo.name}`,
            `🌐 Facebook: ${ownerInfo.facebook}`,
            `✈️ Telegram: ${ownerInfo.telegram}`,
            `🤖 Support GC: ${ownerInfo.supportGroup}`
          ].join("\n");
          api.sendMessage(fallbackMsg, targetThread);
        }

        count++;
      }

      return api.sendMessage(getLang("approveSuccess", count), threadID, messageID);
    }
  },

  onStart: async function ({ api, event, getLang, commandName }) {
    const { threadID, messageID } = event;
    let msg = "", index = 1;

    try {
      const spam = await api.getThreadList(100, null, ["OTHER"]) || [];
      const pending = await api.getThreadList(100, null, ["PENDING"]) || [];
      const list = [...spam, ...pending].filter(g => g.isSubscribed && g.isGroup);

      for (const item of list) msg += `${index++}/ ${item.name} (${item.threadID})\n`;

      if (list.length !== 0) {
        return api.sendMessage(
          getLang("returnListPending", list.length, msg),
          threadID,
          (err, info) => {
            global.GoatBot.onReply.set(info.messageID, {
              commandName,
              messageID: info.messageID,
              author: event.senderID,
              pending: list
            });
          },
          messageID
        );
      } else {
        return api.sendMessage(getLang("returnListClean"), threadID, messageID);
      }
    } catch (e) {
      return api.sendMessage(getLang("cantGetPendingList"), threadID, messageID);
    }
  }
};
