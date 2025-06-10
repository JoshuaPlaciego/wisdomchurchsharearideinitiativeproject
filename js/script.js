// js/script.js

// Updated imports to include all necessary modular functions directly
import { 
    auth, 
    db, 
    sendVerificationEmail, 
    checkPasswordStrength, 
    serverTimestamp, 
    applyActionCode, 
    sendPasswordResetEmail, 
    checkActionCode,
    createUserWithEmailAndPassword, // Added this to imports
    signInWithEmailAndPassword,   // Added this to imports
    signOut,                      // Added this to imports
    onAuthStateChanged            // Added this to imports
} from './auth.js'; 

// Get elements
const signupButton = document.getElementById('signupButton');
const loginButton = document.getElementById('loginButton'); // Corrected typo here
const signupModal = document.getElementById('signupModal');
const loginModal = document.getElementById('loginModal');
const emailVerificationLoginModal = document.getElementById('emailVerificationLoginModal');
const invalidVerificationLinkModal = document.getElementById('invalidVerificationLinkModal');
const resetPasswordAndVerifyModal = document.getElementById('resetPasswordAndVerifyModal'); // New modal element
const hybridRoleModal = document.getElementById('hybridRoleModal');

const closeButtons = document.querySelectorAll('.close-button');
const signupForm = document.getElementById('signupForm');
const loginForm = document.getElementById('loginForm');
const emailVerificationLoginForm = document.getElementById('emailVerificationLoginForm');
const resetPasswordForm = document.getElementById('resetPasswordForm'); // New form element

// Message elements directly within modals
const signupMessage = document.getElementById('signupMessage');
const loginMessage = document.getElementById('loginMessage');
const verificationLoginMessage = document.getElementById('verificationLoginMessage');
const resendMessage = document.getElementById('resendMessage');
const resetPasswordMessage = document.getElementById('resetPasswordMessage'); // New message element for reset password modal

// Global notification message box (requires HTML element with id="notificationMessageBox")
const notificationMessageBox = document.getElementById('notificationMessageBox');

const signupPassword = document.getElementById('signupPassword');
const signupConfirmPassword = document.getElementById('signupConfirmPassword');

const newPassword = document.getElementById('newPassword'); // New password field
const confirmNewPassword = document.getElementById('confirmNewPassword'); // Confirm new password field
const newPasswordStrength = document.getElementById('newPasswordStrength'); // New password strength indicator

const loginAsDriverBtn = document.getElementById('loginAsDriver');
const loginAsPassengerBtn = document.getElementById('loginAsPassenger');

// New elements for invalidVerificationLinkModal
const resendEmailInput = document.getElementById('resendEmailInput');
const resendVerificationButton = document.getElementById('resendVerificationButton');

let currentOobCode = null; // Store the oobCode globally for use in password reset form
let oobCodeEmail = null; // New global variable to store email from oobCode


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
    if (event.target == invalidVerificationLinkModal) {
        // Prevent closing by clicking outside for this specific modal
    }
    if (event.target == resetPasswordAndVerifyModal) {
        // Prevent closing by clicking outside for this specific modal
    }
    if (event.target == hybridRoleModal) {
        // Prevent closing by clicking outside for this specific modal
    }
});

// Password Strength Indicator for signup
signupPassword.addEventListener('input', () => {
    checkPasswordStrength(signupPassword.value);
});

// Password Strength Indicator for new password
newPassword.addEventListener('input', () => {
    checkPasswordStrength(newPassword.value, newPasswordStrength); // Pass the specific strength indicator
});


// Helper to display messages within a specific modal element
const displayModalMessage = (element, message, type) => {
    element.textContent = message;
    element.className = `message-box ${type}`;
    element.style.display = message ? 'block' : 'none'; // Only show if message is not empty
};

// Helper to display a global notification message that auto-hides
const displayGlobalNotification = (message, type, onCloseCallback = null) => {
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
            if (onCloseCallback) { // Execute callback when notification is closed
                onCloseCallback();
            }
        }, 300); // Small delay for fade out effect
    };

    notificationMessageBox.appendChild(closeIcon);
};

