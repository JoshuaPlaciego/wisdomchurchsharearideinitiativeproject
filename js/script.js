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

// Message elements directly within modals
const signupMessage = document.getElementById('signupMessage');
const loginMessage = document.getElementById('loginMessage');
const verificationLoginMessage = document.getElementById('verificationLoginMessage');

// Global notification message box (requires HTML element with id="notificationMessageBox")
const notificationMessageBox = document.getElementById('notificationMessageBox');

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
    displayModalMessage(signupMessage, '', ''); // Clear previous messages
    signupForm.reset(); // Clear form fields
});

loginButton.addEventListener('click', () => {
    loginModal.style.display = 'flex';
    displayModalMessage(loginMessage, '', ''); // Clear previous messages
    loginForm.reset(); // Clear form fields
});

closeButtons.forEach(button => {
    button.addEventListener('click', () => {
        button.closest('.modal').style.display = 'none';
        clearAllMessages(); // Clear all messages, including global
    });
});

window.addEventListener('click', (event) => {
    if (event.target == signupModal) {
        signupModal.style.display = 'none';
        clearAllMessages();
    }
    if (event.target == loginModal) {
        loginModal.style.display = 'none';
        clearAllMessages();
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


// Helper to display messages within a specific modal element
const displayModalMessage = (element, message, type) => {
    element.textContent = message;
    element.className = `message-box ${type}`;
    element.style.display = message ? 'block' : 'none'; // Only show if message is not empty
};

// Helper to display a global notification message that auto-hides
const displayGlobalNotification = (message, type) => { // Removed duration parameter
    if (!notificationMessageBox) {
        console.warn("Global notification message box element not found.");
        return;
    }
    // Clear any previous content and close button
    notificationMessageBox.innerHTML = '';
    notificationMessageBox.textContent = message;
    notificationMessageBox.className = `global-message-box ${type}`;
    notificationMessageBox.style.display = 'flex'; // Use flex to align message and close button
    notificationMessageBox.style.opacity = '1';

    // Create a close icon
    const closeIcon = document.createElement('span');
    closeIcon.textContent = '✖'; // Unicode multiplication sign for a common close icon
    closeIcon.className = 'global-message-close-icon'; // Add a class for styling
    closeIcon.style.cursor = 'pointer';
    closeIcon.style.marginLeft = '10px'; // Space from message
    closeIcon.style.fontWeight = 'bold'; // Make it stand out
    closeIcon.style.fontSize = '1.2em'; // Adjust size

    closeIcon.onclick = () => {
        notificationMessageBox.style.opacity = '0';
        setTimeout(() => {
            notificationMessageBox.style.display = 'none';
            notificationMessageBox.innerHTML = ''; // Clear content
        }, 300); // Small delay for fade out effect
    };

    notificationMessageBox.appendChild(closeIcon);
};

// Clears all message boxes
const clearAllMessages = () => {
    displayModalMessage(signupMessage, '', '');
    displayModalMessage(loginMessage, '', '');
    displayModalMessage(verificationLoginMessage, '', '');
    if (notificationMessageBox) {
        notificationMessageBox.style.display = 'none';
        notificationMessageBox.style.opacity = '0';
        notificationMessageBox.innerHTML = ''; // Clear content
    }
};


// --- Signup Form Submission ---
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllMessages(); // Clear all previous messages

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
        displayModalMessage(signupMessage, 'Passwords do not match.', 'error');
        return;
    }

    // Basic password strength check (more robust logic in auth.js)
    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])(?=.*[A-Z]).{10,16}$/;
    if (!passwordRegex.test(password)) {
        displayModalMessage(signupMessage, 'Password must be 10-16 alphanumeric characters, contain at least 1 symbol, 1 numeric, and 1 capital letter.', 'error');
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

        displayGlobalNotification('Signup successful! Please check your email for a verification link.', 'success');
        signupForm.reset(); // Clear form fields after successful signup
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
        displayModalMessage(signupMessage, errorMessage, 'error');
    }
});

