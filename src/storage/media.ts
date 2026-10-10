let database: Promise<IDBDatabase> | undefined;
function db() {
  return (database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('nova-media', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('blobs');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }));
}
export async function putMedia(blob: Blob, id: string = crypto.randomUUID()): Promise<string> {
  const database = await db();
  await new Promise<void>((resolve, reject) => {
    const tx = database.transaction('blobs', 'readwrite');
    tx.objectStore('blobs').put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return id;
}
export async function getMedia(id: string): Promise<Blob | undefined> {
  const database = await db();
  return new Promise((resolve, reject) => {
    const r = database.transaction('blobs').objectStore('blobs').get(id);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function removeMedia(id: string) {
  const database = await db();
  await new Promise<void>((resolve, reject) => {
    const tx = database.transaction('blobs', 'readwrite');
    tx.objectStore('blobs').delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
export async function clearMedia() {
  const database = await db();
  await new Promise<void>((resolve, reject) => {
    const tx = database.transaction('blobs', 'readwrite');
    tx.objectStore('blobs').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
export async function mediaKeys(): Promise<string[]> {
  const database = await db();
  return new Promise((resolve, reject) => {
    const request = database.transaction('blobs').objectStore('blobs').getAllKeys();
    request.onsuccess = () => resolve(request.result.map(String));
    request.onerror = () => reject(request.error);
  });
}
export async function putMediaBatch(entries: { id: string; blob: Blob }[]) {
  const database = await db();
  await new Promise<void>((resolve, reject) => {
    const tx = database.transaction('blobs', 'readwrite');
    for (const entry of entries) tx.objectStore('blobs').put(entry.blob, entry.id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Media transaction aborted.'));
  });
}
