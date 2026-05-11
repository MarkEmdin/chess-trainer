export class PlayerNotFoundError extends Error {
  constructor(public readonly username: string) {
    super(`Player "${username}" not found on Chess.com`);
    this.name = 'PlayerNotFoundError';
  }
}