// --- Email Verification Login Form Submission (triggered after email link click) ---
emailVerificationLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllMessages(); // Clear all previous messages

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

            displayGlobalNotification('Account successfully verified! Awaiting admin approval. You can now log in.', 'success');
            emailVerificationLoginForm.reset(); // Clear form fields after successful verification login

            displayModalMessage(verificationLoginMessage, 'Account successfully verified! Awaiting admin approval. Click "Close" to proceed to the main login form.', 'success');

            // Add a close button to the message box
            const closeBtn = document.createElement('button');
            closeBtn.textContent = 'Close';
            closeBtn.className = 'mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'; // Basic styling for the button
            closeBtn.onclick = () => {
                emailVerificationLoginModal.style.display = 'none';
                loginModal.style.display = 'flex'; // Redirect to main login form modal
                clearAllMessages(); // Clear all messages after closing the modal
                // Remove the close button to prevent duplicates if the message is redisplayed
                if (closeBtn.parentNode) {
                    closeBtn.parentNode.removeChild(closeBtn);
                }
            };
            verificationLoginMessage.appendChild(closeBtn);

        } else {
            displayModalMessage(verificationLoginMessage, 'Email not verified. Please check your email for the verification link.', 'error');
            emailVerificationLoginForm.reset(); // Clear fields on error
        }

    } catch (error) {
        console.error("Verification login error:", error);
        let errorMessage = "Invalid credentials or email not verified. Please try again.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            errorMessage = 'Invalid email or password.';
        }
        displayModalMessage(verificationLoginMessage, errorMessage, 'error');
        emailVerificationLoginForm.reset(); // Clear fields on error
    }
});

// --- Main Login Form Submission ---
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllMessages(); // Clear all previous messages

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        if (!user.emailVerified) {
            displayModalMessage(loginMessage, 'Email not verified. Please check your email for the verification link and complete the verification login.', 'error');
            loginForm.reset(); // Clear fields
            return;
        }

        // Get user data from Firestore
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            displayModalMessage(loginMessage, 'User data not found. Please contact support.', 'error');
            auth.signOut(); // Log out the user if data is missing
            loginForm.reset(); // Clear fields
            return;
        }

        const userData = userDoc.data();
        const accountStatus = userData.accountStatus;
        const userRole = userData.role;

        if (accountStatus === 'Access Granted') {
            displayGlobalNotification('Login successful! Redirecting to dashboard.', 'success');
            loginForm.reset(); // Clear fields after successful login
            loginModal.style.display = 'none';
            // Slight delay before redirection to allow global notification to be seen
            setTimeout(() => {
                if (userRole === 'driver') {
                    window.location.href = 'driverdashboard.html';
                } else if (userRole === 'passenger') {
                    window.location.href = 'passengerdashboard.html';
                } else if (userRole === 'hybrid') {
                    hybridRoleModal.style.display = 'flex';
                }
            }, 500); // 0.5 second delay

        } else if (accountStatus === 'Awaiting Email Verification') {
            displayModalMessage(loginMessage, 'Your account is awaiting email verification. Please check your email.', 'error');
            loginForm.reset(); // Clear fields
        } else if (accountStatus === 'Awaiting Admin Approval') {
            displayModalMessage(loginMessage, 'Your account is awaiting admin approval. Please wait patiently.', 'error');
            loginForm.reset(); // Clear fields
        } else {
            displayModalMessage(loginMessage, `Your account status is "${accountStatus}". Please contact support.`, 'error');
            loginForm.reset(); // Clear fields
        }

    } catch (error) {
        console.error("Login error:", error);
        let errorMessage = "Invalid email or password.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            errorMessage = 'Invalid email or password.';
        } else if (error.code === 'auth/invalid-credential') {
             errorMessage = 'Invalid email or password.'; // Newer Firebase versions use this
        }
        displayModalMessage(loginMessage, errorMessage, 'error');
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
            displayModalMessage(verificationLoginMessage, 'Email verified! Please log in to complete account activation.', 'success');

        } catch (error) {
            console.error("Error applying action code for email verification:", error);
            let errorMessage = "Error verifying email. The link may be invalid or expired. Please try signing up again or contact support.";
            if (error.code === 'auth/invalid-action-code') {
                errorMessage = "The verification link is invalid or has expired. Please try signing up again.";
            } else if (error.code === 'auth/user-disabled') {
                errorMessage = "Your account has been disabled.";
            }
            displayModalMessage(loginMessage, errorMessage, 'error'); // Show error on main login modal if this fails
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
