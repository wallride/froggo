import { IBoardAPI } from '@froggo/common.api.admin';

import { BoardAPI } from './board-api';

export interface ApiContainer {
  boards: IBoardAPI;
}

export const apiContainer: ApiContainer = {
  boards: new BoardAPI(),
};
