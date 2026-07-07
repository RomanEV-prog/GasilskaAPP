/**
 * Iz imena in priimka sestavi osnovo prijavnega imena: "Janez Novak" → "janez.novak".
 * Šumniki in ostali diakritiki se pretvorijo v ASCII (č→c, š→s, ž→z ...).
 */
export function usernameBase(firstName: string, lastName: string): string {
  const clean = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // odstrani diakritike
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '');
  const first = clean(firstName);
  const last = clean(lastName);
  return [first, last].filter(Boolean).join('.') || 'uporabnik';
}
