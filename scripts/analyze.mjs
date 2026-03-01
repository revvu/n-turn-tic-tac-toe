import { allStrategySummaries, moveToLabel } from "../solver.js";

const summaries = allStrategySummaries();
for (const s of summaries) {
  console.log(
    `n=${s.n} root=${s.rootScore} openings=${s.bestOpeningMoves
      .map(moveToLabel)
      .join(",")} states=${s.cachedStates} nodes=${s.exploredNodes}`,
  );
}
