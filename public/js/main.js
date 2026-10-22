document.documentElement.classList.add('js');

const buzz = (ms) => {                                                                            // haptics (Android, only after the first tap)
  try { if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(ms); } catch {}
};
const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const onScroll = (fn) => {                                                                       // rAF-throttled scroll hook
  let t = false;
  addEventListener('scroll', () => { if (!t) { t = true; requestAnimationFrame(() => { t = false; fn(); }); } }, { passive: true });
  addEventListener('resize', fn);
  fn();
};

/* always start at the top: a refresh / returning to the tab must not restore an old scroll position
   (a deliberate link like /#form from outside is still honoured) */
(() => {
  const nav = performance.getEntriesByType('navigation')[0];
  const fresh = !nav || nav.type === 'navigate';
  const toTop = () => { if (location.hash) history.replaceState(null, '', location.pathname + location.search); scrollTo(0, 0); };
  if (!fresh || !location.hash) toTop();
  addEventListener('pageshow', (e) => { if (e.persisted) toTop(); });   // back/forward cache on phones
})();

/* hero video: vertical on phones, horizontal on desktop; poster only if saving data / reduced motion */
const video = document.getElementById('hero-video');
const mobile = window.matchMedia('(max-width: 768px)');
const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches || navigator.connection?.saveData;
function loadHero() {
  if (calm) return;
  const src = mobile.matches ? 'video/hero-vertical.mp4' : 'video/hero-horizontal.mp4';
  if (video.getAttribute('src') === src) return;
  video.setAttribute('src', src);
  video.poster = mobile.matches ? 'img/poster-vertical.jpg' : 'img/poster-horizontal.jpg';
  video.muted = true;                             // iOS only autoplays muted + inline
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.load();
  const tryPlay = () => video.play().catch(() => {
    // autoplay blocked (e.g. Low Power Mode): start on the first touch / scroll instead
    const kick = () => { video.play().catch(() => {}); ['touchstart', 'pointerdown', 'scroll'].forEach((t) => removeEventListener(t, kick)); };
    ['touchstart', 'pointerdown', 'scroll'].forEach((t) => addEventListener(t, kick, { once: true, passive: true }));
  });
  tryPlay();
}
loadHero();
mobile.addEventListener('change', loadHero);

/* nav */
const nav = document.getElementById('nav');
const burger = document.querySelector('.burger');
const closeNav = () => { nav.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); };
burger.addEventListener('click', () => burger.setAttribute('aria-expanded', nav.classList.toggle('open')));
nav.addEventListener('click', (e) => { if (e.target.closest('a')) closeNav(); });

document.getElementById('year').textContent = new Date().getFullYear();

/* reveal on scroll */
const io = new IntersectionObserver((entries) => entries.forEach((en) => {
  if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
}), { threshold: .12 });
document.querySelectorAll('.section__head, .fears__intro, .steps, .step, .pair__text, .pair__photos, .dir, .why__media, .why__text, .faq details, .form-section__text, .form, .contacts__info, .contacts__map')
  .forEach((el) => {
    el.classList.add('reveal');
    el.style.setProperty('--i', [...el.parentElement.children].filter((n) => n.classList.contains('reveal') || n === el).indexOf(el));
    io.observe(el);
  });

/* highlighted words wipe in when they scroll into view */
const emIo = new IntersectionObserver((entries) => entries.forEach((en) => {
  if (en.isIntersecting) { en.target.classList.add('on'); emIo.unobserve(en.target); }
}), { threshold: .6 });
document.querySelectorAll('em').forEach((el) => emIo.observe(el));

/* "Записатися вдвох" pre-selects the pair option */
document.querySelectorAll('[data-format="pair"]').forEach((a) =>
  a.addEventListener('click', () => {
    const r = document.querySelector('input[name=format][value=pair]');
    r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true }));
  }));

/* form */
const form = document.getElementById('lead-form');
const thanks = document.querySelector('.thanks');
const status = form.querySelector('.form__status');
const btn = form.querySelector('button[type=submit]');
const phone = form.elements.phone;

// keep the +380 prefix and group digits as the user types
phone.addEventListener('input', () => {
  let d = phone.value.replace(/\D/g, '');
  if (d.startsWith('380')) d = d.slice(3); else if (d.startsWith('0')) d = d.slice(1);
  d = d.slice(0, 9);
  const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
  phone.value = d ? '+380 ' + parts.join(' ') : '';
});

