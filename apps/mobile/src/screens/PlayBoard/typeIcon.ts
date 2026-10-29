import { Ionicons } from '@expo/vector-icons';

import { PlayTypeEnum } from '@dead-lines-inc/common.models';

// Mirrors ModeCard's per-type icon so the result reads consistently with
// the mode cards on the home screen — used by both PlayResultChip (live)
// and PlayResultOverlay (final).
export const TYPE_ICON: Record<PlayTypeEnum, keyof typeof Ionicons.glyphMap> = {
  [PlayTypeEnum.score]: 'sparkles-outline',
  [PlayTypeEnum.time]: 'timer-outline',
  [PlayTypeEnum.accuracy]: 'locate-outline',
  [PlayTypeEnum.freePlay]: 'cafe-outline',
};
