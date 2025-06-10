// js/script.js

// Updated imports to include all necessary modular functions directly from auth.js
import { 
    auth, 
    db, // db instance is still useful for direct Firestore operations if needed
    sendVerificationEmail, 
    checkPasswordStrength, 
    serverTimestamp, // serverTimestamp from auth.js
    applyActionCode, 
    sendPasswordResetEmail, 
    checkActionCode,
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,   
    signOut,                      
    onAuthStateChanged,
    getUserProfile,         // NEW: Import for fetching user data
    updateUserAccountStatus // NEW: Import for updating user status
} from './auth.js'; 

// Removed redundant Firestore direct imports as we'll use functions from auth.js where applicable
// import { collection, doc, setDoc, updateDoc, getDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";


// Get elements
const signupButton = document.getElementById('signupButton');
const loginButton = document.getElementById('loginButton'); 
const signupModal = document.getElementById('signupModal');
const loginModal = document.getElementById('loginModal');
const emailVerificationLoginModal = document.getElementById('emailVerificationLoginModal');
const invalidVerificationLinkModal = document.getElementById('invalidVerificationLinkModal'); // Now also used for forgot password
const resetPasswordAndVerifyModal = document.getElementById('resetPasswordAndVerifyModal'); 
const hybridRoleModal = document.getElementById('hybridRoleModal');

const closeButtons = document.querySelectorAll('.close-button');
const signupForm = document.getElementById('signupForm');
const loginForm = document.getElementById('loginForm');
const emailVerificationLoginForm = document.getElementById('emailVerificationLoginForm');
const resetPasswordForm = document.getElementById('resetPasswordForm'); 

// NEW: Forgot Password link element
const forgotPasswordLink = document.getElementById('forgotPasswordLink');

// Message elements directly within modals
const signupMessage = document.getElementById('signupMessage');
const loginMessage = document.getElementById('loginMessage');
const verificationLoginMessage = document.getElementById('verificationLoginMessage');
const resendMessage = document.getElementById('resendMessage');
const resetPasswordMessage = document.getElementById('resetPasswordMessage'); 

// Global notification message box (requires HTML element with id="notificationMessageBox")
const notificationMessageBox = document.getElementById('notificationMessageBox');

const signupPassword = document.getElementById('signupPassword');
const signupConfirmPassword = document.getElementById('signupConfirmPassword');

const newPassword = document.getElementById('newPassword'); 
const confirmNewPassword = document.getElementById('confirmNewPassword'); 
const newPasswordStrength = document.getElementById('newPasswordStrength'); 

const loginAsDriverBtn = document.getElementById('loginAsDriver');
const loginAsPassengerBtn = document.getElementById('loginAsPassenger');

// New elements for invalidVerificationLinkModal
const resendEmailInput = document.getElementById('resendEmailInput');
const resendVerificationButton = document.getElementById('resendVerificationButton');

let currentOobCode = null; 
let oobCodeEmail = null; // Stores email from OOB code to pre-fill forms

// --- DEBUGGING: Check if elements are found ---
console.log('--- Initializing script.js ---');
console.log('signupButton:', signupButton);
console.log('loginButton:', loginButton);
console.log('signupModal:', signupModal);
console.log('loginModal:', loginModal);
console.log('emailVerificationLoginModal:', emailVerificationLoginModal);
console.log('invalidVerificationLinkModal:', invalidVerificationLinkModal);
console.log('resetPasswordAndVerifyModal:', resetPasswordAndVerifyModal);
console.log('hybridRoleModal:', hybridRoleModal);
console.log('forgotPasswordLink:', forgotPasswordLink);
console.log('notificationMessageBox:', notificationMessageBox);
// Add similar logs for other elements if you suspect they might be null
console.log('--- Element checks complete ---');


