import assert from 'node:assert/strict';
import { connectBrowser } from './browser-qa.mjs';

const browser = await connectBrowser();
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const targetUrl = process.argv[2] || 'http://localhost:5173';
try {
  await browser.send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.landscapeRenderErrors = [];
    const reportError = console.error.bind(console);
    console.error = (...args) => { window.landscapeRenderErrors.push(args.map(String).join(' ')); reportError(...args); };
  ` });
  await browser.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await browser.send('Page.navigate', { url: targetUrl });
  await browser.until(`document.body.classList.contains('loaded')`, 30000);
  // Check the modules actually requested by the page, including its lazy import.
  // A fresh entry point must not reuse a previous release's cached 3D scene.
  const modules = await browser.evaluate(`performance.getEntriesByType('resource')
    .map(resource => new URL(resource.name)).filter(url => /\\/src\\/(main|scene|landscape)\\.js$/.test(url.pathname))
    .map(url => ({ path: url.pathname, version: url.searchParams.get('v') }))`);
  assert.equal(modules.length, 3, 'The page loads the entry point, scene and landscape modules');
  assert.ok(modules.every(module => module.version && module.version === modules[0].version), 'All landscape modules use the same cache version');
  console.log('PASS the browser loads all three current-release modules', JSON.stringify(modules));
  await wait(1500);
  await browser.screenshot('landscape-map.png');
  for (const world of ['hub', 'tensor', 'one']) {
    await browser.click(`[data-travel="${world}"]`);
    await browser.until(`document.body.dataset.world === '${world}' && document.getElementById('transition').classList.contains('hidden')`);
    await wait(2000);
    assert.ok(await browser.evaluate(`document.getElementById('world-title').getBoundingClientRect().top > 0`), 'The world heading stays in view');
    await browser.screenshot(`landscape-${world}.png`);
    if (world !== 'hub') {
      await browser.click(`[data-discovery="${world === 'tensor' ? 'tensor-audit' : 'one-patch'}"]`);
      await browser.until(`document.querySelector('dialog').open`, 45000);
      await browser.click('#dialog-close');
      console.log(`PASS ${world}: route across the island still reaches a discovery`);
    }
    await browser.click('#back-map');
    await wait(800);
    console.log(`PASS ${world}: scenery renders and map navigation works`);
  }
  await browser.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await browser.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await wait(1000);
  assert.ok(await browser.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'No mobile horizontal overflow');
  await browser.screenshot('landscape-mobile-map.png');
  await browser.click('[data-travel="one"]');
  await browser.until(`document.body.dataset.world === 'one' && document.getElementById('transition').classList.contains('hidden')`);
  await wait(1800);
  assert.ok(await browser.evaluate(`document.getElementById('world-title').getBoundingClientRect().top > 0`), 'The mobile world heading stays in view');
  await browser.screenshot('landscape-mobile-one.png');
  assert.ok(await browser.evaluate(`getComputedStyle(document.querySelector('.touch-controls')).display !== 'none'`));
  assert.deepEqual(browser.errors, []);
  assert.deepEqual(await browser.evaluate('window.landscapeRenderErrors'), [], 'No WebGL or shader errors');
  console.log('PASS mobile layout, touch controls, JavaScript and WebGL shaders');
} catch (error) {
  console.error(error);
  await browser.screenshot('landscape-failure.png');
  process.exitCode = 1;
} finally {
  await browser.close();
}
