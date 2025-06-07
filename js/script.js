import { auth, db, sendVerificationEmail, checkPasswordStrength } from './auth.js';

// Get elements
const signupButton = document.getElementById('signupButton');
const loginButton = document.getElementById('loginButton');
const signupModal = document.getElementById('signupModal');
const loginModal = document.getElementById('loginModal');
const emailVerificationLoginModal = document.getElementById('emailVerificationLoginModal');
const hybridRoleModal = document.getElementById('hybridRoleModal');

const closeButtons = document.querySelectorAll('.close-button');
const signupForm = document.getElementById('signupForm');
const loginForm = document.getElementById('loginForm');
const emailVerificationLoginForm = document.getElementById('emailVerificationLoginForm');

const signupMessage = document.getElementById('signupMessage');
const loginMessage = document.getElementById('loginMessage');
const verificationLoginMessage = document.getElementById('verificationLoginMessage');

const signupPassword = document.getElementById('signupPassword');
const signupConfirmPassword = document.getElementById('signupConfirmPassword');

const loginAsDriverBtn = document.getElementById('loginAsDriver');
const loginAsPassengerBtn = document.getElementById('loginAsPassenger');

// NCR Cities (Hardcoded for now, could be fetched from an API/DB later)
const ncrCities = [
    "Caloocan", "Las Piñas", "Makati", "Malabon", "Mandaluyong", "Manila",
    "Marikina", "Muntinlupa", "Navotas", "Parañaque", "Pasay", "Pasig",
    "Pateros", "Quezon City", "San Juan", "Taguig", "Valenzuela"
];

// Populate NCR Cities dropdown
const signupCitySelect = document.getElementById('signupCity');
ncrCities.forEach(city => {
    const option = document.createElement('option');
    option.value = city;
    option.textContent = city;
    signupCitySelect.appendChild(option);
});

// Event Listeners for Modals
signupButton.addEventListener('click', () => {
    signupModal.style.display = 'flex';
    signupMessage.style.display = 'none'; // Clear previous messages
    signupForm.reset(); // Clear form fields
});

loginButton.addEventListener('click', () => {
    loginModal.style.display = 'flex';
    loginMessage.style.display = 'none'; // Clear previous messages
    loginForm.reset(); // Clear form fields
});

closeButtons.forEach(button => {
    button.addEventListener('click', () => {
        button.closest('.modal').style.display = 'none';
        clearMessages();
    });
});

window.addEventListener('click', (event) => {
    if (event.target == signupModal) {
        signupModal.style.display = 'none';
        clearMessages();
    }
    if (event.target == loginModal) {
        loginModal.style.display = 'none';
        clearMessages();
    }
    if (event.target == emailVerificationLoginModal) {
        // Prevent closing by clicking outside for this specific modal
    }
    if (event.target == hybridRoleModal) {
        // Prevent closing by clicking outside for this specific modal
    }
});

// Password Strength Indicator
signupPassword.addEventListener('input', () => {
    checkPasswordStrength(signupPassword.value);
});


// Helper to display messages
const showMessage = (element, message, type) => {
    element.textContent = message;
    element.className = `message-box ${type}`;
    element.style.display = 'block';
};

const clearMessages = () => {
    signupMessage.style.display = 'none';
    loginMessage.style.display = 'none';
    verificationLoginMessage.style.display = 'none';
};

// --- Signup Form Submission ---
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();

    const firstName = document.getElementById('signupFirstName').value;
    const lastName = document.getElementById('signupLastName').value;
    const gender = document.getElementById('signupGender').value;
    const mobile = document.getElementById('signupMobile').value;
    const email = document.getElementById('signupEmail').value;
    const facebookLink = document.getElementById('signupFacebook').value;
    const role = document.getElementById('signupRole').value;
    const city = document.getElementById('signupCity').value;
    const password = signupPassword.value;
    const confirmPassword = signupConfirmPassword.value;

    if (password !== confirmPassword) {
        showMessage(signupMessage, 'Passwords do not match.', 'error');
        return;
    }

    // Basic password strength check (more robust logic in auth.js)
    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])(?=.*[A-Z]).{10,16}$/;
    if (!passwordRegex.test(password)) {
        showMessage(signupMessage, 'Password must be 10-16 alphanumeric characters, contain at least 1 symbol, 1 numeric, and 1 capital letter.', 'error');
        return;
    }

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Send email verification
        await sendVerificationEmail(user);

        // Store user data in Firestore
        await db.collection('users').doc(user.uid).set({
            firstName: firstName,
            lastName: lastName,
            gender: gender,
            mobile: mobile,
            email: email,
            facebookLink: facebookLink,
            role: role,
            city: city,
            accountStatus: 'Awaiting Email Verification', // Initial status
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showMessage(signupMessage, 'Signup successful! Please check your email for a verification link.', 'success');
        signupForm.reset(); // Clear form
        signupModal.style.display = 'none'; // Close signup modal
        loginModal.style.display = 'flex'; // Go back to main login form modal

    } catch (error) {
        console.error("Signup error:", error);
        let errorMessage = "An error occurred during signup.";
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'Email already in use.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email format.';
        } else if (error.code === 'auth/weak-password') {
             errorMessage = 'Password is too weak.';
        }
        showMessage(signupMessage, errorMessage, 'error');
    }
});

