import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyDOcbWnWERAiJ21LHk1YLHg1OMuwbV5vi0',
  authDomain: 'cactus-b40b1.firebaseapp.com',
  projectId: 'cactus-b40b1',
  storageBucket: 'cactus-b40b1.firebasestorage.app',
  messagingSenderId: '117082493235',
  appId: '1:117082493235:web:ed58151408477ec7846e46',
};

const app = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);
