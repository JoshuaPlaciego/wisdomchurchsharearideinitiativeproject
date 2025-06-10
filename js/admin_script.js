// js/admin_script.js

import { 
    auth, 
    db, 
    signOut, 
    onAuthStateChanged,
    serverTimestamp 
} from './auth.js';

// Import Firestore specific functions
import { 
    collection, 
    getDocs, 
    query, 
    where, 
    doc, 
    updateDoc 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// REMOVED: Cloud Functions client SDK import (getFunctions, httpsCallable)

// Import global notification functions and populateRoleSelector from dashboard_roles.js
import { displayGlobalNotification, clearAllMessages, removeGlobalBackdrop, populateRoleSelector } from './dashboard_roles.js';

// Get elements
const usersTableBody = document.querySelector('#usersTable tbody');
const adminLogoutButton = document.getElementById('adminLogoutButton');
const statusFilter = document.getElementById('statusFilter');
const refreshUsersButton = document.getElementById('refreshUsersButton');
const roleSelector = document.getElementById('roleSelector'); // For role selector on admin page header

// REMOVED: addAdminRoleCallable initialization


// Event Listeners for Role Selector and Logout Button (using imported populateRoleSelector)
if (roleSelector) {
    // populateRoleSelector will handle its own listeners for 'change'
}

if (adminLogoutButton) {
    adminLogoutButton.addEventListener('click', async () => {
        try {
            await signOut(auth);
            // Clear session storage upon logout
            sessionStorage.removeItem('currentUserRole');
            sessionStorage.removeItem('isAdmin');
            window.location.href = 'index.html'; // Redirect to main login page
        } catch (error) {
            console.error("Error during logout:", error);
            displayGlobalNotification('Failed to log out: ' + error.message, 'error');
        }
    });
}


/**
 * Fetches user data from Firestore based on selected status filter.
 * @param {string} filterStatus - The status to filter by, or 'All'.
 */
async function fetchUsers(filterStatus = 'Awaiting Admin Approval') {
    usersTableBody.innerHTML = '<tr><td colspan="7">Loading users...</td></tr>'; // Updated colspan
    try {
        const usersRef = collection(db, 'users');
        let q;

        if (filterStatus === 'All') {
            q = usersRef; // No filter, get all users
        } else {
            // Filter by specific status
            q = query(usersRef, where('accountStatus', '==', filterStatus));
        }

        const querySnapshot = await getDocs(q);
        const users = [];
        querySnapshot.forEach((doc) => {
            // Ensure we fetch the latest ID token result for each user if needed,
            // but for a simple list, direct Firestore data is often enough.
            // If displaying admin status of *other* users, you'd need to query their custom claims
            // which can be complex from client-side without a callable function.
            // For now, we'll assume the list only needs to show basic profile + Firestore status.
            users.push({ id: doc.id, ...doc.data() });
        });

        renderUsers(users);

    } catch (error) {
        console.error("Error fetching users:", error);
        usersTableBody.innerHTML = '<tr><td colspan="7" class="error-message">Error loading users. Please try again.</td></tr>'; // Updated colspan
        displayGlobalNotification('Failed to load users: ' + error.message, 'error');
    }
}

/**
 * Renders user data into the table.
 * @param {Array<Object>} users - Array of user objects.
 */
function renderUsers(users) {
    usersTableBody.innerHTML = ''; // Clear existing rows

    if (users.length === 0) {
        usersTableBody.innerHTML = '<tr><td colspan="7">No users found with the selected status.</td></tr>'; // Updated colspan
        return;
    }

    users.forEach(user => {
        const row = usersTableBody.insertRow();
        row.insertCell().textContent = user.email || 'N/A';
        row.insertCell().textContent = user.firstName || 'N/A';
        row.insertCell().textContent = user.lastName || 'N/A';
        row.insertCell().textContent = user.role || 'N/A';
        row.insertCell().textContent = user.accountStatus || 'N/A';

        const createdAt = user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleString() : 'N/A';
        row.insertCell().textContent = createdAt;

        const actionsCell = row.insertCell();
        actionsCell.className = 'action-buttons';

        // Display Approve/Reject buttons if status is pending
        if (user.accountStatus === 'Awaiting Admin Approval' || user.accountStatus === 'Awaiting Email Verification') {
            const approveButton = document.createElement('button');
            approveButton.textContent = 'Approve';
            approveButton.onclick = () => updateAccountStatus(user.id, 'Access Granted');
            actionsCell.appendChild(approveButton);

            const rejectButton = document.createElement('button');
            rejectButton.textContent = 'Reject';
            rejectButton.className = 'reject'; 
            rejectButton.onclick = () => updateAccountStatus(user.id, 'Rejected');
            actionsCell.appendChild(rejectButton);
        } else if (user.accountStatus === 'Access Granted') {
             actionsCell.textContent = 'Approved';
        } else if (user.accountStatus === 'Rejected') {
            actionsCell.textContent = 'Rejected';
        }

        // REMOVED: Admin Status/Actions Column logic (Make Admin button)
    });
}

/**
 * Updates a user's account status in Firestore.
 * @param {string} userId - The UID of the user to update.
 * @param {string} newStatus - The new status to set ('Access Granted', 'Rejected', etc.).
 */
async function updateAccountStatus(userId, newStatus) {
    try {
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, {
            accountStatus: newStatus,
            updatedAt: serverTimestamp() 
        });
        displayGlobalNotification(`User status updated to "${newStatus}" for user ID: ${userId}`, 'success');
        fetchUsers(statusFilter.value); 
    } catch (error) {
        console.error("Error updating user status:", error);
        let errorMessage = "Failed to update user status.";
        if (error.code === 'permission-denied') {
            errorMessage = 'Permission Denied: Ensure your admin account has the necessary Firestore permissions.';
        }
        displayGlobalNotification(errorMessage + ' ' + error.message, 'error');
    }
}

