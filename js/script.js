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
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,   
    signOut,                      
    onAuthStateChanged            
} from './auth.js'; 

// Import Firestore functions for modular usage
import { collection, doc, setDoc, updateDoc, getDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";


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
let oobCodeEmail = null; 


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
    clearAllMessages(); // Clear messages first
    signupForm.reset(); // Clear form fields
    signupModal.style.display = 'flex';
});

loginButton.addEventListener('click', () => {
    clearAllMessages(); // Clear messages first
    loginForm.reset(); // Clear form fields
    loginModal.style.display = 'flex';
});

// NEW: Event listener for Forgot Password link
if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        clearAllMessages(); // Clear all messages
        loginModal.style.display = 'none'; // Hide login modal
        resendEmailInput.value = ''; // Clear any previous email
        invalidVerificationLinkModal.style.display = 'flex'; // Show resend/forgot modal
    });
}


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
    // Allow closing of emailVerificationLoginModal with close button, but not outside click
    if (event.target == emailVerificationLoginModal && event.target.querySelector('.close-button') !== event.target) {
        // Do nothing to prevent closing by clicking outside this modal
    }
    // Allow closing of invalidVerificationLinkModal with close button, but not outside click
    if (event.target == invalidVerificationLinkModal && event.target.querySelector('.close-button') !== event.target) {
         // Do nothing to prevent closing by clicking outside this modal
    }
    // Allow closing of resetPasswordAndVerifyModal with close button, but not outside click
    if (event.target == resetPasswordAndVerifyModal && event.target.querySelector('.close-button') !== event.target) {
         // Do nothing to prevent closing by clicking outside this modal
    }
    if (event.target == hybridRoleModal) {
         // Do nothing to prevent closing by clicking outside this modal
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
    displayModalMessage(resetPasswordMessage, '', ''); 

    if (notificationMessageBox) {
        notificationMessageBox.style.display = 'none';
        notificationMessageBox.style.opacity = '0';
        notificationMessageBox.innerHTML = ''; 
    }
};


