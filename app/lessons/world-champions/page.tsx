import { worldChampions } from '../../constants/worldChampions';
import YouTubePlayer from '../../components/YouTubePlayer';

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
              <h2 className="text-lg font-semibold text-stone-800">
                {champion.name}
              </h2>
              <p className="text-sm text-stone-500 mb-1">{champion.years}</p>
              <p className="text-sm text-stone-600 mb-4">
                {champion.description}
              </p>
              <YouTubePlayer url={champion.video} title={champion.name} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
