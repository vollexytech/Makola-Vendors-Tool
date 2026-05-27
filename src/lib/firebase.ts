import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, updateDoc, deleteDoc, writeBatch, query, where, getDocFromServer } from 'firebase/firestore';
import { Vendor, Product } from '../types';
import firebaseConfig from '../firebase-applet-config.json';

// Detect if Firebase setup is complete (needs a non-empty apiKey)
export const isFirebaseConfigured = !!(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== "");

let app: any = null;
let db: any = null;
let auth: any = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
    auth = getAuth(app);
    console.log("Firebase initialized successfully with live cloud connection.");
  } catch (err) {
    console.error("Firebase initialization failed; falling back to mock environment:", err);
  }
}

// Ensure database reference and authorization are safely exported/mocked
export { db, auth };

// --- HARDENED ERROR HANDLING ARCHITECTURE ---
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error Detailed Payload: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- INITIALIZATION CONNECTION VALIDATION ---
async function testConnection() {
  if (isFirebaseConfigured && db) {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.warn("Firebase client offline warning in initial testConnection verification.");
      }
    }
  }
}
testConnection();

// --- FIRESTORE / MOCK OPERATIONS DUAL BRIDGE ---
const MOCK_VENDORS_KEY = 'macular_vendor_sessions';
const MOCK_PRODUCTS_KEY_PREFIX = 'macular_vendor_products_';

// Retrieve all local mock vendors
function getLocalVendors(): Vendor[] {
  try {
    const data = localStorage.getItem(MOCK_VENDORS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

// Store mock vendors back to localStorage
function saveLocalVendors(vendors: Vendor[]) {
  localStorage.setItem(MOCK_VENDORS_KEY, JSON.stringify(vendors));
}

// Retrieve mock products for a vendor
function getLocalProducts(vendorId: string): Product[] {
  try {
    const data = localStorage.getItem(`${MOCK_PRODUCTS_KEY_PREFIX}${vendorId}`);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

// Save mock products for a vendor
function saveLocalProducts(vendorId: string, products: Product[]) {
  localStorage.setItem(`${MOCK_PRODUCTS_KEY_PREFIX}${vendorId}`, JSON.stringify(products));
}

/**
 * Saves or updates a vendor profile session.
 */
export async function saveVendorProfile(vendor: Vendor): Promise<void> {
  const cleanVendor = { ...vendor, updatedAt: new Date().toISOString() };
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'vendors', vendor.id), cleanVendor);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `vendors/${vendor.id}`);
    }
  } else {
    // Mock Mode
    const vendors = getLocalVendors();
    const idx = vendors.findIndex(v => v.id === vendor.id);
    if (idx >= 0) {
      vendors[idx] = cleanVendor;
    } else {
      vendors.push(cleanVendor);
    }
    saveLocalVendors(vendors);
  }
}

/**
 * Retrieves a vendor session either by ID (authUid/vendorId) or serialCode value.
 */
export async function fetchVendor(idOrSerial: string): Promise<Vendor | null> {
  if (isFirebaseConfigured && db) {
    try {
      // First assume ID lookup
      const docRef = doc(db, 'vendors', idOrSerial);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return snapshot.data() as Vendor;
      }

      // Secure Fallback query filtering by specific serialCode attribute directly
      const colRef = collection(db, 'vendors');
      const q = query(colRef, where('serialCode', '==', idOrSerial));
      const querySnap = await getDocs(q);
      let matchedVendor: Vendor | null = null;
      querySnap.forEach((doc) => {
        matchedVendor = doc.data() as Vendor;
      });
      return matchedVendor;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `vendors/${idOrSerial}`);
      return null;
    }
  } else {
    // Mock Mode
    const vendors = getLocalVendors();
    return vendors.find(v => v.id === idOrSerial || v.serialCode === idOrSerial) || null;
  }
}

/**
 * Fetch all vendors (for Admin backend review).
 */
export async function fetchAllVendors(): Promise<Vendor[]> {
  if (isFirebaseConfigured && db) {
    try {
      const querySnap = await getDocs(collection(db, 'vendors'));
      const list: Vendor[] = [];
      querySnap.forEach((doc) => {
        list.push(doc.data() as Vendor);
      });
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'vendors');
      return [];
    }
  } else {
    return getLocalVendors();
  }
}

/**
 * Removes a vendor from database (used for 30-day purged options).
 */
export async function purgeVendorRecord(vendorId: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, 'vendors', vendorId));
      
      const prodColRef = collection(db, 'vendors', vendorId, 'products');
      const productsSnapshot = await getDocs(prodColRef);
      const batch = writeBatch(db);
      productsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `vendors/${vendorId}`);
    }
  } else {
    const vendors = getLocalVendors();
    saveLocalVendors(vendors.filter(v => v.id !== vendorId));
    localStorage.removeItem(`${MOCK_PRODUCTS_KEY_PREFIX}${vendorId}`);
  }
}

/**
 * Save / Update a product under a specific vendor's catalog.
 */
export async function saveProductToCatalog(vendorId: string, product: Product): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'vendors', vendorId, 'products', product.id), product);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `vendors/${vendorId}/products/${product.id}`);
    }
  } else {
    const products = getLocalProducts(vendorId);
    const idx = products.findIndex(p => p.id === product.id);
    if (idx >= 0) {
      products[idx] = product;
    } else {
      products.push(product);
    }
    saveLocalProducts(vendorId, products);
  }
}

/**
 * Retrieve all cataloged products for a specific vendor.
 */
export async function fetchVendorProducts(vendorId: string): Promise<Product[]> {
  if (isFirebaseConfigured && db) {
    try {
      const querySnap = await getDocs(collection(db, 'vendors', vendorId, 'products'));
      const list: Product[] = [];
      querySnap.forEach((doc) => {
        list.push(doc.data() as Product);
      });
      return list.sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `vendors/${vendorId}/products`);
      return [];
    }
  } else {
    return getLocalProducts(vendorId);
  }
}

/**
 * Trigger authenticating via Google login popup.
 */
export async function loginWithGooglePopup(): Promise<User | null> {
  if (isFirebaseConfigured && auth) {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      return result.user;
    } catch (error) {
      console.error("Google login popup error:", error);
      throw error;
    }
  } else {
    // Simulated auth user for mock mode
    return {
      uid: 'mock-google-uid-123',
      displayName: 'Premium Vendor',
      email: 'kingjudecole@gmail.com', // Aligning with developer email for seamless access
      emailVerified: true,
      phoneNumber: '+2348000000000',
    } as any;
  }
}

/**
 * Log out current Firebase Auth session.
 */
export async function logUserOut(): Promise<void> {
  if (isFirebaseConfigured && auth) {
    await signOut(auth);
  }
}
