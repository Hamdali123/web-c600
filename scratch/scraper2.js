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
    // try to force light mode if dark mode is active
    document.body.classList.remove('dark-mode');
    document.body.classList.remove('night-mode');
    const h2 = document.querySelector('h2');
    const computed = window.getComputedStyle(h2);
    return {
      bodyClass: document.body.className,
      h2Color: computed.color,
      h2Font: computed.fontFamily,
      h2Size: computed.fontSize,
      h2Weight: computed.fontWeight,
      h2MarginTop: computed.marginTop,
      h2MarginBottom: computed.marginBottom
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();
