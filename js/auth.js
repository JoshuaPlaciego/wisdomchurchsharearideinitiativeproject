// js/auth.js

// Import the necessary functions from the Firebase SDKs using modular syntax
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { 
    getAuth, 
    sendEmailVerification, 
    sendPasswordResetEmail, 
    checkActionCode, 
    applyActionCode, 
    confirmPasswordReset,
    createUserWithEmailAndPassword, // Add this if your script.js calls auth.createUserWithEmailAndPassword
    signInWithEmailAndPassword,   // Add this if your script.js calls auth.signInWithEmailAndPassword
    signOut,                      // Add this if your script.js calls auth.signOut
    onAuthStateChanged            // Add this if your script.js uses auth.onAuthStateChanged
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

// Function to send email verification
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

// Function to check password strength (corrected to accept an element argument)
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

    if (password.length >= 10 && password.length <= 16) {
        strength += 1;
    } else {
        feedback.push("10-16 chars");
    }

    if (/[A-Z]/.test(password)) { // At least one caps lock
        strength += 1;
    } else {
        feedback.push("1 capital");
    }

    if (/[0-9]/.test(password)) { // At least one numeric
        strength += 1;
    } else {
        feedback.push("1 number");
    }

    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(password)) { // At least one symbol
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

// Exporting these for use in script.js
export { 
    app, // Export app instance if needed elsewhere (though usually not directly)
    auth, 
    db, 
    sendVerificationEmail, 
    checkPasswordStrength, 
    sendPasswordResetEmail, 
    checkActionCode, 
    applyActionCode, 
    confirmPasswordReset, 
    serverTimestamp,
    // Export functions that script.js calls directly on `auth` (like createUserWithEmailAndPassword)
    // but are technically standalone modular functions.
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
}; 