// Clears all message boxes
const clearAllMessages = () => {
    displayModalMessage(signupMessage, '', '');
    displayModalMessage(loginMessage, '', '');
    displayModalMessage(verificationLoginMessage, '', '');
    displayModalMessage(resendMessage, '', '');
    displayModalMessage(resetPasswordMessage, '', ''); // Clear message in new modal

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
        // Corrected: createUserWithEmailAndPassword now takes auth instance as the first argument
        const userCredential = await createUserWithEmailAndPassword(auth, email, password); 
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
            createdAt: serverTimestamp() // Corrected here: using imported serverTimestamp
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
        // Corrected: signInWithEmailAndPassword now takes auth instance as the first argument
        const userCredential = await signInWithEmailAndPassword(auth, email, password); 
        const user = userCredential.user;

        if (user.emailVerified) {
            // Update account status in Firestore to "Awaiting Admin Approval"
            await db.collection('users').doc(user.uid).update({
                accountStatus: 'Awaiting Admin Approval'
            });

            emailVerificationLoginForm.reset(); // Clear form fields after successful verification login
            emailVerificationLoginModal.style.display = 'none'; // Close the verification login modal

            // Display the new global notification message
            displayGlobalNotification(
                'Your account has been fully verified and is now awaiting Admin approval. Once approved, you may log in to your account and enjoy!',
                'success',
                () => { // Callback function to run when the global notification is closed
                    loginModal.style.display = 'flex'; // Show main login modal
                    clearAllMessages(); // Clear messages after opening the main login modal
                }
            );

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

// --- New Password Reset Form Submission (for verification via reset link) ---
resetPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllMessages(); // Clear all previous messages

    const newPass = newPassword.value;
    const confirmNewPass = confirmNewPassword.value;

    if (newPass !== confirmNewPass) {
        displayModalMessage(resetPasswordMessage, 'Passwords do not match.', 'error');
        return;
    }

    // Basic password strength check (re-using the logic)
    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])(?=.*[A-Z]).{10,16}$/;
    if (!passwordRegex.test(newPass)) {
        displayModalMessage(resetPasswordMessage, 'Password must be 10-16 alphanumeric characters, contain at least 1 symbol, 1 numeric, and 1 capital letter.', 'error');
        return;
    }

    if (!currentOobCode) {
        displayModalMessage(resetPasswordMessage, 'No valid verification code found. Please try resending the link.', 'error');
        return;
    }

    try {
        // Corrected: confirmPasswordReset now takes auth instance as the first argument
        await confirmPasswordReset(auth, currentOobCode, newPass); 


        // After successful password reset and implied email verification, update Firestore status
        // Use the globally stored oobCodeEmail
        if (oobCodeEmail) { // Ensure oobCodeEmail is available from handleOobCode
            const userDocs = await db.collection('users').where('email', '==', oobCodeEmail).get();

            if (!userDocs.empty) {
                const userId = userDocs.docs[0].id;
                await db.collection('users').doc(userId).update({
                    accountStatus: 'Awaiting Admin Approval'
                });
                console.log("Firestore status updated to Awaiting Admin Approval after password reset verification for:", oobCodeEmail);
            } else {
                console.warn("User not found in Firestore for email:", oobCodeEmail, ". Status not updated.");
            }
        } else {
            console.warn("oobCodeEmail was not set. Cannot update Firestore status.");
        }


        resetPasswordForm.reset(); // Clear form fields
        resetPasswordAndVerifyModal.style.display = 'none'; // Close modal

        displayGlobalNotification(
            'Your account has been fully verified and is now awaiting Admin approval. Once approved, you may log in to your account and enjoy!',
            'success',
            () => { // Callback when this global notification is closed
                loginModal.style.display = 'flex'; // Show main login modal
                clearAllMessages(); // Clear messages after opening the main login modal
            }
        );

    } catch (error) {
        console.error("Error setting new password and verifying:", error);
        let errorMessage = "Failed to set new password. The link might be invalid or expired. Please try resending.";
        if (error.code === 'auth/invalid-action-code') {
            errorMessage = 'The link is invalid or has already been used. Please try resending a new link.';
        } else if (error.code === 'auth/user-disabled') {
            errorMessage = 'Your account has been disabled.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password is too weak. Please ensure it meets the criteria.'; // More generic message
        }
        displayModalMessage(resetPasswordMessage, errorMessage, 'error');
    }
});


