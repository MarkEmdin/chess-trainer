type TheorySection = {
  title: string;
  description: string;
  icon?: string;
  video?: string;
  trainer?: string;
};

export const theorySections: TheorySection[] = [
  {
    title: 'Мат двумя ладьями',
    description:
      'Метод «лесенки» — две ладьи поочерёдно оттесняют короля противника на край доски. Также известен как линейный мат.',
    video: 'https://youtu.be/vNo4ny67bQU',
    trainer:
      'https://lichess.org/practice/checkmates/piece-checkmates-i/BJy6fEDf/8K8FdT6P',
  },
  {
    title: 'Мат ферзём',
    description:
      'Король и ферзь против одинокого короля. Ферзь сужает пространство, король помогает довести до мата.',
    video: 'https://www.youtube.com/watch?v=Zluc1cj354s',
    trainer:
      'https://lichess.org/practice/checkmates/piece-checkmates-i/BJy6fEDf/U3r4wkFn',
  },
  {
    title: 'Мат ладьёй',
    description:
      'Король и ладья против одинокого короля. Оппозиция королей плюс режущая линия ладьи.',
    video: 'https://youtu.be/c9JUo0dydHQ',
    trainer:
      'https://lichess.org/practice/checkmates/piece-checkmates-i/BJy6fEDf/VeKiltmx',
  },
  {
    title: 'Мельница',
    description:
      'Тактический приём: серия вскрытых шахов слоном и ладьёй позволяет последовательно забирать фигуры противника.',
    video: 'https://www.youtube.com/watch?v=0hmvld-rN5M',
  },
];
