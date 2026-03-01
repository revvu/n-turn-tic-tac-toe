# N-Turn Tic-Tac-Toe (3x3) with Perfect Play Engine

This project explores a Tic-Tac-Toe variant where the symbol on each move is determined by a parameter `n`:

- Turn chunk `0..n-1`: moves place `X`
- Turn chunk `n..2n-1`: moves place `O`
- Then repeat every `n` turns

Both players still alternate who moves. A player wins by completing three-in-a-row on the move they make.

## Minimax Tree Search

The solver uses full-depth minimax with memoization (transposition table) over game states:

- State: `board[9] + turn`
- Player to move: `turn % 2`
- Symbol to place: `mark = floor(turn / n) % 2 ? O : X`
- Terminal utility (for side to move):
  - `-1` if previous move just won
  - `0` on full-board draw
- Recurrence:
  - For each legal move: apply mark, recurse to next turn
  - Child score is from opponent perspective, so parent score is `-childScore`
  - Choose move(s) with maximal score
  - Tie-break by game length:
    - If score is winning (`+1`), prefer the shortest forced win
    - If score is losing (`-1`), prefer the longest forced loss
    - If score is draw (`0`), use static move preference (center, corners, edges)

This computes exact optimal play (no heuristic cutoffs).

## Root Results for n = 1..5

Scores below are from **Player 1 perspective** at the empty board.

| n | Root minimax result | Optimal opening moves | Cached states |
|---|---|---|---:|
| 1 | Draw | all 9 squares (center preferred tie-break) | 5,478 |
| 2 | Draw | all 9 squares (center preferred tie-break) | 4,822 |
| 3 | Win for Player 1 | center only | 4,902 |
| 4 | Win for Player 1 | center only | 2,674 |
| 5 | Win for Player 1 | center only | 802 |

## Web App

Features:

- Play against the perfect minimax engine
- Choose `n` from 1 to 5
- Choose whether you move first or second
- Live evaluation bar from engine perspective
- In-app strategy summary table for root states (`n=1..5`)

## Run

```bash
npm run serve
```

Then open `http://localhost:8000`.

Optional CLI strategy check:

```bash
npm run analyze
```
