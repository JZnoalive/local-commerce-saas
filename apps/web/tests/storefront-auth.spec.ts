import { test, expect } from '@playwright/test';

const TARGET_URL = process.env.E2E_URL || 'http://localhost:3000';

test('muestra registro de cliente y local con campos Nequi y Bancolombia separados', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto(TARGET_URL, { waitUntil: 'networkidle' });

  // Seleccionar opción de local / negocio
  await page.getByRole('button', { name: /Tengo un Local \/ Negocio/i }).click();

  // Seleccionar "Nequi y Bancolombia" y verificar ambos campos
  const selectCuenta = page.locator('select').filter({ hasText: 'Nequi y Bancolombia' }).first();
  await selectCuenta.selectOption('Nequi y Bancolombia');

  await expect(page.getByPlaceholder('Ej: 3001234567').first()).toBeVisible();
  await expect(page.getByPlaceholder('Ej: Ahorros 123-456789-00').first()).toBeVisible();

  expect(consoleErrors).toEqual([]);
});
