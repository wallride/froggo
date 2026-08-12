import { BaseBoard } from './BaseBoard';

export interface BoardValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateBoard(board: BaseBoard): BoardValidationResult {
  const errors: string[] = [];
  const targets: { row: number; col: number; kind: number }[] = [];

  board.cells.forEach((cell, index) => {
    if (cell.hasTarget) {
      targets.push({ row: Math.floor(index / board.size), col: index % board.size, kind: cell.kind });
    }
  });

  if (targets.length !== board.size) {
    errors.push(`expected ${board.size} targets, found ${targets.length}`);
  }

  const rows = new Set(targets.map((target) => target.row));
  if (rows.size !== targets.length) {
    errors.push('multiple targets share the same row');
  }

  const cols = new Set(targets.map((target) => target.col));
  if (cols.size !== targets.length) {
    errors.push('multiple targets share the same column');
  }

  const kinds = new Set(targets.map((target) => target.kind));
  if (kinds.size !== targets.length) {
    errors.push('multiple targets share the same kind region');
  }

  for (let i = 0; i < targets.length; i++) {
    for (let j = i + 1; j < targets.length; j++) {
      const a = targets[i];
      const b = targets[j];
      if (Math.abs(a.row - b.row) <= 1 && Math.abs(a.col - b.col) <= 1) {
        errors.push(`targets at (${a.row},${a.col}) and (${b.row},${b.col}) are neighbours`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
