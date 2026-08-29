/**
 * Static mock data for the Today screen.
 *
 * Milestone 1 has no database, no persistence and no workout state. Every
 * value below is a fixed string taken from docs/design/REIGN_UI_SPEC.md.
 * This module is the single place fake data lives — swapping in a real
 * source later should touch only this file.
 */

export type TodayWorkout = {
  /** Workout name, e.g. "PUSH A". */
  name: string;
  /** Program the workout belongs to. */
  program: string;
  /** Position within the program, e.g. "Week 6 · Day 4". */
  schedule: string;
  /** Volume summary, e.g. "5 exercises · ~52 min". */
  summary: string;
};

export type LastWorkout = {
  name: string;
  /** When and how long, e.g. "Yesterday · 49 min". */
  detail: string;
};

export type CardioSummary = {
  /** Data source label. No Apple Health integration exists yet. */
  source: string;
  /** Current cardio state for the day. */
  detail: string;
};

export const todayWorkout: TodayWorkout = {
  name: 'PUSH A',
  program: 'Bigger Leaner Stronger',
  schedule: 'Week 6 · Day 4',
  summary: '5 exercises · ~52 min',
};

export const lastWorkout: LastWorkout = {
  name: 'Pull A',
  detail: 'Yesterday · 49 min',
};

export const cardio: CardioSummary = {
  source: 'Apple Health',
  detail: 'No cardio recorded today',
};
