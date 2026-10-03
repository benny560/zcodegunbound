const path = require('path');
const PW = require('C:/Users/fanli/AppData/Roaming/npm/node_modules/playwright');
const { chromium } = PW;
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', m => { if (m.type()==='error') errors.push(m.text()); });
  await page.goto('http://127.0.0.1:8899/gunbound_calculator.html', { waitUntil: 'load' });

  await page.evaluate(() => {
    document.getElementById('tank-select').value = 'trico';
    document.getElementById('tank-select').dispatchEvent(new Event('change'));
    const set = (id, v) => {
      const el = document.getElementById(id);
      el.value = v;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };
    set('distance', 5);
    set('elevation', -1);
    set('windAngle', 157);
    set('wind-strength', 18);
    document.getElementById('compass-dir-right').click();
  });

  await page.waitForTimeout(1000);

  const result = await page.evaluate(() => {
    const container = document.getElementById('results-container');
    if (!container) return { txt: 'NO CONTAINER' };
    return { txt: container.innerText };
  });

  console.log('=== results-container 文本 ===');
  console.log(result.txt);
  console.log('\n=== console errors ===');
  console.log(errors.join('\n') || '(无)');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
