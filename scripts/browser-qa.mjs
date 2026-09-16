import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const artifacts = resolve(root, 'artifacts');
await mkdir(artifacts, { recursive: true });
const chromePath = process.env.CHROME_PATH || `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`;
export async function connectBrowser() {
  const child = spawn(chromePath, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-gpu-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--remote-debugging-port=9224', `--user-data-dir=${resolve(artifacts, 'qa-profile')}`, '--window-size=1440,1000', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  child.on('error', error => console.error(error.message));
  let pages;
  for (let i = 0; i < 40; i++) { try { pages = await (await fetch('http://127.0.0.1:9224/json/list')).json(); if (pages.some(p => p.type === 'page')) break; } catch {} await new Promise(r => setTimeout(r, 250)); }
  if (!pages) throw new Error('The headless test browser did not start.');
  const socket = new WebSocket(pages.find(p => p.type === 'page').webSocketDebuggerUrl);
  await new Promise((r, reject) => { socket.onopen = r; socket.onerror = reject; });
  let sequence = 0; const pending = new Map(), errors = [];
  socket.onmessage = message => { const data = JSON.parse(message.data); if (data.id) { const p = pending.get(data.id); pending.delete(data.id); if (data.error) p?.reject(new Error(JSON.stringify(data.error))); else p?.resolve(data.result); } else if (data.method === 'Runtime.exceptionThrown') errors.push(data.params.exceptionDetails.text + ': ' + (data.params.exceptionDetails.exception?.description || '')); };
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => { const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text); return result.result.value; };
  const until = async (expression, timeout = 12000) => { const start = Date.now(); while (Date.now() - start < timeout) { if (await evaluate(expression)) return; await new Promise(r => setTimeout(r, 180)); } throw new Error(`Timed out waiting for: ${expression}`); };
  const click = async selector => { const rect = await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing '+${JSON.stringify(selector)});e.scrollIntoView({block:'nearest',inline:'nearest'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`); await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...rect, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...rect, button: 'left', clickCount: 1 }); };
  const screenshot = async name => { const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); await writeFile(resolve(artifacts, name), Buffer.from(result.data, 'base64')); };
  await send('Page.enable'); await send('Runtime.enable');
  return { send, evaluate, until, click, screenshot, errors, close: async () => { try { await send('Browser.close'); } catch {} socket.close(); child.kill(); } };
}

if (['--capture','--capture-mobile'].includes(process.argv[2])) {
  const browser = await connectBrowser();
  try {
    const mobile=process.argv[2]==='--capture-mobile';
    await browser.send('Emulation.setDeviceMetricsOverride', { width: mobile?390:1440, height: mobile?1240:1000, deviceScaleFactor: 1, mobile });
    await browser.send('Page.navigate', { url: 'http://localhost:5173' });
    try { await browser.until(`document.body.classList.contains('loaded') || document.body.classList.contains('graphics-error')`, 25000); }
    catch (error) { console.log(JSON.stringify({ error: error.message, exceptions: browser.errors, page: await browser.evaluate('({url:location.href,state:document.readyState,text:document.body.innerText.slice(0,2000),resources:performance.getEntriesByType("resource").map(r=>r.name)})') })); }
    await new Promise(r => setTimeout(r, 1800));
    await browser.screenshot(mobile?'mobile-full-page.png':'desktop-map.png');
    console.log(JSON.stringify({ errors: browser.errors, title: await browser.evaluate('document.title'), loaded: await browser.evaluate(`document.body.classList.contains('loaded')`) }));
  } finally { await browser.close(); }
}
