'use strict';

const MESSAGE_LIMITS = { name: 120, email: 254, message: 4000 };
const EMAIL_PATTERN = /^[^\s@?&#%\r\n]+@[^\s@?&#%\r\n]+\.[^\s@?&#%\r\n]+$/;

function validateMessage(values) {
  const errors = {};
  for (const key of ['name', 'email', 'message']) {
    const value = typeof values?.[key] === 'string' ? values[key].trim() : '';
    if (!value) errors[key] = key === 'name' ? 'Please enter your name.' : key === 'email' ? 'Please enter your email address.' : 'Please write a message.';
    else if (value.length > MESSAGE_LIMITS[key]) errors[key] = `Please use ${MESSAGE_LIMITS[key]} characters or fewer.`;
    else if (key === 'email' && !EMAIL_PATTERN.test(value)) errors[key] = 'Please enter a valid email address.';
    else if (key === 'name' && /[\r\n]/.test(value)) errors[key] = 'Please enter your name on one line.';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

function buildMailto(recipient, values) {
  if (typeof recipient !== 'string' || !EMAIL_PATTERN.test(recipient)) throw new Error('Invalid contact address.');
  if (!validateMessage(values).valid) throw new Error('Please complete the required fields.');
  const name = values.name.trim();
  const email = values.email.trim();
  const subject = `Portfolio enquiry from ${name}`;
  const body = `Name: ${name}\nReply email: ${email}\n\n${values.message.trim()}`;
  return `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function setupContactForm(form, status, recipient, openDraft) {
  if (!form || !status) return;
  const launch = openDraft || (url => { window.location.href = url; });
  const getField = name => form.elements?.namedItem?.(name) || form.elements?.[name] || form.querySelector(`[name="${name}"]`);
  const setStatus = (message, state) => { status.textContent = message; if (status.dataset) status.dataset.state = state; };
  const showError = (name, message) => {
    const field = getField(name);
    if (!field) return;
    field.setCustomValidity?.(message || '');
    field.setAttribute?.('aria-invalid', message ? 'true' : 'false');
    const error = form.querySelector?.(`#${name}-error`);
    if (error) error.textContent = message || '';
  };
  form.setAttribute?.('novalidate', '');
  for (const name of ['name', 'email', 'message']) {
    getField(name)?.addEventListener?.('input', () => {
      showError(name, '');
      setStatus('', 'idle');
    });
  }
  const onSubmit = event => {
    event.preventDefault();
    const values = Object.fromEntries(['name', 'email', 'message'].map(name => [name, getField(name)?.value || '']));
    const result = validateMessage(values);
    for (const name of ['name', 'email', 'message']) showError(name, result.errors[name]);
    if (!result.valid) {
      setStatus('Please correct the highlighted fields before opening your email draft.', 'error');
      getField(Object.keys(result.errors)[0])?.focus?.();
      return;
    }
    if (form.checkValidity && !form.checkValidity()) {
      form.reportValidity?.();
      setStatus('Please check the required fields before opening your email draft.', 'error');
      return;
    }
    try {
      launch(buildMailto(recipient, values));
      setStatus(`An email draft was requested. Review and send it in your email app. If nothing opened, email ${recipient} directly using the address shown here.`, 'draft');
    } catch (_) {
      setStatus(`The email draft could not be opened. Your message is still here. Please email ${recipient} directly using the address shown here.`, 'error');
    }
  };
  form.addEventListener('submit', onSubmit);
  return onSubmit;
}

function setupNetwork(canvas) {
  if (!canvas || !canvas.getContext) return;
  const context = canvas.getContext('2d');
  if (!context) return;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let width = 1, height = 1, points = [], frame = 0, visible = true;
  function resize() {
    const bounds = canvas.getBoundingClientRect();
    width = bounds.width; height = bounds.height;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    points = Array.from({ length: width < 600 ? 20 : 34 }, (_, i) => ({ x: ((i * 173 + 29) % 997) / 997 * width, y: ((i * 307 + 83) % 991) / 991 * height, vx: i % 2 ? .11 : -.11, vy: i % 3 ? .07 : -.07 }));
    draw(false);
  }
  function draw(move) {
    context.clearRect(0, 0, width, height);
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (move) { p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > width) p.vx *= -1; if (p.y < 0 || p.y > height) p.vy *= -1; }
      context.beginPath(); context.arc(p.x, p.y, 1.5, 0, Math.PI * 2); context.fillStyle = '#ff6b78'; context.fill();
      for (let j = i + 1; j < points.length; j++) {
        const q = points[j], distance = Math.hypot(p.x - q.x, p.y - q.y);
        if (distance > 140) continue;
        context.strokeStyle = `rgba(151,155,174,${.55 * (1 - distance / 140)})`;
        context.beginPath(); context.moveTo(p.x, p.y); context.lineTo(q.x, q.y); context.stroke();
      }
    }
  }
  function tick() { frame = 0; draw(true); if (visible && !document.hidden && !motion.matches) frame = window.requestAnimationFrame(tick); }
  function sync() {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    if (visible && !document.hidden && !motion.matches) frame = window.requestAnimationFrame(tick);
    else draw(false);
  }
  resize(); sync();
  window.addEventListener('resize', () => { resize(); sync(); });
  document.addEventListener('visibilitychange', sync);
  motion.addEventListener?.('change', sync);
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }).observe(canvas);
}

function initializePortfolio() {
  const emailLink = document.getElementById('contact-email');
  const recipient = emailLink?.getAttribute('href')?.replace(/^mailto:/, '');
  if (recipient) setupContactForm(document.getElementById('contact-form'), document.getElementById('contact-status'), recipient);
  const copy = document.getElementById('copy-email');
  const copyStatus = document.getElementById('copy-status');
  if (copy && recipient && copyStatus) {
    copy.hidden = false;
    copy.addEventListener('click', async () => {
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(recipient);
        copyStatus.textContent = 'Email address copied.';
      } catch (_) { copyStatus.textContent = 'Copy the email address shown above, or select it to open your email app.'; }
    });
  }
  setupNetwork(document.getElementById('network'));
  if ('IntersectionObserver' in window) {
    const links = [...document.querySelectorAll('.site-header nav a[href^="#"]')];
    const observer = new IntersectionObserver(entries => {
      const active = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!active) return;
      for (const link of links) { if (link.hash === `#${active.target.id}`) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current'); }
    }, { rootMargin: '-15% 0px -55% 0px', threshold: 0 });
    for (const id of ['hero', 'projects', 'about', 'timeline', 'contact']) { const section = document.getElementById(id); if (section) observer.observe(section); }
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { buildMailto, validateMessage, setupContactForm };
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializePortfolio);
  else initializePortfolio();
}
