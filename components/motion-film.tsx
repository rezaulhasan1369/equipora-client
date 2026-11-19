"use client";
import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Pause, Play } from "lucide-react";
const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribe = (callback: () => void) => {
  const media = window.matchMedia(reducedQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};
const snapshot = () => window.matchMedia(reducedQuery).matches;
export function MotionFilm({
  name,
  title,
  hero = false,
}: {
  name: string;
  title: string;
  hero?: boolean;
}) {
  const reduced = useSyncExternalStore(subscribe, snapshot, () => true),
    container = useRef<HTMLDivElement>(null),
    video = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false),
    [armed, setArmed] = useState(false),
    [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false),
    [paused, setPaused] = useState(false);
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const active = entries[0].isIntersecting;
        setVisible(active);
        if (active) setArmed(true);
      },
      { threshold: 0.12 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const node = video.current;
    if (!node) return;
    const sync = () => {
      if (visible && !reduced && !paused && !document.hidden && !failed)
        void node.play().catch(() => {});
      else node.pause();
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      node.pause();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [visible, reduced, paused, failed, armed]);
  const poster = "/assets/motion/" + name + "-poster.webp";
  return (
    <div
      ref={container}
      className={"motion-film " + (hero ? "hero-film" : "")}
      data-film={name}
      data-reduced-motion={reduced}
    >
      <Image
        src={poster}
        alt={title}
        fill
        sizes={
          hero
            ? "(max-width: 800px) 100vw, 52vw"
            : "(max-width: 800px) 90vw, 38vw"
        }
        priority={hero}
        className="film-poster"
      />
      {!reduced && !failed && (
        <video
          ref={video}
          muted
          playsInline
          loop
          preload="none"
          poster={poster}
          aria-hidden="true"
          className={ready ? "film-video is-ready" : "film-video"}
          onLoadedData={() => setReady(true)}
          onError={() => setFailed(true)}
        >
          {armed && (
            <source
              src={"/assets/motion/" + name + ".webm"}
              type="video/webm"
              onError={() => setFailed(true)}
            />
          )}
        </video>
      )}
      {!reduced && !failed && (
        <button
          type="button"
          className="film-toggle"
          aria-label={
            (paused ? "Play animation: " : "Pause animation: ") + title
          }
          aria-pressed={paused}
          onClick={() => setPaused((v) => !v)}
        >
          {paused ? <Play size={15} /> : <Pause size={15} />}
          <span>{paused ? "Play" : "Pause"}</span>
        </button>
      )}
      <span className="film-caption">
        3D EQUIPMENT STUDY <span aria-hidden="true">/</span>{" "}
        {reduced ? "STILL FRAME" : "MOTION + CRAFT"}
      </span>
    </div>
  );
}
