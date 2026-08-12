import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { BaseBoard, Cell, validateBoard } from '@froggo/common.models';

import { useApi } from '../../../../api/api-context';
import { BoardEditor } from '../board-editor/board-editor';
import styles from './board-add.module.css';

export function BoardAdd() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { boards: boardApi } = useApi();

  const size = Number(searchParams.get('size'));
  const isValidSize = Number.isInteger(size) && size > 0;

  const [cells, setCells] = useState<Cell[]>(() =>
    Array.from({ length: isValidSize ? size * size : 0 }, () => ({
      kind: 0,
      hasTarget: false,
    })),
  );
  const [error, setError] = useState<string | null>(null);

  if (!isValidSize) {
    return <p>Invalid board size.</p>;
  }

  const handleSave = async () => {
    const board: BaseBoard = { size, cells };
    const validation = validateBoard(board);
    if (!validation.valid) {
      setError(validation.errors.join('; '));
      return;
    }
    try {
      await boardApi.add(board);
      navigate('/boards');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save board');
    }
  };

  return (
    <div>
      <h1>
        Add board ({size}x{size})
      </h1>
      {error && <p className={styles['error']}>{error}</p>}
      <BoardEditor size={size} cells={cells} onChange={setCells} />
      <button type="button" onClick={handleSave}>
        Save
      </button>
    </div>
  );
}

export default BoardAdd;
