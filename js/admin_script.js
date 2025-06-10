// js/admin_script.js

import { 
    auth, 
    db, 
    signOut, 
    onAuthStateChanged,
    serverTimestamp // Import serverTimestamp for setting update times
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

// Get elements
const usersTableBody = document.querySelector('#usersTable tbody');
const adminLogoutButton = document.getElementById('adminLogoutButton');
const statusFilter = document.getElementById('statusFilter');
const refreshUsersButton = document.getElementById('refreshUsersButton');

// Global notification message box (reused from main script)
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


/**
 * Fetches user data from Firestore based on selected status filter.
 * @param {string} filterStatus - The status to filter by, or 'All'.
 */
async function fetchUsers(filterStatus = 'Awaiting Admin Approval') {
    usersTableBody.innerHTML = '<tr><td colspan="7">Loading users...</td></tr>';
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
            users.push({ id: doc.id, ...doc.data() });
        });

        renderUsers(users);

    } catch (error) {
        console.error("Error fetching users:", error);
        usersTableBody.innerHTML = '<tr><td colspan="7" class="error-message">Error loading users. Please try again.</td></tr>';
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
        usersTableBody.innerHTML = '<tr><td colspan="7">No users found with the selected status.</td></tr>';
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

        // Only show action buttons if status allows
        if (user.accountStatus === 'Awaiting Admin Approval' || user.accountStatus === 'Awaiting Email Verification') {
            const approveButton = document.createElement('button');
            approveButton.textContent = 'Approve';
            approveButton.onclick = () => updateAccountStatus(user.id, 'Access Granted');
            actionsCell.appendChild(approveButton);

            const rejectButton = document.createElement('button');
            rejectButton.textContent = 'Reject';
            rejectButton.className = 'reject'; // Add a class for styling
            rejectButton.onclick = () => updateAccountStatus(user.id, 'Rejected');
            actionsCell.appendChild(rejectButton);
        } else if (user.accountStatus === 'Access Granted') {
             actionsCell.textContent = 'Approved';
             // Optional: Add a button to revoke access if needed
             // const revokeButton = document.createElement('button');
             // revokeButton.textContent = 'Revoke Access';
             // revokeButton.className = 'reject';
             // revokeButton.onclick = () => updateAccountStatus(user.id, 'Awaiting Admin Approval');
             // actionsCell.appendChild(revokeButton);
        } else if (user.accountStatus === 'Rejected') {
            actionsCell.textContent = 'Rejected';
            // Optional: Add a button to re-approve if needed
            // const reApproveButton = document.createElement('button');
            // reApproveButton.textContent = 'Re-approve';
            // reApproveButton.onclick = () => updateAccountStatus(user.id, 'Awaiting Admin Approval');
            // actionsCell.appendChild(reApproveButton);
        }
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
            updatedAt: serverTimestamp() // Add a timestamp for the update
        });
        displayGlobalNotification(`User status updated to "${newStatus}" for user ID: ${userId}`, 'success');
        // Refresh the list to show the updated status
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

// Event Listeners
if (adminLogoutButton) {
    adminLogoutButton.addEventListener('click', async () => {
        try {
            await signOut(auth);
            window.location.href = 'index.html'; // Redirect to main login page
        } catch (error) {
            console.error("Error during logout:", error);
            displayGlobalNotification('Failed to log out: ' + error.message, 'error');
        }
    });
}

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


// --- Admin Route Protection ---
// This function will check if the user is authenticated and has admin privileges.
// If not, it redirects them to the main login page.
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is signed in. Now check if they have admin privileges.
        // For this quick implementation, we will assume any logged-in user can access
        // the admin dashboard. However, for real security, you should add custom claims.
        // Example with custom claims (requires setting 'admin: true' claim on user):
        // const idTokenResult = await user.getIdTokenResult();
        // if (idTokenResult.claims.admin) {
        //     console.log("Admin user logged in:", user.uid);
        //     fetchUsers(statusFilter.value); // Load users for admin
        // } else {
        //     console.warn("Non-admin user tried to access admin dashboard:", user.uid);
        //     displayGlobalNotification("You do not have administrative access.", "error", () => {
        //         signOut(auth);
        //         window.location.href = 'index.html';
        //     });
        // }

        // --- Simplified for quick implementation: Any logged-in user can access ---
        // For robust security, implement Firebase Custom Claims.
        // Your current Firestore rules for 'users/{userId}' (allowing any authenticated user to update their own document)
        // are permissive enough that if you log in with an "admin" user account and manually
        // update another user's document, it *will* work.
        // However, this doesn't prevent non-admins from trying to update other users if they
        // guess UIDs and craft requests. Custom claims are the proper way to restrict this.
        console.log("Authenticated user detected for admin dashboard:", user.uid);
        fetchUsers(statusFilter.value); // Fetch users on page load
    } else {
        // No user is signed in, redirect to login page
        console.log("No user signed in. Redirecting to login.");
        window.location.href = 'index.html';
    }
});

// Initial fetch when the script loads (after auth state check completes)
// This will be called by onAuthStateChanged once the user is confirmed.
// No need to call it here directly.
// fetchUsers(statusFilter.value);
