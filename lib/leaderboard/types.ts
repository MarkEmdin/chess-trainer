export type LeaderboardRow = {
  place: number;
  nickname: string;
  likes: number;
  is_me: boolean;
};

export type Cup = 'gold' | 'silver' | 'bronze';
