import '@testing-library/jest-dom';

// JSDOM doesn't implement these browser APIs that several of our libs touch
// (radix-ui Dialog uses ResizeObserver, next-themes pokes at matchMedia).
// Stub them so the modules don't blow up at import time.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
  ResizeObserverStub;

// next/cache (revalidatePath, revalidateTag, unstable_cache) is a
// server-only module that initialises Node Web Streams at import time —
// fine in the Next runtime, fatal in JSDOM. Components that transitively
// pull it in (e.g. Server Actions reachable from a Client Component's
// import graph) would otherwise fail to mount in unit tests. Mocking
// here keeps each test file from having to do it.
jest.mock('next/cache', () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
  unstable_cache: <T,>(fn: T) => fn,
}));

if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