// NCR Cities (Hardcoded for now, could be fetched from an API/DB later)
const ncrCities = [
    "Caloocan", "Las Piñas", "Makati", "Malabon", "Mandaluyong", "Manila",
    "Marikina", "Muntinlupa", "Navotas", "Parañaque", "Pasay", "Pasig",
    "Pateros", "Quezon City", "San Juan", "Taguig", "Valenzuela"
];

// Populate NCR Cities dropdown
const signupCitySelect = document.getElementById('signupCity');
if (signupCitySelect) { // Added check for signupCitySelect
    ncrCities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        signupCitySelect.appendChild(option);
    });
} else {
    console.warn("signupCitySelect element not found. Cannot populate cities.");
}


// Event Listeners for Modals
if (signupButton) { // Added check for signupButton
    signupButton.addEventListener('click', () => {
        console.log('Signup button clicked');
        clearAllMessages(); // Clear messages first
        signupForm.reset(); // Clear form fields
        signupModal.style.display = 'flex';
    });
} else {
    console.error("Signup button element not found.");
}

if (loginButton) { // Added check for loginButton
    loginButton.addEventListener('click', () => {
        console.log('Login button clicked');
        clearAllMessages(); // Clear messages first
        loginForm.reset(); // Clear form fields
        loginModal.style.display = 'flex';
    });
} else {
    console.error("Login button element not found.");
}


// NEW: Event listener for Forgot Password/Resend Email Verification Link
if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Forgot Password/Resend Link clicked');
        clearAllMessages(); // Clear all messages
        loginModal.style.display = 'none'; // Hide login modal
        if (resendEmailInput) resendEmailInput.value = ''; // Clear any previous email
        if (invalidVerificationLinkModal) invalidVerificationLinkModal.style.display = 'flex'; // Show resend/forgot modal
    });
} else {
    console.warn("Forgot Password link element not found.");
}


