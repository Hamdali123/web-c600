const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('https://sanwanay.smartolt.com/auth/login', { waitUntil: 'networkidle2' });
  await page.type('input[name="identity"]', 'mohamadsanwani9@gmail.com');
  await page.type('input[name="password"]', '72UubSHF4m2z');
  await page.click('input[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle2' });
  await page.goto('https://sanwanay.smartolt.com/onu/configured', { waitUntil: 'networkidle2' });
  
  const info = await page.evaluate(() => {
    const wrap = document.querySelector('.content-wrap');
    return {
      bodyBg: window.getComputedStyle(document.body).backgroundColor,
      bodyColor: window.getComputedStyle(document.body).color,
      wrapBg: wrap ? window.getComputedStyle(wrap).backgroundColor : null
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();
