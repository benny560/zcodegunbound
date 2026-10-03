const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file:///C:/Users/fanli/Documents/zcodegunbound/gunbound_calculator.html');
  // 设置: 距离5 落差-1 风向157 风力18 右攻
  await page.fill('#distance', '5');
  await page.fill('#elevation', '-1');
  await page.fill('#windAngle', '157');
  await page.fill('#windStrength', '18');
  // 选右攻
  await page.click('[data-dir="right"], button:has-text("右攻"), #dir-right');
  await page.waitForTimeout(500);
  // 触发计算
  await page.click('button:has-text("计算"), #calculate-btn, button[type="submit"]');
  await page.waitForTimeout(500);
  // 抓N3区域的取整解文本
  const txt = await page.evaluate(() => {
    const container = document.getElementById('results-container');
    return container ? container.innerText : 'NO CONTAINER';
  });
  console.log('=== results-container 文本 ===');
  console.log(txt);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
