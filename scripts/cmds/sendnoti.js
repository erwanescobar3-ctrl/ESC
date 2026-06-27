•cmd install notification.js const fs = require("fs-extra");
const Canvas = require("canvas");
const axios = require("axios");

module.exports = {
  config: {
    name: "notification",
    version: "1.0",
    author: "Rayd",
    countDown: 5,
    role: 1,
    shortDescription: "Notification Canvas",
    longDescription: "Envoye une notification avec fond",
    category: "admin",
    guide: "{pn} <message>"
  },

  onStart: async function ({ api, event, args }) {
    const msg = args.join(" ");

    if (!msg)
      return api.sendMessage(
        "⚠️ | Entrez un message.",
        event.threadID,
        event.messageID
      );

    const pathImg = __dirname + "/cache/notification_sasuke.png";
    fs.ensureDirSync(__dirname + "/cache");

    const canvas = Canvas.createCanvas(1000, 600); // Hauteur un peu plus grande pour le footer
    const ctx = canvas.getContext("2d");

    // FOND IMAGE
    const bg = await Canvas.loadImage("https://i.ibb.co/23JNGHXp/a17d77283919.jpg");
    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

    // Overlay noir clair
    ctx.fillStyle = "rgba(10, 20, 40, 0.85)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Lignes parallèle 
    ctx.strokeStyle = "rgba(59, 130, 246, 0.1)";
    ctx.lineWidth = 1;
    for(let i = -canvas.height; i < canvas.width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + canvas.height, canvas.height);
      ctx.stroke();
    }

    // PANEL PRINCIPAL
    const panelW = 900, panelH = 420;
    const panelX = 50, panelY = 70;

    ctx.fillStyle = "rgba(15, 30, 60, 0.9)";
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 25);
    ctx.fill();

    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#3b82f6";
    ctx.shadowBlur = 20;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // BADGE ADMIN-PREMIUM
    ctx.fillStyle = "rgba(59, 130, 246, 0.2)";
    ctx.beginPath();
    ctx.roundRect(panelX + 25, panelY - 15, 180, 30, 15);
    ctx.fill();
    ctx.strokeStyle = "#60a5fa";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = "bold 14px Sans";
    ctx.fillStyle = "#60a5fa";
    ctx.textAlign = "center";
    ctx.fillText("« AUTORITÉ ROYALE »", panelX + 115, panelY + 5);

    // TITRE
    ctx.textAlign = "left";
    ctx.font = "bold 38px Sans";
    ctx.fillStyle = "#60a5fa";
    ctx.shadowColor = "#3b82f6";
    ctx.shadowBlur = 15;
    ctx.fillText("DÉCISION ROYALE", panelX + 40, panelY + 60);
    ctx.shadowBlur = 0;

    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(panelX + 40, panelY + 85);
    ctx.lineTo(panelX + panelW - 40, panelY + 85);
    ctx.stroke();

    // ADMIN
    ctx.font = "bold 22px Sans";
    ctx.fillStyle = "#60a5fa";
    ctx.fillText("▤ Admin :", panelX + 40, panelY + 130);
    ctx.fillStyle = "#ffffff";
    ctx.fillText("Räyd Eföua", panelX + 150, panelY + 130);

    // MESSAGE BOX
    ctx.font = "bold 22px Sans";
    ctx.fillStyle = "#60a5fa";
    ctx.fillText("▤ Message :", panelX + 40, panelY + 175);

    ctx.fillStyle = "rgba(20, 40, 80, 0.6)";
    ctx.beginPath();
    ctx.roundRect(panelX + 40, panelY + 195, panelW - 80, 160, 15);
    ctx.fill();
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = "20px Sans";
    ctx.fillStyle = "#ffffff";

    const maxWidth = panelW - 120;
    const lineHeight = 32;
    let x = panelX + 60;
    let y = panelY + 225;

    const words = msg.split(" ");
    let line = "";

    for (const word of words) {
      const testLine = line + word + " ";
      if (ctx.measureText(testLine).width > maxWidth) {
        ctx.fillText(line + "▤", x, y);
        line = word + " ";
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line + " ▤", x, y);

    // FOOTER
    ctx.textAlign = "center";
    ctx.font = "italic 14px Sans";
    ctx.fillStyle = "rgba(147, 197, 253, 0.8)";
    ctx.fillText(`✍ ESCOBAR MESSENGER• ${new Date().toLocaleDateString("fr-FR")} ⚡`, canvas.width / 2, canvas.height - 20);

    fs.writeFileSync(pathImg, canvas.toBuffer());

    await api.sendMessage(
      {
        body: "Notification officielle de ESCOBAR Bot",
        attachment: fs.createReadStream(pathImg)
      },
      event.threadID,
      () => fs.unlinkSync(pathImg)
    );
  }
};
