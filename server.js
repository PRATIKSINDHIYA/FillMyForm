const express = require('express');
const bodyParser = require('body-parser');
const { runFormAutomation } = require('./auto_fill_form_web');

const app = express();
const PORT = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.post('/submit', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.send('Please provide a Google Form URL.');

  try {
    await runFormAutomation(url);
    res.send('✅ Form filled and submitted successfully!');
  } catch (err) {
    console.error(err);
    res.send('❌ Something went wrong: ' + err.message);
  }
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));