const setError = (field, msg) => {
  form.elements[field].classList.toggle('invalid', !!msg);
  form.querySelector(`[data-for=${field}]`).textContent = msg || '';
};
form.elements.name.addEventListener('input', () => setError('name', ''));
phone.addEventListener('input', () => setError('phone', ''));

const utm = Object.fromEntries([...new URLSearchParams(location.search)].filter(([k]) => k.startsWith('utm_')));

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  const nameBad = data.name.trim().length < 2;
  const phoneBad = data.phone.replace(/\D/g, '').length < 12;
  setError('name', nameBad ? 'Вкажіть, будь ласка, ім’я' : '');
  setError('phone', phoneBad ? 'Перевірте номер телефону' : '');
  if (nameBad || phoneBad) {
    form.querySelectorAll('.invalid').forEach((el) => { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); });
    buzz(30);
    return form.querySelector('.invalid').focus();
  }

  btn.disabled = true;
  status.className = 'form__status';
  status.textContent = 'Надсилаємо…';
  try {
    const res = await fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, utm }),
    });
    if (!res.ok) throw new Error(res.status);
    form.hidden = true;
    thanks.hidden = false;
    thanks.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // the thanks card is scrolled to the middle of the screen, so burst from there (rect is mid-scroll right now)
    setTimeout(() => confetti(innerWidth / 2, innerHeight * .46), 280);
    buzz([30, 40, 30]);
  } catch {
    status.className = 'form__status fail';
    status.textContent = 'Не вдалося надіслати. Спробуйте ще раз або зателефонуйте: (050) 810 30 30';
  } finally {
    btn.disabled = false;
  }
});


