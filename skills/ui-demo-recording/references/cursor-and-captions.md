# Cursor highlight and caption overlay

Headless Chromium does not draw the OS cursor into the video, so draw one in the page. Pass this function to `context.addInitScript` so it runs before every page's scripts.

```js
// demos/onboarding/cursor-overlay.mjs
export function cursorOverlay() {
  const install = () => {
    if (document.getElementById('__demo-cursor')) return;
    const style = document.createElement('style');
    style.textContent = `
      #__demo-cursor { position: fixed; top: 0; left: 0; width: 22px; height: 22px; margin: -11px 0 0 -11px;
        border-radius: 50%; background: rgba(255,255,255,.9); border: 2px solid rgba(0,0,0,.6);
        box-shadow: 0 1px 4px rgba(0,0,0,.35); pointer-events: none; z-index: 2147483647;
        transition: transform .08s ease-out; }
      #__demo-cursor.down { transform: scale(.75); }
      .__demo-ripple { position: fixed; width: 44px; height: 44px; margin: -22px 0 0 -22px; border-radius: 50%;
        border: 3px solid rgba(59,130,246,.8); pointer-events: none; z-index: 2147483646;
        animation: __demo-r .5s ease-out forwards; }
      @keyframes __demo-r { from { transform: scale(.3); opacity: 1 } to { transform: scale(1.4); opacity: 0 } }
      #__demo-caption { position: fixed; left: 50%; bottom: 48px; transform: translateX(-50%); max-width: 70%;
        padding: 12px 20px; border-radius: 10px; background: rgba(17,24,39,.85); color: #fff;
        font: 600 28px/1.3 system-ui, sans-serif; text-align: center; pointer-events: none;
        z-index: 2147483647; opacity: 0; transition: opacity .25s; }
      #__demo-caption.on { opacity: 1; }`;
    document.head.appendChild(style);
    const c = document.createElement('div'); c.id = '__demo-cursor';
    const cap = document.createElement('div'); cap.id = '__demo-caption';
    document.body.append(c, cap);
    addEventListener('mousemove', (e) => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; }, true);
    addEventListener('mousedown', (e) => {
      c.classList.add('down');
      const r = document.createElement('div'); r.className = '__demo-ripple';
      r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px';
      document.body.appendChild(r); setTimeout(() => r.remove(), 600);
    }, true);
    addEventListener('mouseup', () => c.classList.remove('down'), true);
    window.__demoCaption = (t) => { cap.textContent = t; cap.classList.toggle('on', !!t); };
  };
  if (document.body) install(); else addEventListener('DOMContentLoaded', install);
}
```

Rules:
- The overlay has `pointer-events: none` so it never intercepts clicks.
- Keep captions short (one line, under about 50 characters) and on screen for at least 1.5 seconds.
- If captions must be translatable or editable later, produce an SRT in post-processing instead of burning them into the page.
- A strict Content-Security-Policy can block injected styles in some apps; if the overlay is missing, run against a demo build that relaxes CSP, or use `bypassCSP: true` on the context.