closeButtons.forEach(button => {
    button.addEventListener('click', () => {
        console.log('Close button clicked');
        const modalToClose = button.closest('.modal');
        if (modalToClose) {
            modalToClose.style.display = 'none';
        }
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
    // Allow closing of emailVerificationLoginModal with close button, but not outside click
    // Note: The specific check `event.target.querySelector('.close-button') !== event.target` is complex
    // and might not behave as expected for simple outside clicks. A more robust way might be
    // to check if event.target is the modal itself and the modal is NOT emailVerificationLoginModal.
    // For now, keeping your original logic for these specific modals.
    if (event.target === emailVerificationLoginModal && event.target.querySelector('.close-button') === null) {
        // This condition tries to prevent closing emailVerificationLoginModal by clicking outside,
        // unless the click is specifically on its close button.
        // If the click is on the modal backdrop, and it doesn't contain a close button (meaning click wasn't on it),
        // we do nothing to prevent closing.
    }
    if (event.target === invalidVerificationLinkModal && event.target.querySelector('.close-button') === null) {
           // Do nothing to prevent closing by clicking outside this modal
    }
    if (event.target === resetPasswordAndVerifyModal && event.target.querySelector('.close-button') === null) {
           // Do nothing to prevent closing by clicking outside this modal
    }
    if (event.target === hybridRoleModal) {
           // Do nothing to prevent closing by clicking outside this modal
    }
});


// Password Strength Indicator for signup
if (signupPassword) { // Added check
    signupPassword.addEventListener('input', () => {
        checkPasswordStrength(signupPassword.value);
    });
} else {
    console.warn("Signup password element not found.");
}


// Password Strength Indicator for new password
if (newPassword) { // Added check
    newPassword.addEventListener('input', () => {
        checkPasswordStrength(newPassword.value, newPasswordStrength); // Pass the specific strength indicator
    });
} else {
    console.warn("New password element not found.");
}


// Helper to display messages within a specific modal element
const displayModalMessage = (element, message, type) => {
    if (!element) {
        console.warn(`Attempted to display message, but target element is null. Message: ${message}`);
        return;
    }
    element.textContent = message;
    element.className = `message-box ${type}`;
    element.style.display = message ? 'block' : 'none'; // Only show if message is not empty
};

// Helper to display a global notification message that auto-hides
const displayGlobalNotification = (message, type, onCloseCallback = null) => {
    if (!notificationMessageBox) {
        console.warn("Global notification message box element not found. Cannot display notification.");
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
    displayModalMessage(resetPasswordMessage, '', ''); 

    if (notificationMessageBox) {
        notificationMessageBox.style.display = 'none';
        notificationMessageBox.style.opacity = '0';
        notificationMessageBox.innerHTML = ''; 
    }
};


// --- Signup Form Submission ---
if (signupForm) { // Added check
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAllMessages(); 

        const firstName = document.getElementById('signupFirstName')?.value;
        const lastName = document.getElementById('signupLastName')?.value;
        const gender = document.getElementById('signupGender')?.value;
        const mobile = document.getElementById('signupMobile')?.value;
        const email = document.getElementById('signupEmail')?.value;
        const facebookLink = document.getElementById('signupFacebook')?.value;
        const role = document.getElementById('signupRole')?.value;
        const city = document.getElementById('signupCity')?.value;
        const password = signupPassword?.value;
        const confirmPassword = signupConfirmPassword?.value;

        // Basic check for required fields, though HTML `required` helps
        if (!firstName || !lastName || !gender || !mobile || !email || !role || !city || !password || !confirmPassword) {
            displayModalMessage(signupMessage, 'Please fill in all required fields.', 'error');
            return;
        }

        if (password !== confirmPassword) {
            displayModalMessage(signupMessage, 'Passwords do not match.', 'error');
            return;
        }

        const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])(?=.*[A-Z]).{10,16}$/;
        if (!passwordRegex.test(password)) {
            displayModalMessage(signupMessage, 'Password must be 10-16 alphanumeric characters, contain at least 1 symbol, 1 numeric, and 1 capital letter.', 'error');
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password); 
            const user = userCredential.user;

            await sendVerificationEmail(user);

            // Store user data in Firestore with initial status
            await setDoc(doc(db, 'users', user.uid), { // Use db directly, no need for collection(db, 'users') here
                firstName: firstName,
                lastName: lastName,
                gender: gender,
                mobile: mobile,
                email: email,
                facebookLink: facebookLink,
                role: role,
                city: city,
                accountStatus: 'Awaiting Email Verification', // Initial status
                createdAt: serverTimestamp() 
            });

            displayGlobalNotification('Signup successful! Please check your email for a verification link.', 'success');
            signupForm.reset(); 
            if (signupModal) signupModal.style.display = 'none'; 
            if (loginModal) loginModal.style.display = 'flex'; // Show login modal after signup

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
} else {
    console.error("Signup form element not found.");
}


// --- Email Verification Login Form Submission (triggered after email link click, especially expired/invalid ones) ---
if (emailVerificationLoginForm) { // Added check
    emailVerificationLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAllMessages(); 

        const email = document.getElementById('verificationEmail')?.value;
        const password = document.getElementById('verificationPassword')?.value;

        if (!email || !password) {
            displayModalMessage(verificationLoginMessage, 'Please enter both email and password.', 'error');
            return;
        }

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password); 
            const user = userCredential.user;

            // Ensure the Firebase user's email is actually verified.
            // This is a crucial check. If they arrived here from an expired link, Firebase's
            // `user.emailVerified` might still be false. If it's true, it means verification
            // already happened (perhaps through another link or manual verification).
            if (!user.emailVerified) {
                displayModalMessage(verificationLoginMessage, 'Email not yet verified by Firebase. Please use the "Forgot Password/Resend Email Verification Link?" option to get a new link.', 'error');
                emailVerificationLoginForm.reset(); 
                // We don't sign out immediately here, giving them a chance to retry or realize.
                return;
            }

            // Get the user's profile from Firestore to check their custom accountStatus
            const userData = await getUserProfile(user.uid); 

            if (!userData) {
                displayModalMessage(verificationLoginMessage, 'User data not found. Please contact support.', 'error');
                await signOut(auth); // Sign out if no user data in Firestore
                emailVerificationLoginForm.reset(); 
                return;
            }

            const currentAccountStatus = userData.accountStatus;

            if (currentAccountStatus === 'Awaiting Email Verification') {
                // If the email is verified by Firebase AND Firestore status is 'Awaiting Email Verification',
                // then we can update the status to 'Awaiting Admin Approval' and guide the user.
                await updateUserAccountStatus(user.uid, 'Awaiting Admin Approval'); // Use the new function

                emailVerificationLoginForm.reset(); 
                if (emailVerificationLoginModal) emailVerificationLoginModal.style.display = 'none'; 

                displayGlobalNotification(
                    'Your account has been fully verified and is now awaiting Admin approval. Once approved, you may log in to your account and enjoy!',
                    'success',
                    () => { 
                        if (loginModal) loginModal.style.display = 'flex'; 
                        clearAllMessages(); 
                    }
                );
            } else {
                // Account status is not 'Awaiting Email Verification'. Inform the user.
                displayModalMessage(verificationLoginMessage, `Your account status is currently "${currentAccountStatus}". Please proceed to the main login or contact support.`, 'error');
                emailVerificationLoginForm.reset(); 
                await signOut(auth); // Sign out if not in the expected state for this modal
                // After showing message, redirect to main login
                setTimeout(() => {
                    if (emailVerificationLoginModal) emailVerificationLoginModal.style.display = 'none';
                    if (loginModal) loginModal.style.display = 'flex';
                    clearAllMessages();
                }, 2000); // Small delay to read message
            }

        } catch (error) {
            console.error("Verification login error:", error);
            let errorMessage = "Invalid credentials or email not verified. Please try again.";
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                errorMessage = 'Invalid email or password.';
            } else if (error.code === 'auth/user-disabled') {
                errorMessage = 'Your account has been disabled.';
            }
            displayModalMessage(verificationLoginMessage, errorMessage, 'error');
            emailVerificationLoginForm.reset(); 
        }
    });
} else {
    console.error("Email verification login form element not found.");
}


