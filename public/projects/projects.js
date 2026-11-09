import { createMotion } from '../assets/personal-style/motion.js';

const motion = createMotion();
document.querySelectorAll('.project-detail').forEach(detail => motion.bindDisclosure(detail));
window.addEventListener('pagehide', event => { if (!event.persisted) motion.destroy(); });

const filters = [...document.querySelectorAll('[data-project-filter]')];
const rows = [...document.querySelectorAll('[data-project-group]')];
const result = document.getElementById('project-results');
document.querySelector('.project-filters').hidden = false;

function applyFilter(group) {
  if (!filters.some(button => button.dataset.projectFilter === group)) group = 'all';
  for (const button of filters) {
    button.setAttribute('aria-pressed', String(button.dataset.projectFilter === group));
  }
  let count = 0;
  for (const row of rows) {
    row.hidden = group !== 'all' && row.dataset.projectGroup !== group;
    if (!row.hidden) count++;
  }
  const label = filters.find(button => button.dataset.projectFilter === group).dataset.label;
  result.textContent = group === 'all' ? `${count} projects` : `${count} ${count === 1 ? 'project' : 'projects'} · ${label}`;
}

function restoreLocation() {
  const group = new URL(location.href).searchParams.get('group') || 'all';
  applyFilter(group);
  // A direct project link must always reveal the target, even with an old filter.
  const target = document.getElementById(location.hash.slice(1));
  if (target?.matches('[data-project-group]')) {
    if (target.hidden) applyFilter('all');
    requestAnimationFrame(() => target.scrollIntoView({ behavior: 'instant', block: 'start' }));
  }
}

for (const button of filters) {
  button.addEventListener('click', () => {
    const url = new URL(location.href);
    const group = button.dataset.projectFilter;
    if (group === 'all') url.searchParams.delete('group');
    else url.searchParams.set('group', group);
    url.hash = '';
    history.pushState(null, '', url);
    applyFilter(group);
  });
}
window.addEventListener('popstate', restoreLocation);
window.addEventListener('hashchange', restoreLocation);
restoreLocation();
