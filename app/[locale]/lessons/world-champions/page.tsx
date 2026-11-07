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

const creditLinkClass = 'underline hover:text-foreground';

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
          {worldChampions.map((champion, index) => {
            const name = t(`list.${champion.id}.name`);
            const description = t(`list.${champion.id}.description`);
            return (
              <Card key={champion.id}>
                <CardContent>
                  <div className="flex gap-4">
                    <Avatar className="size-20">
                      <AvatarImage src={champion.photo} alt={name} />
                      <AvatarFallback>{getInitials(name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-1 flex-1">
                      <CardTitle className="text-lg">
                        {index + 1}. {name}
                      </CardTitle>
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
        <section
          aria-labelledby="photo-credits"
          className="mt-10 flex flex-col gap-2 text-xs text-muted-foreground"
        >
          <h2 id="photo-credits" className="font-medium text-foreground">
            {t('photoCredits')}
          </h2>
          <p>{t('photoCreditsNote')}</p>
          <ul className="flex flex-col gap-1">
            {worldChampions.map(({ id, credit }) => (
              <li key={id}>
                {t(`list.${id}.name`)}: {credit.author},{' '}
                {credit.licenseUrl ? (
                  <a href={credit.licenseUrl} className={creditLinkClass}>
                    {credit.license}
                  </a>
                ) : (
                  credit.license
                )}
                ,{' '}
                <a href={credit.source} className={creditLinkClass}>
                  Wikimedia Commons
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
