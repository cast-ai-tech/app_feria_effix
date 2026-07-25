import { expect, test } from "@playwright/test";

/**
 * Flujos del día del evento (Fase 21):
 * login → credencial (QR + código) → guardar charla en Mi Agenda → persiste.
 *
 * Nota: el escaneo con cámara (conexión y sello) no se puede automatizar
 * headless; su lógica está cubierta por unit tests (credencial, colas
 * offline, pasaporte) y el RPC por la migración con rate limit.
 */
test("credencial + Mi Agenda del asistente", async ({ page }) => {
  // Login.
  await page.goto("/ingresar");
  await page.getByLabel(/correo electrónico/i).fill("asistente@test.local");
  await page.getByLabel(/contraseña/i).fill("prueba123");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL("**/perfil", { timeout: 15_000 });

  // Credencial Effix: QR estático + código de conexión visible.
  await page.goto("/credencial");
  await expect(page.getByText("Credencial Effix")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole("img", { name: /qr de mi credencial/i })).toBeVisible(
    { timeout: 15_000 },
  );
  await expect(page.getByText(/^[A-HJ-NP-Z2-9]{8}$/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /escanear otra credencial/i }),
  ).toBeVisible();

  // Mi Agenda: guardar la primera charla y verificar que persiste.
  await page.goto("/agenda");
  await expect(page.getByText("Toda la agenda")).toBeVisible({
    timeout: 15_000,
  });

  const saveButtons = page.getByRole("button", {
    name: "Guardar en Mi Agenda",
  });
  const count = await saveButtons.count();
  test.skip(count === 0, "No hay charlas seed para guardar");

  await saveButtons.first().click();
  await expect(page.getByText(/Mi Agenda \(1\)/)).toBeVisible({
    timeout: 10_000,
  });

  // Recargar: el guardado vive en la base, no solo en el estado local.
  await page.reload();
  await expect(page.getByText(/Mi Agenda \(1\)/)).toBeVisible({
    timeout: 15_000,
  });

  // Limpieza: quitarla para que el test sea re-ejecutable.
  await page.getByText(/Mi Agenda \(1\)/).click();
  await page
    .getByRole("button", { name: "Quitar de Mi Agenda" })
    .first()
    .click();
  await expect(page.getByText(/Mi Agenda \(0\)/)).toBeVisible({
    timeout: 10_000,
  });
});
