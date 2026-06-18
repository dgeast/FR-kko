import { openDB } from 'idb';

const DB_NAME = 'HarmoniceFR_DB';
const DB_VERSION = 1;
const TTL_MS = 3 * 24 * 60 * 60 * 1000; // 3일 (72시간)

export async function initDB() {
  const db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Users table
      if (!db.objectStoreNames.contains('users')) {
        const userStore = db.createObjectStore('users', { keyPath: 'userId' });
        userStore.createIndex('createdAt', 'createdAt');
      }
      
      // Face data table
      if (!db.objectStoreNames.contains('face_data')) {
        const faceStore = db.createObjectStore('face_data', { keyPath: 'faceId' });
        faceStore.createIndex('userId', 'userId');
        faceStore.createIndex('createdAt', 'createdAt');
      }

      // Chat history table
      if (!db.objectStoreNames.contains('chat_history')) {
        const chatStore = db.createObjectStore('chat_history', { keyPath: 'chatId' });
        chatStore.createIndex('userId', 'userId');
        chatStore.createIndex('createdAt', 'createdAt');
      }
    },
  });

  // 앱 시작 시 3일 초과된 데이터 자동 삭제 로직 실행
  await purgeOldData(db);
  return db;
}

async function purgeOldData(db) {
  const now = Date.now();
  const stores = ['users', 'face_data', 'chat_history'];

  for (const storeName of stores) {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const index = store.index('createdAt');
    
    // 현재 시간에서 TTL_MS를 뺀 시간 이전의 데이터를 모두 조회
    const expiredBound = IDBKeyRange.upperBound(now - TTL_MS);
    const expiredKeys = await index.getAllKeys(expiredBound);

    for (const key of expiredKeys) {
      await store.delete(key);
      console.log(`[Purge] Deleted expired record from ${storeName}:`, key);
    }
    
    await tx.done;
  }
}

export async function registerUser(user) {
  const db = await initDB();
  const tx = db.transaction('users', 'readwrite');
  await tx.objectStore('users').put({
    ...user,
    createdAt: Date.now()
  });
  await tx.done;
}

export async function getUser(userId) {
  const db = await initDB();
  return await db.transaction('users').objectStore('users').get(userId);
}

export async function getAllUsers() {
  const db = await initDB();
  return await db.transaction('users').objectStore('users').getAll();
}

export async function saveFaceData(faceData) {
  const db = await initDB();
  const tx = db.transaction('face_data', 'readwrite');
  await tx.objectStore('face_data').put({
    ...faceData,
    createdAt: Date.now()
  });
  await tx.done;
}

export async function getAllFaceData() {
  const db = await initDB();
  return await db.transaction('face_data').objectStore('face_data').getAll();
}

export async function saveChat(chat) {
  const db = await initDB();
  const tx = db.transaction('chat_history', 'readwrite');
  await tx.objectStore('chat_history').put({
    ...chat,
    createdAt: Date.now()
  });
  await tx.done;
}

export async function getChats(userId) {
  const db = await initDB();
  const tx = db.transaction('chat_history');
  const index = tx.objectStore('chat_history').index('userId');
  const allChats = await index.getAll(userId);
  return allChats.sort((a, b) => a.createdAt - b.createdAt);
}
