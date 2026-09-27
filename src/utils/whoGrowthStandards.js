import weightForAge from '../../server/data/who-weianthro.txt?raw';
import lengthForAge from '../../server/data/who-lenanthro.txt?raw';
import weightForLength from '../../server/data/who-wflanthro.txt?raw';
import weightForHeight from '../../server/data/who-wfhanthro.txt?raw';
import { createWhoGrowthStandards } from './whoGrowthStandardsCore.mjs';

export const calculateWhoGrowthScores = createWhoGrowthStandards({
  weightForAge,
  lengthForAge,
  weightForLength,
  weightForHeight,
});
