export class PlayerNotFoundError extends Error {
  constructor(public readonly username: string) {
    super(`Player "${username}" not found`);
    this.name = 'PlayerNotFoundError';
  }
}
