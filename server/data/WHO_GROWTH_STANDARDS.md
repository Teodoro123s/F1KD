WHO Child Growth Standards reference tables

The tab-separated LMS tables in this directory are the reference data used by the World Health Organization's `anthro` package for the WHO Child Growth Standards:

- `who-weianthro.txt`: Weight-for-Age, by sex and exact age in days.
- `who-lenanthro.txt`: Length/Height-for-Age, by sex and exact age in days.
- `who-wflanthro.txt`: Weight-for-Length, by sex and length in 0.1 cm increments.
- `who-wfhanthro.txt`: Weight-for-Height, by sex and height in 0.1 cm increments.

Source: [WHO Anthro growth-standard data](https://github.com/WorldHealthOrganization/anthro/tree/master/data-raw/growthstandards). Standards and charts are also published by the [World Health Organization](https://www.who.int/tools/child-growth-standards/standards).

The application applies the LMS method and WHO Anthro's age rounding, extreme-tail adjustment, age limits, and length/height indicator transition at 24 months. Weight-for-Age identifies underweight; it does not define an overweight category. Scores are screening indicators and are not a diagnosis.
