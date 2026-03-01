import {
  allStrategySummaries,
  bestMove,
  checkWin,
  markForTurn,
  markToGlyph,
  moveToLabel,
  playerForTurn,
  scoreFromPlayerPerspective,
  solvePosition,
} from "./solver.js";

const boardEl = document.querySelector("#board");
const statusEl = document.querySelector("#status");
const evalFillEl = document.querySelector("#eval-fill");
const evalTextEl = document.querySelector("#eval-text");
const pvListEl = document.querySelector("#pv-list");
const nSelectEl = document.querySelector("#n-select");
const sideSelectEl = document.querySelector("#side-select");
const restartBtn = document.querySelector("#restart-btn");
const analysisBodyEl = document.querySelector("#analysis-body");
const analysisSummaryEl = document.querySelector("#analysis-summary");

const state = {
  board: Array(9).fill(0),
  turn: 0,
  n: 1,
  humanPlayer: 0,
  winner: null,
  draw: false,
  thinking: false,
};

function currentPlayer() {
  return playerForTurn(state.turn);
}

function currentMark() {
  return markForTurn(state.turn, state.n);
}

function enginePlayer() {
  return 1 - state.humanPlayer;
}

function playerLabel(player) {
  return player === 0 ? "Player 1" : "Player 2";
}

function resultLabel(score) {
  if (score > 0) {
    return "Win";
  }
  if (score < 0) {
    return "Loss";
  }
  return "Draw";
}

function renderAnalysis() {
  const summaries = allStrategySummaries();
  analysisBodyEl.innerHTML = "";

  for (const summary of summaries) {
    const row = document.createElement("tr");

    const opening = summary.bestOpeningMoves.map(moveToLabel).join(", ");

    row.innerHTML = `
      <td>${summary.n}</td>
      <td>${resultLabel(summary.rootScore)}</td>
      <td>${opening}</td>
      <td>${summary.cachedStates.toLocaleString()}</td>
    `;

    analysisBodyEl.appendChild(row);
  }

  const roots = summaries.map((s) => `n=${s.n}: ${resultLabel(s.rootScore)}`);
  analysisSummaryEl.textContent = `Root minimax results (from Player 1 perspective): ${roots.join(" | ")}`;
}

function renderBoard() {
  boardEl.innerHTML = "";
  for (let i = 0; i < 9; i += 1) {
    const button = document.createElement("button");
    button.className = "cell";
    button.type = "button";
    button.dataset.index = String(i);
    button.textContent = markToGlyph(state.board[i]);

    if (state.board[i] !== 0) {
      button.classList.add("filled");
      button.disabled = true;
    } else {
      const humanTurn = currentPlayer() === state.humanPlayer;
      button.disabled = state.winner !== null || state.draw || !humanTurn || state.thinking;
    }

    boardEl.appendChild(button);
  }
}

function updateEvalBar() {
  if (state.winner !== null || state.draw) {
    let score = 0;
    if (state.winner === enginePlayer()) {
      score = 1;
    } else if (state.winner === state.humanPlayer) {
      score = -1;
    }
    const pct = ((score + 1) / 2) * 100;
    evalFillEl.style.height = `${pct}%`;
    evalTextEl.textContent = score === 0 ? "Draw" : score > 0 ? "Engine won" : "You won";
    return;
  }

  const score = scoreFromPlayerPerspective(state.board, state.turn, state.n, enginePlayer());
  const pct = ((score + 1) / 2) * 100;
  evalFillEl.style.height = `${pct}%`;

  if (score === 1) {
    evalTextEl.textContent = "Engine has a forced win";
  } else if (score === -1) {
    evalTextEl.textContent = "You have a forced win";
  } else {
    evalTextEl.textContent = "Perfect play leads to draw";
  }
}

