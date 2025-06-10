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
    updatePassword, // Import updatePassword (still useful for logged-in users)
    getUserProfile,         // Import for fetching user data
    updateUserAccountStatus, // Import for updating user status
    confirmPasswordReset // RE-IMPORT: Ensure confirmPasswordReset is available
} from './auth.js'; 

// NEW: Explicitly import doc and setDoc from firestore for direct use in script.js
// Also import updateDoc as we'll use it directly
import { doc, setDoc, updateDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";


// Get elements
const signupButton = document.getElementById('signupButton');
const loginButton = document.getElementById('loginButton'); 
const signupModal = document.getElementById('signupModal');
const loginModal = document.getElementById('loginModal');
const emailVerificationLoginModal = document.getElementById('emailVerificationLoginModal');
const invalidVerificationLinkModal = document.getElementById('invalidVerificationLinkModal'); // Now also used for forgot password
const resetPasswordAndVerifyModal = document.getElementById('resetPasswordAndVerifyModal'); 
// RENAMED: from hybridRoleModal to roleSelectionModal
const roleSelectionModal = document.getElementById('roleSelectionModal'); 
const roleSelectionButtonsContainer = document.getElementById('roleSelectionButtonsContainer');


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
// Global variable for the modal backdrop element
let globalBackdrop = null;


const signupPassword = document.getElementById('signupPassword');
const signupConfirmPassword = document.getElementById('signupConfirmPassword');
// NEW LOG: Check if confirmNewPassword element is found
console.log('confirmNewPassword element (global scope check):', document.getElementById('confirmNewPassword'));

const newPassword = document.getElementById('newPassword'); 
const confirmNewPassword = document.getElementById('confirmNewPassword'); 
const newPasswordStrength = document.getElementById('newPasswordStrength'); 

// Removed: loginAsDriverBtn, loginAsPassengerBtn as they will be dynamically created now

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
console.log('roleSelectionModal:', roleSelectionModal); // Updated
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
    if (event.target === roleSelectionModal) { // Updated
           // Do nothing to prevent closing by clicking outside this modal
    }
});


