import Image from 'next/image';
import { worldChampions } from '../../constants/worldChampions';
import YouTubePlayer from '../../components/YouTubePlayer';

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

export default function WorldChampionsPage() {
  return (
    <div className="flex flex-col flex-1 bg-[#f5f0e8] font-sans px-6 py-12">
      <div className="max-w-3xl mx-auto w-full">
        <h1 className="text-3xl font-bold text-stone-800 mb-8">
          World Champions
        </h1>
        <div className="flex flex-col gap-8">
          {worldChampions.map((champion) => (
            <div
              key={champion.name}
              className="rounded-lg border border-stone-300 bg-white p-5"
            >
              <div className="flex gap-4 mb-4">
                <div className="shrink-0 w-24 h-24 rounded-md overflow-hidden bg-stone-200 flex items-center justify-center text-stone-500 font-semibold text-xl">
                  {champion.photo ? (
                    <Image
                      src={champion.photo}
                      alt={champion.name}
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getInitials(champion.name)
                  )}
                </div>
                <div className="flex flex-col">
                  <h2 className="text-lg font-semibold text-stone-800">
                    {champion.name}
                  </h2>
                  <p className="text-sm text-stone-500 mb-1">
                    {champion.years}
                  </p>
                  <p className="text-sm text-stone-600">
                    {champion.description}
                  </p>
                </div>
              </div>
              <YouTubePlayer url={champion.video} title={champion.name} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
