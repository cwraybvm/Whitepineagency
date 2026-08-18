import type { EnergyLevel } from './taskFields';

export interface EnergyRecommendation {
  level: EnergyLevel;
  label: string;
}

export function recommendedEnergy(date: Date = new Date()): EnergyRecommendation {
  const hour = date.getHours();
  if (hour >= 8 && hour < 12) return { level: 'HIGH', label: 'Morning Peak' };
  if (hour >= 13 && hour < 15) return { level: 'LOW', label: 'Post-Lunch Dip' };
  if (hour >= 15 && hour < 18) return { level: 'MEDIUM', label: 'Afternoon Recovery' };
  return { level: 'LOW', label: 'Evening / Off-Hours' };
}
