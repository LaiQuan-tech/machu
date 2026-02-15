import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Firestore } from 'firebase/firestore';
import { BookingData } from '../types';

// NOTE: In a real environment, these keys should come from process.env
// For this demo, we will check if they exist. If not, we run in "Demo Mode".
const firebaseConfig = {
  apiKey: "AIzaSyClNG8TzoEv_XAWSk1yptmWnXMmphChPyI",
  authDomain: "machu-196d8.firebaseapp.com",
  projectId: "machu-196d8",
  storageBucket: "machu-196d8.firebasestorage.app",
  messagingSenderId: "483035524496",
  appId: "1:483035524496:web:3f09fa0e2cd4e7fe741715",
  measurementId: "G-XQ0NCECSGW"
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