// --- New Password Reset Form Submission (for verification via reset link) ---
if (resetPasswordForm) { // Added check
    resetPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAllMessages(); 

        const newPass = newPassword?.value;
        const confirmNewPass = confirmNewPassword?.value;

        if (!newPass || !confirmNewPass) {
             displayModalMessage(resetPasswordMessage, 'Please enter and confirm your new password.', 'error');
             return;
        }

        if (newPass !== confirmNewPass) {
            displayModalMessage(resetPasswordMessage, 'Passwords do not match.', 'error');
            return;
        }

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
            await confirmPasswordReset(auth, currentOobCode, newPass); 

            if (oobCodeEmail) { 
                // Fetch user by email to get their UID for status update
                // Re-added collection, query, getDocs imports here for direct use, as `auth.js` might not export them
                const { collection, query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");
                const usersRef = collection(db, 'users'); 
                const q = query(usersRef, where('email', '==', oobCodeEmail));
                const userDocs = await getDocs(q);

                if (!userDocs.empty) {
                    const userId = userDocs.docs[0].id;
                    // Update account status to 'Awaiting Admin Approval' using the new function
                    await updateUserAccountStatus(userId, 'Awaiting Admin Approval');
                    console.log("Firestore status updated to Awaiting Admin Approval after password reset verification for:", oobCodeEmail);
                } else {
                    console.warn("User not found in Firestore for email:", oobCodeEmail, ". Status not updated.");
                }
            } else {
                console.warn("oobCodeEmail was not set. Cannot update Firestore status.");
            }

            resetPasswordForm.reset(); 
            if (resetPasswordAndVerifyModal) resetPasswordAndVerifyModal.style.display = 'none'; 

            displayGlobalNotification(
                'Your account has been fully verified and is now awaiting Admin approval. Once approved, you may log in to your account and enjoy!',
                'success',
                () => { 
                    if (loginModal) loginModal.style.display = 'flex'; 
                    clearAllMessages(); 
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
                errorMessage = 'Password is too weak. Please ensure it meets the criteria.'; 
            }
            displayModalMessage(resetPasswordMessage, errorMessage, 'error');
        }
    });
} else {
    console.error("Reset password form element not found.");
}