// --- Email Verification Login Form Submission (triggered after email link click) ---
emailVerificationLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();

    const email = document.getElementById('verificationEmail').value;
    const password = document.getElementById('verificationPassword').value;

    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        if (user.emailVerified) {
            // Update account status in Firestore to "Awaiting Admin Approval"
            await db.collection('users').doc(user.uid).update({
                accountStatus: 'Awaiting Admin Approval'
            });

            showMessage(verificationLoginMessage, 'Account successfully verified! Awaiting admin approval. Click "Close" to proceed to the main login form.', 'success');

            // Add a close button to the message box
            const closeBtn = document.createElement('button');
            closeBtn.textContent = 'Close';
            closeBtn.className = 'mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'; // Basic styling for the button
            closeBtn.onclick = () => {
                emailVerificationLoginModal.style.display = 'none';
                loginModal.style.display = 'flex'; // Redirect to main login form modal
                clearMessages();
                // Remove the close button to prevent duplicates if the message is redisplayed
                if (closeBtn.parentNode) {
                    closeBtn.parentNode.removeChild(closeBtn);
                }
            };
            verificationLoginMessage.appendChild(closeBtn);

        } else {
            showMessage(verificationLoginMessage, 'Email not verified. Please check your email for the verification link.', 'error');
            emailVerificationLoginForm.reset();
        }

    } catch (error) {
        console.error("Verification login error:", error);
        let errorMessage = "Invalid credentials or email not verified. Please try again.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            errorMessage = 'Invalid email or password.';
        }
        showMessage(verificationLoginMessage, errorMessage, 'error');
        emailVerificationLoginForm.reset(); // Clear fields on error
    }
});

// --- Main Login Form Submission ---
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        if (!user.emailVerified) {
            showMessage(loginMessage, 'Email not verified. Please check your email for the verification link and complete the verification login.', 'error');
            loginForm.reset();
            return;
        }

        // Get user data from Firestore
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            showMessage(loginMessage, 'User data not found. Please contact support.', 'error');
            auth.signOut(); // Log out the user if data is missing
            loginForm.reset();
            return;
        }

        const userData = userDoc.data();
        const accountStatus = userData.accountStatus;
        const userRole = userData.role;

        if (accountStatus === 'Access Granted') {
            // Check user role and redirect
            loginModal.style.display = 'none';
            if (userRole === 'driver') {
                window.location.href = 'driverdashboard.html'; // Create this page later
            } else if (userRole === 'passenger') {
                window.location.href = 'passengerdashboard.html'; // Changed from riderdashboard.html
            } else if (userRole === 'hybrid') {
                hybridRoleModal.style.display = 'flex';
            }
        } else if (accountStatus === 'Awaiting Email Verification') {
            showMessage(loginMessage, 'Your account is awaiting email verification. Please check your email.', 'error');
            loginForm.reset();
        } else if (accountStatus === 'Awaiting Admin Approval') {
            showMessage(loginMessage, 'Your account is awaiting admin approval. Please wait patiently.', 'error');
            loginForm.reset();
        } else {
            showMessage(loginMessage, `Your account status is "${accountStatus}". Please contact support.`, 'error');
            loginForm.reset();
        }

    } catch (error) {
        console.error("Login error:", error);
        let errorMessage = "Invalid email or password.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            errorMessage = 'Invalid email or password.';
        } else if (error.code === 'auth/invalid-credential') {
             errorMessage = 'Invalid email or password.'; // Newer Firebase versions use this
        }
        showMessage(loginMessage, errorMessage, 'error');
        loginForm.reset(); // Clear fields on error
    }
});

// Hybrid Role Selection
loginAsDriverBtn.addEventListener('click', () => {
    hybridRoleModal.style.display = 'none';
    window.location.href = 'driverdashboard.html';
});

loginAsPassengerBtn.addEventListener('click', () => {
    hybridRoleModal.style.display = 'none';
    window.location.href = 'passengerdashboard.html'; // Changed from riderdashboard.html
});

// Function to handle email verification link clicks (oobCode)
const handleOobCode = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    const oobCode = urlParams.get('oobCode');

    if (mode === 'verifyEmail' && oobCode) {
        try {
            // Apply the action code (verify email)
            await auth.applyActionCode(oobCode);
            console.log("Email verification successful via OOB code!");

            // After successful verification, clear the URL parameters to prevent re-triggering
            // and replace the current history state to avoid accidental re-verification on refresh
            history.replaceState({}, document.title, window.location.pathname);

            // Now, show the email verification login modal
            emailVerificationLoginModal.style.display = 'flex';
            // Try to pre-fill the email from the current user if available
            const currentUser = auth.currentUser;
            if (currentUser && currentUser.email) {
                document.getElementById('verificationEmail').value = currentUser.email;
            }
            showMessage(verificationLoginMessage, 'Email verified! Please log in to complete account activation.', 'success');

        } catch (error) {
            console.error("Error applying action code for email verification:", error);
            let errorMessage = "Error verifying email. The link may be invalid or expired. Please try signing up again or contact support.";
            if (error.code === 'auth/invalid-action-code') {
                errorMessage = "The verification link is invalid or has expired. Please try signing up again.";
            } else if (error.code === 'auth/user-disabled') {
                errorMessage = "Your account has been disabled.";
            }
            showMessage(loginMessage, errorMessage, 'error'); // Show on main login modal or a general message area
            loginModal.style.display = 'flex'; // Show main login if an error occurs
        }
    }
};

// Call handleOobCode when the page loads
window.onload = handleOobCode;


// Handle Firebase Auth state changes (useful for persistent login)
auth.onAuthStateChanged(async (user) => {
    if (user) {
        // User is signed in. You might want to automatically redirect based on account status/role
        // This is a good place to fetch user data and determine their appropriate dashboard
        // For simplicity, we'll let the login form handle redirects after explicit login
        // But for refreshing the page, this would be critical.
        // For now, we'll keep the modals as the primary entry point for interaction.
    } else {
        // User is signed out.
    }
});
