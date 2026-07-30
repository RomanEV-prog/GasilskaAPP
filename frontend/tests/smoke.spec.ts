import { expect, test } from '@playwright/test';

/**
 * Dimni test: prijava → nadzorna plošča → modul Dogodki.
 * Poverilnice prek env (PW_USER/PW_PASS), ker ima lokalni dev admin lahko
 * vklopljeno 2FA — CI (svež seed) uporablja privzetega admina brez 2FA.
 * Prijava: polje je vedno »Uporabniško ime«, e-pošta ne rabi izbire društva.
 */
const USER = process.env.PW_USER ?? 'admin@pgd-pekre.si';
const PASS = process.env.PW_PASS ?? 'GasilApp123!';

test('prijava in osnovna navigacija', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Plamen' })).toBeVisible();

  await page.getByLabel('Uporabniško ime').fill(USER);
  await page.getByLabel('Geslo').fill(PASS);
  await page.getByRole('button', { name: 'Prijava' }).click();

  // Nadzorna plošča (admin društva vidi pozdrav in module).
  await expect(page.getByText(/Pozdravljen/)).toBeVisible({ timeout: 15_000 });

  // En modul: Dogodki — seznam se izriše brez napake.
  await page.goto('/events');
  await expect(
    page.getByRole('heading', { name: /Dogodki/i }),
  ).toBeVisible({ timeout: 10_000 });
});
