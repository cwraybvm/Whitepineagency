import { validateVoiceGenInput } from '../src/lib/sandboxPrompts';

const cases: { body: any; expectError: boolean }[] = [
  { body: {}, expectError: true },
  { body: { sceneText: '' }, expectError: true },
  { body: { sceneText: '   ' }, expectError: true },
  { body: { sceneText: 'Hello', voicePersona: 'Bogus' }, expectError: true },
  { body: { sceneText: 'Hello' }, expectError: true },
  { body: { sceneText: 'Hello', voicePersona: 'Warm' }, expectError: false },
  { body: { sceneText: 'Hello', voicePersona: 'Energetic' }, expectError: false },
  { body: { sceneText: 'Hello', voicePersona: 'Professional' }, expectError: false },
];

let failures = 0;
for (const { body, expectError } of cases) {
  const error = validateVoiceGenInput(body);
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
