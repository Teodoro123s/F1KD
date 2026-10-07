import weightForAge from '../data/who-weianthro.txt?raw';
import lengthForAge from '../data/who-lenanthro.txt?raw';
import weightForLength from '../data/who-wflanthro.txt?raw';
import weightForHeight from '../data/who-wfhanthro.txt?raw';
import { createWhoGrowthStandards } from './whoGrowthStandardsCore.mjs';

export const calculateWhoGrowthScores = createWhoGrowthStandards({
  weightForAge,
  lengthForAge,
  weightForLength,
  weightForHeight,
});
