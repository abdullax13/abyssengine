const { createCanvas, loadImage } = require("canvas");
const path = require("path");

async function generateProfileCard(player) {
  const width = 1300;
  const height = 750;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // ===== Background =====
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#050913");
  bg.addColorStop(1, "#0b1833");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // ===== Character Panel =====
  const panelX = 60;
  const panelY = 60;
  const panelW = 500;
  const panelH = 630;

  ctx.fillStyle = "#0d1a2e";
  ctx.fillRect(panelX, panelY, panelW, panelH);

  ctx.strokeStyle = "#1e90ff";
  ctx.lineWidth = 10;
  ctx.shadowColor = "#1e90ff";
  ctx.shadowBlur = 30;
  ctx.strokeRect(panelX, panelY, panelW, panelH);
  ctx.shadowBlur = 0;

  // ===== Load Character =====
  const character = await loadImage(
    path.join(__dirname, "assets", "characters", "warrior_male_base.PNG")
  );

  ctx.drawImage(character, panelX + 70, panelY + 40, 380, 560);

  // ===== Name & Info =====
  ctx.fillStyle = "white";
  ctx.font = "bold 50px Arial";
  ctx.fillText(player.name || "Unknown", 650, 120);

  ctx.font = "32px Arial";
  ctx.fillStyle = "#1e90ff";
  ctx.fillText(`Level ${player.level}`, 650, 170);

  ctx.fillStyle = "gold";
  ctx.fillText(`Gold: ${player.gold}`, 650, 215);

  // ===== Bars =====
  drawBar(ctx, 650, 280, 550, 40, player.hp, player.hpMax, "#ff3b3b", `HP ${player.hp}/${player.hpMax}`);

  if (player.class === "mage") {
    drawBar(ctx, 650, 350, 550, 40, player.mana, player.manaMax, "#3b82f6", `Mana ${player.mana}/${player.manaMax}`);
  }

  const xpMax = 100 + player.level * 20;
  drawBar(ctx, 650, 420, 550, 35, player.xp, xpMax, "#22c55e", `EXP ${player.xp}/${xpMax}`);

  // ===== Equipment Title =====
  ctx.font = "bold 32px Arial";
  ctx.fillStyle = "white";
  ctx.fillText("Equipment", 650, 500);

  drawSlots(ctx, 650, 540);

  return canvas.toBuffer();
}

function drawBar(ctx, x, y, width, height, value, max, color, label) {
  ctx.fillStyle = "#1f2937";
  ctx.fillRect(x, y, width, height);

  const percent = Math.min(value / max, 1);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width * percent, height);

  ctx.strokeStyle = "#000";
  ctx.strokeRect(x, y, width, height);

  ctx.fillStyle = "white";
  ctx.font = "22px Arial";
  ctx.fillText(label, x + 15, y + height - 12);
}

function drawSlots(ctx, startX, startY) {
  const size = 100;
  const gap = 25;

  for (let i = 0; i < 8; i++) {
    const row = Math.floor(i / 4);
    const col = i % 4;

    const x = startX + col * (size + gap);
    const y = startY + row * (size + gap);

    ctx.strokeStyle = "#1e90ff";
    ctx.lineWidth = 4;
    ctx.strokeRect(x, y, size, size);
  }
}

module.exports = { generateProfileCard };
