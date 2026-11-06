// The position a guest wanted to ask about, kept in this browser while they
// sign up. Storage can be off (private mode): then it is simply not kept.
const STORAGE_KEY = 'pending-ask';

export function rememberAsk(key: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, key);
  } catch {}
}

export function takePendingAsk(): string | null {
  try {
    const key = localStorage.getItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
    return key;
  } catch {
    return null;
  }
}
