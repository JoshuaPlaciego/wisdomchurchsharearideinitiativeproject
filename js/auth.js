// js/auth.js

// Import the necessary functions from the Firebase SDKs using modular syntax
// IMPORTANT: Corrected the module specifier URLs to be clean strings.
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { 
    getAuth, 
    sendEmailVerification, 
    sendPasswordResetEmail, 
    checkActionCode, 
    applyActionCode, 
    confirmPasswordReset,
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,   
    signOut,                      
    onAuthStateChanged,
    updatePassword // Added updatePassword
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js"; 
import { getFirestore, collection, doc, setDoc, updateDoc, getDoc, query, where, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyDuRG37e5qWu1kN7aZQVBwyQwj1EbIieHE",
    authDomain: "wcsharearideinitiativeproject.firebaseapp.com",
    databaseURL: "https://wcsharearideinitiativeproject-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "wcsharearideinitiativeproject",
    storageBucket: "wcsharearideinitiativeproject.firebasestorage.app",
    messagingSenderId: "169826993800",
    appId: "1:169826993800:web:367bee8597df79406b813d",
    measurementId: "G-7RJV9Q4NCT"
};

// Initialize Firebase using the modular syntax
const app = initializeApp(firebaseConfig);

// Get service instances using the modular syntax
const auth = getAuth(app);
const db = getFirestore(app);

/**
 * Sends an email verification link to the provided user.
 * @param {object} user - The Firebase User object.
 * @throws {Error} If there's an error sending the email.
 */
const sendVerificationEmail = async (user) => {
    try {
        // IMPORTANT: Configure actionCodeSettings for your GitHub Pages URL
        // Go to Firebase Console -> Authentication -> Templates -> Email address verification
        // Ensure the domain 'joshuaplaciego.github.io' is authorized for your project.
        const actionCodeSettings = {
            url: 'https://joshuaplaciego.github.io/wisdomchurchsharearideinitiativeproject/', // Your web app's public URL
            handleCodeInApp: true, // This is crucial for returning to your app
        };
        await sendEmailVerification(user, actionCodeSettings); // Use modular sendEmailVerification
        console.log("Verification email sent!");
    } catch (error) {
        console.error("Error sending verification email:", error);
        throw error; // Re-throw to handle in the calling function
    }
};

/**
 * Checks the strength of a given password and provides feedback.
 * @param {string} password - The password string to check.
 * @param {HTMLElement} strengthElement - The HTML element to display the strength feedback.
 */
const checkPasswordStrength = (password, strengthElement) => {
    // If a specific strengthElement is passed, use it; otherwise, default to 'passwordStrength'
    const actualStrengthElement = strengthElement || document.getElementById('passwordStrength');

    if (!actualStrengthElement) {
        console.warn("Password strength indicator element not found.");
        return;
    }

    actualStrengthElement.className = 'password-strength'; // Reset class

    let strength = 0;
    const feedback = [];

    // Check length (10-16 characters)
    if (password.length >= 10 && password.length <= 16) {
        strength += 1;
    } else {
        feedback.push("10-16 chars");
    }

    // Check for at least one uppercase letter
    if (/[A-Z]/.test(password)) { 
        strength += 1;
    } else {
        feedback.push("1 capital");
    }

    // Check for at least one number
    if (/[0-9]/.test(password)) { 
        strength += 1;
    } else {
        feedback.push("1 number");
    }

    // Check for at least one symbol
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(password)) { 
        strength += 1;
    } else {
        feedback.push("1 symbol");
    }

    let strengthText = "";
    let strengthClass = "";

    if (strength === 4) {
        strengthText = "Strong";
        strengthClass = "strong";
    } else if (strength === 2 || strength === 3) {
        strengthText = "Medium";
        strengthClass = "medium";
    } else {
        strengthText = "Weak";
        strengthClass = "weak";
    }

    actualStrengthElement.textContent = strengthText + (feedback.length > 0 ? ` (${feedback.join(", ")})` : "");
    actualStrengthElement.classList.add(strengthClass);
};

/**
 * Fetches a user's profile data from the 'users' Firestore collection.
 * @param {string} uid - The unique ID of the user.
 * @returns {Promise<object|null>} A promise that resolves to the user's profile data or null if not found.
 * @throws {Error} If there's an error fetching the document.
 */
const getUserProfile = async (uid) => {
    try {
        const userDocRef = doc(db, "users", uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            console.log("User profile data:", userDocSnap.data());
            return userDocSnap.data();
        } else {
            console.log(`No user profile document found for UID: ${uid}`);
            return null;
        }
    } catch (error) {
        console.error("Error getting user profile:", error);
        throw error;
    }
};

/**
 * Updates the 'accountStatus' field for a user in the 'users' Firestore collection.
 * Includes a server timestamp for the update time.
 * @param {string} uid - The unique ID of the user.
 * @param {string} status - The new account status (e.g., "Active", "Awaiting Email Verification", "Disabled").
 * @returns {Promise<void>} A promise that resolves when the update is complete.
 * @throws {Error} If there's an error updating the document.
 */
const updateUserAccountStatus = async (uid, status) => {
    try {
        const userDocRef = doc(db, "users", uid);
        await updateDoc(userDocRef, {
            accountStatus: status,
            updatedAt: serverTimestamp() // Use serverTimestamp for consistent timestamps
        });
        console.log(`User ${uid} account status updated to: ${status}`);
    } catch (error) {
        console.error("Error updating user account status:", error);
        throw error;
    }
};


// Exporting these for use in script.js and other modules
export { 
    app, 
    auth, 
    db, 
    sendVerificationEmail, 
    checkPasswordStrength, 
    sendPasswordResetEmail, 
    checkActionCode, 
    applyActionCode, 
    confirmPasswordReset, 
    serverTimestamp, // Make sure serverTimestamp is exported
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updatePassword, // Export the new function
    getUserProfile, // Export the new function
    updateUserAccountStatus // Export the new function
};
