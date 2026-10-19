import { createMotion } from './assets/personal-style/motion.js';

const motion = createMotion();
const dialogs = new Map();
for (const dialog of document.querySelectorAll('dialog')) {
  const controller = motion.bindDialog(dialog);
  dialogs.set(dialog, controller);
  dialog.querySelectorAll('form[method="dialog"]').forEach(form => {
    form.addEventListener('submit', event => {
      event.preventDefault();
      controller.close();
    });
  });
}
export function openCollectionDialog(dialog) { dialogs.get(dialog)?.open(); }
export function closeCollectionDialog(dialog) { dialogs.get(dialog)?.close(); }

// Pointer-triggered quote changes get brief feedback. Space/keyboard stays instant.
document.getElementById('another-quote')?.addEventListener('click', event => {
  if (event.detail === 0) return;
  const quote = document.getElementById('random-quote');
  if (quote) motion.enter(quote, { duration: 160, offset: 4 });
});
window.addEventListener('pagehide', event => { if (!event.persisted) motion.destroy(); });

const backToTop = document.querySelector('.back-to-top');
if (backToTop) {
  let pending = false;
  const update = () => {
    backToTop.classList.toggle('visible', window.scrollY > window.innerHeight);
    pending = false;
  };
  const scheduleUpdate = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(update);
  };
  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate);
  window.addEventListener('load', scheduleUpdate);
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: motion.reduced ? 'instant' : 'smooth' });
    document.querySelector('.wordmark')?.focus({ preventScroll: true });
  });
  update();
}
