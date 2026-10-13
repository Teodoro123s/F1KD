const { readFileSync } = require('node:fs');
const path = require('node:path');

const readReference = (filename) => readFileSync(path.join(__dirname, '..', 'data', filename), 'utf8');
let calculatorPromise;

const getWhoGrowthStandards = () => {
  if (!calculatorPromise) {
    calculatorPromise = import('./whoGrowthStandardsCore.mjs').then(({ createWhoGrowthStandards }) => createWhoGrowthStandards({
      weightForAge: readReference('who-weianthro.txt'),
      lengthForAge: readReference('who-lenanthro.txt'),
      weightForLength: readReference('who-wflanthro.txt'),
      weightForHeight: readReference('who-wfhanthro.txt'),
      bmiForAge: readReference('who-bmianthro.txt'),
      headCircumferenceForAge: readReference('who-hcanthro.txt'),
      armCircumferenceForAge: readReference('who-acanthro.txt'),
      tricepsSkinfoldForAge: readReference('who-tsanthro.txt'),
      subscapularSkinfoldForAge: readReference('who-ssanthro.txt'),
    }));
  }
  return calculatorPromise;
};

module.exports = { getWhoGrowthStandards };
