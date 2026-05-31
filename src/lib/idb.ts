import type { StoryDocument } from "../types";

const DB_NAME = "pet-memory-workbench";
const DB_VERSION = 2;
const STORE_NAME = "stories";
const MEDIA_STORE_NAME = "media_blobs";

type MediaBlobRecord = {
  id: string;
  blob: Blob;
  mimeType?: string;
  sizeBytes?: number;
  createdAt: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(MEDIA_STORE_NAME)) {
        db.createObjectStore(MEDIA_STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function listStories(): Promise<StoryDocument[]> {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).getAll();

    request.onsuccess = () => {
      const items = (request.result as StoryDocument[]).sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt),
      );
      resolve(items);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getStory(id: string): Promise<StoryDocument | undefined> {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(id);

    request.onsuccess = () => resolve(request.result as StoryDocument | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function saveStory(story: StoryDocument): Promise<void> {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(story);

    transaction.oncomplete = () => {
      void listStories().then((items) => gcUnusedMedia(items));
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function deleteStory(id: string): Promise<void> {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);

    transaction.oncomplete = () => {
      void listStories().then((items) => gcUnusedMedia(items));
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function saveMediaBlob(blob: Blob): Promise<string> {
  const db = await openDb();
  const id = crypto.randomUUID();
  const record: MediaBlobRecord = {
    id,
    blob,
    mimeType: blob.type || undefined,
    sizeBytes: blob.size,
    createdAt: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(MEDIA_STORE_NAME, "readwrite");
    tx.objectStore(MEDIA_STORE_NAME).put(record);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getMediaBlob(mediaId: string): Promise<Blob | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MEDIA_STORE_NAME, "readonly");
    const req = tx.objectStore(MEDIA_STORE_NAME).get(mediaId);
    req.onsuccess = () => resolve((req.result as MediaBlobRecord | undefined)?.blob);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteMediaBlob(mediaId: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MEDIA_STORE_NAME, "readwrite");
    tx.objectStore(MEDIA_STORE_NAME).delete(mediaId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function gcUnusedMedia(storiesArg?: StoryDocument[]): Promise<void> {
  const stories = storiesArg ?? (await listStories());
  const usedMediaIds = new Set<string>();

  for (const story of stories) {
    if (
      story.cover?.type === "video" &&
      (story.cover.source === "upload" || (!story.cover.source && story.cover.mediaId)) &&
      story.cover.mediaId
    ) {
      usedMediaIds.add(story.cover.mediaId);
    }
    for (const scene of story.scenes) {
      const media = scene.media;
      if (
        media?.type === "video" &&
        (media.source === "upload" || (!media.source && media.mediaId)) &&
        media.mediaId
      ) {
        usedMediaIds.add(media.mediaId);
      }
    }
  }

  const db = await openDb();
  const allRecords: MediaBlobRecord[] = await new Promise((resolve, reject) => {
    const tx = db.transaction(MEDIA_STORE_NAME, "readonly");
    const req = tx.objectStore(MEDIA_STORE_NAME).getAll();
    req.onsuccess = () => resolve((req.result as MediaBlobRecord[]) ?? []);
    req.onerror = () => reject(req.error);
  });

  const staleIds = allRecords
    .map((record) => record.id)
    .filter((mediaId) => !usedMediaIds.has(mediaId));
  if (!staleIds.length) return;

  await Promise.all(staleIds.map((mediaId) => deleteMediaBlob(mediaId)));
}
