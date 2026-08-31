import { useState } from "react";
import { parseVideoUrl } from "../lib/videoEmbed";

export default function PortfolioGallery({ introVideoUrl, images }: { introVideoUrl: string | null; images: string[] }) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const video = introVideoUrl ? parseVideoUrl(introVideoUrl) : null;

  if (!video && images.length === 0) return null;

  return (
    <div className="mb-8">
      {video && (
        <div className="mb-5">
          {video.kind === "youtube" || video.kind === "vimeo" ? (
            <div className="border-[3px] border-billboard-ink rounded overflow-hidden aspect-video">
              <iframe
                src={video.embedUrl}
                title="Publisher intro video"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <a
              href={video.url}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 border-[3px] border-billboard-ink rounded p-4 bg-billboard-paperDim hover:bg-billboard-paper transition"
            >
              <span className="w-10 h-10 rounded-full bg-billboard-ink text-white flex items-center justify-center text-lg shrink-0">▶</span>
              <span className="text-sm font-semibold">Watch the intro video on {video.platform} →</span>
            </a>
          )}
        </div>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
          {images.map((url) => (
            <button key={url} onClick={() => setLightbox(url)} className="aspect-square border-2 border-billboard-ink rounded overflow-hidden">
              <img src={url} alt="Portfolio" className="w-full h-full object-cover hover:scale-105 transition" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 bg-billboard-ink/80 z-50 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          {/* Deliberately no loading="lazy" here — this only mounts once
              the user clicks a thumbnail specifically to see it full-size,
              so it's the entire point of this render, not off-screen
              content to defer. Lazy-loading something the user just
              explicitly asked to see would add a delay, not save one. */}
          <img src={lightbox} alt="Portfolio" className="max-w-full max-h-full rounded border-[3px] border-billboard-paper" />
        </div>
      )}
    </div>
  );
}
