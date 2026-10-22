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
