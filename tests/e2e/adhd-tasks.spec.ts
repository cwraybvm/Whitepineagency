import { test, expect } from '@playwright/test';
import path from 'node:path';
import { loginAsOwner, createTestTask, patchTask, deleteTask, getColumnCount, listTasks } from './helpers';

let consoleErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));
  await loginAsOwner(page);
});

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    const safeName = testInfo.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    const shotPath = path.join('tests', 'e2e', 'screenshots', `${safeName}.png`);
    await page.screenshot({ path: shotPath, fullPage: true }).catch(() => {});
    console.error(`\n[FAILED] ${testInfo.title}`);
    console.error(`  screenshot: ${shotPath}`);
    if (consoleErrors.length) {
      console.error('  console/page errors:');
      for (const line of consoleErrors) console.error(`    - ${line}`);
    }
  }
});

test.describe('ADHD Tasks board -- end-to-end journeys', () => {
  test('Journey A: Brain Dump parses free text into board tasks', async ({ page }) => {
    const before = await listTasks(page);
    const beforeIds = new Set(before.map((t) => t.id));

    try {
      await page.goto('/admin/tasks');
      await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible();

      const inboxBefore = await getColumnCount(page, 'INBOX');
      const activeBefore = await getColumnCount(page, 'ACTIVE');

      await page.getByRole('button', { name: /Brain Dump/i }).click();
      const textarea = page.getByPlaceholder(/follow up with the Simmons account/i);
      await expect(textarea).toBeVisible();
      await textarea.fill('Design homepage wireframe and review client feedback');
      await page.getByRole('button', { name: /AI Parse Tasks/i }).click();

      // Real OpenAI call in parse-brain-dump/route.ts -- generous timeout,
      // and we deliberately don't assert on exact task wording since the
      // model's split of the input is non-deterministic.
      await expect(page.getByText('Review, edit, or uncheck')).toBeVisible({ timeout: 30_000 });
      await page.getByRole('button', { name: 'Import Selected Tasks' }).click();
      await expect(page.getByText(/Added \d+ task/i)).toBeVisible({ timeout: 10_000 });

      await expect(async () => {
        const inboxAfter = await getColumnCount(page, 'INBOX');
        const activeAfter = await getColumnCount(page, 'ACTIVE');
        expect(inboxAfter + activeAfter).toBeGreaterThan(inboxBefore + activeBefore);
      }).toPass({ timeout: 10_000 });
    } finally {
      const after = await listTasks(page);
      const created = after.filter((t) => !beforeIds.has(t.id));
      for (const t of created) await deleteTask(page, t.id);
    }
  });

  test('Journey B: Focus Mode timer + Brown Noise ambient audio', async ({ page }) => {
    const taskId = await createTestTask(page, { title: 'E2E Journey B focus task' });
    try {
      await page.goto('/admin/tasks');
      const card = page.getByTestId(`task-card-${taskId}`);
      await expect(card).toBeVisible();
      await card.getByTitle('Focus on this task').click();

      await expect(page.getByRole('heading', { name: 'E2E Journey B focus task' })).toBeVisible();

      const brownNoise = page.getByRole('button', { name: 'Brown Noise' });
      await brownNoise.click();
      await expect(brownNoise).toHaveClass(/bg-indigo-500/);

      await page.getByTestId('focus-timer-toggle').click();
      const timer = page.getByTestId('focus-timer');
      const startText = await timer.textContent();
      await page.waitForTimeout(5_000);
      await expect(timer).not.toHaveText(startText ?? '');

      await page.keyboard.press('Escape');
      await expect(page.getByRole('heading', { name: 'E2E Journey B focus task' })).not.toBeVisible();
    } finally {
      await deleteTask(page, taskId);
    }
  });

  test('Journey C: ADHD Toolkit -- Low-Battery Mode + Roosevelt Matrix', async ({ page }) => {
    const taskId = await createTestTask(page, { title: 'E2E Journey C toolkit task', priority: 5 });
    try {
      await page.goto('/admin/tasks');
      await expect(page.getByTestId(`task-card-${taskId}`)).toBeVisible();

      await page.getByRole('button', { name: '🎯 ADHD Toolkit' }).click();
      await page.getByRole('button', { name: 'Low-Battery Mode' }).click();

      await expect(page.getByText('One thing at a time')).toBeVisible();
      // Full-page overlay replaces the board -- only one task title on screen.
      await expect(page.getByRole('button', { name: '🎯 ADHD Toolkit' })).not.toBeVisible();

      await page.getByRole('button', { name: 'Exit Low-Battery Mode' }).click();
      await expect(page.getByRole('button', { name: '🎯 ADHD Toolkit' })).toBeVisible();

      await page.getByRole('button', { name: '🎯 ADHD Toolkit' }).click();
      await page.getByRole('button', { name: /Roosevelt Matrix|Kanban Board/ }).click();
      await expect(page.getByText('Back to Kanban Board')).toBeVisible();
    } finally {
      await deleteTask(page, taskId);
    }
  });

  test('Journey D: Boss Battle -- subtask damage and victory completion', async ({ page }) => {
    const taskId = await createTestTask(page, { title: 'E2E Journey D boss task' });
    await patchTask(page, taskId, {
      subtasks: [
        { id: 's1', title: 'Step one', done: false },
        { id: 's2', title: 'Step two', done: false },
        { id: 's3', title: 'Step three', done: false },
        { id: 's4', title: 'Step four', done: false },
      ],
    });

    try {
      await page.goto('/admin/tasks');
      const card = page.getByTestId(`task-card-${taskId}`);
      await expect(card).toBeVisible();

      const inboxBefore = await getColumnCount(page, 'INBOX');
      const doneBefore = await getColumnCount(page, 'DONE');

      await card.getByRole('button', { name: 'Boss Battle' }).click();
      const modal = page.getByTestId('boss-battle-modal');
      await expect(modal.getByText('Boss HP')).toBeVisible();
      await expect(modal.getByText('100%')).toBeVisible();

      // 4 equal subtasks -> -25 HP per hit.
      await modal.getByLabel('Step one').check();
      await expect(modal.getByText('-25 HP!')).toBeVisible();
      await expect(modal.getByText('75%')).toBeVisible();

      await modal.getByLabel('Step two').check();
      await modal.getByLabel('Step three').check();
      await modal.getByLabel('Step four').check();

      await expect(modal.getByText('Victory!')).toBeVisible();
      // Modal auto-closes ~1.2s after victory and marks the task DONE.
      await expect(modal).not.toBeVisible({ timeout: 5_000 });

      await expect(async () => {
        const inboxAfter = await getColumnCount(page, 'INBOX');
        const doneAfter = await getColumnCount(page, 'DONE');
        expect(inboxAfter).toBe(inboxBefore - 1);
        expect(doneAfter).toBe(doneBefore + 1);
      }).toPass({ timeout: 10_000 });
    } finally {
      await deleteTask(page, taskId);
    }
  });
});
