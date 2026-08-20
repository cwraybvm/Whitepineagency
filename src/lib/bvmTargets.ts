// Single source for targets shared across Call Consistency, Consistent
// Discipline, and BVM Reports -- was previously a locally-defined constant
// inside call-consistency/page.tsx only.
export const CALL_DAILY_TARGET = 45;
export const LEADS_TARGET = 10;

// Weekly leads goal for the digest -- 5 business days at the daily target.
export const WEEKLY_LEADS_TARGET = LEADS_TARGET * 5;

// Both jiu-jitsu and workout share this weekly session target.
export const WEEKLY_TRAINING_TARGET = 2;

export const PAGES_DAILY_TARGET = 10;
export const WATER_DAILY_TARGET = 7;

// Default starting point for appointment mileage/nav when no override is set.
export const BVM_OFFICE_ADDRESS = '700 Cedar Ave, Alexandria, MN 56308';

// IRS standard mileage rate used for the mileage-expense calculator.
export const IRS_MILEAGE_RATE = 0.67;

// Bonus points added to the Daily Discipline Score for completing today's
// scheduled tasks (100% completion = full bonus) -- additive on top of the
// existing 5-component 100-point score, not a re-weighting of it.
export const TASK_BONUS_MAX = 10;
