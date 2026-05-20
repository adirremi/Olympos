export type WorkoutBlock = {
  title: string;
  sets?: string;
  rest?: string;
  exercises?: string[];
};

export type WorkoutSnapshot = {
  name?: string;
  tag?: string;
  warmup?: string;
  blocks?: WorkoutBlock[];
  finisher?: string;
  cooldown?: string;
  level?: string;
};

export function parseWorkoutSnapshot(value: unknown): WorkoutSnapshot {
  if (!value || typeof value !== "object") {
    return {};
  }

  const source = value as Record<string, unknown>;

  const blocks = Array.isArray(source.blocks)
    ? (source.blocks as unknown[]).map((block) => {
        const raw = (block ?? {}) as Record<string, unknown>;
        return {
          title: String(raw.title ?? ""),
          sets: raw.sets ? String(raw.sets) : undefined,
          rest: raw.rest ? String(raw.rest) : undefined,
          exercises: Array.isArray(raw.exercises)
            ? (raw.exercises as unknown[]).map((item) => String(item))
            : undefined,
        };
      })
    : undefined;

  return {
    name: source.name ? String(source.name) : undefined,
    tag: source.tag ? String(source.tag) : undefined,
    warmup: source.warmup ? String(source.warmup) : undefined,
    blocks,
    finisher: source.finisher ? String(source.finisher) : undefined,
    cooldown: source.cooldown ? String(source.cooldown) : undefined,
    level: source.level ? String(source.level) : undefined,
  };
}
