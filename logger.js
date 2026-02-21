function ts() {
  return new Date().toISOString();
}

module.exports = {
  info: (msg) => console.log(`[${ts()}] [INFO] ${msg}`),
  warn: (msg) => console.warn(`[${ts()}] [WARN] ${msg}`),
  error: (msg) => console.error(`[${ts()}] [ERROR] ${msg}`)
};