// REMOVED: makeUserAdmin function (as it calls the Cloud Function)


// Event Listeners for Filter and Refresh
if (statusFilter) {
    statusFilter.addEventListener('change', () => {
        fetchUsers(statusFilter.value);
    });
}

if (refreshUsersButton) {
    refreshUsersButton.addEventListener('click', () => {
        fetchUsers(statusFilter.value);
    });
}


// --- Admin Route Protection & Initialization ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const idTokenResult = await user.getIdTokenResult();
            if (idTokenResult.claims.admin) {
                console.log("Admin user logged in:", user.uid);
                
                // Set session storage for dashboard_roles.js to use
                sessionStorage.setItem('isAdmin', 'true'); 
                // Also get the user's primary role to store for dashboard_roles.js
                const userData = await getUserProfile(user.uid);
                if (userData && userData.accountStatus === 'Access Granted') {
                    sessionStorage.setItem('currentUserRole', userData.role);
                }

                // If on the admin dashboard, populate role selector and fetch users
                if (window.location.pathname.includes('admin_dashboard.html')) {
                    populateRoleSelector(); // Populate the role selector on the admin page
                    fetchUsers(statusFilter.value); // Load users for admin table
                }

            } else {
                // If a non-admin user somehow lands on admin_dashboard.html, redirect them.
                if (window.location.pathname.includes('admin_dashboard.html')) {
                    console.warn("Non-admin user tried to access admin dashboard:", user.uid);
                    displayGlobalNotification("You do not have administrative access.", "error", () => {
                        signOut(auth);
                        window.location.href = 'index.html';
                    });
                }
                // If not on admin_dashboard.html, let the normal flow proceed (e.g., script.js for login redirect)
            }
        } catch (error) {
            console.error("Error fetching ID token result during admin auth check:", error);
            displayGlobalNotification("Authentication error. Please log in again.", "error", () => {
                signOut(auth);
                window.location.href = 'index.html';
            });
        }
    } else {
        // No user is signed in, redirect to login page IF they are trying to access admin_dashboard.html
        if (window.location.pathname.includes('admin_dashboard.html')) {
            console.log("No user signed in. Redirecting to login.");
            window.location.href = 'index.html';
        }
        // If they are on index.html, allow them to remain to log in or sign up.
    }
});

// Note: populateRoleSelector is called directly by onAuthStateChanged in this script
// when the admin user is confirmed and on admin_dashboard.html