// --- Main Login Form Submission ---
if (loginForm) { // Added check
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAllMessages(); 

        const email = document.getElementById('loginEmail')?.value;
        const password = document.getElementById('loginPassword')?.value;

        if (!email || !password) {
            displayModalMessage(loginMessage, 'Please enter both email and password.', 'error');
            return;
        }

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password); 
            const user = userCredential.user;

            if (!user.emailVerified) {
                displayModalMessage(loginMessage, 'Email not verified. Please check your email for the verification link and complete the verification login.', 'error');
                loginForm.reset(); 
                return;
            }

            // Get the user's profile from Firestore to check their account status
            const userData = await getUserProfile(user.uid);

            if (!userData) { 
                displayModalMessage(loginMessage, 'User data not found. Please contact support.', 'error');
                await signOut(auth); // Sign out if no user data in Firestore
                loginForm.reset(); 
                return;
            }

            const accountStatus = userData.accountStatus;
            const userRole = userData.role;

            if (accountStatus === 'Access Granted') {
                displayGlobalNotification('Login successful! Redirecting to dashboard.', 'success');
                loginForm.reset(); 
                if (loginModal) loginModal.style.display = 'none';
                setTimeout(() => {
                    if (userRole === 'driver') {
                        window.location.href = 'driverdashboard.html';
                    } else if (userRole === 'passenger') {
                        window.location.href = 'passengerdashboard.html';
                    } else if (userRole === 'hybrid') {
                        if (hybridRoleModal) hybridRoleModal.style.display = 'flex';
                    }
                }, 500); 

            } else if (accountStatus === 'Awaiting Email Verification') {
                // User's email is verified by Firebase, but Firestore status is still 'Awaiting Email Verification'.
                // Redirect them to the specific modal to complete activation.
                displayModalMessage(loginMessage, 'Your email has been verified. Please log in here to complete account activation.', 'success');
                if (emailVerificationLoginModal) emailVerificationLoginModal.style.display = 'flex'; 
                const verificationEmailInput = document.getElementById('verificationEmail');
                if (verificationEmailInput) verificationEmailInput.value = email; 
                if (loginModal) loginModal.style.display = 'none'; 
                loginForm.reset(); 
            } else if (accountStatus === 'Awaiting Admin Approval') {
                displayModalMessage(loginMessage, 'Your account is awaiting admin approval. Please wait patiently.', 'error');
                loginForm.reset(); 
            } else {
                displayModalMessage(loginMessage, `Your account status is "${accountStatus}". Please contact support.`, 'error');
                loginForm.reset(); 
            }

        } catch (error) {
            console.error("Login error:", error);
            let errorMessage = "Invalid email or password.";
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                errorMessage = 'Invalid email or password.';
            } else if (error.code === 'auth/user-disabled') {
                errorMessage = 'Your account has been disabled.';
            }
            displayModalMessage(loginMessage, errorMessage, 'error');
            loginForm.reset(); 
        }
    });
} else {
    console.error("Login form element not found.");
}


// Hybrid Role Selection
if (loginAsDriverBtn) { // Added check
    loginAsDriverBtn.addEventListener('click', () => {
        if (hybridRoleModal) hybridRoleModal.style.display = 'none';
        window.location.href = 'driverdashboard.html';
    });
} else {
    console.warn("Login as driver button not found.");
}

if (loginAsPassengerBtn) { // Added check
    loginAsPassengerBtn.addEventListener('click', () => {
        if (hybridRoleModal) hybridRoleModal.style.display = 'none';
        window.location.href = 'passengerdashboard.html'; 
    });
} else {
    console.warn("Login as passenger button not found.");
}


