/**
 * Tiny per-user log of finished card games (timestamps), persisted in
 * localStorage under  oilanai_cardgames_v1_<userId>.
 *
 * Lessons already leave a rich trail in chatStorage; card games didn't leave
 * any, so the profile heatmap and achievements couldn't see them.
 */

const PREFIX = "oilanai_cardgames_v1_";
const MAX_ENTRIES = 1000;

export function loadCardGames(userId: string | undefined): number[] {
  if (!userId) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(PREFIX + userId) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((n): n is number => typeof n === "number")
      : [];
  } catch {
    return [];
  }
}

export function recordCardGame(userId: string | undefined): void {
  if (!userId) return;
  try {
    const next = [...loadCardGames(userId), Date.now()].slice(-MAX_ENTRIES);
    localStorage.setItem(PREFIX + userId, JSON.stringify(next));
  } catch {
    /* ignore quota / private mode */
  }
}
