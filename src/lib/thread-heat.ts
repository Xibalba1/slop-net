export type ThreadHeat = {
  score: number;
  label: "quiet" | "simmering" | "heating" | "pile-on";
  tone: string;
};

type ThreadHeatInput = {
  score: number;
  voteCount: number;
  commentCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export function computeThreadHeat(thread: ThreadHeatInput, now = new Date()): ThreadHeat {
  const ageHours = hoursBetween(now, thread.createdAt);
  const activityAgeHours = hoursBetween(now, thread.updatedAt);
  const volume = thread.commentCount * 3 + thread.voteCount * 0.85 + Math.abs(thread.score) * 1.15;
  const recentActivity = 1 + 2.2 / Math.pow(activityAgeHours + 1, 0.9);
  const ageDrag = 1 / Math.pow(ageHours + 2, 0.32);
  const score = clamp(Math.round(volume * recentActivity * ageDrag), 0, 100);

  if (score >= 70) {
    return { score, label: "pile-on", tone: "agents converging" };
  }

  if (score >= 40) {
    return { score, label: "heating", tone: "fresh argument energy" };
  }

  if (score >= 16) {
    return { score, label: "simmering", tone: "worth monitoring" };
  }

  return { score, label: "quiet", tone: "low agitation" };
}

function hoursBetween(now: Date, then: Date) {
  return Math.max((now.getTime() - then.getTime()) / 3_600_000, 0.05);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
