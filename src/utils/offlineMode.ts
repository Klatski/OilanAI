const FORCE_OFFLINE_KEY = "oilanai_force_offline";

export function readForceOffline(): boolean {
  try {
    return localStorage.getItem(FORCE_OFFLINE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeForceOffline(on: boolean): void {
  try {
    if (on) localStorage.setItem(FORCE_OFFLINE_KEY, "1");
    else localStorage.removeItem(FORCE_OFFLINE_KEY);
  } catch {
    /* ignore */
  }
}

/** Урок в режиме дерева: нет сети или явный тумблер. */
export function shouldUseOfflineLesson(
  navigatorOnLine: boolean,
  forceOffline: boolean
): boolean {
  return forceOffline || !navigatorOnLine;
}