// --- Main Login Form Submission ---
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllMessages(); // Clear all previous messages

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        // Corrected: signInWithEmailAndPassword now takes auth instance as the first argument
        const userCredential = await signInWithEmailAndPassword(auth, email, password); 
        const user = userCredential.user;

        // Re-check emailVerified status from Firebase Auth directly, not Firestore
        if (!user.emailVerified) {
            displayModalMessage(loginMessage, 'Email not verified. Please check your email for the verification link and complete the verification login.', 'error');
            loginForm.reset(); // Clear fields
            return;
        }

        // Get user data from Firestore
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            displayModalMessage(loginMessage, 'User data not found. Please contact support.', 'error');
            // Corrected: signOut now takes auth instance as the first argument
            await signOut(auth); 
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
            // If email is verified in Auth but status is still 'Awaiting Email Verification' in Firestore,
            // it means they clicked a link but didn't complete the verification login.
            // Prompt them to do the verification login now.
            displayModalMessage(loginMessage, 'Your email has been verified. Please log in here to complete account activation.', 'success');
            emailVerificationLoginModal.style.display = 'flex'; // Show email verification login modal
            document.getElementById('verificationEmail').value = email; // Pre-fill email
            loginModal.style.display = 'none'; // Hide main login modal
            loginForm.reset(); // Clear main login fields
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

    if (oobCode) { // Check if oobCode exists regardless of mode
        currentOobCode = oobCode; // Store globally

        if (mode === 'verifyEmail') {
            try {
                // Corrected: applyActionCode now takes auth instance as the first argument
                await applyActionCode(auth, oobCode); 
                console.log("Email verification successful via OOB code!");

                // After successful verification, clear the URL parameters to prevent re-triggering
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
                // ALL errors related to oobCode (regardless of specific error code) should lead to invalidVerificationLinkModal
                clearAllMessages(); // Clear existing messages
                emailVerificationLoginModal.style.display = 'none'; // Ensure this modal is closed
                loginModal.style.display = 'none'; // Ensure main login modal is closed

                invalidVerificationLinkModal.style.display = 'flex'; // Always show the new invalid link modal
                resendEmailInput.value = ''; // Clear resend email field in case it was pre-filled
            }
        } else if (mode === 'resetPassword') { // Handle password reset links
            try {
                // Corrected: checkActionCode now takes auth instance as the first argument
                const info = await checkActionCode(auth, oobCode); // This returns ActionCodeInfo
                oobCodeEmail = info.data.email; // Store the email associated with the oobCode
                console.log("Password reset code checked and is valid. Email:", oobCodeEmail, ". Proceed to set new password.");

                clearAllMessages();
                invalidVerificationLinkModal.style.display = 'none'; // Close any other modals
                emailVerificationLoginModal.style.display = 'none';
                loginModal.style.display = 'none'; // Ensure main login modal is closed

                resetPasswordAndVerifyModal.style.display = 'flex'; // Show the new password reset modal
                resetPasswordForm.reset(); // Clear new password fields
                displayModalMessage(resetPasswordMessage, '', ''); // Clear message
                newPasswordStrength.className = 'password-strength'; // Reset strength indicator

                // The oobCode is already globally stored by handleOobCode (currentOobCode = oobCode;)
                history.replaceState({}, document.title, window.location.pathname); // Clear URL parameters

            } catch (error) {
                console.error("Error checking password reset code:", error);
                // ALL errors related to oobCode (regardless of specific error code) should lead to invalidVerificationLinkModal
                clearAllMessages();
                invalidVerificationLinkModal.style.display = 'flex'; // Always show invalid link modal
                emailVerificationLoginModal.style.display = 'none'; // Ensure this modal is closed
                loginModal.style.display = 'none'; // Ensure main login modal is closed

                resendEmailInput.value = ''; // Clear email field in resend modal
            }
        }
    }
};

// Resend Verification Link button handler
resendVerificationButton.onclick = async () => {
    clearAllMessages(); // Clear any messages in the resend modal
    const emailToResend = resendEmailInput.value;
    if (!emailToResend) {
        displayModalMessage(resendMessage, 'Please enter your email address.', 'error');
        return;
    }

    try {
        // Corrected: sendPasswordResetEmail now takes auth instance as the first argument
        await sendPasswordResetEmail(auth, emailToResend);
        resendEmailInput.value = ''; // Clear field on successful send

        // Display global notification for successful resend
        displayGlobalNotification(
            'New verification link sent! Please check your email.',
            'success',
            () => { // Callback when this global notification is closed
                invalidVerificationLinkModal.style.display = 'none'; // Close resend modal
                loginModal.style.display = 'flex'; // Route to main login form
                clearAllMessages(); // Clear all messages
            }
        );

    } catch (resendError) {
        console.error("Error resending verification link:", resendError);
        let resendErrorMessage = "Failed to send new verification link. Please check the email or try again.";
        if (resendError.code === 'auth/user-not-found') {
            resendErrorMessage = 'No user found with that email address.';
        } else if (resendError.code === 'auth/invalid-email') {
            resendErrorMessage = 'Please enter a valid email address.';
        }
        displayModalMessage(resendMessage, resendErrorMessage, 'error');
    }
};


// Call handleOobCode when the page loads
window.onload = handleOobCode;


// Handle Firebase Auth state changes (useful for persistent login)
onAuthStateChanged(auth, async (user) => { // Corrected: onAuthStateChanged takes auth instance as the first argument
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
