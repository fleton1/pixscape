// Touch input. Taps already arrive as left-clicks (the browser's compatibility mouse events),
// so this adds the rest: press-and-hold becomes a right-click on whatever was held, and
// pinching the game view steps the zoom.
import { G } from './game/state.js';

const HOLD_MS = 380;  // long enough to not fire on a slow tap, short enough to feel responsive
const SLOP = 12;      // px a finger may drift before a hold turns into a scroll
const PINCH_STEP = 1.35;

export function setupTouch() {
  let hold = null;
  const cancel = () => { if (hold) clearTimeout(hold.timer); hold = null; };

  document.addEventListener('touchstart', (e) => {
    cancel();
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    const target = e.target;
    if (!(target instanceof Element) || target.closest('input, select, textarea, #worldmap, #title')) return;
    hold = { x: t.clientX, y: t.clientY, fired: false };
    hold.timer = setTimeout(() => {
      hold.fired = true;
      if (navigator.vibrate) navigator.vibrate(12);
      target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window, button: 2, buttons: 2, clientX: hold.x, clientY: hold.y }));
    }, HOLD_MS);
  }, { passive: true, capture: true });

  document.addEventListener('touchmove', (e) => {
    if (!hold || hold.fired) return;
    const t = e.touches[0];
    if (e.touches.length !== 1 || Math.hypot(t.clientX - hold.x, t.clientY - hold.y) > SLOP) cancel();
  }, { passive: true, capture: true });

  document.addEventListener('touchend', (e) => {
    // The hold already acted; swallow the tap the browser would otherwise synthesize on release.
    if (hold && hold.fired && e.cancelable) e.preventDefault();
    cancel();
  }, { passive: false, capture: true });
  document.addEventListener('touchcancel', cancel, { capture: true });

  // No native long-press menus or selection anywhere but text fields.
  document.addEventListener('contextmenu', (e) => { if (!(e.target instanceof Element && e.target.closest('input, textarea'))) e.preventDefault(); });

  // pinch-to-zoom on the game view (zoom is whole steps, 2x-5x)
  const view = document.querySelector('#view');
  let pinch = null;
  const span = (ts) => Math.hypot(ts[0].clientX - ts[1].clientX, ts[0].clientY - ts[1].clientY);
  view.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) { cancel(); pinch = { d: span(e.touches), z: G.settings.zoom }; }
  }, { passive: true });
  view.addEventListener('touchmove', (e) => {
    if (!pinch || e.touches.length !== 2) return;
    e.preventDefault();
    const steps = Math.round(Math.log(span(e.touches) / pinch.d) / Math.log(PINCH_STEP));
    const z = Math.max(2, Math.min(5, pinch.z + steps));
    if (z !== G.settings.zoom) { G.settings.zoom = z; G.ui.dirty('settings'); }
  }, { passive: false });
  view.addEventListener('touchend', (e) => { if (e.touches.length < 2) pinch = null; }, { passive: true });
}
