// Deterministic scene state: scrubbing backwards produces the same assembly.
export const SCENE_STEP_SECONDS = 7;
export function sceneBlockState(block, time, stepSeconds = SCENE_STEP_SECONDS) {
  const starts = Math.max(0, Number(block.revealStep) || 0) * stepSeconds;
  const progress = starts === 0 ? 1 : Math.max(0, Math.min(1, (time - starts) / .65));
  const eased = 1 - (1 - progress) ** 3;
  return { visible: time >= starts, scale: .75 + .25 * eased, lift: (1 - eased) * .65 };
}
export function sceneFrame(steps, time, stepSeconds = SCENE_STEP_SECONDS) {
  const index = Math.max(0, Math.min(steps.length - 1, Math.floor(Math.max(0, time) / stepSeconds)));
  const step = steps[index] || {};
  const phase = Math.max(0, Math.min(1, (time - index * stepSeconds) / .65));
  const previous = index ? steps[index - 1]?.chestOpen ? 1 : 0 : step.chestOpen ? 1 : 0;
  const target = step.chestOpen ? 1 : 0;
  return {index, step, lid: previous + (target - previous) * (1 - (1 - phase) ** 3), flow: ((Math.max(0,time) % 2.4) / 2.4)};
}
