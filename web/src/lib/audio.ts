let audio: HTMLAudioElement | null = null;

export function setAudioElement(element: HTMLAudioElement | null) {
  audio = element;
}

export function getAudioElement(): HTMLAudioElement | null {
  return audio;
}

export function currentAudioTime(): number {
  return audio?.currentTime ?? 0;
}
