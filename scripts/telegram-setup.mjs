// Usage: node --env-file=.env.local scripts/telegram-setup.mjs https://<site>
const site = process.argv[2]?.replace(/\/+$/, '');
const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

if (!site || !token || !secret) {
  console.error(
    'Usage: node --env-file=.env.local scripts/telegram-setup.mjs https://<site>\n' +
      'Requires TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET in the env.',
  );
  process.exit(1);
}

async function call(method, body) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  console.log(method, JSON.stringify(json));
  if (!json.ok) process.exit(1);
}

await call('setWebhook', {
  url: `${site}/api/telegram`,
  secret_token: secret,
  allowed_updates: ['message'],
  drop_pending_updates: true,
});
await call('setMyCommands', {
  commands: [
    { command: 'new', description: 'Unanswered questions (admins)' },
    { command: 'stop', description: 'Turn notifications off' },
  ],
});
await call('setMyCommands', {
  language_code: 'ru',
  commands: [
    { command: 'new', description: 'Вопросы без ответа (админы)' },
    { command: 'stop', description: 'Выключить уведомления' },
  ],
});
