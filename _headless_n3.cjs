const { chromium } = require('C:/Users/fanli/AppData/Roaming/npm/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', m => { if (m.type()==='error') errors.push(m.text()); });
  await page.goto('http://127.0.0.1:8899/gunbound_calculator.html', { waitUntil: 'load' });

  await page.evaluate(() => {
    document.getElementById('tank-select').value = 'trico';
    document.getElementById('tank-select').dispatchEvent(new Event('change'));
    document.getElementById('distance').value = 5;
    document.getElementById('elevation').value = -1;
    document.getElementById('wind-strength').value = 18;
    document.getElementById('compass-dir-right').click();
    switchMode('trico-3in1');
    // 用 applyAngle 设风向 157 (会触发 doCalculate)
    applyAngle(157);
  });
  await page.waitForTimeout(1000);

  const result = await page.evaluate(() => {
    const container = document.getElementById('results-container');
    return container ? container.innerText : 'NO CONTAINER';
  });
  console.log('=== results-container ===');
  console.log(result);
  console.log('\n=== errors ===');
  console.log(errors.join('\n') || '(无)');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
