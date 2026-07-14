const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  console.log('Going to login page...');
  await page.goto('https://sanwanay.smartolt.com/auth/login', { waitUntil: 'networkidle2' });
  
  console.log('Filling credentials...');
  await page.type('input[name="identity"]', 'mohamadsanwani9@gmail.com');
  await page.type('input[name="password"]', '72UubSHF4m2z');
  await page.click('input[type="submit"]');
  
  console.log('Waiting for navigation...');
  await page.waitForNavigation({ waitUntil: 'networkidle2' });
  
  console.log('Going to Configured ONUs...');
  await page.goto('https://sanwanay.smartolt.com/onu/configured', { waitUntil: 'networkidle2' });
  
  console.log('Extracting header styles...');
  const headerInfo = await page.evaluate(() => {
    // Attempt to find the page header
    const titleElements = Array.from(document.querySelectorAll('h1, h2, h3, h4, .page-header, .page-title, .title'));
    
    return titleElements.map(el => {
      const computed = window.getComputedStyle(el);
      return {
        tagName: el.tagName,
        className: el.className,
        innerText: el.innerText.trim(),
        color: computed.color,
        fontSize: computed.fontSize,
        fontWeight: computed.fontWeight,
        marginTop: computed.marginTop,
        marginBottom: computed.marginBottom,
        fontFamily: computed.fontFamily,
        borderBottom: computed.borderBottom
      };
    }).filter(el => el.innerText.includes('Configured'));
  });
  
  console.log('Header Info:', JSON.stringify(headerInfo, null, 2));
  
  console.log('Extracting partial HTML for layout...');
  const html = await page.evaluate(() => document.body.innerHTML);
  fs.writeFileSync('configured_page.html', html);
  
  await browser.close();
})();
