// src/lib/firebaseAdmin.ts
import { initializeApp, getApps, getApp, type App, type ServiceAccount } from 'firebase-admin/app';
import { getAuth as getAdminAuth, type Auth } from 'firebase-admin/auth';
import { credential } from 'firebase-admin';

// This function safely parses the service account key from the environment variable.
function getServiceAccount(): ServiceAccount | undefined {
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountString) {
        // In a production environment, you should throw an error here.
        // For development, we can allow it to proceed, though server-side auth will fail.
        console.warn("FIREBASE_SERVICE_ACCOUNT environment variable is not set. Server-side features like email sending might not work. Please check your project settings.");
        return undefined;
    }
    try {
        return JSON.parse(serviceAccountString);
    } catch (e) {
        console.error("Error parsing FIREBASE_SERVICE_ACCOUNT JSON:", e);
        return undefined;
    }
}

const serviceAccount = getServiceAccount();

// This function ensures that the Firebase Admin app is initialized only once.
function getFirebaseAdminApp(): App {
  const appName = "firebase-admin-app";
  const existingApp = getApps().find(app => app.name === appName);
  if (existingApp) {
    return existingApp;
  }
  
  if (!serviceAccount) {
    // If we can't get a service account, we initialize without credentials.
    // This will allow the app to build, but server-side auth will fail at runtime
    // until the .env variable is set.
    return initializeApp(undefined, appName);
  }
  
  return initializeApp({
    credential: credential.cert(serviceAccount),
  }, appName);
}

function getAuth(): Auth {
  return getAdminAuth(getFirebaseAdminApp());
}

export { getAuth };
