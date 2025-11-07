// lib/fetchFirebaseServices.js
import { collection, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export async function getServicesByCategory(categoryName) {
  const categoryRef = doc(db, 'services', categoryName); // your collection "services" and document = categoryName
  const categorySnap = await getDoc(categoryRef);

  if (!categorySnap.exists()) return [];
  return categorySnap.data().items || [];
}
