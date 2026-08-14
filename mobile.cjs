const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');

function get(path) {
  return new Promise((res, rej) => {
    http.get({ host: '127.0.0.1', port: 9223, path }, (r) => {
      let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });
}

(async () => {
  const list = await get('/json/list');
  const page = list.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl, { perMessageDeflate: false });
  let id = 0; const pending = new Map();
  ws.on('message', (m) => { const g = JSON.parse(m); if (g.id && pending.has(g.id)) { pending.get(g.id)(g.result); pending.delete(g.id); } });
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  await new Promise((r) => ws.on('open', r));

  // 模拟 iPhone 390x844
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390, height: 844, deviceScaleFactor: 2, mobile: true,
  });
  await send('Page.navigate', { url: 'http://127.0.0.1:4173/' });
  await new Promise((r) => setTimeout(r, 2500));

  // 检查横向溢出
  const ov = await send('Runtime.evaluate', {
    expression: `JSON.stringify({docW:document.documentElement.scrollWidth, winW:window.innerWidth, overflow:document.documentElement.scrollWidth>window.innerWidth+2})`,
    returnByValue: true,
  });
  console.log('OVERFLOW_CHECK', ov.result.value);

  for (const sec of ['hero', 'projects', 'skills']) {
    await send('Runtime.evaluate', { expression: `document.getElementById('${sec}').scrollIntoView({block:'start'})` });
    await new Promise((r) => setTimeout(r, 800));
    const s = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`E:/Desktop/portfolio/m-${sec}.png`, Buffer.from(s.data, 'base64'));
    console.log('saved m-' + sec);
  }
  ws.close();
})();
