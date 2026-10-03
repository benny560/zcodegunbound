import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on('console', m => { if (m.type()==='error') errors.push(m.text()); });
await page.goto('http://127.0.0.1:8899/gunbound_calculator.html', { waitUntil: 'load' });

// 设置参数: Trico, 距离5, 落差-1, 风向157, 风力18, 右攻
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
  // 风向盘角度
  const wa = document.getElementById('windAngle') || document.querySelector('[data-wind-angle]');
  document.getElementById('compass-dir-right').click();
});

// 触发计算: 模拟 input 事件后, 计算器自动重算. 等待结果
await page.waitForTimeout(800);

// 抓取 results-container 完整文本 + N3 区域的 HTML(看取整解)
const result = await page.evaluate(() => {
  const container = document.getElementById('results-container');
  if (!container) return { txt: 'NO CONTAINER', html: '' };
  const txt = container.innerText;
  // 找 n=3 的卡片
  const cards = container.querySelectorAll('.result-card, .tank-result, [data-spin]');
  const n3html = Array.from(container.querySelectorAll('*')).filter(el => el.textContent.includes('n=3') || el.textContent.includes('n=3 →')).map(el => el.outerHTML.slice(0, 500));
  return { txt, n3html: n3html.slice(0, 3) };
});

console.log('=== results-container 文本 ===');
console.log(result.txt);
console.log('\n=== console errors ===');
console.log(errors.join('\n') || '(无)');

await browser.close();
