import { getTranslations } from 'next-intl/server';
import { worldChampions } from '@/app/constants/worldChampions';
import VideoModal from '@/app/components/VideoModal';
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

export default async function WorldChampionsPage() {
  const t = await getTranslations('champions');
  return (
    <div className="flex flex-col flex-1 bg-background font-sans px-6 py-12">
      <div className="max-w-3xl mx-auto w-full">
        <h1 className="text-3xl font-bold text-foreground mb-8">
          {t('title')}
        </h1>
        <div className="flex flex-col gap-4">
          {worldChampions.map((champion) => {
            const name = t(`list.${champion.id}.name`);
            const description = t(`list.${champion.id}.description`);
            return (
              <Card key={champion.id}>
                <CardContent>
                  <div className="flex gap-4">
                    <Avatar className="size-20">
                      {champion.photo && (
                        <AvatarImage src={champion.photo} alt={name} />
                      )}
                      <AvatarFallback>{getInitials(name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-1 flex-1">
                      <CardTitle className="text-lg">{name}</CardTitle>
                      <CardDescription>{champion.years}</CardDescription>
                      <p className="text-sm text-muted-foreground mt-2">
                        {description}
                      </p>
                      <div className="mt-4">
                        <VideoModal url={champion.video} title={name} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
