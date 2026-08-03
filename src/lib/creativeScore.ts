export type ScorableType = 'COPY' | 'AD' | 'VIDEO_SCRIPT' | 'DRIP' | 'LANDING_PAGE';

export type ScoreResult = { score: number; feedback: string[] };

const POWER_WORDS = ['free', 'new', 'proven', 'secret', 'guaranteed', 'instant', 'easy', 'stop', 'warning', 'imagine', 'discover'];
const CTA_VERBS = ['call', 'book', 'get', 'claim', 'schedule', 'save', 'start', 'shop', 'learn', 'sign up', 'request', 'download', 'visit', 'order', 'reserve', 'act now', "don't wait", 'hurry'];
const URGENCY_WORDS = ['today', 'now', 'limited', 'hurry', 'deadline', 'expires', 'expiring', "don't wait", 'last chance', 'act fast', 'while supplies last', 'only', 'ends soon', 'this week'];

const SMS_LIMIT = 160;
const GOOGLE_HEADLINE_LIMIT = 30;
const META_FOLD_LIMIT = 125;

function firstSentence(text: string) {
  const match = text.match(/^[^.!?\n]+[.!?]?/);
  return (match?.[0] || text).trim();
}

function lastSentence(text: string) {
  const parts = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  return parts[parts.length - 1] || text;
}

function hookTextFor(type: ScorableType, content: string, metadata: any): string {
  if (type === 'AD') return metadata?.headline || firstSentence(content);
  if (type === 'VIDEO_SCRIPT') return metadata?.beats?.[0]?.line || firstSentence(content);
  if (type === 'LANDING_PAGE') return metadata?.heroHeadline || firstSentence(content);
  return firstSentence(content);
}

function ctaTextFor(type: ScorableType, content: string, metadata: any): string {
  if (type === 'AD') return metadata?.cta || '';
  if (type === 'VIDEO_SCRIPT') return metadata?.beats?.[metadata.beats.length - 1]?.line || lastSentence(content);
  if (type === 'DRIP') return metadata?.steps?.[metadata.steps.length - 1]?.content || lastSentence(content);
  if (type === 'LANDING_PAGE') return metadata?.primaryCta || lastSentence(content);
  return lastSentence(content);
}

function scoreHook(hook: string): { points: number; ok: boolean } {
  if (!hook.trim()) return { points: 5, ok: false };
  const lower = hook.toLowerCase();
  const hasPattern = hook.includes('?') || /\d/.test(hook) || POWER_WORDS.some((w) => lower.includes(w));
  const reasonableLength = hook.length >= 4 && hook.length <= 100;
  if (hasPattern && reasonableLength) return { points: 25, ok: true };
  return { points: 15, ok: false };
}

function scoreCta(cta: string): { points: number; ok: boolean } {
  if (!cta.trim()) return { points: 0, ok: false };
  const lower = cta.toLowerCase();
  const hasVerb = CTA_VERBS.some((v) => lower.includes(v));
  return hasVerb ? { points: 25, ok: true } : { points: 12, ok: false };
}

function scoreUrgency(fullText: string): { points: number; ok: boolean } {
  const lower = fullText.toLowerCase();
  const matches = URGENCY_WORDS.filter((w) => lower.includes(w)).length;
  if (matches >= 2) return { points: 25, ok: true };
  if (matches === 1) return { points: 15, ok: false };
  return { points: 0, ok: false };
}

function scoreCompliance(type: ScorableType, content: string, metadata: any): { points: number; ok: boolean } {
  if (type === 'VIDEO_SCRIPT' || type === 'LANDING_PAGE') return { points: 25, ok: true };

  if (type === 'AD') {
    const headlineLen = (metadata?.headline || '').length;
    const bodyLen = content.length;
    const headlineOk = headlineLen > 0 && headlineLen <= GOOGLE_HEADLINE_LIMIT;
    const bodyOk = bodyLen <= META_FOLD_LIMIT;
    if (headlineOk && bodyOk) return { points: 25, ok: true };
    if (headlineOk || bodyOk) return { points: 13, ok: false };
    return { points: 5, ok: false };
  }

  // COPY, DRIP — judged against SMS length
  const len = content.length;
  if (len <= SMS_LIMIT) return { points: 25, ok: true };
  if (len <= SMS_LIMIT * 1.5) return { points: 13, ok: false };
  return { points: 5, ok: false };
}

export function scoreCreative(content: string, type: ScorableType, metadata?: any): ScoreResult {
  const hook = scoreHook(hookTextFor(type, content, metadata));
  const cta = scoreCta(ctaTextFor(type, content, metadata));
  const urgency = scoreUrgency(`${content} ${JSON.stringify(metadata || {})}`);
  const compliance = scoreCompliance(type, content, metadata);

  const score = Math.max(0, Math.min(100, hook.points + cta.points + urgency.points + compliance.points));

  const feedback: string[] = [];
  if (!hook.ok) feedback.push('Open with a question, number, or bold claim to sharpen the hook.');
  if (!cta.ok) feedback.push('Add a clear action verb to the call-to-action (Call, Book, Claim, Schedule).');
  if (!urgency.ok) feedback.push("Add urgency language (today, limited, don't wait) to drive faster response.");
  if (!compliance.ok) feedback.push('Trim content to fit platform limits (SMS 160 / Google headline 30 / Meta fold ~125).');

  return { score, feedback };
}
