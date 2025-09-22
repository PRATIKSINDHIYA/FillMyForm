const express = require('express');
const bodyParser = require('body-parser');
const { runFormAutomation, checkGeminiKey } = require('./auto_fill_form_web');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.post('/check-key', async (req, res) => {
  try {
    const { apiKey } = req.body || {};
    if (!apiKey) return res.status(400).json({ ok: false, error: 'Missing apiKey' });
    await checkGeminiKey(apiKey);
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ ok: false, error: err.message });
  }
});

app.post('/submit', async (req, res) => {
  const { url, apiKey } = req.body || {};
  if (!url) return res.status(400).json({ ok: false, error: 'Please provide a Google Form URL.' });
  if (!apiKey) return res.status(400).json({ ok: false, error: 'Please provide Gemini API key.' });
  try {
    const u = new URL(url);
    if (!/docs\.google\.com$/.test(u.hostname) || !/\/forms\//.test(u.pathname)) {
      return res.status(400).json({ ok: false, error: 'Please paste a valid Google Forms URL.' });
    }
  } catch (_) {
    return res.status(400).json({ ok: false, error: 'Invalid URL format.' });
  }

  try {
    const result = await runFormAutomation(url, apiKey);
    return res.json({ ok: true, ...result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: err.message || 'Server error' });
  }
});

app.listen(PORT, HOST, () => console.log(`Server running at http://${HOST}:${PORT}`));

