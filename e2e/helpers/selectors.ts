// Shared locator helpers. Keep these label/text-based so they survive minor
// markup changes; reach for CSS selectors only when no accessible name exists.

import type { Page } from "@playwright/test";

export const splash = {
  cta: (page: Page) => page.getByRole("button", { name: /Nuevo Partido/i }),
};

export const createForm = {
  nombre: (page: Page) => page.locator("#nombre"),
  fecha: (page: Page) => page.locator("#fecha"),
  horario: (page: Page) => page.locator("#horario"),
  ubicacion: (page: Page) => page.locator("#ubicacion"),
  playerCountOption: (page: Page, total: number) =>
    page.locator(`.count-option:has(.count-number:text-is("${total}"))`),
  submit: (page: Page) =>
    page.getByRole("button", { name: /^Crear Partido$/i }),
  formError: (page: Page) => page.locator(".form-error"),
  backLink: (page: Page) => page.locator(".back-link"),
};

export const matchPage = {
  loading: (page: Page) => page.locator(".loading"),
  errorState: (page: Page) => page.locator(".error-state"),
  notFoundHeading: (page: Page) =>
    page.getByRole("heading", { name: /Partido no encontrado/i }),
  inscriptionStep: (page: Page) => page.locator(".inscription-step").first(),
  continueButton: (page: Page) =>
    page.getByRole("button", { name: /Armar equipos/i }),
};

export const inGame = {
  container: (page: Page) =>
    page.locator(".match-page--jugando, .match-page--finalizado"),
  finishButton: (page: Page) =>
    page.getByRole("button", { name: /Finalizar partido|Terminar partido/i }),
};
