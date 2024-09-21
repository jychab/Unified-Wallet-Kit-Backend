// The Firebase Admin SDK to access Firestore.
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { defineString } from "firebase-functions/params";
initializeApp();

export const db = getFirestore();
export const storage = getStorage();
db.settings({
  ignoreUndefinedProperties: true,
});

export const telegramApiKey = defineString("TELEGRAM_API_KEY");
