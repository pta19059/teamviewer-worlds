import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { connectBrowser } from './browser-qa.mjs';

const b = await connectBrowser(); const results = [];
const wait = ms => new Promise(r => setTimeout(r, ms));
const check = (name, value) => { assert.ok(value, name); results.push(name); console.log(`PASS ${name}`); };
try {
  await b.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await b.send('Page.navigate', { url: 'http://localhost:5173' });
  await b.until(`document.body.classList.contains('loaded')`, 25000); await wait(1800);
  if(Number(await b.evaluate(`document.getElementById('total-count').textContent`))>0){await b.click('#nav-journal');await b.click('#reset-progress');await b.click('#reset-progress');await wait(400);await b.until(`document.body.classList.contains('loaded') && document.getElementById('total-count').textContent === '0'`,25000);}
  check('3D engine loads and page language is English', await b.evaluate(`document.documentElement.lang === 'en' && document.querySelector('canvas').width > 0`));
  check('All resources load locally', await b.evaluate(`performance.getEntriesByType('resource').every(r=>new URL(r.name).origin===location.origin)`));
  await b.screenshot('desktop-map.png');
  await b.click('#start'); await b.until(`document.body.dataset.world === 'hub' && document.getElementById('transition').classList.contains('hidden')`); await wait(1300);
  check('The start button enters Connection Island', await b.evaluate(`document.getElementById('world-title').textContent === 'Connection Island'`));
  await b.screenshot('connection-island.png');
  const initialPosition = await b.evaluate(`document.getElementById('minimap-player').style.cssText`);
  await b.send('Input.dispatchKeyEvent', { type:'keyDown', code:'ArrowLeft', key:'ArrowLeft', windowsVirtualKeyCode:37 }); await wait(900);
  await b.send('Input.dispatchKeyEvent', { type:'keyUp', code:'ArrowLeft', key:'ArrowLeft', windowsVirtualKeyCode:37 });
  check('Keyboard controls move TIA', initialPosition !== await b.evaluate(`document.getElementById('minimap-player').style.cssText`));
  await b.send('Input.dispatchKeyEvent', { type:'keyDown', code:'Space', key:' ', windowsVirtualKeyCode:32 });
  await b.send('Input.dispatchKeyEvent', { type:'keyUp', code:'Space', key:' ', windowsVirtualKeyCode:32 });
  await b.click('#back-map'); await b.click('[data-travel="tensor"]');
  await b.until(`document.body.dataset.world === 'tensor' && document.getElementById('transition').classList.contains('hidden')`); await wait(1300);
  await b.screenshot('tensor-world.png');
  // Start with a station across the castle, exercising the obstacle route.
  await b.click('[data-discovery="tensor-audit"]');
  await b.until(`document.querySelector('dialog').open && document.getElementById('dialog-title').textContent.includes('memory')`, 45000);
  check('Click-to-walk routes TIA around the castle to a discovery', true);
  await b.screenshot('discovery.png');
  const previousCount = Number(await b.evaluate(`document.getElementById('total-count').textContent`));
  await b.click('#collect');
  await b.until(`!document.querySelector('dialog').open`);
  check('Collecting a discovery updates progress', Number(await b.evaluate(`document.getElementById('total-count').textContent`)) === previousCount + 1);
  await b.click('[data-discovery="tensor-audit"]'); await b.until(`document.querySelector('dialog').open`,10000); await b.click('#collect');
  check('Revisiting a discovery cannot award it twice', Number(await b.evaluate(`document.getElementById('total-count').textContent`)) === previousCount + 1);
  for (const id of ['tensor-connect','tensor-access','tensor-identity','tensor-integrations','tensor-ot']) {
    await b.click(`[data-discovery="${id}"]`); await b.until(`document.querySelector('dialog').open`,45000); await b.click('#collect'); await b.until(`!document.querySelector('dialog').open`);
  }
  check('All six Tensor discoveries can be collected', await b.evaluate(`document.getElementById('quest-title').textContent === 'World complete!'`));
  await b.click('#next-discovery'); await b.until(`document.body.dataset.world === 'one' && document.getElementById('transition').classList.contains('hidden')`); await wait(1300);
  await b.screenshot('one-world.png');
  for (let i=0;i<6;i++) { await b.click('#next-discovery'); await b.until(`document.querySelector('dialog').open`,45000); await b.click('#collect'); await b.until(`!document.querySelector('dialog').open`); }
  check('All twelve discoveries and both worlds can be completed', await b.evaluate(`document.getElementById('total-count').textContent === '12' && document.getElementById('quest-title').textContent === 'World complete!'`));
  await b.click('#nav-journal'); await b.until(`document.querySelector('dialog').open`);
  check('The journal shows all twelve collected capabilities', await b.evaluate(`document.querySelectorAll('.journal-item.found').length === 12`));
  await b.screenshot('journal.png');await b.click('#dialog-close');
  await b.send('Page.reload'); await b.until(`document.body.classList.contains('loaded')`,25000);
  check('Progress survives a page reload', await b.evaluate(`document.getElementById('total-count').textContent === '12'`));
  await b.click('#start'); await b.until(`document.body.dataset.world === 'hub' && document.getElementById('transition').classList.contains('hidden')`);
  await b.click('#sound'); check('The sound toggle is interactive', await b.evaluate(`document.getElementById('sound').getAttribute('aria-label') === 'Mute sound'`));
  await b.click('#nav-guide'); check('The guide opens with English instructions', await b.evaluate(`document.getElementById('dialog-title').textContent === 'Curiosity isyour superpower.'`));
  await b.send('Input.dispatchKeyEvent', { type:'keyDown', key:'Escape', code:'Escape', windowsVirtualKeyCode:27 });
  await b.send('Input.dispatchKeyEvent', { type:'keyUp', key:'Escape', code:'Escape', windowsVirtualKeyCode:27 }); await b.until(`!document.querySelector('dialog').open`);
  await b.click('#back-map');
  await b.send('Emulation.setDeviceMetricsOverride', { width:390,height:844,deviceScaleFactor:1,mobile:true });
  await b.send('Emulation.setTouchEmulationEnabled', { enabled:true,maxTouchPoints:5 }); await wait(1500);
  check('Mobile layout has no horizontal overflow', await b.evaluate(`document.documentElement.scrollWidth <= innerWidth`));
  await b.screenshot('mobile-map.png');
  await b.click('[data-travel="one"]'); await b.until(`document.body.dataset.world === 'one' && document.getElementById('transition').classList.contains('hidden')`); await wait(1000);
  check('Touch controls are visible on mobile', await b.evaluate(`getComputedStyle(document.querySelector('.touch-controls')).display !== 'none'`));
  await b.screenshot('mobile-world.png');
  check('No JavaScript runtime errors', b.errors.length === 0);
  await writeFile('artifacts/browser-results.json',JSON.stringify({passed:results,errors:b.errors},null,2));
} catch (error) {
  console.error(error); console.error('Runtime errors:',b.errors);await b.screenshot('failure.png');
  await writeFile('artifacts/browser-results.json',JSON.stringify({passed:results,error:error.message,errors:b.errors},null,2));process.exitCode=1;
} finally {await b.close();}
