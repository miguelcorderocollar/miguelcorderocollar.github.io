import { createMotion } from './assets/personal-style/motion.js';

// Occasional disclosures animate their state; keyboard input remains immediate.
const motion = createMotion();
document.querySelectorAll('main details').forEach(details => motion.bindDisclosure(details));
document.querySelectorAll('#copy-markdown-button, .action-link, .back-to-top').forEach(control => {
  control.setAttribute('data-mcc-press', '');
});
window.addEventListener('pagehide', event => { if (!event.persisted) motion.destroy(); });

// Homepage navigation. Native anchors preserve URL hashes and keyboard behavior.
const sectionLinks = [...document.querySelectorAll('#TOC a')];
const headings = [...document.querySelectorAll('main > h2[id]')];
let scrollPending = false;
function updateNavigation() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  document.querySelector('.reading-progress').style.width = `${maxScroll > 0 ? Math.min(100, window.scrollY / maxScroll * 100) : 0}%`;
  document.querySelector('.back-to-top').classList.toggle('visible', window.scrollY > window.innerHeight);
  let current = headings[0];
  for (const heading of headings) {
    if (heading.getBoundingClientRect().top <= 100) current = heading;
  }
  for (const link of sectionLinks) {
    const active = link.hash === `#${current.id}`;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
  scrollPending = false;
}
function scheduleNavigation() {
  if (!scrollPending) {
    scrollPending = true;
    requestAnimationFrame(updateNavigation);
  }
}
window.addEventListener('scroll', scheduleNavigation, { passive: true });
window.addEventListener('resize', scheduleNavigation);
window.addEventListener('load', scheduleNavigation);
document.querySelector('.back-to-top').addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  document.querySelector('.wordmark').focus({ preventScroll: true });
});
updateNavigation();

function fallbackCopyText(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, text.length);

  try {
    return document.execCommand('copy');
  } finally {
    document.body.removeChild(textarea);
  }
}

async function copyCurriculumMarkdown() {
  const button = document.getElementById('copy-markdown-button');
  const status = document.getElementById('copy-markdown-status');
  if (!button || !status) return;

  const source = button.dataset.markdownSource;
  if (!source) {
    status.textContent = 'Markdown source is not configured.';
    return;
  }

  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = 'Copying...';
  status.textContent = '';

  try {
    const response = await fetch(source, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to load markdown (${response.status})`);
    }

    const markdown = await response.text();
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(markdown);
    } else if (!fallbackCopyText(markdown)) {
      throw new Error('Clipboard access is not available.');
    }

    status.textContent = 'Markdown copied to clipboard.';
  } catch (error) {
    console.error(error);
    status.textContent = 'Unable to copy markdown right now.';
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
  }
}

function initCurriculumActions() {
  const button = document.getElementById('copy-markdown-button');
  if (!button) return;
  button.addEventListener('click', copyCurriculumMarkdown);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCurriculumActions);
} else {
  initCurriculumActions();
}
