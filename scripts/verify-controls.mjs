import assert from 'node:assert/strict';
import { connectBrowser } from './browser-qa.mjs';

const browser = await connectBrowser();
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const pressE = async () => {
  await browser.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'e', code: 'KeyE', windowsVirtualKeyCode: 69 });
  await browser.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'e', code: 'KeyE', windowsVirtualKeyCode: 69 });
};
const ready = world => browser.until(`document.body.dataset.world === '${world}' && document.getElementById('transition').classList.contains('hidden')`);
try {
  await browser.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 800, deviceScaleFactor: 1, mobile: false });
  await browser.send('Page.navigate', { url: process.argv[2] || 'http://localhost:5173' });
  await browser.until(`document.body.classList.contains('loaded')`, 30000);
  await browser.evaluate('document.fonts.ready.then(() => true)');
  for (const [width, height] of [[1920,900],[1865,854],[1600,850],[1920,800],[1920,1080],[1440,900],[1366,768],[1024,650],[820,650],[800,900],[768,1024],[390,844]]) {
    await browser.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 521 });
    await wait(350);
    const layout = await browser.evaluate(`(() => {
      const start = document.getElementById('start').getBoundingClientRect();
      const selector = document.getElementById('world-selector').getBoundingClientRect();
      return { buttonBottom: start.bottom, selectorTop: selector.top, overflow: document.documentElement.scrollWidth > innerWidth };
    })()`);
    assert.ok(layout.buttonBottom + 12 <= layout.selectorTop, `${width}x${height}: world cards overlap Start exploring: ${JSON.stringify(layout)}`);
    assert.equal(layout.overflow, false, `${width}x${height}: no horizontal overflow`);
    console.log(`PASS ${width}x${height}: Start exploring stays clear of world cards`);
    if (width === 1920 && height === 800) await browser.screenshot('controls-map-desktop.png');
    if (width === 390) await browser.screenshot('controls-map-mobile.png');
  }
  await browser.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await browser.click('#start'); await ready('hub');
  await pressE();
  await browser.until(`!document.getElementById('toast').classList.contains('hidden') && document.getElementById('toast').textContent.includes('Move closer')`);
  assert.equal(await browser.evaluate(`document.querySelector('dialog').open`), false);
  console.log('PASS E away from objects explains how to discover');
  await browser.until(`document.getElementById('toast').classList.contains('hidden')`);
  await browser.click('#discover-action');
  await browser.until(`!document.getElementById('toast').classList.contains('hidden')`);
  console.log('PASS the Discover control is a real clickable button');
  await browser.click('#back-map'); await browser.click('[data-travel="tensor"]'); await ready('tensor');
  await browser.until(`!document.getElementById('interaction').classList.contains('hidden') && document.getElementById('interaction-text').textContent.includes('Enter:')`);
  await pressE(); await ready('hub');
  console.log('PASS E enters a nearby portal');
  await browser.click('#back-map'); await browser.click('[data-travel="tensor"]'); await ready('tensor');
  await browser.click('[data-discovery="tensor-connect"]');
  await browser.until(`document.querySelector('dialog').open`, 45000);
  await browser.click('#dialog-close');
  await browser.until(`!document.querySelector('dialog').open && !document.getElementById('interaction').classList.contains('hidden')`);
  await pressE();
  await browser.until(`document.querySelector('dialog').open && document.getElementById('dialog-title').textContent === 'Support without borders'`);
  console.log('PASS keyboard E opens a nearby discovery after closing its dialog');
  await browser.click('#dialog-close');
  await browser.until(`!document.querySelector('dialog').open`);
  await browser.click('#discover-action');
  await browser.until(`document.querySelector('dialog').open && document.getElementById('dialog-title').textContent === 'Support without borders'`);
  console.log('PASS clicking Discover opens the same nearby discovery');
  await browser.screenshot('controls-discovery.png');
  assert.deepEqual(browser.errors, []);
  console.log('PASS no JavaScript runtime errors');
} catch (error) {
  console.error(error);
  await browser.screenshot('controls-failure.png');
  process.exitCode = 1;
} finally {
  await browser.close();
}
