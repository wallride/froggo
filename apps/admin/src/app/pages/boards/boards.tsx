import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Board, BoardStateEnum } from '@froggo/common.models';

import { useApi } from '../../../api/api-context';
import styles from './boards.module.css';

const MIN_SIZE = 5;
const MAX_SIZE = 15;
const SIZES = Array.from(
  { length: MAX_SIZE - MIN_SIZE + 1 },
  (_, i) => MIN_SIZE + i,
);

const STATE_GROUP_ORDER = [
  BoardStateEnum.draft,
  BoardStateEnum.testing,
  BoardStateEnum.public,
];

export function Boards() {
  const { boards: boardApi } = useApi();
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedSize, setSelectedSize] = useState<number>(MIN_SIZE);

  useEffect(() => {
    boardApi.getAll().then(setBoards);
  }, [boardApi]);

  const countsBySize = useMemo(() => {
    const counts = new Map<number, number>();
    for (const board of boards) {
      counts.set(board.size, (counts.get(board.size) ?? 0) + 1);
    }
    return counts;
  }, [boards]);

  const groupedBoards = useMemo(() => {
    const filtered = boards.filter((board) => board.size === selectedSize);
    return STATE_GROUP_ORDER.map((state) => ({
      state,
      boards: filtered.filter((board) => board.state === state),
    })).filter((group) => group.boards.length > 0);
  }, [boards, selectedSize]);

  return (
    <div>
      <h1>Boards</h1>
      <div className={styles['tabs']}>
        {SIZES.map((size) => (
          <button
            key={size}
            type="button"
            className={
              size === selectedSize ? styles['tabActive'] : styles['tab']
            }
            onClick={() => setSelectedSize(size)}
          >
            {size}x{size} ({countsBySize.get(size) ?? 0})
          </button>
        ))}
      </div>
      <table className={styles['table']}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Complexity</th>
            <th>Plays Total</th>
            <th>Avg Score</th>
            <th>Avg Stars</th>
            <th>Avg Time</th>
          </tr>
        </thead>
        <tbody>
          {groupedBoards.map(({ state, boards: group }) => (
            <Fragment key={state}>
              <tr>
                <th className={styles['groupHeader']} colSpan={6}>
                  {state}
                </th>
              </tr>
              {group.map((board) => (
                <tr key={board.id}>
                  <td>
                    <Link to={`/boards/edit?id=${board.id}`}>{board.id}</Link>
                  </td>
                  <td>{board.complexity}</td>
                  <td>{board.stats.playsTotal}</td>
                  <td>{board.stats.avgScore.toFixed(2)}</td>
                  <td>{board.stats.avgStars.toFixed(2)}</td>
                  <td>{board.stats.avgTime.toFixed(2)}</td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Boards;
