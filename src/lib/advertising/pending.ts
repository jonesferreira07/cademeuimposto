const STORAGE_KEY = "cmi-ad-pending-v1";
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export function forgetPendingAd(storage: StorageLike) {
  try { storage.removeItem(STORAGE_KEY); } catch { /* Navegador pode bloquear armazenamento. */ }
}
export function savePendingAd(storage: StorageLike, token: string | null, expiresAt: string) {
  if (!token) return;
  try { storage.setItem(STORAGE_KEY, JSON.stringify({ token, expiresAt })); } catch { /* O código do pedido continua disponível na tela. */ }
}
export function pendingAdToken(storage: StorageLike, now = Date.now()) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    if (raw.length > 6500) { forgetPendingAd(storage); return null; }
    const value = JSON.parse(raw);
    if (typeof value.token !== "string" || value.token.length > 6000 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value.token) || !Number.isFinite(Date.parse(value.expiresAt)) || Date.parse(value.expiresAt) <= now) {
      forgetPendingAd(storage); return null;
    }
    return value.token as string; // A assinatura e a validade serão verificadas novamente no servidor.
  } catch { forgetPendingAd(storage); return null; }
}
