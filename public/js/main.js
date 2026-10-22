const nav = document.getElementById('nav');
const burger = document.querySelector('.burger');
burger.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  burger.setAttribute('aria-expanded', open);
});
nav.addEventListener('click', (e) => {
  if (e.target.tagName === 'A') { nav.classList.remove('open'); burger.setAttribute('aria-expanded', false); }
});
document.getElementById('year').textContent = new Date().getFullYear();

const form = document.getElementById('lead-form');
const status = form.querySelector('.form__status');
const btn = form.querySelector('button[type=submit]');

const setError = (field, msg) => {
  form.elements[field].classList.toggle('invalid', !!msg);
  form.querySelector(`[data-for=${field}]`).textContent = msg || '';
};

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  setError('name', data.name.trim().length < 2 ? 'Вкажіть ім’я' : '');
  setError('phone', data.phone.replace(/\D/g, '').length < 10 ? 'Вкажіть коректний номер телефону' : '');
  if (form.querySelector('.invalid')) return;

  btn.disabled = true;
  status.className = 'form__status';
  status.textContent = 'Надсилаємо…';
  try {
    const res = await fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error();
    form.reset();
    status.className = 'form__status ok';
    status.textContent = 'Дякуємо! Ми зв’яжемося з вами найближчим часом.';
  } catch {
    status.className = 'form__status fail';
    status.textContent = 'Не вдалося надіслати. Спробуйте ще раз або зателефонуйте нам.';
  } finally {
    btn.disabled = false;
  }
});
