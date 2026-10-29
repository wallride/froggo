import type { ImageSourcePropType } from 'react-native';

// Metro requires static, literal require() calls per asset — the file names
// can't be built dynamically from `kind`/`variant` numbers.
// Kind groups past MAX_BOARD_SIZE (12) are commented out, to pick which ones to
// keep or drop. A board needs a distinct group per kind it uses, so at least
// MAX_BOARD_SIZE groups must stay in.
const cellTextures: Record<number, ImageSourcePropType[]> = {
  1: [
    require('../../assets/images/cell/textures/1_1.png'),
    require('../../assets/images/cell/textures/1_2.png'),
    require('../../assets/images/cell/textures/1_3.png'),
    require('../../assets/images/cell/textures/1_4.png'),
  ],
  2: [
    require('../../assets/images/cell/textures/2_1.png'),
    require('../../assets/images/cell/textures/2_2.png'),
    require('../../assets/images/cell/textures/2_3.png'),
    require('../../assets/images/cell/textures/2_4.png'),
  ],
  3: [
    require('../../assets/images/cell/textures/3_1.png'),
    require('../../assets/images/cell/textures/3_2.png'),
    require('../../assets/images/cell/textures/3_3.png'),
    require('../../assets/images/cell/textures/3_4.png'),
  ],
  4: [
    require('../../assets/images/cell/textures/4_1.png'),
    require('../../assets/images/cell/textures/4_2.png'),
    require('../../assets/images/cell/textures/4_3.png'),
    require('../../assets/images/cell/textures/4_4.png'),
  ],
  5: [
    require('../../assets/images/cell/textures/5_1.png'),
    require('../../assets/images/cell/textures/5_2.png'),
    require('../../assets/images/cell/textures/5_3.png'),
    require('../../assets/images/cell/textures/5_4.png'),
  ],
  6: [
    require('../../assets/images/cell/textures/6_1.png'),
    require('../../assets/images/cell/textures/6_2.png'),
    require('../../assets/images/cell/textures/6_3.png'),
    require('../../assets/images/cell/textures/6_4.png'),
  ],
  7: [
    require('../../assets/images/cell/textures/7_1.png'),
    require('../../assets/images/cell/textures/7_2.png'),
    require('../../assets/images/cell/textures/7_3.png'),
    require('../../assets/images/cell/textures/7_4.png'),
  ],
  8: [
    require('../../assets/images/cell/textures/8_1.png'),
    require('../../assets/images/cell/textures/8_2.png'),
    require('../../assets/images/cell/textures/8_3.png'),
    require('../../assets/images/cell/textures/8_4.png'),
  ],
  9: [
    require('../../assets/images/cell/textures/9_1.png'),
    require('../../assets/images/cell/textures/9_2.png'),
    require('../../assets/images/cell/textures/9_3.png'),
    require('../../assets/images/cell/textures/9_4.png'),
  ],
  10: [
    require('../../assets/images/cell/textures/10_1.png'),
    require('../../assets/images/cell/textures/10_2.png'),
    require('../../assets/images/cell/textures/10_3.png'),
    require('../../assets/images/cell/textures/10_4.png'),
  ],
  11: [
    require('../../assets/images/cell/textures/11_1.png'),
    require('../../assets/images/cell/textures/11_2.png'),
    require('../../assets/images/cell/textures/11_3.png'),
    require('../../assets/images/cell/textures/11_4.png'),
  ],
  12: [
    require('../../assets/images/cell/textures/12_1.png'),
    require('../../assets/images/cell/textures/12_2.png'),
    require('../../assets/images/cell/textures/12_3.png'),
    require('../../assets/images/cell/textures/12_4.png'),
  ],
};

// Picks one of the (currently 4) texture variants for a cell kind at random.
// Undefined for a kind with no textures (e.g. kind 0).
export function randomCellTexture(kind: number): ImageSourcePropType | undefined {
  const variants = cellTextures[kind];
  if (!variants || variants.length === 0) return undefined;
  return variants[Math.floor(Math.random() * variants.length)];
}

const TEXTURE_KINDS = Object.keys(cellTextures).map(Number);

// A texture for each of a board's cells — every kind on it gets its own
// image set, and each cell one of the set's variants, all picked at random.
// Pick once per board (useMemo), so they don't change on every render.
export function pickCellTextures(cells: { kind: number }[]): (ImageSourcePropType | undefined)[] {
  const kindTextureMap = randomizeKindTextures(cells.map((cell) => cell.kind));
  return cells.map((cell) => randomCellTexture(kindTextureMap.get(cell.kind) ?? cell.kind));
}

// Every texture image, to load ahead of the first board.
export const allCellTextures: ImageSourcePropType[] = Object.values(cellTextures).flat();

// Builds a random bijection from a board's actual (non-zero) cell kinds to
// texture kind groups, so a kind isn't tied to the same image set across
// plays while every kind on the board still gets its own distinct set.
export function randomizeKindTextures(kinds: number[]): Map<number, number> {
  const uniqueKinds = [...new Set(kinds.filter((kind) => kind > 0))];

  const shuffledTextureKinds = [...TEXTURE_KINDS];
  for (let i = shuffledTextureKinds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledTextureKinds[i], shuffledTextureKinds[j]] = [
      shuffledTextureKinds[j],
      shuffledTextureKinds[i],
    ];
  }

  return new Map(uniqueKinds.map((kind, i) => [kind, shuffledTextureKinds[i]]));
}
