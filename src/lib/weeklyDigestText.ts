import { WEEKLY_LEADS_TARGET } from './bvmTargets';

export interface WeeklyDigest {
  weekStart: string;
  weekEnd: string;
  complianceScore: number;
  habits: {
    totalPagesRead: number;
    avgPagesPerDay: number;
    totalWaterGlasses: number;
    avgWaterPerDay: number;
    jiuJitsuCompleted: number;
    jiuJitsuTarget: number;
    workoutsCompleted: number;
    workoutsTarget: number;
  };
  sales: {
    totalCalls: number;
    totalLvmGk: number;
    totalInfoGathered: number;
    appointmentsSet: number;
    leadsAdded: number;
    dropOffsCompleted: number;
  };
  mileage: {
    totalMiles: number;
    totalDeduction: number;
  };
}

const DIVIDER = '-----------------------------------------';

// Matches the spec's literal example text exactly, including which fields
// it omits -- totalLvmGk/totalInfoGathered are real API fields (asked for
// as computed metrics) but don't appear in this template since the spec's
// own worked example didn't show them here.
export function buildWeeklyDigestText(d: WeeklyDigest): string {
  const jjCheck = d.habits.jiuJitsuCompleted >= d.habits.jiuJitsuTarget ? ' ✅' : '';
  const woCheck = d.habits.workoutsCompleted >= d.habits.workoutsTarget ? ' ✅' : '';

  return `🏆 WEEKLY PERFORMANCE & DISCIPLINE DIGEST
${DIVIDER}
🎯 Overall Discipline Score: ${d.complianceScore}%

🔥 HABITS & DISCIPLINE
• Reading: ${d.habits.totalPagesRead} Pages (${d.habits.avgPagesPerDay.toFixed(1)} avg/day)
• Water: ${d.habits.totalWaterGlasses} Glasses (${d.habits.avgWaterPerDay.toFixed(1)} avg/day)
• Jiu-Jitsu: ${d.habits.jiuJitsuCompleted} / ${d.habits.jiuJitsuTarget} Sessions Completed${jjCheck}
• Workouts: ${d.habits.workoutsCompleted} / ${d.habits.workoutsTarget} Workouts Completed${woCheck}

📞 BVM SALES & FIELD OPERATIONS
• Total Dials Made: ${d.sales.totalCalls} Calls
• Leads Added: ${d.sales.leadsAdded} / ${WEEKLY_LEADS_TARGET} Goal
• Drop-Off Visits Completed: ${d.sales.dropOffsCompleted} Accounts
• Appointments Scheduled: ${d.sales.appointmentsSet}

🚗 MILEAGE & TAX DEDUCTION
• Business Miles Driven: ${d.mileage.totalMiles.toFixed(1)} mi
• IRS Mileage Deduction: $${d.mileage.totalDeduction.toFixed(2)}
${DIVIDER}
Sent via White Pine Portal`;
}
