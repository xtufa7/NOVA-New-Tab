import { inExtension } from '../storage/settings';
export interface MusicStatus {
  playing: boolean;
  ducked: boolean;
  trackId: string;
  title: string;
  artist: string;
  coverId: string;
  current: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: string;
  bins: number[];
}
export const idle: MusicStatus = {
  playing: false,
  ducked: false,
  trackId: '',
  title: 'Nothing playing',
  artist: 'Local files. Your soundtrack.',
  coverId: '',
  current: 0,
  duration: 0,
  volume: 40,
  muted: false,
  shuffle: false,
  repeat: 'all',
  bins: [],
};
export async function musicCommand(action: string, value?: number): Promise<MusicStatus> {
  if (
    ![
      'play',
      'pause',
      'next',
      'prev',
      'shuffle',
      'repeat',
      'volume',
      'mute',
      'seek',
      'stop',
      'status',
      'sync',
    ].includes(action)
  )
    throw new Error('Unknown music action.');
  if (
    (action === 'volume' && (!Number.isFinite(value) || value! < 0 || value! > 100)) ||
    (action === 'seek' && (!Number.isFinite(value) || value! < 0))
  )
    throw new Error('Invalid audio value.');
  if (!inExtension) {
    if (action === 'status') return idle;
    throw new Error('Music playback needs the installed extension.');
  }
  const result = await chrome.runtime.sendMessage({
    target: 'worker',
    type: 'music',
    action,
    value,
  });
  if (result?.error) throw new Error(result.error);
  return result ?? idle;
}
