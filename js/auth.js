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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

// Function to send email verification
const sendVerificationEmail = async (user) => {
    try {
        await user.sendEmailVerification();
        console.log("Verification email sent!");
    } catch (error) {
        console.error("Error sending verification email:", error);
        throw error; // Re-throw to handle in the calling function
    }
};

// Function to check password strength
const checkPasswordStrength = (password) => {
    let strength = 0;
    const strengthIndicator = document.getElementById('passwordStrength');
    strengthIndicator.className = 'password-strength'; // Reset class

    if (password.length >= 10 && password.length <= 16) {
        strength += 1;
    }
    if (/[A-Z]/.test(password)) { // At least one caps lock
        strength += 1;
    }
    if (/[0-9]/.test(password)) { // At least one numeric
        strength += 1;
    }
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(password)) { // At least one symbol
        strength += 1;
    }

    if (strength < 2) {
        strengthIndicator.classList.add('weak');
    } else if (strength === 2 || strength === 3) {
        strengthIndicator.classList.add('medium');
    } else if (strength === 4) {
        strengthIndicator.classList.add('strong');
    }
};

// Exporting these for use in script.js
export { auth, db, sendVerificationEmail, checkPasswordStrength };