// Function to handle email verification link clicks (oobCode)
const handleOobCode = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    const oobCode = urlParams.get('oobCode');

    if (oobCode) { 
        currentOobCode = oobCode; 
        clearAllMessages(); // Clear messages initially

        if (mode === 'verifyEmail') {
            let emailFromOob = '';
            try {
                // Check the action code to get the email before attempting to apply it.
                // This allows us to pre-fill the email even if the code is expired or invalid for direct application.
                const info = await checkActionCode(auth, oobCode);
                emailFromOob = info.data.email; 
                oobCodeEmail = emailFromOob; // Store the email globally
                console.log(`handleOobCode: Processing verifyEmail for: ${emailFromOob}`);

                // Attempt to apply the action code. This is where it will fail if expired or already used.
                await applyActionCode(auth, oobCode); 
                console.log("Email verification successful via OOB code!");

                // If applyActionCode succeeds, the email is now verified by Firebase.
                // Redirect user to the main login with a success message.
                history.replaceState({}, document.title, window.location.pathname); // Clean URL
                displayGlobalNotification('Your email has been successfully verified! Please log in to complete account activation.', 'success', () => {
                    if (loginModal) loginModal.style.display = 'flex';
                    if (loginForm) loginForm.reset();
                    const loginEmailInput = document.getElementById('loginEmail');
                    if (loginEmailInput) loginEmailInput.value = emailFromOob; // Pre-fill login email
                    const loginPasswordInput = document.getElementById('loginPassword');
                    if (loginPasswordInput) loginPasswordInput.value = '';
                    clearAllMessages();
                });
            } catch (error) {
                console.error("Error handling email verification link (verifyEmail mode):", error);
                
                // If `applyActionCode` failed (e.g., invalid/expired link, already used),
                // redirect to the `emailVerificationLoginModal` as per the request's flow.
                if (emailVerificationLoginModal) emailVerificationLoginModal.style.display = 'flex';
                const verificationEmailInput = document.getElementById('verificationEmail');
                if (verificationEmailInput) verificationEmailInput.value = emailFromOob || ''; // Pre-fill email if obtained
                const verificationPasswordInput = document.getElementById('verificationPassword');
                if (verificationPasswordInput) verificationPasswordInput.value = '';
                
                let message = '';
                if (error.code === 'auth/invalid-action-code') {
                    message = 'The verification link is invalid or has already been used. Please log in below to check your account status.';
                } else if (error.code === 'auth/expired-action-code') {
                     message = 'The verification link has expired. Please log in below to check your account status and resend a new link.';
                } else if (error.code === 'auth/user-disabled') {
                    // If user is disabled, do not show verification login modal, go to main login with global error.
                    message = 'Your account has been disabled. Please contact support.';
                    if (emailVerificationLoginModal) emailVerificationLoginModal.style.display = 'none'; 
                    if (loginModal) loginModal.style.display = 'flex'; 
                    displayGlobalNotification(message, 'error'); 
                    return; // Exit here as we've handled the redirection
                } else {
                    message = 'An error occurred with the verification link. Please log in below to check your account status.';
                }
                displayModalMessage(verificationLoginMessage, message, 'error');

                history.replaceState({}, document.title, window.location.pathname); // Clean URL
            }
        } else if (mode === 'resetPassword') { 
            try {
                const info = await checkActionCode(auth, oobCode); 
                oobCodeEmail = info.data.email; 
                console.log("Password reset code checked and is valid. Email:", oobCodeEmail, ". Proceed to set new password.");

                clearAllMessages();
                if (invalidVerificationLinkModal) invalidVerificationLinkModal.style.display = 'none'; 
                if (emailVerificationLoginModal) emailVerificationLoginModal.style.display = 'none';
                if (loginModal) loginModal.style.display = 'none'; 

                if (resetPasswordAndVerifyModal) resetPasswordAndVerifyModal.style.display = 'flex'; 
                if (resetPasswordForm) resetPasswordForm.reset(); 
                displayModalMessage(resetPasswordMessage, '', ''); 
                if (newPasswordStrength) newPasswordStrength.className = 'password-strength'; 

                history.replaceState({}, document.title, window.location.pathname); 

            } catch (error) {
                console.error("Error checking password reset code:", error);
                clearAllMessages();
                if (invalidVerificationLinkModal) invalidVerificationLinkModal.style.display = 'none'; 
                if (emailVerificationLoginModal) emailVerificationLoginModal.style.display = 'none'; 
                if (resetPasswordAndVerifyModal) resetPasswordAndVerifyModal.style.display = 'none'; 
                
                if (loginModal) loginModal.style.display = 'flex'; // Show main login modal

                let errorMessage = 'The password reset link is invalid or has expired. Please use the "Forgot Password/Resend Email Verification Link?" link on the login form to request a new one.';
                if (error.code === 'auth/invalid-action-code') {
                    errorMessage = 'The password reset link is invalid or has already been used. Please use the "Forgot Password/Resend Email Verification Link?" link on the login form to request a new link.';
                } else if (error.code === 'auth/user-disabled') {
                     errorMessage = 'Your account has been disabled. Please contact support.';
                }

                displayGlobalNotification(errorMessage, 'error', () => {
                    clearAllMessages(); // Clear after user closes notification
                });
                if (resendEmailInput) resendEmailInput.value = ''; 
            }
        }
    }
};

