export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function sampleExponential(meanMs: number) {
  return -Math.log(1 - Math.random()) * meanMs;
}

export function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pick<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

export function maybe(probability: number) {
  return Math.random() < probability;
}

export function weightedChoice<T>(choices: Array<{ value: T; weight: number }>) {
  const total = choices.reduce((sum, choice) => sum + Math.max(0, choice.weight), 0);

  if (total <= 0) {
    return choices[0]?.value;
  }

  let roll = Math.random() * total;

  for (const choice of choices) {
    roll -= Math.max(0, choice.weight);
    if (roll <= 0) {
      return choice.value;
    }
  }

  return choices[choices.length - 1]?.value;
}

export function logNormalNoise(volatility: number) {
  const u = Math.max(Number.EPSILON, Math.random());
  const v = Math.max(Number.EPSILON, Math.random());
  const normal = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);

  return Math.exp(normal * volatility * 0.25);
}