function principalVariationLines() {
  if (state.winner !== null || state.draw) {
    return [];
  }

  const board = state.board.slice();
  let turn = state.turn;
  const lines = [];

  while (turn < 9) {
    const solution = solvePosition(board, turn, state.n);
    const move = solution.bestMoves[0];
    if (move === undefined) {
      break;
    }

    const player = playerForTurn(turn);
    const mark = markForTurn(turn, state.n);
    lines.push(`${playerLabel(player)} ${markToGlyph(mark)} -> ${moveToLabel(move)}`);
    board[move] = mark;

    if (checkWin(board, mark)) {
      break;
    }
    turn += 1;
  }

  return lines;
}

function updatePrincipalVariation() {
  const lines = principalVariationLines();
  pvListEl.innerHTML = "";

  if (lines.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No continuation (game over).";
    pvListEl.appendChild(li);
    return;
  }

  for (const line of lines) {
    const li = document.createElement("li");
    li.textContent = line;
    pvListEl.appendChild(li);
  }
}

function updateStatus() {
  if (state.winner !== null) {
    if (state.winner === state.humanPlayer) {
      statusEl.textContent = "Game over: you win.";
    } else {
      statusEl.textContent = "Game over: engine wins.";
    }
    return;
  }

  if (state.draw) {
    statusEl.textContent = "Game over: draw.";
    return;
  }

  const markGlyph = markToGlyph(currentMark());
  const whoseTurn = currentPlayer() === state.humanPlayer ? "Your turn" : "Engine turn";
  statusEl.textContent = `${whoseTurn} (${playerLabel(currentPlayer())}, placing ${markGlyph})`;
}

function render() {
  renderBoard();
  updateStatus();
  updateEvalBar();
  updatePrincipalVariation();
}

function applyMove(index) {
  if (state.board[index] !== 0 || state.winner !== null || state.draw) {
    return false;
  }

  const mark = currentMark();
  const player = currentPlayer();
  state.board[index] = mark;

  if (checkWin(state.board, mark)) {
    state.winner = player;
  } else if (state.turn === 8) {
    state.draw = true;
  } else {
    state.turn += 1;
  }

  return true;
}

function engineStep() {
  if (state.winner !== null || state.draw) {
    return;
  }

  if (currentPlayer() !== enginePlayer()) {
    return;
  }

  state.thinking = true;
  render();

  window.setTimeout(() => {
    const move = bestMove(state.board, state.turn, state.n);
    if (move !== null) {
      applyMove(move);
    }
    state.thinking = false;
    render();

    if (currentPlayer() === enginePlayer() && state.winner === null && !state.draw) {
      engineStep();
    }
  }, 220);
}

function resetGame() {
  state.board = Array(9).fill(0);
  state.turn = 0;
  state.winner = null;
  state.draw = false;
  state.thinking = false;
  render();

  if (currentPlayer() === enginePlayer()) {
    engineStep();
  }
}

boardEl.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const idx = Number(target.dataset.index);
  if (Number.isNaN(idx)) {
    return;
  }

  if (currentPlayer() !== state.humanPlayer || state.thinking) {
    return;
  }

  if (!applyMove(idx)) {
    return;
  }

  render();
  engineStep();
});

nSelectEl.addEventListener("change", () => {
  state.n = Number(nSelectEl.value);
  resetGame();
});

sideSelectEl.addEventListener("change", () => {
  state.humanPlayer = sideSelectEl.value === "first" ? 0 : 1;
  resetGame();
});

restartBtn.addEventListener("click", () => {
  resetGame();
});

function init() {
  state.n = Number(nSelectEl.value);
  state.humanPlayer = sideSelectEl.value === "first" ? 0 : 1;

  // Warm the solver for n=1..5 and render a compact strategy table.
  renderAnalysis();

  // Ensure starting state's best move set is already cached for selected n.
  solvePosition(state.board, state.turn, state.n);

  render();
  if (currentPlayer() === enginePlayer()) {
    engineStep();
  }
}

init();
