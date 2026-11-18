// Added to the device's remote view by f1emu's view proxy. Three jobs: keep the
// panel sharp at any size, show the simulated hardware on the picture, and put
// what the emulator can do in a column of controls.
//
// Everything on the picture is placed in pixels of device.png (2048x1080), in
// SVG layers that scale with it.
//
// - The power meter is the real artwork: the shapes of Flipper's light guide
//   sticker (meter.json), fitted onto the photo, lit by the rules of Flipper's
//   own power meter emulator (see `show()`).
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
    html > body { width: 100%; box-sizing: border-box; }
    /* Half a picture of room on every side: cables run off past the photo's own box. */
    .f1layer { position: absolute; left: -50%; top: -50%; width: 200%; height: 200%; pointer-events: none; }
    #f1cables { z-index: 1; }
    #f1leds { z-index: 3; }
    #f1cables .cable { transition: transform .22s ease-out; }
    #f1cables .cable.click { pointer-events: auto; cursor: pointer; }
    #f1cables .cable.click:hover { filter: brightness(1.15); }
    #f1cables text { font: 500 24px system-ui, sans-serif; fill: #8A9099; }
    #f1leds .lamp { transition: fill .15s; }
    #f1leds .blink { animation: f1blink 1s steps(1) infinite; }
    @keyframes f1blink { 0% { opacity: 1 } 50% { opacity: .12 } }

    /* The column of controls. The device moves over to make room for it. */
    body.f1open { padding-right: 300px; }
    body.f1open #photo { max-width: calc(98vw - 300px); }
    #f1side { position: fixed; top: 48px; right: 0; bottom: 0; width: 300px; box-sizing: border-box; z-index: 9;
              display: none; padding: 4px 16px 24px; overflow-y: auto; background: #1A1E24;
              border-left: 1px solid #2A2F37; font: 13px/1.35 system-ui, sans-serif; color: #8A9099; }
    body.f1open #f1side { display: block; }
    #f1side [hidden] { display: none !important; }
    #f1side h3 { margin: 18px 0 8px; font: 600 11px system-ui, sans-serif; letter-spacing: .08em;
                 text-transform: uppercase; color: #FF8200; }
    #f1side .row { display: flex; align-items: center; gap: 8px; margin: 6px 0; min-height: 26px; }
    #f1side .row > span:first-child { flex: 0 0 62px; }
    #f1side .row > span.wide { flex: 1; }
    #f1side button, #f1fold { font: 13px system-ui, sans-serif; color: #FF8200; background: none;
                              border: 1px solid #FF8200; border-radius: 6px; padding: 3px 10px; cursor: pointer;
                              white-space: nowrap; }
    #f1side button:hover, #f1fold:hover { background: rgba(255, 130, 0, .12); }
    #f1side button:disabled, #f1side.busy button { opacity: .5; cursor: wait; }
    #f1side.busy button { pointer-events: none; }
    #f1side input, #f1side select { font: inherit; color: #fff; background: #14171C; border: 1px solid #3A404A;
                                    border-radius: 6px; padding: 3px 6px; min-width: 0; flex: 1; }
    #f1side input[type=number] { flex: 0 0 44px; }
    #f1side input[type=range] { padding: 0; border: 0; background: none; accent-color: #FF8200; }
    #f1side b { color: #fff; font-weight: 600; }
    #f1side .row > b { min-width: 3ch; text-align: right; }
    #f1side ul { list-style: none; margin: 0; padding: 0; }
    #f1side li { display: flex; align-items: center; gap: 8px; margin: 5px 0; }
    #f1side li b { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    #f1side li.joined b::after { content: ' · joined'; color: #4de0e0; font-weight: 400; }
    #f1side code { font: 12px ui-monospace, monospace; color: #C9CED6; user-select: all; }
    #f1side pre { margin: 6px 0 0; padding: 8px; max-height: 200px; overflow: auto; background: #14171C;
                  border-radius: 6px; font: 11px/1.4 ui-monospace, monospace; color: #C9CED6;
                  white-space: pre-wrap; word-break: break-all; }
    #f1note { margin: 10px 0 0; color: #FFB25C; }
    #f1note:empty { display: none; }
    #f1fold { position: fixed; top: 58px; right: 12px; z-index: 9; background: #1A1E24; }
    body.f1open #f1fold { right: 299px; border-right-color: #1A1E24; border-radius: 6px 0 0 6px; padding: 3px 7px; }

    #f1menu { position: fixed; z-index: 20; display: flex; flex-direction: column; padding: 4px; background: #1A1E24;
              border: 1px solid #3A404A; border-radius: 8px; box-shadow: 0 8px 24px rgba(0, 0, 0, .5);
              font: 13px system-ui, sans-serif; color: #8A9099; }
    #f1menu[hidden] { display: none; }
    #f1menu span { padding: 4px 12px 6px; }
    #f1menu button { font: inherit; text-align: left; color: #fff; background: none; border: 0; border-radius: 5px;
                     padding: 6px 12px; cursor: pointer; }
    #f1menu button:hover { background: rgba(255, 130, 0, .2); }
    #f1menu button.on { color: #FF8200; }

    /* The video output: a small picture in the column, or the whole window. */
    #f1stage img { display: block; width: 100%; aspect-ratio: 16 / 9; background: #000; border-radius: 4px;
                   cursor: zoom-in; }
    #f1stage button { display: none; }
    #f1stage.big { position: fixed; inset: 0; z-index: 30; display: flex; flex-direction: column;
                   align-items: center; justify-content: center; gap: 10px; background: rgba(10, 12, 15, .94);
                   font: 13px system-ui, sans-serif; color: #8A9099; }
    #f1stage.big img { width: auto; height: auto; aspect-ratio: auto; max-width: 96vw;
                       max-height: calc(100vh - 90px); cursor: default; }
    #f1stage.big button { display: block; font: inherit; color: #FF8200; background: none;
                          border: 1px solid #FF8200; border-radius: 6px; padding: 3px 10px; cursor: pointer; }
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
  const GREEN = '#58e06f', YELLOW = '#ffe14f', ORANGE = '#ff9a3c', RED = '#ff5a52';
  // What Flipper OS sets its network lights to: 120 255 0 and 0 255 255.
  const LIME = '#8cf53c', CYAN = '#3deaea';

  // ---------- controls: a column on the right ----------
  const el = (tag, props, ...kids) => {
    const e = Object.assign(document.createElement(tag), props);
    e.append(...kids);
    return e;
  };
  const button = (text, onclick) => {
    const b = el('button', { type: 'button', textContent: text });
    b.addEventListener('click', onclick);
    return b;
  };
  const choice = (options, onset) => {
    const s = el('select', {}, ...options.map(([value, text]) => el('option', { value, textContent: text })));
    s.addEventListener('change', () => onset(s.value));
    return s;
  };
  const row = (text, ...kids) => el('div', { className: 'row' }, el('span', { textContent: text }), ...kids);
  const slider = (text, onset) => {
    const input = el('input', { type: 'range', min: 0, max: 100, ariaLabel: text });
    const value = el('b');
    input.addEventListener('input', () => { value.textContent = input.value; });
    input.addEventListener('change', () => onset(input.value));
    return Object.assign(row(text, input, value), { input, value });
  };
  // A value the guest reports goes into its control, unless someone is using it.
  const sync = (input, value) => { if (document.activeElement !== input) input.value = value; };

  const side = el('aside', { id: 'f1side' });
  const fold = button('', () => setOpen(!document.body.classList.contains('f1open')));
  fold.id = 'f1fold';
  const setOpen = open => {
    document.body.classList.toggle('f1open', open);
    fold.textContent = open ? '›' : '‹ Hardware';
    fold.title = open ? 'Hide the controls' : 'Show the controls';
    localStorage.setItem('f1side', open ? '1' : '0');
  };
  setOpen(localStorage.getItem('f1side') !== '0');
  document.body.append(side, fold);
  // The page takes plain keys as presses of the device's buttons. Typing here is not that.
  for (const type of ['keydown', 'keyup']) side.addEventListener(type, e => e.stopPropagation());
  const note = el('div', { id: 'f1note' });
  const section = title => {
    const s = el('section', { hidden: true }, el('h3', { textContent: title }));
    side.append(s);
    return s;
  };

  let state = {};
  let busy = false;
  const post = async (url, data) => {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
                                   body: JSON.stringify(data) })
      .catch(() => { throw new Error('The emulator did not answer.'); });
    const answer = await res.json().catch(() => ({ ok: false }));
    if (!res.ok || answer.ok === false) throw new Error(answer.said || 'The emulator refused.');
    return answer;
  };
  // One request to the emulator at a time. While it is being carried out the
  // guest still reports the old state, so `refresh()` waits for it too.
  async function job(text, work) {
    if (busy) return false;
    busy = true;
    side.classList.add('busy');
    note.textContent = text;
    let ok = true;
    try {
      await work();
      note.textContent = '';
    } catch (e) {
      note.textContent = e.message;
      ok = false;
    }
    busy = false;
    side.classList.remove('busy');
    await refresh();
    return ok;
  }
  const act = (...args) => job('', () => post('f1emu/do', { args }));
  const save = async (url, name) => {
    const res = await fetch(url, { cache: 'no-store' }).catch(() => { throw new Error('The emulator did not answer.'); });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).said || 'The emulator refused.');
    const link = el('a', { href: URL.createObjectURL(await res.blob()), download: name });
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 10000);
  };
  const stamp = () => new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');

  const start = button('Simulated hardware: turn on', () =>
    job('Loading. The first time this builds the simulators, which takes a few minutes.',
        () => post('f1emu/do', { args: ['on'] })));
  side.append(note, el('div', { className: 'row' }, start));

  // What is on the far end of the USB-C cable: nothing, a charger, a phone the
  // Flipper charges, or a laptop that powers the Flipper and gets its internet.
  const USB = [['none', 'Nothing'], ['charger', 'Charger'], ['device', 'Phone, charged by the Flipper'], ['laptop', 'Laptop']];
  const plugUsb = what => {
    lines.usb.plug(what !== 'none');
    act('usb', what);
  };
  const plugEth1 = plugged => {
    lines.eth1.plug(plugged);
    act('laptop', plugged ? 'on' : 'off');
  };

  const power = section('Power');
  const battery = slider('Battery', v => act('battery', v));
  const usbPick = choice(USB, plugUsb);
  power.append(battery, row('USB-C1', usbPick));

  const modem = section('5G modem');
  const signal = slider('Signal', v => act('modem', '--signal', v));
  const operator = el('input', { type: 'text', maxLength: 24, ariaLabel: 'Operator' });
  operator.addEventListener('change', () => act('modem', '--operator=' + operator.value.trim()));
  const tech = choice([['5gnr', '5G'], ['lte', 'LTE']], v => act('modem', '--tech', v));
  modem.append(signal, row('Operator', operator), row('Network', tech));

  const wifi = section('Wi-Fi networks around it');
  const networks = el('ul');
  const seconds = el('input', { type: 'number', min: 1, max: 120, value: 15, ariaLabel: 'Seconds to record' });
  const record = button('Download .pcap', () => {
    const n = Math.min(120, Math.max(1, Number(seconds.value) || 15));
    job(`Recording the air for ${n} s.`, () => save(`f1emu/pcap?seconds=${n}`, `flipper-air-${stamp()}.pcap`));
  });
  wifi.append(networks, row('Record', seconds, el('span', { textContent: 's' }), record));

  const laptops = section('Laptops');
  const eth1Text = el('span', { className: 'wide' });
  const eth1Plug = button('', () => plugEth1(!state.eth1));
  const usbText = el('span', { className: 'wide' });
  const usbRow = el('div', { className: 'row' }, usbText);
  const which = choice([['eth1', 'on ETH1'], ['usb', 'on USB-C1']], () => {});
  const command = el('input', { type: 'text', value: 'ping -c 2 flipper.net', ariaLabel: 'Command to run on the laptop' });
  const output = el('pre', { hidden: true });
  const runIt = button('Run', () => job('Running on the laptop.', async () => {
    output.textContent = (await post('f1emu/run', { laptop: which.value, command: command.value })).said || '(no output)';
    output.hidden = false;
  }));
  command.addEventListener('keydown', e => { if (e.key === 'Enter') runIt.click(); });
  const runRow = el('div', { className: 'row' }, command, runIt);
  const whichRow = row('Run', which);
  laptops.append(el('div', { className: 'row' }, eth1Text, eth1Plug), usbRow, whichRow, runRow, output);

  // ---------- the video output ----------
  // QEMU hands out a picture of the screen and takes mouse and keyboard events;
  // the proxy passes both on. Small, it is a look at the screen. Opened, it has
  // the keyboard and the mouse, until its Close button.
  const video = section('Video output');
  video.hidden = false;
  const videoOn = button('Turn on', () =>
    job('Loading the display driver. The first time this builds it, which takes a few minutes.',
        () => post('f1emu/do', { args: ['on', 'video'] })));
  const videoRow = el('div', { className: 'row' }, el('span', { className: 'wide', textContent: 'No screen attached' }), videoOn);
  const screen = el('img', { alt: 'The video output', title: 'Click to use it with mouse and keyboard', draggable: false });
  const closeStage = button('Close (keys and mouse go back to this page)', () => setBig(false));
  const stage = el('div', { id: 'f1stage', hidden: true }, screen, closeStage);
  video.append(videoRow, stage);
  let big = false;
  const setBig = on => {
    big = on;
    stage.classList.toggle('big', on);
    (on ? document.body : video).append(stage);
  };
  screen.addEventListener('click', () => { if (!big) setBig(true); });
  let waiting = null;
  const nextFrame = () => {
    waiting = null;
    if (state.video && (big || document.body.classList.contains('f1open')) && !document.hidden) {
      screen.src = 'f1emu/video.png?' + Date.now();
    } else {
      waiting = setTimeout(nextFrame, 1000);
    }
  };
  screen.addEventListener('load', () => { waiting = setTimeout(nextFrame, big ? 80 : 2000); });
  screen.addEventListener('error', () => { waiting = setTimeout(nextFrame, 3000); });
  nextFrame();

  // Browser key names to QEMU's. Letters, digits and F-keys follow a pattern.
  const QKEY = {
    Enter: 'ret', Space: 'spc', Backspace: 'backspace', Tab: 'tab', Escape: 'esc', Minus: 'minus', Equal: 'equal',
    BracketLeft: 'bracket_left', BracketRight: 'bracket_right', Backslash: 'backslash', Semicolon: 'semicolon',
    Quote: 'apostrophe', Backquote: 'grave_accent', Comma: 'comma', Period: 'dot', Slash: 'slash',
    ShiftLeft: 'shift', ShiftRight: 'shift_r', ControlLeft: 'ctrl', ControlRight: 'ctrl_r', AltLeft: 'alt',
    AltRight: 'alt_r', MetaLeft: 'meta_l', MetaRight: 'meta_r', CapsLock: 'caps_lock', ArrowUp: 'up',
    ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', Home: 'home', End: 'end', PageUp: 'pgup',
    PageDown: 'pgdn', Insert: 'insert', Delete: 'delete',
  };
  const qcode = code => (/^Key[A-Z]$/.test(code) ? code[3].toLowerCase() : /^Digit\d$/.test(code) ? code[5]
    : /^F\d+$/.test(code) ? code.toLowerCase() : QKEY[code]);
  // Events leave in order, one request at a time; what piles up meanwhile goes
  // out together in the next one.
  let queue = [];
  let sending = false;
  const send = async (...events) => {
    queue.push(...events);
    if (sending) return;
    sending = true;
    while (queue.length) {
      const events = queue;
      queue = [];
      await post('f1emu/input', { events }).catch(() => {});
    }
    sending = false;
  };
  const point = e => {
    const box = screen.getBoundingClientRect();
    const at = (v, size) => Math.max(0, Math.min(32767, Math.round(v / size * 32767)));
    // Only the newest position matters: a move still waiting to leave is replaced.
    if (queue.length >= 2 && queue.at(-1).type === 'abs' && queue.at(-2).type === 'abs') queue.length -= 2;
    send({ type: 'abs', data: { axis: 'x', value: at(e.clientX - box.left, box.width) } },
         { type: 'abs', data: { axis: 'y', value: at(e.clientY - box.top, box.height) } });
  };
  const press = (button, down) => send({ type: 'btn', data: { down, button } });
  screen.addEventListener('mousemove', e => { if (big) point(e); });
  for (const type of ['mousedown', 'mouseup']) {
    screen.addEventListener(type, e => {
      if (!big) return;
      e.preventDefault();
      point(e);
      press(['left', 'middle', 'right'][e.button] || 'left', type === 'mousedown');
    });
  }
  screen.addEventListener('contextmenu', e => { if (big) e.preventDefault(); });
  screen.addEventListener('wheel', e => {
    if (!big) return;
    e.preventDefault();
    const button = e.deltaY < 0 ? 'wheel-up' : 'wheel-down';
    press(button, true);
    press(button, false);
  }, { passive: false });
  // Before the page's own key handling, which would press the device's buttons.
  for (const type of ['keydown', 'keyup']) {
    addEventListener(type, e => {
      if (!big) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const key = qcode(e.code);
      // The guest repeats a held key by itself.
      if (key && !e.repeat) send({ type: 'key', data: { down: type === 'keydown', key: { type: 'qcode', data: key } } });
    }, true);
  }

  // ---------- the emulator itself ----------
  const emulator = section('Emulator');
  emulator.hidden = false;
  const shot = button('Screenshot', () => job('', () => save('f1emu/screenshot.png', `flipper-one-${stamp()}.png`)));
  const tag = el('input', { type: 'text', maxLength: 40, placeholder: 'name', ariaLabel: 'Snapshot name' });
  const snapshots = el('ul');
  const snap = async (what, name) => {
    if (!/^[\w.-]{1,40}$/.test(name)) {
      note.textContent = 'A snapshot name is letters, digits, dots and dashes.';
      return;
    }
    const ok = await job({ save: 'Saving the snapshot.', load: 'Going back to the snapshot.', delete: '' }[what],
                         () => post('f1emu/do', { args: ['snapshot', what, name] }));
    // The guest went back in time and forgot the connection the panel arrives on.
    if (ok && what === 'load') location.reload();
    else listSnapshots();
  };
  const listSnapshots = async () => {
    try {
      const tags = await (await fetch('f1emu/snapshots', { cache: 'no-store' })).json();
      snapshots.replaceChildren(...tags.map(name => el('li', {}, el('b', { textContent: name }),
        button('Go back', () => snap('load', name)), button('Delete', () => snap('delete', name)))));
    } catch (e) { /* no list this time */ }
  };
  tag.addEventListener('keydown', e => { if (e.key === 'Enter') snap('save', tag.value.trim()); });
  // Stopping takes this page's server with it, so there is nothing to wait for.
  let leaving = '';
  const leave = (text, ...args) => job(text, async () => {
    await post('f1emu/do', { args });
    leaving = text;
    throw new Error(text);
  });
  emulator.append(
    el('div', { className: 'row' }, shot),
    row('Snapshot', tag, button('Save', () => snap('save', tag.value.trim()))),
    snapshots,
    el('div', { className: 'row' },
       button('Factory reset', () => {
         if (confirm('Erase everything stored on this Flipper and start it again?')) leave('Starting again, as new. This takes a moment.', 'restart', '--reset');
       }),
       button('Shut down', () => {
         if (confirm('Shut this Flipper down?')) leave('Shut down. `f1emu start` brings it back.', 'stop');
       })));
  listSnapshots();

  // ---------- USB-C1: what to plug in, asked where the cable is ----------
  const menu = el('div', { id: 'f1menu', hidden: true }, el('span', { textContent: 'In USB-C1:' }),
                  ...USB.map(([value, text]) => Object.assign(button(text, () => plugUsb(value)), { value })));
  document.body.append(menu);
  lines.usb.addEventListener('click', e => {
    e.stopPropagation();
    for (const b of menu.querySelectorAll('button')) b.classList.toggle('on', b.value === (state.cable || 'none'));
    menu.hidden = false;
    menu.style.left = Math.min(e.clientX, innerWidth - menu.offsetWidth - 8) + 'px';
    menu.style.top = Math.min(e.clientY, innerHeight - menu.offsetHeight - 8) + 'px';
  });
  addEventListener('click', () => { menu.hidden = true; });
  lines.eth1.addEventListener('click', () => plugEth1(!state.eth1));

  let listed = '';
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
    labels.usb.textContent = bat ? { none: 'USB-C1 · click', charger: 'USB-C1 · charger', device: 'USB-C1 · phone',
                                     laptop: 'USB-C1 · laptop' }[cableIn] : '';
    labels.hdmi.textContent = state.video ? 'HDMI · screen' : '';

    // Flipper OS lights each network lamp while its port has a link, steadily,
    // in these colours (99-network-leds.rules in flipperone-linux-build-scripts).
    // It leaves LINK alone: that one is for apps to use, so here it stays dark.
    light(lamp.eth0, state.eth0 ? LIME : null);
    light(lamp.eth1, state.eth1 ? LIME : null);
    light(lamp.wifi, state.wifi === 'up' ? CYAN : null);
    light(lamp.link, null);

    // The power meter follows Flipper's own emulator of it, the reference for
    // the firmware (flipperone-mcu-firmware issue 254). Neither is final.
    // Bars: watts taken from the battery, counted from the battery symbol
    // outwards; on battery alone the first 0.3 W do not count. Up to 8 W they
    // stack, one more every 2 W; above that all four are lit and the colours
    // say how much. Chevrons: watts coming in, counted from the plug.
    const input = bat ? state.input_w : 0;
    const excess = bat ? state.draw_w - (input > 0 ? 0 : 0.3) : 0;
    const bars = excess <= 0 ? []
      : excess <= 8 ? [GREEN, excess > 2 && YELLOW, excess > 4 && ORANGE, excess > 6 && RED]
      : excess <= 12 ? [YELLOW, YELLOW, RED, RED]
      : excess <= 24 ? [ORANGE, ORANGE, RED, RED] : [ORANGE, RED, RED, RED];
    ['bar4', 'bar3', 'bar2', 'bar1'].forEach((name, i) => lightMeter(lamp[name], bars[i] || null));
    ['chev4', 'chev3', 'chev2', 'chev1'].forEach((name, i) => lightMeter(lamp[name], input > [0, 7.5, 15, 27][i] ? GREEN : null));
    // Green for a source that negotiated its power, yellow for one that did
    // not: the charger does, the laptop's plain USB port does not.
    lightMeter(lamp.plug, input > 0 ? (cableIn === 'charger' ? GREEN : YELLOW) : null);
    const charging = bat && state.charging && state.level < 100;
    const critical = bat && state.level < 5 && !state.charging;
    lightMeter(lamp.battery, critical ? RED : charging || excess > 0 ? GREEN : null, critical);
    lightMeter(lamp.bolt, charging ? GREEN : null);

    power.hidden = !bat;
    if (bat) {
      sync(battery.input, state.level);
      if (document.activeElement !== battery.input) battery.value.textContent = state.level;
      sync(usbPick, cableIn);
    }
    modem.hidden = !has('modem');
    if (has('modem')) {
      sync(signal.input, state.signal);
      if (document.activeElement !== signal.input) signal.value.textContent = state.signal;
      sync(operator, state.operator);
      sync(tech, state.tech);
    }
    wifi.hidden = !has('wifi');
    // Rebuilt only when it changed, so a password being selected stays selected.
    const list = JSON.stringify([state.networks, state.ssid]);
    if (list !== listed) {
      listed = list;
      networks.replaceChildren(...(state.networks || []).map(n =>
        el('li', { className: n.ssid === state.ssid ? 'joined' : '' }, el('b', { textContent: n.ssid }),
           n.password ? el('code', { textContent: n.password, title: 'Password' }) : 'open')));
    }
    laptops.hidden = !on;
    const address = port => (state.laptops || {})[port] || 'waiting for an address';
    const usbLaptop = cableIn === 'laptop';
    eth1Text.textContent = state.eth1 ? `ETH1: ${address('eth1')}` : 'ETH1: empty';
    eth1Plug.textContent = state.eth1 ? 'Unplug' : 'Plug in a laptop';
    usbRow.hidden = !usbLaptop;
    usbText.textContent = `USB-C1: ${address('usb')}`;
    which.options[0].disabled = !state.eth1;
    which.options[1].disabled = !usbLaptop;
    if (which.selectedOptions[0].disabled) which.value = state.eth1 ? 'eth1' : 'usb';
    whichRow.hidden = !(state.eth1 && usbLaptop);
    runRow.hidden = !(state.eth1 || usbLaptop);
    if (runRow.hidden) output.hidden = true;
    videoRow.hidden = Boolean(state.video);
    stage.hidden = !state.video;
  }
  let away = false;
  async function refresh() {
    if (busy) return;
    try {
      const res = await fetch('f1emu/state', { cache: 'no-store' });
      const next = await res.json();
      // Back after a restart: the device's page has to connect afresh too.
      if (away && leaving) location.reload();
      if (away) note.textContent = '';
      away = false;
      // A click may have come while this answer was on its way. It describes
      // the state before the click; showing it would pull the cable back out.
      if (busy || !('sim' in next)) return;
      state = next;
      show();
    } catch (e) {
      // The proxy is gone: stopping, or between two runs. The next tick tries again.
      away = true;
      if (!leaving) note.textContent = 'The emulator does not answer.';
    }
  }
  refresh();
  setInterval(refresh, 2500);
})();
