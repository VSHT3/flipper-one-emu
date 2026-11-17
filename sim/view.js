// Added to the device's remote view by f1emu's view proxy. Two jobs: keep the
// panel sharp at any size, and show the simulated hardware on the picture.
//
// Everything is placed in pixels of device.png (2048x1080), in SVG layers that
// scale with it.
//
// - The power meter is the real artwork: the shapes of Flipper's light guide
//   sticker (meter.json), fitted onto the photo, lit the way the hardware docs
//   describe (docs.flipper.net/one/hardware/power-meter).
// - Ports are where the tech specs put them: both Ethernet sockets on the left
//   end, USB-C1 on the right end, HDMI on the top edge. They face away from the
//   camera, so the cables are drawn behind the device and vanish into its edge.
(async () => {
  const W = 2048, H = 1080;
  const wrap = document.getElementById('wrap');
  const src = document.getElementById('panel');
  if (!wrap || !src) return;

  // The page stretches its 256x144 canvas with nearest-neighbour sampling, which
  // at any size that is not a whole multiple gives letters uneven strokes. Redraw
  // it at the next whole multiple and let the browser scale that down smoothly.
  const sharp = document.createElement('canvas');
  sharp.style.cssText = 'position:absolute;z-index:1';
  for (const k of ['left', 'top', 'width', 'height']) sharp.style[k] = src.style[k];
  src.style.visibility = 'hidden';
  src.after(sharp);
  const ctx = sharp.getContext('2d');
  const draw = () => {
    const k = Math.max(1, Math.ceil(sharp.getBoundingClientRect().width * devicePixelRatio / src.width));
    if (sharp.width !== src.width * k) { sharp.width = src.width * k; sharp.height = src.height * k; }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, 0, 0, sharp.width, sharp.height);
    requestAnimationFrame(draw);
  };
  draw();

  const style = document.createElement('style');
  style.textContent = `
    /* The page centres its body inside <html>, so the body is only as wide as the
       photo and clips whatever leaves it. Give it the whole window. */
    html > body { width: 100%; }
    /* Half a picture of room on every side: cables run off past the photo's own box. */
    .f1layer { position: absolute; left: -50%; top: -50%; width: 200%; height: 200%; pointer-events: none; }
    #f1cables { z-index: 1; }
    #f1leds { z-index: 3; }
    #f1cables .cable { transition: transform .22s ease-out; }
    #f1cables .cable.click { pointer-events: auto; cursor: pointer; }
    #f1cables .cable.click:hover { filter: brightness(1.15); }
    #f1cables text { font: 500 24px system-ui, sans-serif; fill: #8A9099; }
    #f1leds .lamp { transition: fill .15s, opacity .15s; }
    #f1leds .blink { animation: f1blink 1.1s steps(2, jump-none) infinite; }
    @keyframes f1blink { from { opacity: 1 } to { opacity: .35 } }
    #f1sim { position: fixed; left: 24px; bottom: 20px; display: flex; flex-direction: column; gap: 6px;
             font: 13px system-ui, sans-serif; color: #8A9099; max-width: 250px; }
    #f1sim button { font: inherit; color: #FF8200; background: none; border: 1px solid #FF8200; border-radius: 6px;
                    padding: 3px 10px; cursor: pointer; width: fit-content; }
    #f1sim button:disabled { opacity: .5; cursor: wait; }
    #f1sim label { display: flex; align-items: center; gap: 8px; font: inherit; color: inherit; cursor: default; }
    #f1sim label span { min-width: 62px; }
    #f1sim input[type=range] { width: 120px; accent-color: #FF8200; }
    #f1sim b { color: #fff; font-weight: 600; min-width: 3ch; }
  `;
  document.head.appendChild(style);

  const NS = 'http://www.w3.org/2000/svg';
  const node = (tag, attrs, parent) => {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  };
  const layer = id => {
    const svg = node('svg', { id, class: 'f1layer', viewBox: `${-W / 2} ${-H / 2} ${W * 2} ${H * 2}`, preserveAspectRatio: 'none' });
    svg.style.display = 'none';
    wrap.appendChild(svg);
    return svg;
  };

  // ---------- cables, behind the device ----------
  // Rendered pictures (tools/render_cables.py), each already turned the way it
  // leaves the device. `mouth` is where the socket meets the outline of the
  // device in the photo, measured from Flipper's dimensioned top view; the plug's
  // tip sits `depth` pixels further in, hidden behind the body.
  const cables = layer('f1cables');
  const art = await (await fetch('f1emu/cables/cables.json')).json();
  const cable = (picture, mouth, clickable) => {
    const a = art[picture];
    const turn = a.degrees * Math.PI / 180;
    const [dx, dy] = [Math.cos(turn), Math.sin(turn)];
    const tip = [mouth[0] - dx * a.hidden, mouth[1] - dy * a.hidden];
    const g = node('g', { class: 'cable' + (clickable ? ' click' : '') }, cables);
    node('image', { href: `f1emu/cables/${picture}.png`, x: tip[0] - a.tip_x, y: tip[1] - a.tip_y,
                    width: a.width, height: a.height }, g);
    // Unplugged, it lies pulled back along its own direction, clear of the socket.
    g.plug = plugged => {
      g.style.transform = plugged ? '' : `translate(${dx * 150}px, ${dy * 150}px)`;
    };
    g.plug(false);
    return g;
  };
  const lines = {
    eth0: cable('eth-grey', [276, 352], false),
    eth1: cable('eth-black', [195, 462], true),
    usb: cable('usb-c', [1819, 598], true),
    hdmi: cable('hdmi', [687, 172], false),
  };
  const labels = {
    eth0: node('text', { x: 300, y: 140 }, cables),
    eth1: node('text', { x: 0, y: 790 }, cables),
    usb: node('text', { x: 1856, y: 506 }, cables),
    hdmi: node('text', { x: 800, y: 112 }, cables),
  };

  // ---------- lamps, on top of the device ----------
  const leds = layer('f1leds');
  const glow = node('filter', { id: 'f1glow', x: '-80%', y: '-80%', width: '260%', height: '260%' }, node('defs', {}, leds));
  node('feGaussianBlur', { stdDeviation: 3.2, result: 'b' }, glow);
  const merge = node('feMerge', {}, glow);
  node('feMergeNode', { in: 'b' }, merge);
  node('feMergeNode', { in: 'SourceGraphic' }, merge);
  const OFF = '#2b2c2f';
  const light = (el, color, blink) => {
    el.setAttribute('fill', color || OFF);
    el.setAttribute('filter', color ? 'url(#f1glow)' : '');
    el.classList.toggle('blink', Boolean(color && blink));
  };
  const pill = (cx, cy) => node('rect', { class: 'lamp', x: cx - 16.5, y: cy - 5.5, width: 33, height: 11, rx: 4.5 }, leds);
  const lamp = {
    eth0: pill(544, 299), eth1: pill(524, 328), wifi: pill(503, 357),
    link: node('circle', { class: 'lamp', cx: 483, cy: 386, r: 8.5 }, leds),
  };
  const meterArt = await (await fetch('f1emu/meter.json')).json();
  const meter = node('g', { transform: `matrix(${meterArt.matrix.join(',')})` }, leds);
  for (const name in meterArt.shapes) {
    lamp[name] = node('path', { class: 'lamp', d: meterArt.shapes[name], 'fill-rule': 'evenodd' }, meter);
  }
  // The filter is measured in the artwork's own tiny units inside the meter.
  const small = node('filter', { id: 'f1glows', x: '-80%', y: '-80%', width: '260%', height: '260%' }, leds.querySelector('defs'));
  node('feGaussianBlur', { stdDeviation: .8, result: 'b' }, small);
  const merge2 = node('feMerge', {}, small);
  node('feMergeNode', { in: 'b' }, merge2);
  node('feMergeNode', { in: 'SourceGraphic' }, merge2);
  const lightMeter = (el, color, blink) => {
    light(el, color, blink);
    if (color) el.setAttribute('filter', 'url(#f1glows)');
  };
  const GREEN = '#58e06f', YELLOW = '#ffe14f', ORANGE = '#ff9a3c', RED = '#ff5a52', BLUE = '#4d9dff';
  const SCALE = [GREEN, YELLOW, ORANGE, RED];

  // ---------- controls, under the page's own "Show controls" switch ----------
  const box = document.createElement('div');
  box.id = 'f1sim';
  document.getElementById('hud').appendChild(box);
  const start = document.createElement('button');
  start.textContent = 'Simulated hardware: turn on';
  const note = document.createElement('div');
  const slider = (text, onset) => {
    const row = document.createElement('label');
    const name = document.createElement('span');
    const input = document.createElement('input');
    const value = document.createElement('b');
    name.textContent = text;
    input.type = 'range'; input.min = 0; input.max = 100;
    input.addEventListener('input', () => { value.textContent = input.value; });
    input.addEventListener('change', () => onset(input.value));
    row.append(name, input, value);
    row.hidden = true;
    row.input = input; row.value = value;
    return row;
  };
  const battery = slider('Battery', v => act('battery', v));
  const signal = slider('5G signal', v => act('modem', '--signal', v));
  box.append(start, battery, signal, note);

  let state = {};
  let busy = false;
  async function act(...args) {
    if (busy) return;
    busy = true; start.disabled = true;
    try {
      const res = await fetch('f1emu/do', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                                           body: JSON.stringify({ args }) });
      const answer = await res.json();
      note.textContent = answer.ok ? '' : answer.said;
    } catch (e) {
      note.textContent = 'the emulator did not answer';
    }
    busy = false; start.disabled = false;
    refresh();
  }
  start.addEventListener('click', () => {
    note.textContent = 'Loading. The first time this builds the simulators, which takes a few minutes.';
    act('on');
  });
  // What is on the far end of the USB-C cable: nothing, a charger, a phone the
  // Flipper charges, or a laptop that powers the Flipper and gets its internet.
  lines.usb.addEventListener('click', () => {
    const next = { none: 'charger', charger: 'device', device: 'laptop', laptop: 'none' }[state.cable || 'none'];
    lines.usb.plug(next !== 'none');
    act('usb', next);
  });
  lines.eth1.addEventListener('click', () => {
    lines.eth1.plug(!state.eth1);
    act('laptop', state.eth1 ? 'off' : 'on');
  });

  function show() {
    const has = k => (state.sim || []).includes(k);
    const on = (state.sim || []).length > 0;
    const bat = has('battery') && state.level !== null;
    const cableIn = state.cable || 'none';
    start.hidden = on;
    cables.style.display = leds.style.display = on || state.video ? '' : 'none';

    lines.eth0.plug(Boolean(state.eth0));
    lines.eth1.plug(Boolean(state.eth1));
    lines.usb.plug(cableIn !== 'none');
    lines.usb.style.display = bat ? '' : 'none';
    lines.hdmi.plug(Boolean(state.video));
    lines.hdmi.style.display = state.video ? '' : 'none';
    labels.eth0.textContent = 'ETH0 · network';
    labels.eth1.textContent = state.eth1 ? 'ETH1 · laptop' : 'ETH1 · click to plug in';
    labels.usb.textContent = bat ? { none: 'USB-C1 · click to plug in', charger: 'USB-C1 · charger',
                                     device: 'USB-C1 · charging a phone',
                                     laptop: 'USB-C1 · laptop' }[cableIn] : '';
    labels.hdmi.textContent = state.video ? 'HDMI · monitor window' : '';

    light(lamp.eth0, state.eth0 ? GREEN : null);
    light(lamp.eth1, state.eth1 ? GREEN : null);
    light(lamp.wifi, state.wifi === 'up' ? BLUE : null);
    light(lamp.link, state.online ? GREEN : RED);

    // Both gauges fill from the battery symbol outwards, green first. How many
    // watts one segment stands for is not documented; 3 W each is a guess.
    const segments = watts => (watts > 0.05 ? Math.min(4, Math.max(1, Math.ceil(watts / 3))) : 0);
    const draw = bat ? segments(state.draw_w) : 0;
    const input = bat ? segments(state.input_w) : 0;
    ['bar4', 'bar3', 'bar2', 'bar1'].forEach((name, i) => lightMeter(lamp[name], i < draw ? SCALE[i] : null, true));
    ['chev1', 'chev2', 'chev3', 'chev4'].forEach((name, i) => lightMeter(lamp[name], i < input ? SCALE[i] : null));
    lightMeter(lamp.battery, bat ? GREEN : null);
    lightMeter(lamp.bolt, bat && state.charging ? GREEN : null);
    lightMeter(lamp.plug, bat && (cableIn === 'charger' || cableIn === 'laptop') ? RED : null);

    battery.hidden = !bat;
    signal.hidden = !has('modem');
    if (bat && document.activeElement !== battery.input) { battery.input.value = state.level; battery.value.textContent = state.level; }
    if (has('modem') && document.activeElement !== signal.input) { signal.input.value = state.signal; signal.value.textContent = state.signal; }
  }
  async function refresh() {
    // While a click is still being carried out the guest reports the old state;
    // showing it would yank the cable back out and in again.
    if (busy) return;
    try {
      const res = await fetch('f1emu/state', { cache: 'no-store' });
      const next = await res.json();
      if (!('sim' in next)) return;
      state = next;
      show();
    } catch (e) { /* the proxy is restarting; the next tick tries again */ }
  }
  refresh();
  setInterval(refresh, 2500);
})();
