import { rememberAsk, takePendingAsk } from '@/lib/coaching/pendingAsk';

describe('pendingAsk', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => jest.restoreAllMocks());

  it('hands the remembered position back once', () => {
    rememberAsk('g1-5');
    expect(takePendingAsk()).toBe('g1-5');
    expect(takePendingAsk()).toBeNull();
  });

  it('survives storage being off', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(() => rememberAsk('g1-5')).not.toThrow();
    expect(takePendingAsk()).toBeNull();
  });
});
