require('dotenv').config();
const { chromium } = require('playwright');
const { GoogleGenAI } = require('@google/genai');
const stringSimilarity = require('string-similarity');

function createAIClient(apiKey) {
  if (!apiKey) throw new Error('Missing Gemini API key');
  return new GoogleGenAI({ apiKey });
}

function extractTextFromGenAIResponse(result) {
  try {
    if (!result) return '';
    if (result.response && typeof result.response.text === 'function') {
      return result.response.text();
    }
    if (typeof result.text === 'function') {
      return result.text();
    }
    // Fallbacks for unexpected shapes
    if (result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts[0] && result.candidates[0].content.parts[0].text) {
      return result.candidates[0].content.parts[0].text;
    }
  } catch (_) {}
  return '';
}

async function askAI(question, options, apiKey) {
  const prompt = `
Question:
${question}

Options:
${options.map((o,i)=>`${i+1}) ${o}`).join('\n')}

Choose the best option. Reply only with the option text.
  `.trim();

  const ai = createAIClient(apiKey);
  const result = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }]
  });
  const text = extractTextFromGenAIResponse(result).trim();
  return text;
}

async function runFormAutomation(url, apiKey) {
  const mode = process.env.BROWSER_MODE || 'cdp'; // 'cdp' | 'headless'
  const browser = mode === 'headless'
    ? await chromium.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'] })
    : await chromium.connectOverCDP('http://localhost:9222'); // attach to running Chrome
  const existingContexts = browser.contexts();
  const context = existingContexts && existingContexts.length > 0
    ? existingContexts[0]
    : await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(45000);
  page.setDefaultNavigationTimeout(45000);
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
    const ans = await askAI(q.question, q.options, apiKey);
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
  
  await Promise.race([
    page.waitForURL('**/formResponse*', { timeout: 15000 }).catch(()=>{}),
    page.waitForSelector('text=/Your response has been recorded/i', { timeout: 15000 }).catch(()=>{})
  ]);

  if (mode === 'headless') {
    try { await page.close(); } catch (_) {}
    try { await context.close(); } catch (_) {}
    try { await browser.close(); } catch (_) {}
  }
  // In CDP mode, do not close the tab/context to keep it visible in the user's Chrome
  return { submitted: true };
}

async function checkGeminiKey(apiKey) {
  const ai = createAIClient(apiKey);
  try {
    const result = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{ role: 'user', parts: [{ text: 'ping' }] }]
    });
    const text = extractTextFromGenAIResponse(result).trim();
    if (!text) throw new Error('Empty model response');
    return true;
  } catch (err) {
    const msg = (err && (err.message || err.toString())) || 'Gemini request failed';
    throw new Error(msg);
  }
}

module.exports = { runFormAutomation, checkGeminiKey };