// --- Signup Form Submission ---
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllMessages(); 

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

    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])(?=.*[A-Z]).{10,16}$/;
    if (!passwordRegex.test(password)) {
        displayModalMessage(signupMessage, 'Password must be 10-16 alphanumeric characters, contain at least 1 symbol, 1 numeric, and 1 capital letter.', 'error');
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password); 
        const user = userCredential.user;

        await sendVerificationEmail(user);

        await setDoc(doc(collection(db, 'users'), user.uid), {
            firstName: firstName,
            lastName: lastName,
            gender: gender,
            mobile: mobile,
            email: email,
            facebookLink: facebookLink,
            role: role,
            city: city,
            accountStatus: 'Awaiting Email Verification', 
            createdAt: serverTimestamp() 
        });

        displayGlobalNotification('Signup successful! Please check your email for a verification link.', 'success');
        signupForm.reset(); 
        signupModal.style.display = 'none'; 
        loginModal.style.display = 'flex'; 

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
    clearAllMessages(); 

    const email = document.getElementById('verificationEmail').value;
    const password = document.getElementById('verificationPassword').value;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password); 
        const user = userCredential.user;

        if (!user.emailVerified) {
            displayModalMessage(verificationLoginMessage, 'Email not verified. Please check your email for the verification link.', 'error');
            emailVerificationLoginForm.reset(); 
            return;
        }

        // NEW: Check Firestore account status BEFORE updating
        const userDocRef = doc(collection(db, 'users'), user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            displayModalMessage(verificationLoginMessage, 'User data not found. Please contact support.', 'error');
            await signOut(auth); 
            emailVerificationLoginForm.reset(); 
            return;
        }

        const userData = userDoc.data();
        const currentAccountStatus = userData.accountStatus;

        if (currentAccountStatus === 'Awaiting Email Verification') {
            // Proceed to update to 'Awaiting Admin Approval'
            await updateDoc(doc(collection(db, 'users'), user.uid), {
                accountStatus: 'Awaiting Admin Approval'
            });

            emailVerificationLoginForm.reset(); 
            emailVerificationLoginModal.style.display = 'none'; 

            displayGlobalNotification(
                'Your account has been fully verified and is now awaiting Admin approval. Once approved, you may log in to your account and enjoy!',
                'success',
                () => { 
                    loginModal.style.display = 'flex'; 
                    clearAllMessages(); 
                }
            );
        } else {
            // Account status is not 'Awaiting Email Verification', inform user
            displayModalMessage(verificationLoginMessage, `Your account status is currently "${currentAccountStatus}". Please proceed to the main login or contact support.`, 'error');
            emailVerificationLoginForm.reset(); 
            // Optionally, sign them out if this was an unexpected state
            await signOut(auth);
            // After showing message, redirect to main login
            setTimeout(() => {
                emailVerificationLoginModal.style.display = 'none';
                loginModal.style.display = 'flex';
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

// --- New Password Reset Form Submission (for verification via reset link) ---
resetPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllMessages(); 

    const newPass = newPassword.value;
    const confirmNewPass = confirmNewPassword.value;

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
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('email', '==', oobCodeEmail));
            const userDocs = await getDocs(q);

            if (!userDocs.empty) {
                const userId = userDocs.docs[0].id;
                await updateDoc(doc(collection(db, 'users'), userId), {
                    accountStatus: 'Awaiting Admin Approval'
                });
                console.log("Firestore status updated to Awaiting Admin Approval after password reset verification for:", oobCodeEmail);
            } else {
                console.warn("User not found in Firestore for email:", oobCodeEmail, ". Status not updated.");
            }
        } else {
            console.warn("oobCodeEmail was not set. Cannot update Firestore status.");
        }


        resetPasswordForm.reset(); 
        resetPasswordAndVerifyModal.style.display = 'none'; 

        displayGlobalNotification(
            'Your account has been fully verified and is now awaiting Admin approval. Once approved, you may log in to your account and enjoy!',
            'success',
            () => { 
                loginModal.style.display = 'flex'; 
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


// --- Main Login Form Submission ---
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllMessages(); 

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password); 
        const user = userCredential.user;

        if (!user.emailVerified) {
            displayModalMessage(loginMessage, 'Email not verified. Please check your email for the verification link and complete the verification login.', 'error');
            loginForm.reset(); 
            return;
        }

        const userDocRef = doc(collection(db, 'users'), user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) { 
            displayModalMessage(loginMessage, 'User data not found. Please contact support.', 'error');
            await signOut(auth); 
            loginForm.reset(); 
            return;
        }

        const userData = userDoc.data();
        const accountStatus = userData.accountStatus;
        const userRole = userData.role;

        if (accountStatus === 'Access Granted') {
            displayGlobalNotification('Login successful! Redirecting to dashboard.', 'success');
            loginForm.reset(); 
            loginModal.style.display = 'none';
            setTimeout(() => {
                if (userRole === 'driver') {
                    window.location.href = 'driverdashboard.html';
                } else if (userRole === 'passenger') {
                    window.location.href = 'passengerdashboard.html';
                } else if (userRole === 'hybrid') {
                    hybridRoleModal.style.display = 'flex';
                }
            }, 500); 

        } else if (accountStatus === 'Awaiting Email Verification') {
            displayModalMessage(loginMessage, 'Your email has been verified. Please log in here to complete account activation.', 'success');
            emailVerificationLoginModal.style.display = 'flex'; 
            document.getElementById('verificationEmail').value = email; 
            loginModal.style.display = 'none'; 
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
        }
        displayModalMessage(loginMessage, errorMessage, 'error');
        loginForm.reset(); 
    }
});

// Hybrid Role Selection
loginAsDriverBtn.addEventListener('click', () => {
    hybridRoleModal.style.display = 'none';
    window.location.href = 'driverdashboard.html';
});

loginAsPassengerBtn.addEventListener('click', () => {
    hybridRoleModal.style.display = 'none';
    window.location.href = 'passengerdashboard.html'; 
});

