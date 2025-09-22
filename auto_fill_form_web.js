require('dotenv').config();
const { chromium } = require('playwright');
const { GoogleGenAI } = require('@google/genai');
const stringSimilarity = require('string-similarity');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function askAI(question, options) {
  const prompt = `
Question:
${question}

Options:
${options.map((o,i)=>`${i+1}) ${o}`).join('\n')}

Choose the best option. Reply only with the option text.
  `.trim();

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  return response.text.trim();
}

async function runFormAutomation(url) {
  const browser = await chromium.connectOverCDP('http://localhost:9222'); // attach to running Chrome
  const context = browser.contexts()[0];
  const page = await context.newPage();
  await page.goto(url);
  await page.waitForTimeout(2000);

  const questions = await page.$$eval(
    'div[role="listitem"]',
    (blocks) => {
      return blocks.map(block => {
        const qText = block.querySelector('[role="heading"]')?.innerText || "";
        const opts = Array.from(block.querySelectorAll('label span'))
          .map(el => el.innerText)
          .filter(Boolean);
        return { question: qText, options: opts };
      }).filter(q => q.question && q.options.length);
    }
  );

  for (const q of questions) {
    const ans = await askAI(q.question, q.options);
    const match = stringSimilarity.findBestMatch(ans, q.options);
    const best = q.options[match.bestMatchIndex];
    await page.evaluate((optionText) => {
      const spans = Array.from(document.querySelectorAll('label span'));
      const el = spans.find(s => s.innerText.trim() === optionText.trim());
      if (el) el.click();
    }, best);
    await page.waitForTimeout(500);
  }

  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('div[role="button"]'));
    const sub = btns.find(b => b.innerText.toLowerCase().includes("submit"));
    if (sub) sub.click();
  });
}

module.exports = { runFormAutomation };


