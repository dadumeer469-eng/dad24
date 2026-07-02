const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json'); // I need to get credentials

// Actually, I can use the existing firebase config and `firebase-admin`?
