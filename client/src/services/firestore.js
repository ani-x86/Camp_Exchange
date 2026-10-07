import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

// ── Users Collection ──────────────────────────────────────────────

/**
 * Fetch user profile from Firestore by UID
 */
export async function getUserProfile(uid) {
  if (!uid) return null;
  const docRef = doc(db, 'users', uid);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() };
  }
  return null;
}

/**
 * Upsert user profile (sync on login/signup)
 */
export async function syncUserProfile(user, additionalData = {}) {
  if (!user || !user.uid) return null;
  const docRef = doc(db, 'users', user.uid);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    const newUserData = {
      uid: user.uid,
      email: user.email || additionalData.collegeEmail || '',
      displayName: additionalData.displayName || user.displayName || 'Campus Student',
      phoneNumber: user.phoneNumber || additionalData.phoneNumber || '',
      prn: additionalData.prn || '',
      photoURL: user.photoURL || '',
      role: 'student',
      verificationStatus: 'verified',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...additionalData,
    };
    await setDoc(docRef, newUserData);
    return { id: user.uid, ...newUserData };
  } else {
    // Update existing user with any newly provided non-empty fields
    const updates = {
      updatedAt: serverTimestamp(),
    };
    if (additionalData.prn) updates.prn = additionalData.prn;
    if (additionalData.phoneNumber) updates.phoneNumber = additionalData.phoneNumber;
    if (additionalData.displayName) updates.displayName = additionalData.displayName;
    await updateDoc(docRef, updates);
    return { id: snap.id, ...snap.data(), ...updates };
  }
}

// ── Products Collection ───────────────────────────────────────────

/**
 * Get all active products, optionally filtered by category
 */
export async function getProducts(categoryFilter = null) {
  try {
    const productsRef = collection(db, 'products');
    let q = query(productsRef);
    if (categoryFilter && categoryFilter !== 'all') {
      q = query(productsRef, where('category', '==', categoryFilter));
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, _id: d.id, ...d.data() }));
  } catch (err) {
    console.error('Error fetching products from Firestore:', err);
    return [];
  }
}

/**
 * Get product by ID
 */
export async function getProductById(productId) {
  if (!productId) return null;
  const docRef = doc(db, 'products', productId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return { id: snap.id, _id: snap.id, ...snap.data() };
  }
  return null;
}

/**
 * Create a new product listing
 */
export async function createProduct(productData, user) {
  const productsRef = collection(db, 'products');
  const payload = {
    ...productData,
    price: Number(productData.price) || 0,
    sellerId: user?.uid || 'anonymous',
    sellerName: user?.displayName || user?.name || 'Student Seller',
    sellerEmail: user?.email || '',
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const docRef = await addDoc(productsRef, payload);
  return { id: docRef.id, _id: docRef.id, ...payload };
}

/**
 * Update a product listing
 */
export async function updateProduct(productId, updates) {
  const docRef = doc(db, 'products', productId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
  return { id: productId, ...updates };
}

/**
 * Delete a product listing
 */
export async function deleteProduct(productId) {
  const docRef = doc(db, 'products', productId);
  await deleteDoc(docRef);
  return true;
}

// ── Cart Collection ───────────────────────────────────────────────

/**
 * Get user cart
 */
export async function getUserCart(uid) {
  if (!uid) return [];
  const cartDoc = doc(db, 'carts', uid);
  const snap = await getDoc(cartDoc);
  if (snap.exists()) {
    return snap.data().items || [];
  }
  return [];
}

/**
 * Save / Update user cart
 */
export async function saveUserCart(uid, items) {
  if (!uid) return;
  const cartDoc = doc(db, 'carts', uid);
  await setDoc(cartDoc, {
    items,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

// ── Orders Collection ─────────────────────────────────────────────

/**
 * Place an order
 */
export async function createOrder(orderData, user) {
  const ordersRef = collection(db, 'orders');
  const payload = {
    buyerId: user?.uid,
    buyerName: user?.displayName || 'Student Buyer',
    buyerEmail: user?.email,
    items: orderData.items || [],
    totalAmount: orderData.totalAmount || 0,
    status: 'completed',
    paymentMethod: orderData.paymentMethod || 'cash_on_delivery',
    createdAt: serverTimestamp(),
  };
  const docRef = await addDoc(ordersRef, payload);
  return { id: docRef.id, ...payload };
}

/**
 * Get orders for a user
 */
export async function getUserOrders(uid) {
  if (!uid) return [];
  const ordersRef = collection(db, 'orders');
  const q = query(ordersRef, where('buyerId', '==', uid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
