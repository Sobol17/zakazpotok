'use strict';

const header = document.getElementById('site-header');
const menuToggle = document.getElementById('menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');

function updateHeader() {
  header.classList.toggle('is-scrolled', window.scrollY > 40 || menuToggle.getAttribute('aria-expanded') === 'true');
}
function setMenu(open, restoreFocus = false) {
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  mobileMenu.hidden = !open;
  updateHeader();
  if (restoreFocus) menuToggle.focus();
}
menuToggle.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
mobileMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
document.addEventListener('focusin', event => {
  if (!mobileMenu.hidden && event.target !== menuToggle && !mobileMenu.contains(event.target)) setMenu(false);
});
document.addEventListener('click', event => {
  if (!header.contains(event.target) && !mobileMenu.hidden) setMenu(false);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !mobileMenu.hidden) setMenu(false, true);
});
window.addEventListener('scroll', updateHeader, {passive: true});
window.addEventListener('resize', () => {
  if (window.innerWidth > 700) setMenu(false);
}, {passive: true});

const video = document.getElementById('overview-video');
function showVideoError() {
  video.hidden = true;
  document.getElementById('video-placeholder').hidden = false;
}
video.addEventListener('error', showVideoError);
if (video.error) showVideoError();

document.getElementById('current-year').textContent = new Intl.DateTimeFormat('en', {
  year: 'numeric', timeZone: 'Asia/Irkutsk'
}).format(new Date());
updateHeader();

const dialog = document.getElementById('showcase-dialog');
let filmTrigger;
if (typeof dialog.showModal === 'function') {
  document.querySelectorAll('[data-showcase]').forEach(link => {
    link.setAttribute('aria-haspopup', 'dialog');
    link.setAttribute('aria-controls', dialog.id);
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      filmTrigger = link;
      dialog.showModal();
      video.play().catch(() => { /* Native playback controls remain available. */ });
    });
  });
  dialog.querySelector('.showcase-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    video.pause();
    filmTrigger?.focus({preventScroll: true});
  });
}

const cookieNotice = document.getElementById('cookie-notice');
const cookieSettings = document.getElementById('cookie-settings');
const cookieName = 'zakazpotok_cookie_choice';
const refusalKey = 'zakazpotok.cookie-refusal.v1';
const choiceLifetime = 180 * 24 * 60 * 60;
const cookiePath = new URL('.', document.baseURI).pathname;
const cookieAttributes = `Path=${cookiePath}; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
let openedFromSettings = false;

function hasCookieChoice() {
  try {
    if (document.cookie.split(';').some(value => value.trim() === `${cookieName}=accepted`)) return true;
    return Number(localStorage.getItem(refusalKey)) > Date.now();
  } catch {
    return false;
  }
}

function setCookieNotice(open, focus = false) {
  openedFromSettings = open && focus;
  cookieNotice.hidden = !open;
  cookieSettings.setAttribute('aria-expanded', String(open));
  if (open && focus) document.getElementById('cookie-title').focus({preventScroll: true});
}

cookieSettings.hidden = false;
cookieSettings.addEventListener('click', () => setCookieNotice(true, true));

function openCookieSettingsFromLink() {
  if (location.hash === '#cookie-settings') setCookieNotice(true, true);
}
window.addEventListener('hashchange', openCookieSettingsFromLink);
if (!hasCookieChoice()) setCookieNotice(true);
openCookieSettingsFromLink();

cookieNotice.querySelectorAll('[data-cookie-choice]').forEach(button => {
  button.addEventListener('click', () => {
    const accepted = button.dataset.cookieChoice === 'accept';
    try {
      document.cookie = accepted
        ? `${cookieName}=accepted; Max-Age=${choiceLifetime}; ${cookieAttributes}`
        : `${cookieName}=; Max-Age=0; ${cookieAttributes}`;
    } catch {
      // Some browsers block cookie access in restricted contexts.
    }
    try {
      if (accepted) localStorage.removeItem(refusalKey);
      else localStorage.setItem(refusalKey, String(Date.now() + choiceLifetime * 1000));
    } catch {
      // The banner still closes if the browser blocks local storage.
    }

    if (location.hash === '#cookie-settings') {
      history.replaceState(history.state, '', location.pathname + location.search);
    }
    const restoreFocus = openedFromSettings;
    setCookieNotice(false);
    if (restoreFocus) cookieSettings.focus({preventScroll: true});
  });
});

const demo = document.getElementById('demo');
if (demo.dataset.videoSrc) {
  const content = document.getElementById('author-demo-template').content.cloneNode(true);
  const recording = content.querySelector('video');
  recording.src = demo.dataset.videoSrc;
  if (demo.dataset.poster) recording.poster = demo.dataset.poster;
  demo.replaceChildren(content);
  demo.setAttribute('aria-labelledby', 'author-demo-title');
  // Only one soundtrack should play when moving between the film and the walkthrough.
  video.addEventListener('play', () => recording.pause());
  recording.addEventListener('play', () => video.pause());
}
