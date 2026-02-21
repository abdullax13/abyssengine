const { createCanvas, loadImage } = require("canvas");
const path = require("path");

async function generateProfileCard(player) {
  const canvas = createCanvas(1200, 700);
  const ctx = canvas.getContext("2d");

  // ===== Full Background =====
  const gradient = ctx.createLinearGradient(0, 0, 1200, 700);
  gradient.addColorStop(0, "#070b14");
  gradient.addColorStop(1, "#0a1224");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1200, 700);

  // ===== Character Background Panel =====
  ctx.fillStyle = "#0f1a33";
  ctx.fillRect(40, 40, 450, 620);

  // ===== Blue Glow Frame =====
  ctx.strokeStyle = "#1e90ff";
  ctx.lineWidth = 8;
  ctx.shadowColor = "#1e90ff";
  ctx.shadowBlur = 25;
  ctx.strokeRect(40, 40, 450, 620);
  ctx.shadowBlur = 0;

  // ===== Load Character =====
  const character = await loadImage(
    path.join(__dirname, "assets", "characters", "warrior_male_base.PNG")
  );

  ctx.drawImage(character, 90, 80, 350, 550);

  // ===== Player Name =====
  ctx.fillStyle = "white";
  ctx.font = "bold 40px Arial";
  ctx.fillText(player.name || "Unknown", 550, 90);

  ctx.font = "28px Arial";
  ctx.fillStyle = "#1e90ff";
  ctx.fillText(`Level ${player.level}`, 550, 130);

  ctx.fillStyle = "gold";
  ctx.fillText(`Gold: ${player.gold}`, 550, 170);

  // ===== Bars =====
  drawBar(ctx, 550, 230, 500, 35, player.hp, player.hpMax, "#ff4444", `HP ${player.hp}/${player.hpMax}`);

  if (player.class === "mage") {
    drawBar(ctx, 550, 290, 500, 35, player.mana, player.manaMax, "#3b82f6", `Mana ${player.mana}/${player.manaMax}`);
  }

  const xpMax = 100 + player.level * 20;
  drawBar(ctx, 550, 350, 500, 30, player.xp, xpMax, "#22c55e", `EXP ${player.xp}/${xpMax}`);

  // ===== Equipment Slots =====
  drawSlots(ctx);

  return canvas.toBuffer();
}

function drawBar(ctx, x, y, width, height, value, max, color, text) {
  ctx.fillStyle = "#1f2937";
  ctx.fillRect(x, y, width, height);

  const percent = Math.min(value / max, 1);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width * percent, height);

  ctx.strokeStyle = "#000";
  ctx.strokeRect(x, y, width, height);

  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText(text, x + 10, y + height - 10);
}

function drawSlots(ctx) {
  const startX = 550;
  const startY = 430;
  const size = 90;
  const gap = 20;

  for (let i = 0; i < 8; i++) {
    const row = Math.floor(i / 4);
    const col = i % 4;

    const x = startX + col * (size + gap);
    const y = startY + row * (size + gap);

    ctx.strokeStyle = "#1e90ff";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, size, size);
  }
}

module.exports = { generateProfileCard };
