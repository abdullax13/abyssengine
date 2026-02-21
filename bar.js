function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function bar(current, max, size = 12) {
  max = Math.max(1, Number(max || 1));
  current = clamp(Number(current || 0), 0, max);
  const filled = Math.round((current / max) * size);
  const empty = size - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

function xpToNextLevel(level) {
  // simple curve; we can tune later
  return 50 + (level - 1) * 25;
}

module.exports = { bar, xpToNextLevel };