// Resend Verification Link / Forgot Password button handler (now handles both)
if (resendVerificationButton) { // Added check
    resendVerificationButton.onclick = async () => {
        clearAllMessages(); 
        const emailToResend = resendEmailInput?.value;
        if (!emailToResend) {
            displayModalMessage(resendMessage, 'Please enter your email address.', 'error');
            return;
        }

        try {
            // Use sendPasswordResetEmail which can also trigger a new verification link for unverified users
            await sendPasswordResetEmail(auth, emailToResend);
            if (resendEmailInput) resendEmailInput.value = ''; 

            displayGlobalNotification(
                'If an account with that email exists, a verification/password reset link has been sent to your email. Please check your inbox (and spam folder).', // More generic message for security
                'success',
                () => { 
                    if (invalidVerificationLinkModal) invalidVerificationLinkModal.style.display = 'none'; 
                    if (loginModal) loginModal.style.display = 'flex'; 
                    clearAllMessages(); 
                }
            );

        } catch (resendError) {
            console.error("Error sending verification/reset link:", resendError);
            let resendErrorMessage = "Failed to send link. Please check the email format or try again.";
            // Firebase sendPasswordResetEmail is intentionally vague on user-not-found to prevent email enumeration.
            // So, we'll keep the success message generic even on some errors, or provide a specific error only if it's not 'user-not-found'.
            if (resendError.code === 'auth/invalid-email') {
                resendErrorMessage = 'Please enter a valid email address.';
            } else if (resendError.code === 'auth/user-disabled') {
                resendErrorMessage = 'This account has been disabled.';
            } else {
                // For other errors, still show a generic error but log full details
                console.error("Unhandled resend error code:", resendError.code);
            }
            displayModalMessage(resendMessage, resendErrorMessage, 'error');
        }
    };
} else {
    console.warn("Resend Verification button not found.");
}


// Call handleOobCode when the page loads
window.onload = handleOobCode;


// Handle Firebase Auth state changes (useful for persistent login)
onAuthStateChanged(auth, async (user) => { 
    if (user) {
        // User is signed in. This block is for persistent login state handling.
        // For the current flow, initial redirects happen after explicit login attempts
        // in loginForm/emailVerificationLoginForm.
        // This is primarily for maintaining session if page refreshes or for initial load.
        // Example: If a user refreshes an approved page, you might want to re-check their status here.
        // For now, we'll keep the modals as the primary entry point.
    } else {
        // User is signed out.
    }
});