// Password Strength Indicator for signup
if (signupPassword) { // Added check
    signupPassword.addEventListener('input', () => {
        checkPasswordStrength(signupPassword.value);
    });
} else {
    console.warn("signupPassword element not found.");
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

/**
 * Helper to display a global notification message that auto-hides or stays until closed.
 * Adds a greyed-out backdrop and centers the message.
 * @param {string} message - The message content.
 * @param {string} type - The type of message (e.g., 'success', 'error', 'info').
 * @param {function} [onCloseCallback=null] - Optional callback to execute when the notification is closed.
 */
const displayGlobalNotification = (message, type, onCloseCallback = null) => {
    if (!notificationMessageBox) {
        console.warn("Global notification message box element not found. Cannot display notification.");
        return;
    }

    // Clear any previous messages and remove any existing backdrop
    clearAllMessages(); 
    removeGlobalBackdrop(); 

    // Create and append the backdrop
    globalBackdrop = document.createElement('div');
    globalBackdrop.className = 'global-modal-backdrop';
    document.body.appendChild(globalBackdrop);

    // Clear any previous content and close button
    notificationMessageBox.innerHTML = '';
    notificationMessageBox.textContent = message;
    notificationMessageBox.className = `global-message-box ${type}`;
    notificationMessageBox.style.display = 'flex'; 
    notificationMessageBox.style.opacity = '1';

    // Create a close icon
    const closeIcon = document.createElement('span');
    closeIcon.textContent = '✖'; 
    closeIcon.className = 'global-message-close-icon'; 
    closeIcon.style.cursor = 'pointer';
    closeIcon.style.marginLeft = '10px'; 
    closeIcon.style.fontWeight = 'bold'; 
    closeIcon.style.fontSize = '1.2em'; 

    closeIcon.onclick = () => {
        notificationMessageBox.style.opacity = '0';
        setTimeout(() => {
            notificationMessageBox.style.display = 'none';
            notificationMessageBox.innerHTML = ''; 
            removeGlobalBackdrop(); 
            if (onCloseCallback) { 
                onCloseCallback();
            }
        }, 300); 
    };

    notificationMessageBox.appendChild(closeIcon);
};

// Helper function to remove the global backdrop (copied from script.js)
const removeGlobalBackdrop = () => {
    if (globalBackdrop && globalBackdrop.parentNode) {
        globalBackdrop.parentNode.removeChild(globalBackdrop);
        globalBackdrop = null; 
    }
};

// Clears all messages (including global)
const clearAllMessages = () => {
    if (notificationMessageBox) {
        notificationMessageBox.style.display = 'none';
        notificationMessageBox.style.opacity = '0';
        notificationMessageBox.innerHTML = ''; 
    }
    removeGlobalBackdrop();
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
            // setDoc is now imported at the top
            await setDoc(doc(db, 'users', user.uid), { 
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
            if (!user.emailVerified) {
                displayModalMessage(verificationLoginMessage, 'Email not yet verified by Firebase. Please use the "Forgot Password/Resend Email Verification Link?" option to get a new link.', 'error');
                emailVerificationLoginForm.reset(); 
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
                await updateUserAccountStatus(user.uid, 'Awaiting Admin Approval'); 

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
                emailVerificationLoginForm.reset(); 
                if (emailVerificationLoginModal) emailVerificationLoginModal.style.display = 'none'; 

                displayGlobalNotification(
                    `Your account status is currently "${currentAccountStatus}". Please proceed to the main login or contact support if you need further assistance.`, 
                    'error', 
                    () => {
                        if (loginModal) loginModal.style.display = 'flex'; 
                        clearAllMessages(); 
                    }
                );
                await signOut(auth); 
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
        const confirmedNewPasswordValue = confirmNewPassword?.value; 

        if (!newPass || !confirmedNewPasswordValue) { 
             displayModalMessage(resetPasswordMessage, 'Please enter and confirm your new password.', 'error');
             return;
        }

        if (newPass !== confirmedNewPasswordValue) { 
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

        console.log("Attempting password change with oobCode:", currentOobCode);
        console.log("auth.currentUser before confirmPasswordReset:", auth.currentUser);

        let notificationMessage = ''; 
        let notificationType = 'success'; 

        try {
            await confirmPasswordReset(auth, currentOobCode, newPass);
            console.log("Password updated using confirmPasswordReset!");

            let signedInUser = null;
            if (oobCodeEmail) { 
                const userCredentialAfterReset = await signInWithEmailAndPassword(auth, oobCodeEmail, newPass);
                signedInUser = userCredentialAfterReset.user;
                console.log("User successfully signed in after password reset. UID:", signedInUser.uid);
            } else {
                console.warn("oobCodeEmail was not set, cannot explicitly sign in user after password reset.");
            }

            if (signedInUser && signedInUser.uid) { 
                const userData = await getUserProfile(signedInUser.uid); 

                if (userData) {
                    if (userData.accountStatus === 'Awaiting Email Verification') {
                        console.log("Account status is 'Awaiting Email Verification'. Updating to 'Awaiting Admin Approval' for UID:", signedInUser.uid);
                        await updateDoc(doc(db, 'users', signedInUser.uid), { 
                            accountStatus: 'Awaiting Admin Approval',
                            updatedAt: serverTimestamp() 
                        });
                        notificationMessage = 'Your account has been fully verified and is now awaiting Admin approval. Once approved, you may log in to your account and enjoy!';
                        notificationType = 'success';
                        console.log("Firestore status updated to Awaiting Admin Approval.");
                    } else if (userData.accountStatus === 'Access Granted') {
                        console.log("Account status is 'Access Granted', no change needed for UID:", signedInUser.uid);
                        notificationMessage = 'Password has been changed successfully!';
                        notificationType = 'success';
                    } else if (userData.accountStatus === 'Awaiting Admin Approval') { 
                        console.log("Account status is 'Awaiting Admin Approval', no change needed. Showing specific message for UID:", signedInUser.uid);
                        notificationMessage = 'Password has been changed successfully and is now awaiting Admin approval. Once approved, you may log in to your account and enjoy!';
                        notificationType = 'success';
                    } else {
                        console.warn("User data found, but status not 'Awaiting Email Verification', 'Access Granted', or 'Awaiting Admin Approval'. Current status:", userData.accountStatus, "Status not updated after password reset.");
                        notificationMessage = 'Password has been changed successfully. Your account status is ' + userData.accountStatus + '. Please contact support if needed.';
                        notificationType = 'info'; 
                    }
                } else {
                    console.warn("User data not found for UID:", signedInUser.uid, ". Status not updated after password reset.");
                    notificationMessage = 'Password has been changed successfully, but user data could not be retrieved. Please log in or contact support.';
                    notificationType = 'info'; 
                }
            } else {
                console.warn("Signed-in user or UID not available for Firestore status update.");
                notificationMessage = 'Password has been changed successfully, but account status could not be updated. Please log in or contact support.';
                notificationType = 'info'; 
            }

            resetPasswordForm.reset(); 
            if (resetPasswordAndVerifyModal) resetPasswordAndVerifyModal.style.display = 'none'; 

            displayGlobalNotification(
                notificationMessage,
                notificationType,
                () => { 
                    if (loginModal) loginModal.style.display = 'flex'; 
                    clearAllMessages(); 
                }
            );

        } catch (error) {
            console.error("Error setting new password and verifying:", error);
            console.error("Firebase error code for password reset attempt:", error.code); 

            let errorMessage = "Failed to set new password. The link might be invalid or expired. Please try resending.";
            if (error.code === 'auth/invalid-action-code') {
                errorMessage = 'The link is invalid or has already been used. Please try resending a new link.';
            } else if (error.code === 'auth/user-disabled') {
                errorMessage = 'Your account has been disabled.';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'Password is too weak. Please ensure it meets the criteria.'; 
            } else if (error.code === 'auth/requires-recent-login') {
                errorMessage = 'Please sign in again to change your password. You will need to request a new password reset link.';
            } else if (error.code === 'auth/user-not-found') { 
                errorMessage = 'The user associated with this link was not found. Please ensure the link is correct.';
            }
            
            if (resetPasswordAndVerifyModal) resetPasswordAndVerifyModal.style.display = 'none'; 
            displayGlobalNotification(
                errorMessage, 
                'error', 
                () => {
                    if (invalidVerificationLinkModal) invalidVerificationLinkModal.style.display = 'flex'; 
                    const resendEmailInputRef = document.getElementById('resendEmailInput');
                    if(resendEmailInputRef && oobCodeEmail) resendEmailInputRef.value = oobCodeEmail; 
                    currentOobCode = null; 
                    oobCodeEmail = null; 
                    clearAllMessages(); 
                }
            );
        }
    });
} else {
    console.error("Reset password form element not found.");
}


// --- Main Login Form Submission ---
if (loginForm) { 
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

            // Fetch user data from Firestore AND get ID token claims for admin check
            const [userData, idTokenResult] = await Promise.all([
                getUserProfile(user.uid),
                user.getIdTokenResult() // Get claims including custom claims
            ]);

            // If email is not verified, redirect to verification login form
            if (!user.emailVerified) {
                loginForm.reset(); 
                if (loginModal) loginModal.style.display = 'none'; 

                displayGlobalNotification(
                    'Your email is not yet verified. Please complete the verification process by logging in to the Email Verification Form.',
                    'error',
                    () => {
                        if (emailVerificationLoginModal) emailVerificationLoginModal.style.display = 'flex';
                        const verificationEmailInput = document.getElementById('verificationEmail');
                        if (verificationEmailInput) verificationEmailInput.value = email; 
                        const verificationPasswordInput = document.getElementById('verificationPassword');
                        if (verificationPasswordInput) verificationPasswordInput.value = ''; 
                        clearAllMessages();
                    }
                );
                return; 
            }

            // Check if user data exists in Firestore
            if (!userData) { 
                displayModalMessage(loginMessage, 'User data not found. Please contact support.', 'error');
                await signOut(auth); 
                loginForm.reset(); 
                return;
            }

            const accountStatus = userData.accountStatus;
            const userRole = userData.role;
            const isAdmin = idTokenResult.claims.admin === true; // Check admin claim

            // --- Handle redirection based on account status and admin privilege ---
            if (accountStatus === 'Access Granted') {
                loginForm.reset(); 
                if (loginModal) loginModal.style.display = 'none';

                // Store user's primary role and admin status in session storage
                sessionStorage.setItem('currentUserRole', userRole);
                sessionStorage.setItem('isAdmin', isAdmin ? 'true' : 'false');

                // Determine roles to show in modal (driver, passenger, admin)
                const availableRoles = [];
                if (userRole === 'driver' || userRole === 'hybrid') {
                    availableRoles.push('driver');
                }
                if (userRole === 'passenger' || userRole === 'hybrid') {
                    availableRoles.push('passenger');
                }
                if (isAdmin) {
                    availableRoles.push('admin');
                }

                // If only one role is available and not admin, redirect directly
                if (availableRoles.length === 1 && !isAdmin) {
                    displayGlobalNotification('Login successful! Redirecting to dashboard.', 'success');
                    setTimeout(() => {
                        if (userRole === 'driver') {
                            window.location.href = 'driverdashboard.html';
                        } else if (userRole === 'passenger') {
                            window.location.href = 'passengerdashboard.html';
                        }
                    }, 500);
                } else {
                    // Show role selection modal for hybrid or admin users
                    displayGlobalNotification('Login successful! Please select your role.', 'success', () => {
                         populateRoleSelectionModal(availableRoles);
                         if (roleSelectionModal) roleSelectionModal.style.display = 'flex';
                         clearAllMessages(); // Clear global message after showing modal
                    });
                }
                
            } else if (accountStatus === 'Awaiting Email Verification') {
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


// --- Populate and Handle Role Selection Modal ---
/**
 * Populates the role selection modal with buttons based on available roles.
 * @param {Array<string>} roles - An array of roles available to the user (e.g., ['driver', 'passenger', 'admin']).
 */
const populateRoleSelectionModal = (roles) => {
    if (!roleSelectionButtonsContainer) {
        console.error("Role selection buttons container not found!");
        return;
    }
    roleSelectionButtonsContainer.innerHTML = ''; // Clear previous buttons

    roles.forEach(role => {
        const button = document.createElement('button');
        button.className = 'role-select-button'; // Add a class for styling
        button.textContent = `Log In as ${role.charAt(0).toUpperCase() + role.slice(1)}`; // Capitalize first letter

        button.addEventListener('click', () => {
            if (roleSelectionModal) roleSelectionModal.style.display = 'none';
            // Redirect based on selected role
            if (role === 'driver') {
                window.location.href = 'driverdashboard.html';
            } else if (role === 'passenger') {
                window.location.href = 'passengerdashboard.html';
            } else if (role === 'admin') {
                window.location.href = 'admin_dashboard.html';
            }
        });
        roleSelectionButtonsContainer.appendChild(button);
    });
};


// Function to handle email verification link clicks (oobCode)
const handleOobCode = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    const oobCode = urlParams.get('oobCode');

    if (oobCode) { 
        currentOobCode = oobCode; 
        clearAllMessages(); 

        if (mode === 'verifyEmail') {
            let emailFromOob = '';
            try {
                const info = await checkActionCode(auth, oobCode);
                emailFromOob = info.data.email; 
                oobCodeEmail = emailFromOob; 
                console.log(`handleOobCode: Processing verifyEmail for: ${emailFromOob}`);

                await applyActionCode(auth, oobCode); 
                console.log("Email verification successful via OOB code!");

                history.replaceState({}, document.title, window.location.pathname); 
                displayGlobalNotification(
                    'Your email has been successfully verified! Please log in to the Email Verification Form to complete account activation.', 
                    'success', 
                    (() => {
                        if (emailVerificationLoginModal) emailVerificationLoginModal.style.display = 'flex';
                        const verificationEmailInput = document.getElementById('verificationEmail');
                        if (verificationEmailInput) verificationEmailInput.value = emailFromOob; 
                        const verificationPasswordInput = document.getElementById('verificationPassword');
                        if (verificationPasswordInput) verificationPasswordInput.value = ''; 
                        clearAllMessages();
                    }) // Ensure this is a function call
                );
            } catch (error) {
                console.error("Error handling email verification link (verifyEmail mode):", error);
                
                let message = '';
                if (error.code === 'auth/expired-action-code') {
                    message = 'The verification link has expired. Please use the "Forgot Password/Resend Email Verification Link?" option to request a new link.';
                    if (emailVerificationLoginModal) emailVerificationLoginModal.style.display = 'none'; 
                    displayGlobalNotification(
                        message, 
                        'error', 
                        () => {
                            if (invalidVerificationLinkModal) invalidVerificationLinkModal.style.display = 'flex';
                            const resendEmailInputRef = document.getElementById('resendEmailInput');
                            if(resendEmailInputRef && oobCodeEmail) resendEmailInputRef.value = oobCodeEmail; 
                            currentOobCode = null; 
                            oobCodeEmail = null; 
                            clearAllMessages(); 
                        }
                    );
                    history.replaceState({}, document.title, window.location.pathname); 
                    return; 
                } else if (error.code === 'auth/invalid-action-code') {
                    message = 'The verification link is invalid or has already been used. Please log in below to check your account status.';
                    if (emailVerificationLoginModal) emailVerificationLoginModal.style.display = 'flex';
                    const verificationEmailInput = document.getElementById('verificationEmail');
                    if (verificationEmailInput) verificationEmailInput.value = emailFromOob || ''; 
                    const verificationPasswordInput = document.getElementById('verificationPassword');
                    if (verificationPasswordInput) verificationPasswordInput.value = '';
                    displayModalMessage(verificationLoginMessage, message, 'error');
                } else if (error.code === 'auth/user-disabled') {
                    message = 'Your account has been disabled. Please contact support.';
                    if (emailVerificationLoginModal) emailVerificationLoginModal.style.display = 'none'; 
                    if (loginModal) loginModal.style.display = 'flex'; 
                    displayGlobalNotification(message, 'error'); 
                } else {
                    message = 'An error occurred with the verification link. Please log in below to check your account status.';
                    if (emailVerificationLoginModal) emailVerificationLoginModal.style.display = 'flex';
                    const verificationEmailInput = document.getElementById('verificationEmail');
                    if (verificationEmailInput) verificationEmailInput.value = emailFromOob || '';
                    const verificationPasswordInput = document.getElementById('verificationPassword');
                    if (verificationPasswordInput) verificationPasswordInput.value = '';
                    displayModalMessage(verificationLoginMessage, message, 'error');
                }

                history.replaceState({}, document.title, window.location.pathname); 
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
                console.error("Error checking password reset code (mode=resetPassword):", error); 
                clearAllMessages();
                if (invalidVerificationLinkModal) invalidVerificationLinkModal.style.display = 'none'; 
                if (emailVerificationLoginModal) emailVerificationLoginModal.style.display = 'none'; 
                if (resetPasswordAndVerifyModal) resetPasswordAndVerifyModal.style.display = 'none'; 
                
                if (loginModal) loginModal.style.display = 'none'; 

                let errorMessage = 'The password reset link is invalid or has expired. Please use the "Forgot Password/Resend Email Verification Link?" link on the login form to request a new one.';
                if (error.code === 'auth/invalid-action-code') {
                    errorMessage = 'The link is invalid or has already been used. Please try resending a new link.';
                } else if (error.code === 'auth/user-disabled') {
                     errorMessage = 'Your account has been disabled.';
                } else if (error.code === 'auth/action-code-expired') { 
                     errorMessage = 'The password reset link has expired. Please use the "Forgot Password/Resend Email Verification Link?" link on the login form to request a new one.';
                }


                displayGlobalNotification(errorMessage, 'error', () => {
                    if (invalidVerificationLinkModal) invalidVerificationLinkModal.style.display = 'flex'; 
                    const resendEmailInputRef = document.getElementById('resendEmailInput');
                    if(resendEmailInputRef && oobCodeEmail) resendEmailInputRef.value = oobCodeEmail; 
                    currentOobCode = null; 
                    oobCodeEmail = null; 
                    clearAllMessages(); 
                }
            );
            }
        }
    }
};

// Resend Verification Link / Forgot Password button handler (now handles both)
if (resendVerificationButton) { 
    resendVerificationButton.onclick = async () => {
        clearAllMessages(); 
        const emailToResend = resendEmailInput?.value;
        if (!emailToResend) {
            displayModalMessage(resendMessage, 'Please enter your email address.', 'error');
            return;
        }

        try {
            await sendPasswordResetEmail(auth, emailToResend);
            if (resendEmailInput) resendEmailInput.value = ''; 

            displayGlobalNotification(
                'If an account with that email exists, a verification/password reset link has been sent to your email. Please check your inbox (and spam folder).', 
                'success',
                () => { 
                    if (invalidVerificationLinkModal) invalidVerificationLinkModal.style.display = 'none'; 
                    if (loginModal) loginModal.style.display = 'flex'; 
                    clearAllMessages(); 
                }
            );

        } catch (resendError) {
            console.error("Error sending verification/reset link:", resendError);
            console.error("Firebase error code for resend link attempt:", resendError.code);

            let resendErrorMessage = "Failed to send link. Please check the email format or try again.";
            if (resendError.code === 'auth/invalid-email') {
                resendErrorMessage = 'Please enter a valid email address.';
            } else if (resendError.code === 'auth/user-disabled') {
                resendErrorMessage = 'This account has been disabled.';
            } else if (resendError.code === 'auth/network-request-failed') { 
                resendErrorMessage = 'Network error. Please check your internet connection and try again.';
            } else if (resendError.code === 'auth/too-many-requests') { 
                resendErrorMessage = 'Too many requests for this email. Please wait a few minutes before trying again.';
            } else {
                console.error("Unhandled resend error code:", resendError.code);
            }
            
            displayGlobalNotification(resendErrorMessage, 'error', () => {
                clearAllMessages(); 
            });
        }
    };
} else {
    console.warn("Resend Verification button not found.");
}


// Call handleOobCode when the page loads
window.onload = handleOobCode;


// Handle Firebase Auth state changes (useful for persistent login)
// This is mainly for initial page load check for the login status.
// Redirection logic is primarily handled in the loginForm submission now.
onAuthStateChanged(auth, async (user) => { 
    if (user) {
        // User is signed in.
        // For simplicity, if a logged-in user somehow lands on the root (index.html),
        // and they are already 'Access Granted', redirect them based on their role
        // unless they are on an oobCode link.
        const urlParams = new URLSearchParams(window.location.search);
        const mode = urlParams.get('mode');

        if (!mode && (window.location.pathname.endsWith('/') || window.location.pathname.endsWith('index.html'))) {
            try {
                const userData = await getUserProfile(user.uid);
                if (userData && userData.accountStatus === 'Access Granted') {
                    // Fetch ID token results to check for admin claim
                    const idTokenResult = await user.getIdTokenResult();
                    const userRole = userData.role;
                    const isAdmin = idTokenResult.claims.admin === true;

                    // If user is a normal driver/passenger, redirect directly
                    if (userRole === 'driver' && !isAdmin && userRole !== 'hybrid') { // Added !isAdmin and !hybrid to condition
                        window.location.href = 'driverdashboard.html';
                    } else if (userRole === 'passenger' && !isAdmin && userRole !== 'hybrid') { // Added !isAdmin and !hybrid to condition
                        window.location.href = 'passengerdashboard.html';
                    } else {
                        // For hybrid or admin users, show the role selection modal
                        const availableRoles = [];
                        if (userRole === 'driver' || userRole === 'hybrid') {
                            availableRoles.push('driver');
                        }
                        if (userRole === 'passenger' || userRole === 'hybrid') {
                            availableRoles.push('passenger');
                        }
                        if (isAdmin) {
                            availableRoles.push('admin');
                        }
                        populateRoleSelectionModal(availableRoles);
                        if (roleSelectionModal) roleSelectionModal.style.display = 'flex';
                    }
                }
            } catch (error) {
                console.error("Error in onAuthStateChanged for index.html:", error);
                // Optionally display a notification or log out
            }
        }
    } else {
        // User is signed out. Do nothing if they are on index.html.
        // Redirection for admin_dashboard.html will be handled by admin_script.js
        // and other modals already handle their own redirects if needed.
    }
});
