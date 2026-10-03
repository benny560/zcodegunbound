const { chromium } = require('C:/Users/fanli/AppData/Roaming/npm/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:8899/gunbound_calculator.html', { waitUntil: 'load' });
  // 用 page.evaluate 内联设置: 选trico, 填参数, 切模式, 用 evaluate 调 applyAngle
  // applyAngle 在闭包里, 但我们可以直接模拟 canvas pointer 事件
  await page.evaluate(() => {
    document.getElementById('tank-select').value = 'trico';
    document.getElementById('tank-select').dispatchEvent(new Event('change'));
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    document.getElementById('distance').value = 5;
    document.getElementById('elevation').value = -1;
    document.getElementById('wind-strength').value = 18;
    document.getElementById('compass-dir-right').click();
    switchMode('trico-3in1');
  });
  await page.waitForTimeout(200);
  // 模拟在compass canvas上点击设157度. canvas 800x800, 中心(400,400).
  // 157度 = atan2(y,x). 右攻0度=正右(+x). 157度在左上偏左.
  // x = 400 + r*cos(157°), y = 400 + r*sin(157°). r=300
  const r=300, ang=157*Math.PI/180;
  const cx=400+r*Math.cos(ang), cy=400+r*Math.sin(ang);
  await page.evaluate((args) => {
    const canvas = document.getElementById('compass-canvas');
    const rect = canvas.getBoundingClientRect();
    const px = (args.x/800)*rect.width + rect.left;
    const py = (args.y/800)*rect.height + rect.top;
    // 用 PointerEvent
    ['pointerdown','pointerup','click'].forEach(t=>{
      canvas.dispatchEvent(new PointerEvent(t,{clientX:px,clientY:py,bubbles:true}));
    });
    // 也试 mousedown
    canvas.dispatchEvent(new MouseEvent('mousedown',{clientX:px,clientY:py,bubbles:true}));
    canvas.dispatchEvent(new MouseEvent('mouseup',{clientX:px,clientY:py,bubbles:true}));
  }, {x:cx, y:cy});
  await page.waitForTimeout(800);
  // 抓 N3 取整解的 HTML
  const html = await page.evaluate(() => {
    const c = document.getElementById('results-container');
    if(!c) return 'NO';
    // 找含 "取整解" 的 data-item
    const items = c.querySelectorAll('.data-item');
    const rounds = [];
    items.forEach(it => {
      const lbl = it.querySelector('.data-label')?.textContent || '';
      const val = it.querySelector('.data-value')?.textContent || '';
      if(lbl.includes('取整')) rounds.push({lbl, val, title: it.querySelector('.data-value')?.getAttribute('title')||''});
    });
    // 也抓 windAngle 确认
    const wa = document.getElementById('wind-angle-display')?.textContent;
    return { rounds, windAngle: wa, allText: c.innerText.slice(0,400) };
  });
  console.log('windAngle显示:', html.windAngle);
  console.log('取整解项:');
  html.rounds.forEach(r => console.log(`  ${r.lbl}: "${r.val}" title="${r.title}"`));
  console.log('\n前400字:\n', html.allText);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
