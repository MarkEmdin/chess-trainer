import { createTranslator } from 'next-intl';
import en from '@/messages/en.json';
import ru from '@/messages/ru.json';
import { escapeHtml, type BotMessage } from './api';

export type BotLocale = 'en' | 'ru';

const PREVIEW_LIMIT = 300;
const LIST_LIMIT = 10;

export function toBotLocale(x: string | null | undefined): BotLocale {
  return x === 'ru' ? 'ru' : 'en';
}

function t(locale: BotLocale) {
  return createTranslator({
    locale,
    messages: locale === 'ru' ? ru : en,
    namespace: 'telegram.bot',
  });
}

export function previewBody(body: string): string {
  if (body.length <= PREVIEW_LIMIT) return body;
  const cut = body.slice(0, PREVIEW_LIMIT);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export function newQuestionMessage(
  locale: BotLocale,
  p: { nickname: string; moveSan: string; body: string; url: string },
): BotMessage {
  const tr = t(locale);
  return {
    text: tr('newQuestion', {
      nickname: `<b>${escapeHtml(p.nickname)}</b>`,
      move: escapeHtml(p.moveSan),
      body: escapeHtml(previewBody(p.body)),
    }),
    buttons: [{ text: tr('openAndAnswer'), url: p.url }],
  };
}

export function answeredMessage(
  locale: BotLocale,
  p: { moveSan: string; url: string },
): BotMessage {
  const tr = t(locale);
  return {
    text: tr('answered', { move: escapeHtml(p.moveSan) }),
    buttons: [{ text: tr('openAnswer'), url: p.url }],
  };
}

function ago(locale: BotLocale, createdAt: string, now: Date): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const minutes = Math.max(0, Math.floor((now.getTime() - new Date(createdAt).getTime()) / 60000));
  if (minutes < 60) return rtf.format(-minutes, 'minute');
  if (minutes < 1440) return rtf.format(-Math.floor(minutes / 60), 'hour');
  return rtf.format(-Math.floor(minutes / 1440), 'day');
}

export function questionListMessage(
  locale: BotLocale,
  items: { nickname: string; moveSan: string; createdAt: string; url: string }[],
  adminUrl: string,
  now: Date,
): BotMessage {
  const tr = t(locale);
  if (items.length === 0) return { text: tr('listEmpty') };
  const shown = items.slice(0, LIST_LIMIT);
  const lines = shown.map(
    (it, i) =>
      `${i + 1}. <b>${escapeHtml(it.nickname)}</b>, ${escapeHtml(it.moveSan)}, ${ago(locale, it.createdAt, now)}`,
  );
  const more = items.length - shown.length;
  const text = [
    tr('listTitle', { count: items.length }),
    '',
    ...lines,
    ...(more > 0 ? ['', tr('listMore', { count: more })] : []),
  ].join('\n');
  return {
    text,
    buttons: [
      ...shown.map((it, i) => ({ text: `${i + 1}. ${it.nickname}, ${it.moveSan}`, url: it.url })),
      { text: tr('openAdmin'), url: adminUrl },
    ],
  };
}

export function connectedMessage(
  locale: BotLocale,
  nickname: string,
  isAdmin: boolean,
): BotMessage {
  const tr = t(locale);
  return {
    text: `${tr('connected', { nickname: `<b>${escapeHtml(nickname)}</b>` })}\n${tr(
      isAdmin ? 'connectedAdmin' : 'connectedStudent',
    )}`,
  };
}

export function infoMessage(
  locale: BotLocale,
  key: 'expired' | 'startNoCode' | 'help' | 'helpUnlinked' | 'stopped',
  profileUrl: string,
): BotMessage {
  const tr = t(locale);
  const msg: BotMessage = { text: tr(key) };
  if (key !== 'help') msg.buttons = [{ text: tr('openProfile'), url: profileUrl }];
  return msg;
}
