// js/dashboard_roles.js

import { auth, signOut, onAuthStateChanged, getUserProfile } from './auth.js';

// Global notification message box (reused from script.js)
const notificationMessageBox = document.getElementById('notificationMessageBox');
let globalBackdrop = null;

// Helper to display a global notification message (copied from script.js)
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


const roleSelector = document.getElementById('roleSelector');
const logoutButton = document.getElementById('logoutButton');

/**
 * Populates the role selector dropdown based on the user's available roles.
 * It reads the user's primary role and admin status from sessionStorage
 * (which is set during login in script.js).
 */
const populateRoleSelector = () => {
    const currentUserRole = sessionStorage.getItem('currentUserRole'); // Primary role from Firestore
    const isAdmin = sessionStorage.getItem('isAdmin') === 'true'; // Admin status from claims

    if (!roleSelector) {
        console.warn("Role selector dropdown not found on this dashboard.");
        return;
    }

    // Clear existing options, but keep the "Switch Role" default
    roleSelector.innerHTML = '<option value="">Switch Role</option>';

    // Determine which roles are available for this user
    const availableRoles = new Set(); // Use a Set to avoid duplicates

    // Add primary user roles
    if (currentUserRole === 'driver' || currentUserRole === 'hybrid') {
        availableRoles.add('driver');
    }
    if (currentUserRole === 'passenger' || currentUserRole === 'hybrid') {
        availableRoles.add('passenger');
    }
    // Add admin role if applicable
    if (isAdmin) {
        availableRoles.add('admin');
    }

    // Add options to the dropdown for each available role
    availableRoles.forEach(role => {
        // Prevent showing "Switch Role" to the current page's role
        let currentPath = window.location.pathname;
        let isCurrentPageRole = false;

        if (role === 'driver' && currentPath.includes('driverdashboard.html')) {
            isCurrentPageRole = true;
        } else if (role === 'passenger' && currentPath.includes('passengerdashboard.html')) {
            isCurrentPageRole = true;
        } else if (role === 'admin' && currentPath.includes('admin_dashboard.html')) {
            isCurrentPageRole = true;
        }

        if (!isCurrentPageRole) {
            const option = document.createElement('option');
            option.value = role;
            option.textContent = role.charAt(0).toUpperCase() + role.slice(1); // Capitalize
            roleSelector.appendChild(option);
        }
    });

    // If only one option available (besides "Switch Role"), or no other roles to switch to,
    // disable the selector or hide it, or just leave it.
    // We'll leave it as is, but if there's only "Switch Role", it won't do anything.
    if (roleSelector.options.length <= 1) { // Only "Switch Role"
        roleSelector.style.display = 'none'; // Hide if no other roles to switch to
    } else {
        roleSelector.style.display = 'inline-block'; // Show if there are options
    }
};


// Event listener for role selector changes
if (roleSelector) {
    roleSelector.addEventListener('change', (event) => {
        const selectedRole = event.target.value;
        if (selectedRole) { // If a valid role was selected (not the "Switch Role" placeholder)
            if (selectedRole === 'driver') {
                window.location.href = 'driverdashboard.html';
            } else if (selectedRole === 'passenger') {
                window.location.href = 'passengerdashboard.html';
            } else if (selectedRole === 'admin') {
                window.location.href = 'admin_dashboard.html';
            }
        }
    });
}

// Event listener for logout button
if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
        try {
            await signOut(auth);
            // Clear session storage upon logout
            sessionStorage.removeItem('currentUserRole');
            sessionStorage.removeItem('isAdmin');
            window.location.href = 'index.html'; // Redirect to main login
        } catch (error) {
            console.error("Error logging out:", error);
            displayGlobalNotification('Failed to log out. Please try again.', 'error');
        }
    });
}

// On page load, check auth state and populate role selector
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is logged in. Fetch their claims and profile to ensure session storage is up-to-date.
        // This handles cases where user refreshes the page or navigates directly.
        try {
            const [userData, idTokenResult] = await Promise.all([
                getUserProfile(user.uid),
                user.getIdTokenResult()
            ]);

            if (userData && userData.accountStatus === 'Access Granted') {
                const userRole = userData.role;
                const isAdmin = idTokenResult.claims.admin === true;

                // Update session storage in case it was cleared or page refreshed
                sessionStorage.setItem('currentUserRole', userRole);
                sessionStorage.setItem('isAdmin', isAdmin ? 'true' : 'false');
                
                populateRoleSelector();
            } else {
                // Account not 'Access Granted' or data missing, redirect to login
                displayGlobalNotification("Your account is not active. Please log in again.", "error", () => {
                    signOut(auth);
                    window.location.href = 'index.html';
                });
            }
        } catch (error) {
            console.error("Error checking auth state on dashboard:", error);
            displayGlobalNotification("Authentication check failed. Please log in again.", "error", () => {
                signOut(auth);
                window.location.href = 'index.html';
            });
        }
    } else {
        // No user is logged in, redirect to index.html
        window.location.href = 'index.html';
    }
});

// Initial call when the script loads to set up event listeners
// populateRoleSelector will be called by onAuthStateChanged after auth is confirmed.
