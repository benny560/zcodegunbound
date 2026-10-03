const { chromium } = require('C:/Users/fanli/AppData/Roaming/npm/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', m => { if (m.type()==='error') errors.push(m.text()); });
  await page.goto('http://127.0.0.1:9123/gunbound_calculator.html', { waitUntil: 'load' });
  await page.evaluate(() => {
    document.getElementById('tank-select').value = 'trico';
    document.getElementById('tank-select').dispatchEvent(new Event('change'));
    document.getElementById('distance').value = 5;
    document.getElementById('elevation').value = -1;
    document.getElementById('wind-strength').value = 18;
    document.getElementById('compass-dir-right').click();
    switchMode('trico-3in1');
    document.getElementById('mode-click').click();
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const dots = document.querySelectorAll('.compass-click-dot');
    let best=null, bd=999;
    dots.forEach(d => {const deg=parseFloat(d.dataset.deg);const df=Math.min(Math.abs(deg-157),360-Math.abs(deg-157));if(df<bd){bd=df;best=d;}});
    if(best) best.click();
  });
  await page.waitForTimeout(800);
  const res = await page.evaluate(() => {
    const wa = document.getElementById('wind-angle-display')?.textContent;
    const c = document.getElementById('results-container');
    if(!c) return {wa};
    const items = c.querySelectorAll('.data-item');
    const rows = [];
    items.forEach(it => {
      const lbl = it.querySelector('.data-label')?.textContent || '';
      const val = it.querySelector('.data-value')?.textContent || '';
      rows.push(lbl+': '+val);
    });
    return {wa, rows};
  });
  console.log('风向:', res.wa);
  console.log('全部数据项:');
  res.rows.forEach(r=>console.log('  '+r));
  console.log('\nerrors:', errors.join('; ')||'(无)');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
