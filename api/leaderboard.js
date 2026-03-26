const { kv } = require('@vercel/kv');

const BOARD_KEY = 'squint:leaderboard';
const MAX_ENTRIES = 100;

function sanitize(str) {
  return String(str).trim().slice(0, 20).replace(/[<>&"']/g, '');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET — return top 10
  if (req.method === 'GET') {
    try {
      const scores = (await kv.get(BOARD_KEY)) || [];
      return res.json(scores.slice(0, 10));
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Could not fetch scores' });
    }
  }

  // POST — add a score
  if (req.method === 'POST') {
    const { name, score } = req.body || {};
    if (typeof score !== 'number' || score < 0 || score > 999999) {
      return res.status(400).json({ error: 'Invalid score' });
    }

    const entry = {
      name: sanitize(name) || 'Anonymous',
      score,
      date: Date.now(),
    };

    try {
      const scores = (await kv.get(BOARD_KEY)) || [];
      scores.push(entry);
      scores.sort((a, b) => b.score - a.score);
      await kv.set(BOARD_KEY, scores.slice(0, MAX_ENTRIES));
      return res.json({ ok: true, rank: scores.findIndex(s => s === entry) + 1 });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Could not save score' });
    }
  }

  res.status(405).end();
};
