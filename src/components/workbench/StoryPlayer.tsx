import { useEffect, useState, useCallback } from "react";
import { Play, RotateCcw, ChevronRight } from "lucide-react";
import { getLinearNextSceneId, type StoryDecisionMap } from "@/lib/player";
import { getMediaBlob } from "@/lib/idb";
import type { StoryDocument, StoryMedia } from "@/types";

export function StoryPlayer({
  story,
  shareMode,
  onSceneChange,
  seekSceneId,
}: {
  story: StoryDocument;
  shareMode?: boolean;
  onSceneChange?: (sceneId: string, phase: "cover" | "playing" | "ended") => void;
  seekSceneId?: string | null;
}) {
  const [phase, setPhase] = useState<"cover" | "playing" | "ended">("cover");
  const [currentSceneId, setCurrentSceneId] = useState(story.startSceneId);
  const [decisions, setDecisions] = useState<StoryDecisionMap>({});
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    onSceneChange?.(currentSceneId, phase);
  }, [currentSceneId, phase, onSceneChange]);

  useEffect(() => {
    if (seekSceneId) {
      setPhase("playing");
      setCurrentSceneId(seekSceneId);
    }
  }, [seekSceneId]);

  useEffect(() => {
    setPhase("cover");
    setCurrentSceneId(story.startSceneId);
    setDecisions({});
    setVisible(true);
  }, [story.id, story.updatedAt]);

  const currentScene = story.scenes.find((s) => s.id === currentSceneId);

  const transition = useCallback((next: () => void) => {
    setVisible(false);
    setTimeout(() => {
      next();
      setVisible(true);
    }, 350);
  }, []);

  function startPlaying() {
    transition(() => setPhase("playing"));
  }

  function choose(sceneId: string, choiceId: string) {
    const scene = story.scenes.find((s) => s.id === sceneId);
    const choice = scene?.choices.find((c) => c.id === choiceId);
    if (!choice) return;
    setDecisions((d) => ({ ...d, [sceneId]: choiceId }));
    transition(() => setCurrentSceneId(choice.nextSceneId));
  }

  function goNext() {
    if (!currentScene) return;
    const nextId = getLinearNextSceneId(story, currentScene.id);
    if (nextId) transition(() => setCurrentSceneId(nextId));
    else transition(() => setPhase("ended"));
  }

  function restart() {
    transition(() => {
      setPhase("cover");
      setCurrentSceneId(story.startSceneId);
      setDecisions({});
    });
  }

  // ── Cover ──────────────────────────────────────────
  if (phase === "cover") {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-b from-neutral-900 to-black overflow-hidden">
        {story.cover?.type === "image" && (
          <>
            <img
              src={story.cover.src}
              alt=""
              className="absolute inset-0 w-full h-full object-cover blur-md scale-110 opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70" />
          </>
        )}
        <div
          className={`relative z-10 text-center px-8 py-12 max-w-md transition-all duration-300 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          }`}
        >
          {story.cover?.type === "image" && (
            <img
              src={story.cover.src}
              alt=""
              className="w-28 h-28 rounded-full object-cover mx-auto mb-6 ring-4 ring-white/10 shadow-lg"
            />
          )}
          <h1 className="font-serif text-[clamp(26px,7vw,36px)] font-semibold text-white leading-tight mb-2">
            {story.title}
          </h1>
          <p className="text-white/60 text-sm mb-1">{story.petName}</p>
          {story.summary && (
            <p className="text-white/40 text-xs leading-relaxed mb-8">{story.summary}</p>
          )}
          <button
            onClick={startPlaying}
            className="inline-flex items-center gap-2.5 px-7 py-3 rounded-full bg-white text-neutral-900 font-medium text-sm hover:bg-white/90 active:scale-95 transition-all"
          >
            <Play className="w-4 h-4" /> 开始观看
          </button>
        </div>
      </div>
    );
  }

  // ── Ended ──────────────────────────────────────────
  if (phase === "ended") {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-b from-neutral-900 to-black">
        <div
          className={`text-center px-8 py-12 max-w-sm transition-all duration-300 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          }`}
        >
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-5">
            <span className="text-2xl">🐾</span>
          </div>
          <h2 className="font-serif text-2xl text-white font-semibold mb-2">故事看完了</h2>
          <p className="text-white/50 text-sm mb-8">
            和 {story.petName} 的故事，永远温柔回看。
          </p>
          <button
            onClick={restart}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/15 border border-white/20 text-white text-sm hover:bg-white/25 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> 重新开始
          </button>
        </div>
      </div>
    );
  }

  // ── Playing ────────────────────────────────────────
  return (
    <div className="relative w-full h-full bg-black flex flex-col overflow-hidden">
      {/* Media area */}
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <SceneMedia media={currentScene?.media} />
      </div>

      {/* Bottom overlay with text & actions */}
      <div
        className={`absolute bottom-0 inset-x-0 transition-all duration-300 ease-out ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
        }`}
      >
        <div className="bg-gradient-to-t from-black/80 via-black/50 to-transparent pt-16 pb-8 px-6">
          <div className="max-w-md mx-auto">
            {currentScene?.background && (
              <span className="inline-block text-[10px] text-white/40 uppercase tracking-wider mb-1.5">
                {currentScene.background}
              </span>
            )}
            <h2 className="font-serif text-lg text-white font-semibold leading-snug mb-1">
              {currentScene?.title}
            </h2>
            {currentScene?.text && (
              <p className="text-white/60 text-sm leading-relaxed mb-5 whitespace-pre-wrap line-clamp-3">
                {currentScene.text}
              </p>
            )}

            {currentScene && currentScene.choices.length > 0 ? (
              <div className="grid gap-2">
                {currentScene.choices.map((choice) => (
                  <button
                    key={choice.id}
                    onClick={() => choose(currentScene.id, choice.id)}
                    className="text-left px-4 py-3 rounded-xl bg-white/12 border border-white/15 text-white hover:bg-white/20 active:scale-[0.98] transition-all backdrop-blur-sm"
                  >
                    <strong className="block text-sm font-medium">{choice.label}</strong>
                    {choice.coverText && (
                      <span className="block text-xs text-white/40 mt-0.5">{choice.coverText}</span>
                    )}
                  </button>
                ))}
              </div>
            ) : currentScene?.ending ? (
              <button
                onClick={() => transition(() => setPhase("ended"))}
                className="px-6 py-2.5 rounded-full bg-white text-neutral-900 text-sm font-medium hover:bg-white/90 active:scale-95 transition-all"
              >
                看完了
              </button>
            ) : (
              <button
                onClick={goNext}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-white/12 border border-white/15 text-white text-sm hover:bg-white/20 transition-colors backdrop-blur-sm"
              >
                继续 <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Resolve and display scene media (handles IndexedDB blobs for uploaded videos). */
function SceneMedia({ media }: { media?: StoryMedia }) {
  const [src, setSrc] = useState("");
  const [objectUrl, setObjectUrl] = useState("");

  useEffect(() => {
    let active = true;
    if (!media) {
      setSrc("");
      return;
    }
    if (media.type === "image") {
      setSrc(media.src);
      return;
    }
    const source = media.source ?? (media.mediaId ? "upload" : "url");
    if (source === "upload" && media.mediaId) {
      void getMediaBlob(media.mediaId).then((blob) => {
        if (!active || !blob) return;
        const url = URL.createObjectURL(blob);
        setObjectUrl(url);
        setSrc(url);
      });
    } else {
      setSrc(media.src);
    }
    return () => {
      active = false;
    };
  }, [media]);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  if (!media || !src) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center">
        <span className="text-white/20 text-sm">这一段还没有放媒体</span>
      </div>
    );
  }

  if (media.type === "image") {
    return <img src={src} alt="" className="w-full h-full object-cover" />;
  }

  return <video src={src} controls playsInline className="w-full h-full object-contain bg-black" />;
}
