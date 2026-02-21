const { createCanvas, loadImage } = require("canvas");
const path = require("path");

async function generateProfileCard(player) {
  const canvas = createCanvas(1024, 1024);
  const ctx = canvas.getContext("2d");

  // ===== Background =====
  const gradient = ctx.createLinearGradient(0, 0, 1024, 1024);
  gradient.addColorStop(0, "#0b0f1a");
  gradient.addColorStop(1, "#05070d");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1024, 1024);

  // ===== Left Frame Glow =====
  ctx.strokeStyle = "#1e90ff";
  ctx.lineWidth = 10;
  ctx.shadowColor = "#1e90ff";
  ctx.shadowBlur = 20;
  ctx.strokeRect(60, 150, 400, 600);
  ctx.shadowBlur = 0;

  // ===== Load Character =====
  const character = await loadImage(
    path.join(__dirname, "assets", "characters", "warrior_male_base.png")
  );

  ctx.drawImage(character, 80, 170, 360, 560);

  // ===== Stats Text =====
  ctx.fillStyle = "white";
  ctx.font = "bold 36px Arial";
  ctx.fillText(`Level ${player.level}`, 550, 150);
  ctx.font = "28px Arial";
  ctx.fillText(`Gold: ${player.gold}`, 550, 190);

  drawBar(ctx, 550, 260, 380, 30, player.hp, player.hpMax, "#ff4444", "HP");

  if (player.class === "mage") {
    drawBar(ctx, 550, 320, 380, 30, player.mana, player.manaMax, "#3b82f6", "MANA");
  }

  drawBar(ctx, 550, 380, 380, 30, player.xp, 100 + player.level * 20, "#22c55e", "EXP");

  // ===== Equipment Slots =====
  drawSlots(ctx, player);

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
  ctx.font = "20px Arial";
  ctx.fillText(label, x, y - 5);
}

function drawSlots(ctx, player) {
  const startX = 550;
  const startY = 500;
  const size = 90;
  const gap = 20;

  const slots = [
    player.equipment.weapon,
    player.equipment.armor,
    player.equipment.helmet,
    null,
    null,
    null,
    null,
    null
  ];

  for (let i = 0; i < 8; i++) {
    const row = Math.floor(i / 4);
    const col = i % 4;

    const x = startX + col * (size + gap);
    const y = startY + row * (size + gap);

    ctx.strokeStyle = "#1e90ff";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, size, size);

    if (!slots[i]) {
      ctx.fillStyle = "#444";
      ctx.font = "40px Arial";
      ctx.fillText("+", x + 30, y + 60);
    } else {
      ctx.fillStyle = "white";
      ctx.font = "14px Arial";
      ctx.fillText(slots[i].name.substring(0, 10), x + 10, y + 50);
    }
  }
}

module.exports = { generateProfileCard };
