import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, Firestore, query, orderBy } from 'firebase/firestore';
import { BookingData, BookingRecord, BookingStatus, ConsultationType, DonationData, DonationType } from '../types';

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

// Mock data for demo mode
let mockBookings: BookingRecord[] = [
  {
    id: 'mock-1',
    name: '王小明',
    phone: '0912345678',
    birthDate: '1990-01-01',
    bookingDate: '2023-10-25',
    bookingTime: '14:00',
    type: ConsultationType.CAREER,
    notes: '想問換工作',
    status: BookingStatus.PENDING,
    createdAt: new Date().toISOString()
  },
  {
    id: 'mock-2',
    name: '李小華',
    phone: '0987654321',
    birthDate: '1985-05-15',
    bookingDate: '2023-10-26',
    bookingTime: '10:00',
    type: ConsultationType.MARRIAGE,
    notes: '問姻緣',
    status: BookingStatus.CONFIRMED,
    createdAt: new Date(Date.now() - 86400000).toISOString()
  }
];

export const submitDonation = async (data: DonationData): Promise<boolean> => {
  const newDonation = {
    ...data,
    createdAt: new Date()
  };

  if (!db) {
    console.warn("Firebase not configured. Running in DEMO MODE.");
    console.log("Mock Donation Data:", newDonation);
    return new Promise((resolve) => {
      setTimeout(() => resolve(true), 1500);
    });
  }

  try {
    const docRef = await addDoc(collection(db, "donations"), newDonation);
    console.log("Donation written with ID: ", docRef.id);
    return true;
  } catch (e) {
    console.error("Error adding donation: ", e);
    throw e;
  }
};

export const submitBooking = async (data: BookingData): Promise<boolean> => {
  const newBooking = {
    ...data,
    status: BookingStatus.PENDING,
    createdAt: new Date()
  };

  // If Firebase is not configured or failed to load, we simulate a successful API call
  // This allows the user to see the UI interaction without a valid backend setup immediately.
  if (!db) {
    console.warn("Firebase not configured or keys missing. Running in DEMO MODE.");
    console.log("Mock Submission Data:", newBooking);
    mockBookings.unshift({
      ...newBooking,
      id: `mock-${Date.now()}`,
      createdAt: new Date().toISOString()
    } as BookingRecord);
    return new Promise((resolve) => {
      setTimeout(() => resolve(true), 1500); // Simulate network delay
    });
  }

  try {
    const docRef = await addDoc(collection(db, "bookings"), newBooking);
    console.log("Document written with ID: ", docRef.id);
    return true;
  } catch (e) {
    console.error("Error adding document: ", e);
    throw e;
  }
};

export const getBookings = async (): Promise<BookingRecord[]> => {
  if (!db) {
    return new Promise((resolve) => {
      setTimeout(() => resolve([...mockBookings]), 800);
    });
  }

  try {
    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const bookings: BookingRecord[] = [];
    querySnapshot.forEach((doc) => {
      bookings.push({ id: doc.id, ...doc.data() } as BookingRecord);
    });
    return bookings;
  } catch (e) {
    console.error("Error getting documents: ", e);
    throw e;
  }
};

export const updateBookingStatus = async (id: string, status: BookingStatus): Promise<boolean> => {
  if (!db) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const index = mockBookings.findIndex(b => b.id === id);
        if (index !== -1) {
          mockBookings[index].status = status;
        }
        resolve(true);
      }, 500);
    });
  }

  try {
    const bookingRef = doc(db, "bookings", id);
    await updateDoc(bookingRef, { status });
    return true;
  } catch (e) {
    console.error("Error updating document: ", e);
    throw e;
  }
};