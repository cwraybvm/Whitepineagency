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
  // Prototype pollution protection: inherited property names must be rejected
  { body: { sceneText: 'Hello', voicePersona: 'constructor' }, expectError: true },
  { body: { sceneText: 'Hello', voicePersona: 'toString' }, expectError: true },
  { body: { sceneText: 'Hello', voicePersona: '__proto__' }, expectError: true },
  { body: { sceneText: 'Hello', voicePersona: 'hasOwnProperty' }, expectError: true },
  { body: { sceneText: 'Hello', voicePersona: 'valueOf' }, expectError: true },
  // Length validation: exactly 4096 chars is valid
  { body: { sceneText: 'x'.repeat(4096), voicePersona: 'Warm' }, expectError: false },
  // Length validation: 4097 chars exceeds limit
  { body: { sceneText: 'x'.repeat(4097), voicePersona: 'Warm' }, expectError: true },
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
