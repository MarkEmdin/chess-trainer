import { worldChampions } from '../../constants/worldChampions';
import YouTubePlayer from '../../components/YouTubePlayer';
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/app/components/ui/card';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/app/components/ui/avatar';

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
            <Card key={champion.name}>
              <CardContent>
                <div className="flex gap-4">
                  <Avatar className="size-20">
                    {champion.photo && (
                      <AvatarImage
                        src={champion.photo}
                        alt={champion.name}
                      />
                    )}
                    <AvatarFallback>
                      {getInitials(champion.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-1">
                    <CardTitle className="text-lg">{champion.name}</CardTitle>
                    <CardDescription>{champion.years}</CardDescription>
                    <p className="text-sm text-muted-foreground mt-2">
                      {champion.description}
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardContent>
                <YouTubePlayer url={champion.video} title={champion.name} />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
