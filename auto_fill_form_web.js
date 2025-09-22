// require('dotenv').config();
// const { chromium } = require('playwright');
// const { GoogleGenAI } = require('@google/genai');
// const stringSimilarity = require('string-similarity');

// const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// async function askAI(question, options) {
//   const prompt = `
// Question:
// ${question}

// Options:
// ${options.map((o,i)=>`${i+1}) ${o}`).join('\n')}

// Choose the best option. Reply only with the option text.
//   `.trim();

//   const response = await ai.models.generateContent({
//     model: "gemini-2.5-flash",
//     contents: prompt,
//   });

//   return response.text.trim();
// }

// async function runFormAutomation(url) {
//   const browser = await chromium.connectOverCDP('http://localhost:9222'); // attach to running Chrome
//   const context = browser.contexts()[0];
//   const page = await context.newPage();
//   await page.goto(url);
//   await page.waitForTimeout(2000);

//   const questions = await page.$$eval(
//     'div[role="listitem"]',
//     (blocks) => {
//       return blocks.map(block => {
//         const qText = block.querySelector('[role="heading"]')?.innerText || "";
//         const opts = Array.from(block.querySelectorAll('label span'))
//           .map(el => el.innerText)
//           .filter(Boolean);
//         return { question: qText, options: opts };
//       }).filter(q => q.question && q.options.length);
//     }
//   );

//   for (const q of questions) {
//     const ans = await askAI(q.question, q.options);
//     const match = stringSimilarity.findBestMatch(ans, q.options);
//     const best = q.options[match.bestMatchIndex];
//     await page.evaluate((optionText) => {
//       const spans = Array.from(document.querySelectorAll('label span'));
//       const el = spans.find(s => s.innerText.trim() === optionText.trim());
//       if (el) el.click();
//     }, best);
//     await page.waitForTimeout(500);
//   }

//   await page.evaluate(() => {
//     const btns = Array.from(document.querySelectorAll('div[role="button"]'));
//     const sub = btns.find(b => b.innerText.toLowerCase().includes("submit"));
//     if (sub) sub.click();
//   });
// }

// module.exports = { runFormAutomation };



require('dotenv').config();
const { chromium } = require('playwright');
const { GoogleGenAI } = require('@google/genai');
const stringSimilarity = require('string-similarity');

async function askAI(question, options, apiKey) {
  const ai = new GoogleGenAI({ apiKey: apiKey });

  const prompt = `
Question: ${question}

Options:
${options.map((o, i) => `${i + 1}) ${o}`).join('\n')}

Choose the most appropriate option. Reply only with the exact option text.
  `.trim();

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",  // Using a more available model
      contents: prompt,
    });
    return response.text.trim();
  } catch (error) {
    console.error('AI Error:', error);
    // Fallback: choose first option if AI fails
    return options[0];
  }
}

async function runFormAutomation(url) {
  let browser;
  try {
    // Launch browser with visible UI (for debugging)
    browser = await chromium.launch({ 
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.goto(url);
    await page.waitForTimeout(3000);

    // Extract questions and options
    const questions = await page.$$eval(
      'div[role="listitem"]',
      (blocks) => {
        return blocks.map(block => {
          const qText = block.querySelector('[role="heading"]')?.innerText || "";
          const opts = Array.from(block.querySelectorAll('label span'))
            .map(el => el.innerText)
            .filter(text => text && text.trim().length > 0);
          return { question: qText, options: opts };
        }).filter(q => q.question && q.options.length > 0);
      }
    );

    console.log(`Found ${questions.length} questions`);

    // Get API key from environment (set in the route)
    const apiKey = process.env.GEMINI_API_KEY;

    // Answer each question using AI
    for (const q of questions) {
      console.log(`Question: ${q.question}`);
      console.log(`Options: ${q.options.join(', ')}`);
      
      const ans = await askAI(q.question, q.options, apiKey);
      console.log(`AI Answer: ${ans}`);
      
      const match = stringSimilarity.findBestMatch(ans, q.options);
      const bestMatch = q.options[match.bestMatchIndex];
      console.log(`Best Match: ${bestMatch}`);

      // Click the matching option
      await page.evaluate((optionText) => {
        const labels = Array.from(document.querySelectorAll('label'));
        const targetLabel = labels.find(label => {
          const span = label.querySelector('span');
          return span && span.innerText.trim() === optionText.trim();
        });
        if (targetLabel) {
          targetLabel.click();
        }
      }, bestMatch);
      
      await page.waitForTimeout(1000);
    }

    // Submit the form
    await page.evaluate(() => {
      const submitButtons = Array.from(document.querySelectorAll('div[role="button"]'));
      const submitBtn = submitButtons.find(btn => 
        btn.innerText && btn.innerText.toLowerCase().includes('submit')
      );
      if (submitBtn) {
        submitBtn.click();
      }
    });

    await page.waitForTimeout(3000);
    console.log('Form submitted successfully!');

  } catch (error) {
    console.error('Automation error:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = { runFormAutomation };