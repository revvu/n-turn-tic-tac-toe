const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const PREFERRED_MOVE_ORDER = [4, 0, 2, 6, 8, 1, 3, 5, 7];

function chunkToMark(chunkIndex) {
  return chunkIndex % 2 === 0 ? 1 : 2;
}

export function markForTurn(turn, n) {
  return chunkToMark(Math.floor(turn / n));
}

export function playerForTurn(turn) {
  return turn % 2;
}

export function cloneBoard(board) {
  return board.slice();
}

export function checkWin(board, mark) {
  for (const line of WIN_LINES) {
    if (board[line[0]] === mark && board[line[1]] === mark && board[line[2]] === mark) {
      return true;
    }
  }
  return false;
}

export function legalMoves(board) {
  const moves = [];
  for (let i = 0; i < board.length; i += 1) {
    if (board[i] === 0) {
      moves.push(i);
    }
  }
  return moves;
}

function boardKey(board, turn) {
  return `${board.join("")}:${turn}`;
}

function terminalStateScore(board, turn, n) {
  if (turn === 0) {
    return null;
  }

  const previousTurn = turn - 1;
  const markPlaced = markForTurn(previousTurn, n);

  if (checkWin(board, markPlaced)) {
    // The previous player just won, so from the perspective of the current player this is a loss.
    return -1;
  }

  if (turn >= 9) {
    return 0;
  }

  return null;
}

function preferredSort(a, b) {
  return PREFERRED_MOVE_ORDER.indexOf(a) - PREFERRED_MOVE_ORDER.indexOf(b);
}

function isBetterDistance(score, distance, bestDistance) {
  if (bestDistance === null) {
    return true;
  }

  if (score > 0) {
    // In winning lines, prefer the shortest forced win.
    return distance < bestDistance;
  }

  if (score < 0) {
    // In losing lines, prefer the longest resistance.
    return distance > bestDistance;
  }

  return false;
}

function solveState(board, turn, n, memo, stats) {
  const key = boardKey(board, turn);
  const existing = memo.get(key);
  if (existing) {
    return existing;
  }

  stats.nodes += 1;

  const terminal = terminalStateScore(board, turn, n);
  if (terminal !== null) {
    const result = { score: terminal, distance: 0, bestMoves: [] };
    memo.set(key, result);
    return result;
  }

  let bestScore = -Infinity;
  let bestDistance = null;
  let bestMoves = [];
  const mark = markForTurn(turn, n);

  for (let idx = 0; idx < 9; idx += 1) {
    if (board[idx] !== 0) {
      continue;
    }

    board[idx] = mark;
    const child = solveState(board, turn + 1, n, memo, stats);
    const score = -child.score;
    const distance = child.distance + 1;
    board[idx] = 0;

    if (score > bestScore) {
      bestScore = score;
      bestDistance = distance;
      bestMoves = [idx];
    } else if (score === bestScore) {
      if (isBetterDistance(score, distance, bestDistance)) {
        bestDistance = distance;
        bestMoves = [idx];
      } else if (distance === bestDistance) {
        bestMoves.push(idx);
      }
    }
  }

  bestMoves.sort(preferredSort);

  const result = {
    score: bestScore,
    distance: bestDistance,
    bestMoves,
  };
  memo.set(key, result);
  return result;
}

const memoByN = new Map();
const statsByN = new Map();

function getMemo(n) {
  if (!memoByN.has(n)) {
    memoByN.set(n, new Map());
    statsByN.set(n, { nodes: 0 });
    solveState(Array(9).fill(0), 0, n, memoByN.get(n), statsByN.get(n));
  }
  return memoByN.get(n);
}

export function solvePosition(board, turn, n) {
  const memo = getMemo(n);
  const key = boardKey(board, turn);
  if (!memo.has(key)) {
    // Build this position lazily if not reachable from empty due to invalid game history.
    const stats = statsByN.get(n);
    solveState(cloneBoard(board), turn, n, memo, stats);
  }
  return memo.get(key);
}

export function bestMove(board, turn, n) {
  const solution = solvePosition(board, turn, n);
  return solution.bestMoves[0] ?? null;
}

export function scoreFromPlayerPerspective(board, turn, n, player) {
  const { score } = solvePosition(board, turn, n);
  const currentPlayer = playerForTurn(turn);
  return currentPlayer === player ? score : -score;
}

export function strategySummary(n) {
  const emptyBoard = Array(9).fill(0);
  const root = solvePosition(emptyBoard, 0, n);
  const stats = statsByN.get(n);
  return {
    n,
    rootScore: root.score,
    bestOpeningMoves: root.bestMoves,
    exploredNodes: stats.nodes,
    cachedStates: memoByN.get(n).size,
  };
}

export function allStrategySummaries() {
  const summaries = [];
  for (let n = 1; n <= 5; n += 1) {
    summaries.push(strategySummary(n));
  }
  return summaries;
}

export function moveToLabel(moveIndex) {
  const row = Math.floor(moveIndex / 3) + 1;
  const col = (moveIndex % 3) + 1;
  return `r${row}c${col}`;
}

export function markToGlyph(mark) {
  if (mark === 1) {
    return "X";
  }
  if (mark === 2) {
    return "O";
  }
  return "";
}
