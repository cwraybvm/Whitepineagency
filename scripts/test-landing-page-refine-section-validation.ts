import { validateRefineSectionInput } from '../src/app/api/sandbox/landing-page/refine-section/route';

const cases: { body: any; expectError: boolean }[] = [
  { body: {}, expectError: true },
  { body: { field: '' }, expectError: true },
  { body: { field: 'heroHeadline' }, expectError: true },
  { body: { field: 'heroHeadline', instruction: '' }, expectError: true },
  { body: { field: 'heroHeadline', instruction: 'make it punchier' }, expectError: false },
  { body: { field: 'subheadline', instruction: 'add urgency', currentValue: 'Call now' }, expectError: false },
  { body: { field: 'subheadline', instruction: 'add urgency', currentValue: 42 }, expectError: true },
];

let failures = 0;
for (const { body, expectError } of cases) {
  const error = validateRefineSectionInput(body);
  const got = error !== null;
  if (got !== expectError) {
    failures++;
    console.error(`FAIL: ${JSON.stringify(body)} -> expected error=${expectError}, got=${got} (${error})`);
  }
}
if (failures > 0) {
  console.error(`${failures} case(s) failed`);
  process.exit(1);
}
console.log('All refine-section validation cases passed');
