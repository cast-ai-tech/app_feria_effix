import { expect, test } from "@playwright/test";

/**
 * Flujo crítico del día del evento (Fase 13):
 * login → ver boleta → el QR renderiza y ROTA (clave dinámica TOTP).
 */
test("login → boleta → QR renderiza y rota", async ({ page }) => {
  // 1. Login con el usuario de prueba.
  await page.goto("/ingresar");
  await page.getByLabel(/correo electrónico/i).fill("asistente@test.local");
  await page.getByLabel(/contraseña/i).fill("prueba123");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL("**/perfil", { timeout: 15_000 });

  // 2. Ver la boleta.
  await page.goto("/tickets");
  await expect(page.getByText(/CLAVE DINÁMICA/)).toBeVisible({
    timeout: 15_000,
  });

  // 3. El QR renderiza (imagen generada por la librería qrcode).
  const qr = page.getByRole("img", { name: /código qr/i });
  await expect(qr).toBeVisible({ timeout: 15_000 });
  const initialSrc = await qr.getAttribute("src");
  expect(initialSrc).toContain("data:image/png");

  // 4. La clave dinámica ROTA: el código (y el QR) cambian al pasar la
  //    ventana TOTP de 30s.
  const codeText = () =>
    page.getByText(/CLAVE DINÁMICA · \d+/).textContent();
  const initialCode = await codeText();

  await expect
    .poll(codeText, {
      timeout: 40_000, // la ventana es de 30s; margen para el borde
      intervals: [1_000],
    })
    .not.toBe(initialCode);

  const rotatedSrc = await qr.getAttribute("src");
  expect(rotatedSrc).not.toBe(initialSrc);
});
