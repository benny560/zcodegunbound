const { chromium } = require('C:/Users/fanli/AppData/Roaming/npm/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:8899/gunbound_calculator.html', { waitUntil: 'load' });
  await page.evaluate(() => {
    document.getElementById('tank-select').value = 'trico';
    document.getElementById('tank-select').dispatchEvent(new Event('change'));
    document.getElementById('distance').value = 5;
    document.getElementById('elevation').value = -1;
    document.getElementById('wind-strength').value = 18;
    document.getElementById('compass-dir-right').click();
    switchMode('trico-3in1');
    // 切到点击模式, 然后点击最接近157度的圆周点
    document.getElementById('mode-click').click();
  });
  await page.waitForTimeout(300);
  // 找最接近157的 compass-click-dot
  await page.evaluate(() => {
    const dots = document.querySelectorAll('.compass-click-dot');
    let best=null, bestDiff=999;
    dots.forEach(d => {
      const deg = parseFloat(d.dataset.deg);
      const diff = Math.min(Math.abs(deg-157), 360-Math.abs(deg-157));
      if(diff < bestDiff){bestDiff=diff; best=d;}
    });
    if(best) best.click();
  });
  await page.waitForTimeout(800);
  const res = await page.evaluate(() => {
    const wa = document.getElementById('wind-angle-display')?.textContent;
    const c = document.getElementById('results-container');
    if(!c) return {wa};
    const items = c.querySelectorAll('.data-item');
    const rounds = [];
    items.forEach(it => {
      const lbl = it.querySelector('.data-label')?.textContent || '';
      const val = it.querySelector('.data-value')?.textContent || '';
      if(lbl.includes('取整')) rounds.push(lbl+': '+val);
    });
    return {wa, rounds, text: c.innerText.slice(0,500)};
  });
  console.log('风向:', res.wa);
  console.log('取整解:');
  res.rounds.forEach(r=>console.log('  '+r));
  console.log('\n结果前500字:\n', res.text);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
