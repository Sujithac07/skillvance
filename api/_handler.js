const app = require('../backend/server');

module.exports = async function handler(req, res) {
  await app.ensureInitialized();
  return app(req, res);
};
