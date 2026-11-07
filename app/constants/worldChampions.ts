export type PhotoCredit = {
  author: string;
  license: string;
  licenseUrl?: string;
  source: string;
};

type Champion = {
  id: string;
  years: string;
  video: string;
  photo: string;
  credit: PhotoCredit;
};

export const worldChampions: Champion[] = [
  {
    id: 'steinitz',
    years: '1836–1900',
    video:
      'https://www.youtube.com/watch?v=IeqRRj7j-ig&list=PLDvSkqTvAFAkGByF3CansKBYv0F290smA&index=11',
    photo: '/champions/steinitz.webp',
    credit: {
      author: 'Fritz Schumann',
      license: 'Public domain',
      source:
        'https://commons.wikimedia.org/wiki/File:Steinitz,_William-4_-_DPLA_-_9eeab9ac335135c24b69ab7e36fc5354_(cropped).jpg',
    },
  },
  {
    id: 'lasker',
    years: '1868–1941',
    video:
      'https://www.youtube.com/watch?v=Q9gakVu-DRY&list=PLDvSkqTvAFAkGByF3CansKBYv0F290smA&index=12',
    photo: '/champions/lasker.webp',
    credit: {
      author: 'Bundesarchiv, Bild 102-00457',
      license: 'CC BY-SA 3.0 de',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/de/',
      source:
        'https://commons.wikimedia.org/wiki/File:Bundesarchiv_Bild_102-00457,_Emanuel_Lasker.jpg',
    },
  },
  {
    id: 'capablanca',
    years: '1888–1942',
    video:
      'https://www.youtube.com/watch?v=sVTE5cWCGA4&list=PLDvSkqTvAFAkGByF3CansKBYv0F290smA&index=13',
    photo: '/champions/capablanca.webp',
    credit: {
      author: 'Keystone-France',
      license: 'Public domain',
      source:
        'https://commons.wikimedia.org/wiki/File:Jos%C3%A9_Ra%C3%BAl_Capablanca_1931.jpg',
    },
  },
  {
    id: 'alekhine',
    years: '1892–1946',
    video:
      'https://www.youtube.com/watch?v=bzQG5tGlnHo&list=PLDvSkqTvAFAkGByF3CansKBYv0F290smA&index=10',
    photo: '/champions/alekhine.webp',
    credit: {
      author: 'George Grantham Bain Collection, Library of Congress',
      license: 'Public domain',
      source:
        'https://commons.wikimedia.org/wiki/File:Alexandre_Alekhine_01.jpg',
    },
  },
  {
    id: 'euwe',
    years: '1901–1981',
    video:
      'https://www.youtube.com/watch?v=KrodeOzzclY&list=PLDvSkqTvAFAkGByF3CansKBYv0F290smA&index=9',
    photo: '/champions/euwe.webp',
    credit: {
      author: 'Harry Pot / Anefo',
      license: 'CC BY-SA 3.0 nl',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/nl/',
      source:
        'https://commons.wikimedia.org/wiki/File:Max_Euwe_1963.jpg',
    },
  },
  {
    id: 'botvinnik',
    years: '1911–1995',
    video:
      'https://www.youtube.com/watch?v=UvXZcWTMZAI&list=PLDvSkqTvAFAkGByF3CansKBYv0F290smA&index=8',
    photo: '/champions/botvinnik.webp',
    credit: {
      author: 'Harry Pot / Anefo',
      license: 'CC BY-SA 3.0 nl',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/nl/',
      source:
        'https://commons.wikimedia.org/wiki/File:Mikhail_Botvinnik_1962.jpg',
    },
  },
  {
    id: 'smyslov',
    years: '1921–2010',
    video:
      'https://www.youtube.com/watch?v=WwW_nn06WJM&list=PLDvSkqTvAFAkGByF3CansKBYv0F290smA&index=7',
    photo: '/champions/smyslov.webp',
    credit: {
      author: 'Koen Suyk / Anefo',
      license: 'CC0',
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      source:
        'https://commons.wikimedia.org/wiki/File:Interpolisschaaktoernooi_Tilburg_1819_Smyslov_aan_zet,_Bestanddeelnr_929-3630.jpg',
    },
  },
  {
    id: 'tal',
    years: '1936–1992',
    video:
      'https://www.youtube.com/watch?v=nAb0mVACFWg&list=PLDvSkqTvAFAkGByF3CansKBYv0F290smA&index=6',
    photo: '/champions/tal.webp',
    credit: {
      author: 'Harry Pot / Anefo',
      license: 'CC BY-SA 3.0 nl',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/nl/',
      source:
        'https://commons.wikimedia.org/wiki/File:Mikhail_Tal_1962.jpg',
    },
  },
  {
    id: 'petrosian',
    years: '1929–1984',
    video:
      'https://www.youtube.com/watch?v=e9RJrlc9HrM&list=PLDvSkqTvAFAkGByF3CansKBYv0F290smA&index=5',
    photo: '/champions/petrosian.webp',
    credit: {
      author: 'Harry Pot / Anefo',
      license: 'CC0',
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      source:
        'https://commons.wikimedia.org/wiki/File:Petrosian_1962_(cropped).jpg',
    },
  },
  {
    id: 'spassky',
    years: '1937–2025',
    video:
      'https://www.youtube.com/watch?v=T7BCgvVbR2s&list=PLDvSkqTvAFAkGByF3CansKBYv0F290smA&index=4',
    photo: '/champions/spassky.webp',
    credit: {
      author: 'Rob Bogaerts / Anefo',
      license: 'CC0',
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      source:
        'https://commons.wikimedia.org/wiki/File:Dhr._Boris_Spassky,_Bestanddeelnr_932-7320.jpg',
    },
  },
  {
    id: 'fischer',
    years: '1943–2008',
    video:
      'https://www.youtube.com/watch?v=g--lmBpkewQ&list=PLDvSkqTvAFAkGByF3CansKBYv0F290smA&index=3',
    photo: '/champions/fischer.webp',
    credit: {
      author: 'Bert Verhoeff / Anefo',
      license: 'CC0',
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      source:
        'https://commons.wikimedia.org/wiki/File:Bobby_Fischer_1972.jpg',
    },
  },
  {
    id: 'karpov',
    years: '1951–',
    video:
      'https://www.youtube.com/watch?v=6tbPmtH-OKo&list=PLDvSkqTvAFAkGByF3CansKBYv0F290smA&index=2',
    photo: '/champions/karpov.webp',
    credit: {
      author: 'Veni Markovski',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      source:
        'https://commons.wikimedia.org/wiki/File:Anatoly_Karpov_2017_april.jpg',
    },
  },
  {
    id: 'kasparov',
    years: '1963–',
    video:
      'https://www.youtube.com/watch?v=xb54p5yR-RU&list=PLDvSkqTvAFAkGByF3CansKBYv0F290smA',
    photo: '/champions/kasparov.webp',
    credit: {
      author: 'Fryta 73',
      license: 'CC BY-SA 2.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/',
      source:
        'https://commons.wikimedia.org/wiki/File:Garri_Kasparow_(18776605665)_(cropped)_2.jpg',
    },
  },
];
