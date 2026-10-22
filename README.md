# Fitness Club Landing

Одно­сторінковий лендінг фітнес-клубу (українською) з формою запису на пробне заняття.

## Структура

```
server.js        # Node-сервер без залежностей: статика + POST /api/lead
public/
  index.html     # розмітка сторінки
  css/style.css  # адаптивні стилі
  js/main.js     # меню, валідація й відправка форми
  img/           # зображення
leads.jsonl      # заявки (створюється автоматично, не комітиться)
```

## Запуск

Потрібен Node.js 18+.

```bash
npm start            # http://localhost:3000
PORT=8080 npm start  # інший порт
```

## Форма

`POST /api/lead` приймає JSON `{ name, phone, message?, website? }`.
Поле `website` — honeypot проти ботів. Валідні заявки дописуються в `leads.jsonl`.
Пересилання в Telegram / email / CRM — `TODO` у `server.js`.

## Контент і медіа

- Відео: `public/video/hero-vertical.mp4` (телефони) і `hero-horizontal.mp4` (ПК) — підміняються в `js/main.js`.
- Фото: `public/img/*.webp` (оптимізовані, до 1500 px).
- Кольори бренду з fitberry-bucha.com.ua: `#9f2c57`, `#700c32`, `#fcf9f9`; світліший відтінок бренду для акцентів — `#d73b75`.
- Заявки містять `format` (solo/pair), `interest` і `utm_*`.
