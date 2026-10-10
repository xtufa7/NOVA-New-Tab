import type { Settings } from '../settings/schema';
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function reconcile(base: unknown, local: unknown, remote: unknown): unknown {
  if (equal(base, local)) return structuredClone(remote);
  if (Array.isArray(base) && Array.isArray(local) && Array.isArray(remote)) {
    const keyed = (items: unknown[]) => items.every((v) => object(v) && typeof v.id === 'string');
    if ([...base, ...local, ...remote].length && keyed(base) && keyed(local) && keyed(remote)) {
      const baseMap = new Map(base.map((v) => [v.id, v])),
        localMap = new Map(local.map((v) => [v.id, v])),
        remoteMap = new Map(remote.map((v) => [v.id, v]));
      const localOrderChanged = !equal(
        base.map((v) => v.id),
        local.map((v) => v.id),
      );
      const order = localOrderChanged
        ? [
            ...local.map((v) => v.id),
            ...remote.filter((v) => !baseMap.has(v.id) && !localMap.has(v.id)).map((v) => v.id),
          ]
        : [
            ...remote.map((v) => v.id),
            ...local.filter((v) => !remoteMap.has(v.id)).map((v) => v.id),
          ];
      return [...new Set(order)].flatMap((id) => {
        if (baseMap.has(id) && !localMap.has(id)) return [];
        if (!localMap.has(id)) return [structuredClone(remoteMap.get(id))];
        const merged = reconcile(baseMap.get(id), localMap.get(id), remoteMap.get(id));
        return merged === undefined ? [] : [merged];
      });
    }
    return structuredClone(local);
  }
  if (object(base) && object(local) && object(remote)) {
    const result = { ...remote };
    for (const key of new Set([...Object.keys(base), ...Object.keys(local)])) {
      if (!(key in local)) {
        if (key in base) delete result[key];
      } else {
        const value = reconcile(base[key], local[key], remote[key]);
        if (value === undefined) delete result[key];
        else result[key] = value;
      }
    }
    return result;
  }
  return structuredClone(local);
}
// Preserve unrelated edits made by another New Tab while this page's debounced save is pending.
export function mergeSettings(base: Settings, local: Settings, remote: Settings): Settings {
  return reconcile(base, local, remote) as Settings;
}
