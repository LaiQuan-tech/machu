import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Firestore } from 'firebase/firestore';
import { BookingData } from '../types';

// NOTE: In a real environment, these keys should come from process.env
// For this demo, we will check if they exist. If not, we run in "Demo Mode".
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

let app: FirebaseApp | undefined;
let db: Firestore | undefined;

const isConfigured = !!firebaseConfig.apiKey;

if (isConfigured && getApps().length === 0) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log("Firebase initialized successfully");
  } catch (error) {
    console.error("Firebase initialization failed", error);
  }
}

export const submitBooking = async (data: BookingData): Promise<boolean> => {
  // If Firebase is not configured or failed to load, we simulate a successful API call
  // This allows the user to see the UI interaction without a valid backend setup immediately.
  if (!db) {
    console.warn("Firebase not configured or keys missing. Running in DEMO MODE.");
    console.log("Mock Submission Data:", data);
    return new Promise((resolve) => {
      setTimeout(() => resolve(true), 1500); // Simulate network delay
    });
  }

  try {
    const docRef = await addDoc(collection(db, "bookings"), {
      ...data,
      createdAt: new Date()
    });
    console.log("Document written with ID: ", docRef.id);
    return true;
  } catch (e) {
    console.error("Error adding document: ", e);
    throw e;
  }
};