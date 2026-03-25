"use client";

import LiteYouTubeEmbed from "react-lite-youtube-embed";
import "react-lite-youtube-embed/dist/LiteYouTubeEmbed.css";

function extractVideoId(url: string): string {
  // youtube.com/watch?v=ID
  const watchMatch = url.match(/[?&]v=([^&]+)/);
  if (watchMatch) return watchMatch[1];

  // youtu.be/ID
  const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
  if (shortMatch) return shortMatch[1];

  // youtube.com/embed/ID
  const embedMatch = url.match(/embed\/([^?&]+)/);
  if (embedMatch) return embedMatch[1];

  // assume raw ID
  return url;
}

export default function YouTubePlayer({
  url,
  title = "YouTube video",
}: {
  url: string;
  title?: string;
}) {
  const videoId = extractVideoId(url);

  return (
    <div className="rounded-lg overflow-hidden">
      <LiteYouTubeEmbed id={videoId} title={title} />
    </div>
  );
}
