const Waline = require('@waline/vercel');

module.exports = Waline({
  pg: process.env.POSTGRES_URL ? true : false,
});
