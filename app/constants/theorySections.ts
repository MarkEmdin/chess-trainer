type TheorySection = {
  id: string;
  icon?: string;
  video?: string;
  trainer?: string;
};

export const theorySections: TheorySection[] = [
  {
    id: 'twoRooksMate',
    video: 'https://youtu.be/vNo4ny67bQU',
    trainer:
      'https://lichess.org/practice/checkmates/piece-checkmates-i/BJy6fEDf/8K8FdT6P',
  },
  {
    id: 'queenMate',
    video: 'https://www.youtube.com/watch?v=Zluc1cj354s',
    trainer:
      'https://lichess.org/practice/checkmates/piece-checkmates-i/BJy6fEDf/U3r4wkFn',
  },
  {
    id: 'rookMate',
    video: 'https://youtu.be/c9JUo0dydHQ',
    trainer:
      'https://lichess.org/practice/checkmates/piece-checkmates-i/BJy6fEDf/VeKiltmx',
  },
  {
    id: 'windmill',
    video: 'https://www.youtube.com/watch?v=0hmvld-rN5M',
    trainer: 'https://lichess.org/study/moOcHMA4/0YWcsjfF',
  },
];
