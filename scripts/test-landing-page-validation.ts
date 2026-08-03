import { validateLandingPageInput } from '../src/lib/sandboxPrompts';

const cases: { body: any; expectError: boolean }[] = [
  { body: {}, expectError: true },
  { body: { mode: 'bogus' }, expectError: true },
  { body: { mode: 'asset' }, expectError: true },
  { body: { mode: 'asset', assetId: '' }, expectError: true },
  { body: { mode: 'asset', assetId: '   ' }, expectError: true },
  { body: { mode: 'asset', assetId: 'abc-123' }, expectError: false },
  { body: { mode: 'brief' }, expectError: true },
  { body: { mode: 'brief', prompt: '' }, expectError: true },
  { body: { mode: 'brief', prompt: '   ' }, expectError: true },
  { body: { mode: 'brief', prompt: 'A roofing company special offer' }, expectError: false },
];

let failures = 0;
for (const { body, expectError } of cases) {
  const error = validateLandingPageInput(body);
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
console.log('All validation cases passed');
