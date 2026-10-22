document.documentElement.classList.add('js');

/* hero video: vertical on phones, horizontal on desktop; poster only if saving data / reduced motion */
const video = document.getElementById('hero-video');
const mobile = window.matchMedia('(max-width: 768px)');
const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches || navigator.connection?.saveData;
function loadHero() {
  if (calm) return;
  const src = mobile.matches ? 'video/hero-vertical.mp4' : 'video/hero-horizontal.mp4';
  if (!video.src.endsWith(src)) { video.src = src; video.poster = mobile.matches ? 'img/poster-vertical.jpg' : 'img/poster-horizontal.jpg'; video.play().catch(() => {}); }
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
document.querySelectorAll('.section__head, .fear, .step, .pair__text, .pair__photos, .dir, .why__media, .why__text, .faq details, .form, .contacts__info')
  .forEach((el) => { el.classList.add('reveal'); io.observe(el); });

/* sticky mobile CTA hides when the form is on screen */
const sticky = document.querySelector('.sticky-cta');
new IntersectionObserver(([en]) => sticky.classList.toggle('hide', en.isIntersecting))
  .observe(document.getElementById('form'));

/* "Записатися вдвох" pre-selects the pair option */
document.querySelectorAll('[data-format="pair"]').forEach((a) =>
  a.addEventListener('click', () => { document.querySelector('input[name=format][value=pair]').checked = true; }));

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
  if (nameBad || phoneBad) return form.querySelector('.invalid').focus();

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
  } catch {
    status.className = 'form__status fail';
    status.textContent = 'Не вдалося надіслати. Спробуйте ще раз або зателефонуйте: (050) 810 30 30';
  } finally {
    btn.disabled = false;
  }
});
