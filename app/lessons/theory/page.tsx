import Image from 'next/image';
import { BookOpenIcon, ExternalLinkIcon } from 'lucide-react';
import { theorySections } from '../../constants/theorySections';
import VideoModal from '../../components/VideoModal';
import { Button } from '@/app/components/ui/button';
import {
  Card,
  CardContent,
  CardTitle,
} from '@/app/components/ui/card';

export default function TheoryPage() {
  return (
    <div className="flex flex-col flex-1 bg-background font-sans px-6 py-12">
      <div className="max-w-3xl mx-auto w-full">
        <h1 className="text-3xl font-bold text-foreground mb-8">Theory</h1>
        <div className="flex flex-col gap-4">
          {theorySections.map((section) => (
            <Card key={section.title}>
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
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                      {section.description}
                    </p>
                    {(section.video || section.trainer) && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {section.video && (
                          <VideoModal
                            url={section.video}
                            title={section.title}
                          />
                        )}
                        {section.trainer && (
                          <Button variant="outline" asChild>
                            <a
                              href={section.trainer}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLinkIcon />
                              Тренажёр на Lichess
                            </a>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
