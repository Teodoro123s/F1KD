const { readFileSync } = require('node:fs');
const path = require('node:path');

const readReference = (filename) => readFileSync(path.join(__dirname, '..', 'data', filename), 'utf8');
let calculatorPromise;

const getWhoGrowthStandards = () => {
  if (!calculatorPromise) {
    calculatorPromise = import('../../src/utils/whoGrowthStandardsCore.mjs').then(({ createWhoGrowthStandards }) => createWhoGrowthStandards({
      weightForAge: readReference('who-weianthro.txt'),
      lengthForAge: readReference('who-lenanthro.txt'),
      weightForLength: readReference('who-wflanthro.txt'),
      weightForHeight: readReference('who-wfhanthro.txt'),
    }));
  }
  return calculatorPromise;
};

module.exports = { getWhoGrowthStandards };
