type Champion = {
  name: string;
  years: string;
  description: string;
  video: string;
  photo?: string;
};

export const worldChampions: Champion[] = [
  {
    name: 'Wilhelm Steinitz',
    years: '1836–1900',
    description:
      'Первый официальный чемпион мира по шахматам. Основатель позиционной школы, ввёл принципы накопления преимущества.',
    video:
      'https://www.youtube.com/watch?v=IeqRRj7j-ig&list=PLDvSkqTvAFAkGByF3CansKBYv0F290smA&index=11',
  },
  {
    name: 'Emanuel Lasker',
    years: '1868–1941',
    description:
      'Чемпион мира 27 лет — рекорд в истории. Известен психологическим подходом и универсальным стилем.',
    video:
      'https://www.youtube.com/watch?v=Q9gakVu-DRY&list=PLDvSkqTvAFAkGByF3CansKBYv0F290smA&index=12',
  },
  {
    name: 'José Raúl Capablanca',
    years: '1888–1942',
    description:
      'Кубинский гений с феноменальной интуицией. Практически не проигрывал в лучшие годы.',
    video:
      'https://www.youtube.com/watch?v=sVTE5cWCGA4&list=PLDvSkqTvAFAkGByF3CansKBYv0F290smA&index=13',
  },
  {
    name: 'Alexander Alekhine',
    years: '1892–1946',
    description:
      'Известен агрессивным стилем и глубокими комбинациями. Единственный чемпион, умерший, оставаясь чемпионом.',
    video:
      'https://www.youtube.com/watch?v=bzQG5tGlnHo&list=PLDvSkqTvAFAkGByF3CansKBYv0F290smA&index=10',
  },
  {
    name: 'Max Euwe',
    years: '1901–1981',
    description:
      'Голландский чемпион мира и математик. Победил Алехина в матче 1935 года.',
    video:
      'https://www.youtube.com/watch?v=KrodeOzzclY&list=PLDvSkqTvAFAkGByF3CansKBYv0F290smA&index=9',
  },
  {
    name: 'Mikhail Botvinnik',
    years: '1911–1995',
    description:
      'Патриарх советской шахматной школы. Воспитал целое поколение чемпионов.',
    video:
      'https://www.youtube.com/watch?v=UvXZcWTMZAI&list=PLDvSkqTvAFAkGByF3CansKBYv0F290smA&index=8',
  },
  {
    name: 'Vasily Smyslov',
    years: '1921–2010',
    description: 'Известен гармоничным стилем и отличной техникой эндшпиля.',
    video:
      'https://www.youtube.com/watch?v=WwW_nn06WJM&list=PLDvSkqTvAFAkGByF3CansKBYv0F290smA&index=7',
  },
  {
    name: 'Mikhail Tal',
    years: '1936–1992',
    description:
      '«Волшебник из Риги». Легендарный тактик с жертвами и атакующим стилем.',
    video:
      'https://www.youtube.com/watch?v=nAb0mVACFWg&list=PLDvSkqTvAFAkGByF3CansKBYv0F290smA&index=6',
  },
  {
    name: 'Tigran Petrosian',
    years: '1929–1984',
    description:
      'Мастер защиты и профилактики. Один из самых труднопробиваемых игроков.',
    video:
      'https://www.youtube.com/watch?v=e9RJrlc9HrM&list=PLDvSkqTvAFAkGByF3CansKBYv0F290smA&index=5',
  },
  {
    name: 'Boris Spassky',
    years: '1937–',
    description:
      'Универсальный игрок. Чемпион мира, уступивший титул Фишеру в 1972 году.',
    video:
      'https://www.youtube.com/watch?v=T7BCgvVbR2s&list=PLDvSkqTvAFAkGByF3CansKBYv0F290smA&index=4',
  },
  {
    name: 'Bobby Fischer',
    years: '1943–2008',
    description:
      'Легенда шахмат, разрушивший доминирование СССР. Чемпион мира 1972 года.',
    video:
      'https://www.youtube.com/watch?v=g--lmBpkewQ&list=PLDvSkqTvAFAkGByF3CansKBYv0F290smA&index=3',
  },
  {
    name: 'Anatoly Karpov',
    years: '1951–',
    description:
      'Мастер позиционной игры и контроля. Доминировал в 1970–80-х годах.',
    video:
      'https://www.youtube.com/watch?v=6tbPmtH-OKo&list=PLDvSkqTvAFAkGByF3CansKBYv0F290smA&index=2',
  },
  {
    name: 'Garry Kasparov',
    years: '1963–',
    description:
      'Один из сильнейших игроков в истории. Агрессивный стиль и глубокая подготовка.',
    video:
      'https://www.youtube.com/watch?v=xb54p5yR-RU&list=PLDvSkqTvAFAkGByF3CansKBYv0F290smA',
  },
];
