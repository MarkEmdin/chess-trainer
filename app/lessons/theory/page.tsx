import Image from 'next/image';
import { BookOpenIcon } from 'lucide-react';
import { theorySections } from '../../constants/theorySections';
import VideoModal from '../../components/VideoModal';
import {
  Card,
  CardContent,
  CardTitle,
} from '@/app/components/ui/card';

export default function TheoryPage() {
  return (
    <div className="flex flex-col flex-1 bg-[#f5f0e8] font-sans px-6 py-12">
      <div className="max-w-3xl mx-auto w-full">
        <h1 className="text-3xl font-bold text-stone-800 mb-8">Theory</h1>
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
                    {section.video && (
                      <div className="mt-4">
                        <VideoModal
                          url={section.video}
                          title={section.title}
                        />
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
