import { formatText } from '../../localization/texts';

const MINUTE_MS = 60 * 1000;
// A participant who played this recently counts as online.
const ONLINE_MS = 2 * MINUTE_MS;

export type Presence = { online: true } | { online: false; label: string };

// Where the participant is by their last play: online, or how long ago they
// played. Null when they haven't played yet.
export function formatPresence(
  lastPlayTimestamp: string | undefined,
  now: number,
  texts: {
    lastSeenMinutes: string; // {minutes}
    lastSeenHours: string; // {hours} {minutes}
  },
): Presence | null {
  if (!lastPlayTimestamp) return null;

  const agoMs = Math.max(0, now - new Date(lastPlayTimestamp).getTime());
  if (agoMs < ONLINE_MS) return { online: true };

  const totalMinutes = Math.floor(agoMs / MINUTE_MS);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return {
    online: false,
    label: hours > 0
      ? formatText(texts.lastSeenHours, { hours, minutes })
      : formatText(texts.lastSeenMinutes, { minutes }),
  };
}
