import weightForAge from '../data/who-weianthro.txt?raw';
import lengthForAge from '../data/who-lenanthro.txt?raw';
import weightForLength from '../data/who-wflanthro.txt?raw';
import weightForHeight from '../data/who-wfhanthro.txt?raw';
import bmiForAge from '../data/who-bmianthro.txt?raw';
import headCircumferenceForAge from '../data/who-hcanthro.txt?raw';
import armCircumferenceForAge from '../data/who-acanthro.txt?raw';
import tricepsSkinfoldForAge from '../data/who-tsanthro.txt?raw';
import subscapularSkinfoldForAge from '../data/who-ssanthro.txt?raw';
import { createWhoGrowthStandards } from './whoGrowthStandardsCore.mjs';

export const calculateWhoGrowthScores = createWhoGrowthStandards({
  weightForAge,
  lengthForAge,
  weightForLength,
  weightForHeight,
  bmiForAge,
  headCircumferenceForAge,
  armCircumferenceForAge,
  tricepsSkinfoldForAge,
  subscapularSkinfoldForAge,
});
