import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import {
  Board,
  BoardComplexityEnum,
  BoardStateEnum,
  Cell,
  validateBoard,
} from '@froggo/common.models';

import { useApi } from '../../../../api/api-context';
import { BoardEditor } from '../board-editor/board-editor';
import styles from './board-edit.module.css';

const STATE_OPTIONS = Object.values(BoardStateEnum);
const COMPLEXITY_OPTIONS = Object.values(BoardComplexityEnum);

export function BoardEdit() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { boards: boardApi } = useApi();

  const id = searchParams.get('id');

  const [board, setBoard] = useState<Board | null>();
  const [cells, setCells] = useState<Cell[]>([]);
  const [state, setState] = useState<BoardStateEnum>(BoardStateEnum.draft);
  const [complexity, setComplexity] = useState<BoardComplexityEnum>(
    BoardComplexityEnum.easy,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setBoard(null);
      return;
    }
    boardApi
      .getById(id)
      .then((found) => {
        setBoard(found);
        setCells(found.cells);
        setState(found.state);
        setComplexity(found.complexity);
      })
      .catch(() => setBoard(null));
  }, [boardApi, id]);

  if (board === undefined) {
    return <p>Loading...</p>;
  }

  if (board === null) {
    return <p>Board not found.</p>;
  }

  const handleSave = async () => {
    const updated: Board = { ...board, cells, state, complexity };
    const validation = validateBoard(updated);
    if (!validation.valid) {
      setError(validation.errors.join('; '));
      return;
    }
    try {
      await boardApi.update(updated);
      navigate('/boards');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save board');
    }
  };

  return (
    <div>
      <h1>
        Edit board ({board.size}x{board.size})
      </h1>
      {error && <p className={styles['error']}>{error}</p>}
      <dl className={styles['meta']}>
        <dt>ID</dt>
        <dd>{board.id}</dd>
        <dt>Created At</dt>
        <dd>{board.createdAt}</dd>
        <dt>Avg Score</dt>
        <dd>{board.stats.avgScore.toFixed(2)}</dd>
        <dt>Avg Stars</dt>
        <dd>{board.stats.avgStars.toFixed(2)}</dd>
        <dt>Avg Time</dt>
        <dd>{board.stats.avgTime.toFixed(2)}</dd>
        <dt>Plays Total</dt>
        <dd>{board.stats.playsTotal}</dd>
      </dl>
      <label className={styles['field']}>
        State
        <select
          value={state}
          onChange={(event) => setState(event.target.value as BoardStateEnum)}
        >
          {STATE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <label className={styles['field']}>
        Complexity
        <select
          value={complexity}
          onChange={(event) =>
            setComplexity(event.target.value as BoardComplexityEnum)
          }
        >
          {COMPLEXITY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <BoardEditor size={board.size} cells={cells} onChange={setCells} />
      <button type="button" onClick={handleSave}>
        Save
      </button>
    </div>
  );
}

export default BoardEdit;
