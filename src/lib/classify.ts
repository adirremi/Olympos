type QuestionnaireInput = {
  run2kMinutes: number;
  maxPullups: number;
  maxPushups: number;
  weeklyTrainingDays: number;
  motivationLevel: number;
  hasInjury: boolean;
};

export function classifyTrainingLevel(input: QuestionnaireInput) {
  if (input.hasInjury) {
    return "beginner";
  }

  const score =
    (input.run2kMinutes <= 9 ? 2 : input.run2kMinutes <= 11 ? 1 : 0) +
    (input.maxPullups >= 10 ? 2 : input.maxPullups >= 5 ? 1 : 0) +
    (input.maxPushups >= 50 ? 2 : input.maxPushups >= 30 ? 1 : 0) +
    (input.weeklyTrainingDays >= 4 ? 1 : 0) +
    (input.motivationLevel >= 4 ? 1 : 0);

  if (score >= 6) {
    return "advanced";
  }

  if (score >= 3) {
    return "intermediate";
  }

  return "beginner";
}