/* ---------- flashcard deck ---------- */
(() => {
  const deck = document.getElementById('deck');
  const ui = document.querySelector('.deck__ui');
  const count = document.querySelector('.deck__count');
  const nextBtn = document.querySelector('[data-deck=next]');
  const cards = [...deck.querySelectorAll('.fear')].map((el, i) => {
    const q = el.querySelector('.fear__q').textContent;
    const a = el.querySelector('.fear__a').textContent;
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<div class="card__inner">
      <div class="card__face card__front"><span class="card__tag"><span>Питання</span><span>${i + 1}</span></span><p class="card__q"></p><span class="card__flip">Торкніться, щоб перевернути ↻</span></div>
      <div class="card__face card__back"><span class="card__tag"><span>Відповідь</span></span><p class="card__a"></p><a class="card__cta" href="#form">Записатися на безкоштовне →</a></div>
    </div>`;
    card.querySelector('.card__q').textContent = q;
    card.querySelector('.card__a').textContent = a;
    card.dataset.n = i + 1;
    card.tabIndex = -1;
    return card;
  });
  deck.replaceChildren(...cards);
  deck.classList.add('deck--on');
  ui.hidden = false;

  const order = [...cards];                     // order[0] is the top card
  const tilt = [0, -3.5, 3, -2, 2];
  const total = cards.length;

  function layout(snap) {
    order.forEach((c, p) => {
      const depth = Math.min(p, 4);
      c.classList.toggle('is-top', p === 0);
      c.style.zIndex = total - p;
      c.style.opacity = p > 3 ? 0 : 1;
      c.style.pointerEvents = p === 0 ? 'auto' : 'none';
      c.tabIndex = p === 0 ? 0 : -1;
      c.setAttribute('aria-hidden', p === 0 ? 'false' : 'true');
      c.style.transition = c === snap ? 'none' : 'transform .45s cubic-bezier(.2,.9,.3,1.2), opacity .3s';
      c.style.transform = `translate(0, ${depth * 18}px) rotate(${tilt[depth]}deg) scale(${1 - depth * 0.04})`;
    });
    count.textContent = `${order[0].dataset.n} / ${total}`;
  }

  // throw the top card away; it returns unseen to the back of the deck
  function fling(card, vx, vy) {
    const dir = vx || 1;
    buzz(12);
    order.push(order.shift());
    layout();                                    // next card steps up
    card.style.zIndex = total + 1;               // keep the flying card above the deck
    card.style.opacity = 0;
    card.style.transition = 'transform .5s cubic-bezier(.3,.6,.4,1), opacity .5s';
    card.style.transform = `translate(${dir * Math.max(window.innerWidth, 600) * .9}px, ${vy * 180}px) rotate(${dir * 28}deg)`;
    setTimeout(() => {
      card.classList.remove('is-flipped');
      layout(card);                              // snap the card to the back without animating
    }, 520);
  }

  /* pointer drag: free movement, throw to send away, tap to flip */
  let drag = null;
  deck.addEventListener('pointerdown', (e) => {
    const card = e.target.closest('.card');
    if (!card || card !== order[0] || e.target.closest('a')) return;
    drag = { card, x: e.clientX, y: e.clientY, dx: 0, dy: 0, moved: false, id: e.pointerId, samples: [[performance.now(), e.clientX, e.clientY]] };
  });
  deck.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag.dx = e.clientX - drag.x; drag.dy = e.clientY - drag.y;
    if (!drag.moved) {
      if (Math.hypot(drag.dx, drag.dy) < 8) return;
      // on touch screens a mostly vertical gesture is a page scroll — the browser takes over (pointercancel)
      drag.moved = true;
      drag.card.setPointerCapture(e.pointerId);
      drag.card.classList.add('is-drag');
    }
    drag.samples.push([performance.now(), e.clientX, e.clientY]);
    if (drag.samples.length > 5) drag.samples.shift();
    drag.card.style.transform = `translate(${drag.dx}px, ${drag.dy}px) rotate(${drag.dx * 0.06}deg)`;
  });
  const end = (e, cancelled) => {
    if (!drag || e.pointerId !== drag.id) return;
    const { card, dx, dy, moved, samples } = drag;
    drag = null;
    card.classList.remove('is-drag');
    if (cancelled || !moved) { if (!cancelled && !moved) { card.classList.toggle('is-flipped'); buzz(8); } layout(); return; }
    const [t0, x0, y0] = samples[0];
    const [t1, x1, y1] = samples[samples.length - 1];
    const dt = Math.max(t1 - t0, 1);
    const vx = (x1 - x0) / dt, vy = (y1 - y0) / dt;   // px/ms
    if (Math.hypot(dx, dy) > 130 || Math.hypot(vx, vy) > 0.6) fling(card, Math.sign(vx || dx), Math.max(-2, Math.min(2, vy)));
    else layout();
  };
  deck.addEventListener('pointerup', (e) => end(e, false));
  deck.addEventListener('pointercancel', (e) => end(e, true));

  /* keyboard + button */
  nextBtn.addEventListener('click', () => fling(order[0], 1, 0));
  deck.addEventListener('keydown', (e) => {
    const top = order[0];
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); top.classList.toggle('is-flipped'); }
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); fling(top, e.key === 'ArrowRight' ? 1 : -1, 0); }
  });

  layout();
  // reveal the deck when it scrolls into view
  deck.classList.add('reveal');
  io.observe(deck);
})();


/* ---------- scroll progress + hero parallax ---------- */
(() => {
  const bar = document.querySelector('.progress');
  const hero = document.getElementById('hero');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let tick = false;
  const update = () => {
    tick = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    document.documentElement.style.setProperty('--p', max > 0 ? Math.min(scrollY / max, 1).toFixed(4) : 0);
    if (!still && scrollY < hero.offsetHeight) hero.style.setProperty('--py', Math.min(scrollY * 0.2, 80).toFixed(1));
  };
  addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(update); } }, { passive: true });
  update();
})();

/* ---------- flashcard cursor: a square label that follows the mouse over the deck only ---------- */
(() => {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cur = document.querySelector('.cursor');
  const label = cur.querySelector('span');
  const deck = document.getElementById('deck');
  let x = 0, y = 0, cx = 0, cy = 0, running = false;
  const place = () => { cur.style.transform = `translate3d(${cx}px, ${cy}px, 0)`; };
  const loop = () => {
    cx += (x - cx) * .22; cy += (y - cy) * .22;
    place();
    if (running) requestAnimationFrame(loop);
  };
  deck.addEventListener('pointermove', (e) => {
    x = e.clientX; y = e.clientY;
    const card = e.target.closest('.card');
    const over = !!card && !e.target.closest('a');
    // appear exactly under the mouse (never fly in from an old position)
    if (over && !cur.classList.contains('on')) { cx = x; cy = y; place(); }
    if (!running) { running = true; requestAnimationFrame(loop); }
    cur.classList.toggle('on', over);
    if (card) label.textContent = card.classList.contains('is-flipped') ? 'Далі' : 'Тягніть';
  });
  deck.addEventListener('pointerleave', () => { cur.classList.remove('on'); running = false; });
})();

/* ---------- deck: wiggle the top card now and then to show it can be swiped ---------- */
(() => {
  const deck = document.getElementById('deck');
  let touched = false, timer = null;
  deck.addEventListener('pointerdown', () => { touched = true; clearInterval(timer); });
  const wiggle = () => {
    if (touched || document.hidden) return;
    const top = deck.querySelector('.card.is-top');
    if (!top || top.classList.contains('is-drag')) return;
    const base = top.style.transform;
    top.animate([
      { transform: base },
      { transform: `${base} translateX(34px) rotate(5deg)`, offset: .3 },
      { transform: `${base} translateX(-18px) rotate(-3deg)`, offset: .6 },
      { transform: base },
    ], { duration: 1300, easing: 'cubic-bezier(.3,.7,.3,1)' });
  };
  new IntersectionObserver(([en], obs) => {
    if (!en.isIntersecting) return;
    obs.disconnect();
    setTimeout(wiggle, 900);
    timer = setInterval(wiggle, 7000);
  }, { threshold: .5 }).observe(deck);
})();


/* =====================================================================
   Interactions
   ===================================================================== */

/* ---------- headings: words rise one by one ---------- */
(() => {
  let n = 0;
  const unit = (content) => {
    const w = document.createElement('span'); w.className = 'w';
    const i = document.createElement('span'); i.className = 'wi'; i.style.setProperty('--wi', n++);
    i.append(content); w.append(i); return w;
  };
  const split = (parent) => {
    const out = [];
    parent.childNodes.forEach((node) => {
      if (node.nodeType === 3) {
        node.textContent.split(/(\s+)/).forEach((tok) => {
          if (!tok) return;
          out.push(/^\s+$/.test(tok) ? document.createTextNode(' ') : unit(document.createTextNode(tok)));
        });
      } else if (node.nodeName === 'EM') out.push(unit(node));        // keep a highlighted phrase together
      else if (node.nodeName === 'BR') out.push(node);
      else { split(node); out.push(node); }                            // e.g. a coloured <span>: split inside it
    });
    parent.replaceChildren(...out);
  };
  const seen = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add('in'); seen.unobserve(en.target); }
  }), { threshold: .35 });
  document.querySelectorAll('h2').forEach((h) => {
    h.setAttribute('aria-label', h.textContent.replace(/\s+/g, ' ').trim());
    n = 0; split(h); h.classList.add('split'); seen.observe(h);
  });
})();

/* ---------- marquee: speed follows how fast you scroll (and flips when you scroll up) ---------- */
(() => {
  const m = document.querySelector('.marquee');
  const track = m.querySelector('.marquee__track');
  if (still) return;
  m.classList.add('marquee--js');
  let pos = 0, v = 1.1, last = scrollY, visible = true, loopW = 1;
  const measure = () => { loopW = (track.getBoundingClientRect().width + (parseFloat(getComputedStyle(track).columnGap) || 0)) / 2; };
  measure(); addEventListener('resize', measure); document.fonts && document.fonts.ready.then(measure);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(m);
  const frame = () => {
    const dy = scrollY - last; last = scrollY;
    v += (1.1 + Math.max(-40, Math.min(40, dy)) * .45 - v) * .12;
    if (visible) {
      pos -= v;
      if (pos <= -loopW) pos += loopW; else if (pos > 0) pos -= loopW;
      track.style.transform = `translate3d(${pos}px, 0, 0)`;
    }
    requestAnimationFrame(frame);
  };
  frame();
})();

/* ---------- steps: the timeline fills as you scroll, each step ticks when reached ---------- */
(() => {
  const steps = document.querySelector('.steps');
  const items = [...steps.querySelectorAll('.step')];
  onScroll(() => {
    const r = steps.getBoundingClientRect();
    const trigger = innerHeight * .68;
    steps.style.setProperty('--sp', Math.max(0, Math.min(1, (trigger - r.top) / r.height)).toFixed(3));
    items.forEach((it) => it.classList.toggle('done', it.getBoundingClientRect().top + 40 < trigger));
  });
})();

/* ---------- pair: the second person joins (×1 → ×2), photos drift apart as you scroll, share with a friend ---------- */
(() => {
  const photos = document.querySelector('.pair__photos');
  const badge = photos.querySelector('.pair__badge');
  badge.textContent = '×1';
  new IntersectionObserver(([e], o) => {
    if (!e.isIntersecting) return;
    o.disconnect();
    setTimeout(() => { badge.textContent = '×2'; badge.classList.add('pop'); buzz(15); }, still ? 0 : 1700);
  }, { threshold: .4 }).observe(photos);
  if (!still) onScroll(() => {
    const r = photos.getBoundingClientRect();
    const c = (r.top + r.height / 2 - innerHeight / 2) / (innerHeight / 2 + r.height / 2);
    photos.style.setProperty('--ps', Math.max(-1, Math.min(1, c)).toFixed(3));
  });

  const btn = document.querySelector('[data-share]');
  const label = btn.textContent;
  const flash = (text) => { btn.textContent = text; setTimeout(() => { btn.textContent = label; }, 2400); };
  // navigator.share / clipboard.writeText exist only on HTTPS; the textarea trick also works on plain http (e.g. a LAN preview)
  const legacyCopy = (text) => {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px';
    document.body.append(ta); ta.select(); ta.setSelectionRange(0, text.length);
    let ok = false; try { ok = document.execCommand('copy'); } catch {}
    ta.remove(); return ok;
  };
  btn.addEventListener('click', async () => {
    const data = { title: 'FitBerry Буча', text: 'Підемо разом на безкоштовне тренування у FitBerry, Буча?', url: location.origin + location.pathname + '#pair' };
    if (navigator.share) {
      try { await navigator.share(data); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    let ok = false;
    if (navigator.clipboard && window.isSecureContext) { try { await navigator.clipboard.writeText(`${data.text} ${data.url}`); ok = true; } catch {} }
    if (!ok) ok = legacyCopy(`${data.text} ${data.url}`);
    if (ok) { flash('Посилання скопійовано ✓'); buzz(10); }
    else window.prompt('Скопіюйте посилання і надішліть другу:', `${data.text} ${data.url}`);
  });
})();

/* ---------- directions: swipe carousel on phones (active card scales up, dots follow) ---------- */
(() => {
  const dirs = document.querySelector('.dirs');
  const cards = [...dirs.children];
  const dots = document.querySelector('.dirs__dots');
  const hint = document.querySelector('.dirs__hint');
  cards.forEach((c, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.tabIndex = -1; b.setAttribute('aria-label', 'Напрям ' + (i + 1));
    b.addEventListener('click', () => { dirs.scrollTo({ left: c.offsetLeft - (dirs.clientWidth - c.offsetWidth) / 2, behavior: 'smooth' }); buzz(6); });
    dots.append(b);
  });
  let current = -1;
  const update = () => {
    const mid = dirs.scrollLeft + dirs.clientWidth / 2;
    let best = 0, bd = Infinity;
    cards.forEach((c, i) => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = i; } });
    if (best !== current) { if (current !== -1) buzz(5); current = best; }
    cards.forEach((c, i) => c.classList.toggle('active', i === best));
    [...dots.children].forEach((d, i) => d.classList.toggle('on', i === best));
    if (dirs.scrollLeft > 24) hint.classList.add('gone');
  };
  dirs.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
  addEventListener('resize', update);
  update();
})();

/* ---------- form: "Удвох" opens a field for the second person ---------- */
form.addEventListener('change', (e) => {
  if (e.target.name === 'format') form.classList.toggle('pair-on', e.target.value === 'pair');
});

/* ---------- square confetti ---------- */
function confetti(x, y) {
  if (still) return;
  const colors = ['#9f2c57', '#700c32', '#f4d9e0', '#fcf9f9', '#ffffff'];
  for (let i = 0; i < 46; i++) {
    const el = document.createElement('i');
    const size = 6 + Math.random() * 9;
    el.className = 'confetti';
    el.style.cssText = `width:${size}px;height:${size}px;background:${colors[i % colors.length]}`;
    document.body.append(el);
    const a = Math.random() * Math.PI * 2, dist = 110 + Math.random() * 230;
    const dx = Math.cos(a) * dist, dy = Math.sin(a) * dist - 120;
    el.animate([
      { transform: `translate(${x}px, ${y}px) rotate(0deg)`, opacity: 1 },
      { transform: `translate(${x + dx}px, ${y + dy + 280}px) rotate(${Math.random() * 720 - 360}deg)`, opacity: 0 },
    ], { duration: 1100 + Math.random() * 800, easing: 'cubic-bezier(.15,.7,.3,1)' }).onfinish = () => el.remove();
  }
}
