type StoredDoc = {
  id: string;
  loanId: string;
  key: string;
  label: string;
  filename: string;
  dataUrl: string;
  size?: number;
  uploadedAt?: number;
};

const DB_NAME = "lms-doc-store";
const DB_VERSION = 2;
const STORE_NAME = "loanDocs";
const KYC_STORE = "kycDocs";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("loanId", "loanId", { unique: false });
      }
      if (!db.objectStoreNames.contains(KYC_STORE)) {
        db.createObjectStore(KYC_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function buildId(loanId: string, key: string) {
  return `${loanId}:${key}`;
}

export async function saveLoanDocs(loanId: string, docs: Array<Omit<StoredDoc, "id" | "loanId">>) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    docs.forEach((doc) => {
      const record: StoredDoc = {
        id: buildId(loanId, doc.key),
        loanId,
        ...doc,
      };
      store.put(record);
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getLoanDoc(loanId: string, key: string): Promise<StoredDoc | null> {
  const db = await openDb();
  const result = await new Promise<StoredDoc | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(buildId(loanId, key));
    request.onsuccess = () => resolve((request.result as StoredDoc) || null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return result;
}

export async function getLoanDocs(loanId: string): Promise<StoredDoc[]> {
  const db = await openDb();
  const result = await new Promise<StoredDoc[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const idx = store.index("loanId");
    const request = idx.getAll(loanId);
    request.onsuccess = () => resolve((request.result as StoredDoc[]) || []);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return result;
}

type StoredKycDoc = {
  id: string;
  email: string;
  key: string;
  dataUrl: string;
};

function buildKycId(email: string, key: string) {
  return `${email}:${key}`;
}

export async function saveKycDocs(email: string, docs: Array<Omit<StoredKycDoc, "id" | "email">>) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(KYC_STORE, "readwrite");
    const store = tx.objectStore(KYC_STORE);
    docs.forEach((doc) => {
      const record: StoredKycDoc = {
        id: buildKycId(email, doc.key),
        email,
        ...doc,
      };
      store.put(record);
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getKycDoc(email: string, key: string): Promise<StoredKycDoc | null> {
  const db = await openDb();
  const result = await new Promise<StoredKycDoc | null>((resolve, reject) => {
    const tx = db.transaction(KYC_STORE, "readonly");
    const store = tx.objectStore(KYC_STORE);
    const request = store.get(buildKycId(email, key));
    request.onsuccess = () => resolve((request.result as StoredKycDoc) || null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return result;
}
