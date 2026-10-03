const { chromium } = require('C:/Users/fanli/AppData/Roaming/npm/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:8899/gunbound_calculator.html', { waitUntil: 'load' });
  // 选 Trico 先
  await page.evaluate(() => {
    document.getElementById('tank-select').value = 'trico';
    document.getElementById('tank-select').dispatchEvent(new Event('change'));
  });
  await page.waitForTimeout(300);
  // 列出风力设置区所有 input
  const ids = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('input[type="number"], input[type="text"], select'));
    return all.map(el => ({ id: el.id || '(noid)', placeholder: el.placeholder, value: el.value, parent: el.closest('div')?.textContent?.slice(0,30) }));
  });
  console.log(JSON.stringify(ids, null, 2));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