// Function to handle email verification link clicks (oobCode)
const handleOobCode = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    const oobCode = urlParams.get('oobCode');

    if (oobCode) { 
        currentOobCode = oobCode; 

        if (mode === 'verifyEmail') {
            try {
                await applyActionCode(auth, oobCode); 
                console.log("Email verification successful via OOB code!");

                history.replaceState({}, document.title, window.location.pathname);

                emailVerificationLoginModal.style.display = 'flex';
                const currentUser = auth.currentUser;
                if (currentUser && currentUser.email) {
                    document.getElementById('verificationEmail').value = currentUser.email;
                }
                displayModalMessage(verificationLoginMessage, 'Email verified! Please log in to complete account activation.', 'success');

            } catch (error) {
                console.error("Error applying action code for email verification:", error);
                // NEW: Redirect to main login and show global notification on error
                clearAllMessages(); 
                emailVerificationLoginModal.style.display = 'none'; 
                resetPasswordAndVerifyModal.style.display = 'none'; // Ensure reset modal is closed too
                invalidVerificationLinkModal.style.display = 'none'; // Ensure resend modal is closed

                loginModal.style.display = 'flex'; // Show main login modal

                let errorMessage = 'The verification link is invalid or has expired. Please use the "Forgot Password?" link on the login form to resend a new verification or reset link.';
                if (error.code === 'auth/invalid-action-code') {
                    errorMessage = 'The verification link is invalid or has already been used. Please use the "Forgot Password?" link on the login form to resend a new link.';
                } else if (error.code === 'auth/user-disabled') {
                     errorMessage = 'Your account has been disabled. Please contact support.';
                }

                displayGlobalNotification(errorMessage, 'error', () => {
                    clearAllMessages(); // Clear after user closes notification
                });
                resendEmailInput.value = ''; 
            }
        } else if (mode === 'resetPassword') { 
            try {
                const info = await checkActionCode(auth, oobCode); 
                oobCodeEmail = info.data.email; 
                console.log("Password reset code checked and is valid. Email:", oobCodeEmail, ". Proceed to set new password.");

                clearAllMessages();
                invalidVerificationLinkModal.style.display = 'none'; 
                emailVerificationLoginModal.style.display = 'none';
                loginModal.style.display = 'none'; 

                resetPasswordAndVerifyModal.style.display = 'flex'; 
                resetPasswordForm.reset(); 
                displayModalMessage(resetPasswordMessage, '', ''); 
                newPasswordStrength.className = 'password-strength'; 

                history.replaceState({}, document.title, window.location.pathname); 

            } catch (error) {
                console.error("Error checking password reset code:", error);
                // NEW: Redirect to main login and show global notification on error
                clearAllMessages();
                invalidVerificationLinkModal.style.display = 'none'; 
                emailVerificationLoginModal.style.display = 'none'; 
                resetPasswordAndVerifyModal.style.display = 'none'; // Ensure reset modal is closed
                
                loginModal.style.display = 'flex'; // Show main login modal

                let errorMessage = 'The password reset link is invalid or has expired. Please use the "Forgot Password?" link on the login form to request a new one.';
                 if (error.code === 'auth/invalid-action-code') {
                    errorMessage = 'The password reset link is invalid or has already been used. Please use the "Forgot Password?" link on the login form to request a new link.';
                } else if (error.code === 'auth/user-disabled') {
                     errorMessage = 'Your account has been disabled. Please contact support.';
                }

                displayGlobalNotification(errorMessage, 'error', () => {
                    clearAllMessages(); // Clear after user closes notification
                });
                resendEmailInput.value = ''; 
            }
        }
    }
};

// Resend Verification Link / Forgot Password button handler (now handles both)
resendVerificationButton.onclick = async () => {
    clearAllMessages(); 
    const emailToResend = resendEmailInput.value;
    if (!emailToResend) {
        displayModalMessage(resendMessage, 'Please enter your email address.', 'error');
        return;
    }

    try {
        await sendPasswordResetEmail(auth, emailToResend);
        resendEmailInput.value = ''; 

        displayGlobalNotification(
            'If an account with that email exists, a verification/password reset link has been sent to your email. Please check your inbox (and spam folder).', // More generic message
            'success',
            () => { 
                invalidVerificationLinkModal.style.display = 'none'; 
                loginModal.style.display = 'flex'; 
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
