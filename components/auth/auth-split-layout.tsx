"use client";

import { useCallback, useRef, type ReactNode } from "react";

const VIDEO_SRC = "/media/login-loop.mp4";
/** Velocidade do loop (1 = normal; menor = mais lento). */
const VIDEO_PLAYBACK_RATE = 0.72;

type Props = {
  children: ReactNode;
};

export function AuthSplitLayout({ children }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const tryPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = VIDEO_PLAYBACK_RATE;
    video.muted = true;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      video.pause();
      return;
    }

    void video.play().catch(() => {
      // Autoplay pode falhar na 1ª tentativa; onCanPlay tenta de novo.
    });
  }, []);

  return (
    <div className="relative min-h-dvh overflow-hidden lg:grid lg:grid-cols-2">
      {/* Formulário — sobre o vídeo no mobile; coluna esquerda sólida no desktop */}
      <div className="relative z-10 flex min-h-dvh items-center justify-center overflow-y-auto p-6 sm:p-8 lg:col-start-1 lg:bg-canvas lg:p-10">
        <div
          className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(61,122,117,0.12),transparent)] lg:block"
          aria-hidden
        />
        <div className="relative w-full max-w-md">{children}</div>
      </div>

      {/* Vídeo — tela cheia atrás no mobile; 50% direita no desktop */}
      <div
        className="fixed inset-0 -z-10 overflow-hidden bg-[#1a2422] lg:relative lg:z-0 lg:col-start-2 lg:min-h-dvh"
        aria-hidden
      >
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover object-center"
          src={VIDEO_SRC}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onLoadedData={tryPlay}
          onCanPlay={tryPlay}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/45 to-black/35" />
        <div className="pointer-events-none absolute inset-0 bg-black/30" />
      </div>
    </div>
  );
}
