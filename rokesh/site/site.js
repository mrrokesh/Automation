// Marketing-site behaviour: header shadow, mobile menu, scroll reveal, count-up numbers, card spotlight.
// Everything degrades gracefully: without JS the content is simply visible (the .reveal rules need html.js).
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = document.querySelector('header');
  const onScroll = () => header && header.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  const nav = document.querySelector('nav'), toggle = document.querySelector('.nav-toggle');
  if (nav && toggle) {
    toggle.addEventListener('click', () => { const o = nav.classList.toggle('open'); toggle.setAttribute('aria-expanded', String(o)); });
    nav.querySelectorAll('.links a').forEach(a => a.addEventListener('click', () => { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }));
  }

  const countUp = el => {
    const end = parseFloat(el.dataset.count), suffix = el.dataset.suffix || '', dec = (String(el.dataset.count).split('.')[1] || '').length;
    if (reduce) { el.textContent = end.toFixed(dec) + suffix; return; }
    const t0 = performance.now(), dur = 1400;
    const step = t => { const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = (end * e).toFixed(dec) + suffix; if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };

  const seen = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in'); seen.unobserve(e.target);
      e.target.querySelectorAll('[data-count]').forEach(countUp); if (e.target.dataset.count) countUp(e.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  document.querySelectorAll('.reveal, [data-count]').forEach(el => seen.observe(el));

  // Spotlight: cards glow under the pointer.
  if (!reduce && matchMedia('(hover: hover)').matches) {
    document.addEventListener('pointermove', e => {
      const c = e.target.closest && e.target.closest('.site .card'); if (!c) return;
      const r = c.getBoundingClientRect(); c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }
})();

// Reference-style extras: rotating "Wave goodbye to" words, lifecycle tabs, prompt example chips.
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const words = document.querySelectorAll('.words span');
  if (words.length > 1 && !reduce) {
    let i = 0;
    setInterval(() => { words[i].classList.remove('on'); words[i].classList.add('off'); const prev = words[i]; i = (i + 1) % words.length; setTimeout(() => prev.classList.remove('off'), 600); words[i].classList.add('on'); }, 2200);
  } else if (words.length) { words[0].classList.add('on'); }

  const TABS = [
    ['Capture and qualify leads', 'Capture and route inbound leads across channels with instant replies and smart qualification, so high-intent prospects never wait.'],
    ['Engagement that adapts in real time', 'Engage customers with timely, personalised messages across WhatsApp, email, SMS and social so every interaction feels relevant.'],
    ['Turn intent into revenue', 'Nudge customers to act with automated follow-ups, catalogs, payment links and conversion-focused journeys.'],
    ['Support at scale', 'Combine AI assistants and human agents to handle FAQs, route complex cases and manage conversations from one inbox.'],
    ['Drive long-term customer value', 'Re-engage customers with reminders, updates and lifecycle campaigns that keep your brand top of mind.'],
  ];
  const panel = document.getElementById('tabpanel');
  document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('[data-tab]').forEach(x => x.setAttribute('aria-selected', String(x === b)));
    const [h, p] = TABS[+b.dataset.tab]; panel.innerHTML = ''; const h3 = document.createElement('h3'), pp = document.createElement('p'); h3.textContent = h; pp.textContent = p; panel.append(h3, pp);
    panel.style.animation = 'none'; panel.offsetHeight; panel.style.animation = '';
  }));
  document.querySelectorAll('[data-ex]').forEach(b => b.addEventListener('click', () => { const t = document.getElementById('prompt'); if (t) { t.value = b.dataset.ex; t.focus(); } }));
})();
