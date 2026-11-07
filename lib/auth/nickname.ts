// 3-30 chars, letters/digits/underscore/hyphen. set_nickname in the database
// enforces the same rule.
export const NICKNAME_RE = /^[a-zA-Z0-9_-]{3,30}$/;
