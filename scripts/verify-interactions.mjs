import assert from 'node:assert/strict';
import { connectBrowser } from './browser-qa.mjs';
const b=await connectBrowser();const wait=ms=>new Promise(r=>setTimeout(r,ms));
const at=async(x,y)=>{await b.send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});await b.send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1});};
try{
  await b.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await b.send('Page.navigate',{url:'http://localhost:5173'});await b.until(`document.body.classList.contains('loaded')`,25000);
  await b.click('#start');await b.until(`document.body.dataset.world==='hub' && document.getElementById('transition').classList.contains('hidden')`);await wait(2400);
  // Portal center observed in the 1440 Ã— 1000 Connection Island screenshot.
  await at(434,547);await b.until(`document.body.dataset.world==='tensor' && document.getElementById('transition').classList.contains('hidden')`,45000);
  console.log('PASS Clicking the physical Tensor portal walks TIA through it');
  await b.click('[data-discovery="tensor-connect"]');await b.until(`document.querySelector('dialog').open`,30000);await b.click('#dialog-close');await wait(200);
  const before=await b.evaluate(`document.getElementById('minimap-player').style.cssText`);
  await b.send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowLeft',code:'ArrowLeft',windowsVirtualKeyCode:37});await wait(700);
  await b.send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowLeft',code:'ArrowLeft',windowsVirtualKeyCode:37});
  assert.notEqual(before,await b.evaluate(`document.getElementById('minimap-player').style.cssText`));
  console.log('PASS Keyboard movement works after closing a discovery dialog');
  await b.send('Input.dispatchMouseEvent',{type:'mousePressed',x:1050,y:630,button:'left',clickCount:1});
  for(let i=1;i<=12;i++)await b.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:1050-i*25,y:630,button:'left',buttons:1});
  await b.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:750,y:630,button:'left',clickCount:1});
  await b.send('Input.dispatchMouseEvent',{type:'mouseWheel',x:750,y:630,deltaX:0,deltaY:-220});await wait(1500);await b.screenshot('orbit-camera.png');
  console.log('PASS Orbit and zoom input render without errors');
  await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await b.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});await wait(1000);
  const initial=await b.evaluate(`document.getElementById('minimap-player').style.cssText`);
  const rect=await b.evaluate(`(()=>{const r=document.querySelector('[data-key="ArrowDown"]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  await b.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[rect]});await wait(800);
  await b.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait(200);
  assert.notEqual(initial,await b.evaluate(`document.getElementById('minimap-player').style.cssText`));
  console.log('PASS Touch direction pad moves TIA');
  await b.click('#back-map');await wait(1600);await b.screenshot('mobile-map.png');
  assert.equal(b.errors.length,0,b.errors.join('\n'));console.log('PASS No runtime errors in portal, camera, keyboard, and touch tests');
}catch(error){console.error(error);await b.screenshot('interaction-failure.png');process.exitCode=1;}finally{await b.close();}
