const { chromium } = require('C:/Users/fanli/AppData/Roaming/npm/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:9123/gunbound_calculator.html', { waitUntil: 'load' });
  await page.evaluate(() => {
    document.getElementById('tank-select').value = 'trico';
    document.getElementById('tank-select').dispatchEvent(new Event('change'));
    document.getElementById('distance').value = 33;
    document.getElementById('elevation').value = 0;
    document.getElementById('wind-strength').value = 12;
    document.getElementById('compass-dir-left').click();
    switchMode('trico-3in1');
    document.getElementById('mode-click').click();
  });
  await page.waitForTimeout(300);
  // 左攻 wa=90, effWa=180-90=90. 点最接近90的圆周点
  await page.evaluate(() => {
    const dots = document.querySelectorAll('.compass-click-dot');
    let best=null, bd=999;
    dots.forEach(d => {const deg=parseFloat(d.dataset.deg);const df=Math.min(Math.abs(deg-90),360-Math.abs(deg-90));if(df<bd){bd=df;best=d;}});
    if(best) best.click();
  });
  await page.waitForTimeout(800);
  const res = await page.evaluate(() => {
    const wa = document.getElementById('wind-angle-display')?.textContent;
    const c = document.getElementById('results-container');
    if(!c) return {wa};
    // 抓所有 data-item 文本
    const all = [];
    const cards = c.querySelectorAll('.result-card, .tank-result');
    // 直接抓整个容器的所有 .data-item
    c.querySelectorAll('.data-item').forEach(it => {
      const lbl = it.querySelector('.data-label')?.textContent || '';
      const val = it.querySelector('.data-value')?.textContent || '';
      all.push(lbl+': '+val);
    });
    return {wa, all};
  });
  console.log('风向:', res.wa);
  console.log('数据项:');
  res.all.forEach(r=>console.log('  '+r));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
