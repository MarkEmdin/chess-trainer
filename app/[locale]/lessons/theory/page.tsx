import Image from 'next/image';
import { BookOpenIcon, ExternalLinkIcon } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { theorySections } from '@/app/constants/theorySections';
import VideoModal from '@/app/components/VideoModal';
import { Button } from '@/app/components/ui/button';
import {
  Card,
  CardContent,
  CardTitle,
} from '@/app/components/ui/card';

export default async function TheoryPage() {
  const t = await getTranslations('theory');
  return (
    <div className="flex flex-col flex-1 bg-background font-sans px-6 py-12">
      <div className="max-w-3xl mx-auto w-full">
        <h1 className="text-3xl font-bold text-foreground mb-8">{t('title')}</h1>
        <div className="flex flex-col gap-4">
          {theorySections.map((section) => {
            const title = t(`sections.${section.id}.title`);
            const description = t(`sections.${section.id}.description`);
            return (
              <Card key={section.id}>
                <CardContent>
                  <div className="flex gap-4">
                    {section.icon ? (
                      <Image
                        src={section.icon}
                        alt=""
                        width={64}
                        height={64}
                        className="shrink-0"
                      />
                    ) : (
                      <div className="shrink-0 size-16 rounded-md bg-muted flex items-center justify-center">
                        <BookOpenIcon className="size-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex flex-col gap-1 flex-1">
                      <CardTitle className="text-lg">{title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-2">
                        {description}
                      </p>
                      {(section.video || section.trainer) && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {section.video && (
                            <VideoModal url={section.video} title={title} />
                          )}
                          {section.trainer && (
                            <Button variant="outline" asChild>
                              <a
                                href={section.trainer}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLinkIcon />
                                {t('lichessTrainer')}
                              </a>
                            </Button>
                          )}
                        </div>
                      )}
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
