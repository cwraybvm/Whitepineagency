import { type Page } from '@playwright/test';

/**
 * Logs in via the master-admin bypass (POST /api/auth/login with
 * ADMIN_PASSWORD) so subsequent page.goto() calls carry the role=OWNER
 * cookie proxy.ts requires for every /admin/* route.
 *
 * Every helper below takes `page` (not the standalone `request` fixture)
 * and calls page.request.* deliberately -- `request` is a separate
 * APIRequestContext with its own cookie jar that never receives the
 * cookies this login sets, so mixing the two silently 401s.
 */
export async function loginAsOwner(page: Page): Promise<void> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error('ADMIN_PASSWORD is not set in the test environment (.env/.env.local) -- cannot authenticate as OWNER.');
  }
  const res = await page.request.post('/api/auth/login', { data: { password } });
  if (!res.ok()) {
    throw new Error(`Login failed: ${res.status()} ${await res.text()}`);
  }
}

export async function listTasks(page: Page): Promise<{ id: string }[]> {
  const res = await page.request.get('/api/focus-tasks');
  if (!res.ok()) {
    throw new Error(`listTasks failed: ${res.status()} ${await res.text()}`);
  }
  return res.json();
}

export async function createTestTask(page: Page, overrides: Record<string, unknown> = {}): Promise<string> {
  const res = await page.request.post('/api/focus-tasks', {
    data: { title: 'E2E seed task', ...overrides },
  });
  if (!res.ok()) {
    throw new Error(`createTestTask failed: ${res.status()} ${await res.text()}`);
  }
  const body = await res.json();
  return body.id as string;
}

export async function patchTask(page: Page, taskId: string, patch: Record<string, unknown>): Promise<void> {
  const res = await page.request.patch(`/api/focus-tasks/${taskId}`, { data: patch });
  if (!res.ok()) {
    throw new Error(`patchTask failed: ${res.status()} ${await res.text()}`);
  }
}

export async function deleteTask(page: Page, taskId: string): Promise<void> {
  // Best-effort cleanup -- a task already completed/removed by the test
  // itself is not a test failure, so failures here are swallowed.
  await page.request.delete(`/api/focus-tasks/${taskId}`).catch(() => {});
}

export async function getColumnCount(page: Page, columnId: 'INBOX' | 'ACTIVE' | 'DONE'): Promise<number> {
  const text = await page.getByTestId(`column-count-${columnId}`).textContent();
  return Number(text?.trim() ?? '0');
}
