import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getAudioElement } from "../lib/audio";
import type { Song } from "../lib/types";

export type View = "home" | "search" | "now" | "album" | "playlist" | "artist";
export type RepeatState = "off" | "all" | "one";
export type NowTab = "lyrics" | "queue";

export interface DetailRef {
  type: "album" | "playlist" | "artist";
  id: string;
  title?: string;
}

interface PlayerState {
  queue: Song[];
  index: number;
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  repeat: RepeatState;
  shuffle: boolean;
  view: View;
  detail: DetailRef | null;
  nowTab: NowTab;
  liked: string[];
  toast: { id: number; message: string } | null;

  setView: (view: View) => void;
  setNowTab: (tab: NowTab) => void;
  openDetail: (detail: DetailRef) => void;
  closeDetail: () => void;
  playSong: (song: Song, queue?: Song[]) => void;
  playCollection: (songs: Song[], startIndex?: number, shuffled?: boolean) => void;
  toggle: () => void;
  setPlaying: (playing: boolean) => void;
  next: (auto?: boolean) => void;
  previous: () => void;
  seek: (time: number) => void;
  setTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  cycleRepeat: () => void;
  toggleShuffle: () => void;
  appendQueue: (songs: Song[]) => void;
  patchSong: (id: string, patch: Partial<Song>) => void;
  removeAt: (index: number) => void;
  toggleLike: (id: string) => void;
  setToast: (message: string) => void;
  clearToast: (id: number) => void;
}

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const usePlayer = create<PlayerState>()(
  persist(
    (set, get) => ({
      queue: [],
      index: 0,
      playing: false,
      currentTime: 0,
      duration: 0,
      volume: 0.8,
      muted: false,
      repeat: "off",
      shuffle: false,
      view: "home",
      detail: null,
      nowTab: "lyrics",
      liked: [],
      toast: null,

      setView: (view) => set({ view }),
      setNowTab: (nowTab) => set({ nowTab }),
      openDetail: (detail) =>
        set({ detail, view: detail.type as View, playing: get().playing }),
      closeDetail: () => set({ detail: null, view: "home" }),

      playSong: (song, queue) => {
        const source = queue && queue.length > 0 ? queue : get().queue;
        const nextQueue = [...source];
        let index = nextQueue.findIndex((item) => item.id === song.id);
        if (index < 0) {
          nextQueue.push(song);
          index = nextQueue.length - 1;
        }
        set({ queue: nextQueue, index, playing: true, currentTime: 0 });
      },

      playCollection: (songs, startIndex = 0, shouldShuffle = false) => {
        if (songs.length === 0) return;
        const queue = shouldShuffle ? shuffled(songs) : [...songs];
        const index = shouldShuffle
          ? 0
          : Math.max(0, Math.min(startIndex, queue.length - 1));
        set({ queue, index, playing: true, currentTime: 0 });
      },

      toggle: () => {
        if (get().queue.length === 0) return;
        set({ playing: !get().playing });
      },

      setPlaying: (playing) => set({ playing }),

      next: (auto = false) => {
        const { queue, index, repeat, shuffle, playing } = get();
        if (queue.length === 0) return;
        if (shuffle && queue.length > 1) {
          let target = index;
          while (target === index) target = Math.floor(Math.random() * queue.length);
          set({ index: target, currentTime: 0, playing: auto ? true : playing });
          return;
        }
        if (index >= queue.length - 1) {
          if (repeat === "all" || !auto) {
            set({ index: 0, currentTime: 0, playing: auto ? true : playing });
          } else {
            set({ playing: false, currentTime: 0 });
          }
          return;
        }
        set({ index: index + 1, currentTime: 0, playing: auto ? true : playing });
      },

      previous: () => {
        const { queue, index, currentTime } = get();
        if (queue.length === 0) return;
        if (currentTime > 4) {
          get().seek(0);
          return;
        }
        set({ index: index <= 0 ? queue.length - 1 : index - 1, currentTime: 0 });
      },

      seek: (time) => {
        const audio = getAudioElement();
        const duration = get().duration;
        const clamped = Math.max(0, Math.min(time, duration || time));
        if (audio) audio.currentTime = clamped;
        set({ currentTime: clamped });
      },

      setTime: (time) => set({ currentTime: time }),
      setDuration: (duration) => set({ duration }),

      setVolume: (volume) => {
        const clamped = Math.max(0, Math.min(1, volume));
        set({ volume: clamped, muted: clamped === 0 ? get().muted : false });
      },

      toggleMute: () => set({ muted: !get().muted }),

      cycleRepeat: () => {
        const order: RepeatState[] = ["off", "all", "one"];
        const current = get().repeat;
        set({ repeat: order[(order.indexOf(current) + 1) % order.length] });
      },

      toggleShuffle: () => set({ shuffle: !get().shuffle }),

      appendQueue: (songs) => {
        const { queue } = get();
        const existing = new Set(queue.map((item) => item.id));
        const additions = songs.filter((song) => !existing.has(song.id));
        if (additions.length === 0) return;
        set({ queue: [...queue, ...additions] });
      },

      patchSong: (id, patch) => {
        set({
          queue: get().queue.map((song) =>
            song.id === id ? { ...song, ...patch } : song,
          ),
        });
      },

      removeAt: (removeIndex) => {
        const { queue, index } = get();
        if (removeIndex < 0 || removeIndex >= queue.length) return;
        const nextQueue = queue.filter((_, i) => i !== removeIndex);
        if (nextQueue.length === 0) {
          set({ queue: [], index: 0, playing: false, currentTime: 0, duration: 0 });
          return;
        }
        let nextIndex = index;
        if (removeIndex < index) nextIndex = index - 1;
        if (nextIndex >= nextQueue.length) nextIndex = nextQueue.length - 1;
        set({ queue: nextQueue, index: nextIndex, currentTime: 0 });
      },

      toggleLike: (id) => {
        const liked = get().liked;
        set({
          liked: liked.includes(id) ? liked.filter((item) => item !== id) : [...liked, id],
        });
      },

      setToast: (message) => set({ toast: { id: Date.now(), message } }),
      clearToast: (id) => {
        if (get().toast?.id === id) set({ toast: null });
      },
    }),
    {
      name: "nhacnheo-player",
      partialize: (state) => ({
        queue: state.queue,
        index: state.index,
        volume: state.volume,
        repeat: state.repeat,
        shuffle: state.shuffle,
        liked: state.liked,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && state.index >= state.queue.length) state.index = 0;
      },
    },
  ),
);

export function useCurrentSong(): Song | null {
  return usePlayer((state) => state.queue[state.index] ?? null);
}
