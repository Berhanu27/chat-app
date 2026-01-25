import { initializeApp } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, doc, getDoc, getDocs, getFirestore, query, setDoc, where } from "firebase/firestore";
import { toast } from "react-toastify";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const signup = async (username, email, password) => {
  try {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    const user = res.user;
    await setDoc(doc(db, "users", user.uid), {
      id: user.uid,
      username: username.toLowerCase(),
      email,
      name: "",
      avatar: "",
      bio: "Hey there i am using chat app",
      lastSeen: Date.now(),
      createdAt: Date.now()
    });
    await setDoc(doc(db, "chats", user.uid), {
      chatData: []
    });
    toast.success("Account created!");
  } catch (error) {
    console.error(error);
    toast.error(error.code.split('/')[1].replace(/-/g, ' '));
  }
};

const login = async (email, password) => {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    toast.success("Logged in!");
  } catch (error) {
    console.error(error);
    toast.error(error.code.split('/')[1].replace(/-/g, ' '));
  }
};
const logout = async () => {
  try {
    await signOut(auth);
    toast.success("Logged out!");
  } catch (error) {
    console.error(error);
    toast.error(error.code.split('/')[1].replace(/-/g, ' '));
  }
};
const resetPass = async (email) => {
  if (!email) {
    toast.error("Enter your email");
    return;
  }
  
  try {
    const userRef = collection(db, 'users');
    const q = query(userRef, where('email', '==', email));
    const querySnap = await getDocs(q);
    
    if (!querySnap.empty) {
      await sendPasswordResetEmail(auth, email);
      toast.success("Password reset email sent! Check your inbox.");
    } else {
      toast.error("Email doesn't exist!");
    }
  } catch (error) {
    console.error(error);
    toast.error(error.message);
  }
};

export { auth, db, signup, login , logout, resetPass };
