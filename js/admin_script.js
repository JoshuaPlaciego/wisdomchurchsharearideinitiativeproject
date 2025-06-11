// js/admin_script.js

import { 
    auth, 
    db, 
    signOut, 
    onAuthStateChanged,
    serverTimestamp,
    getUserProfile // ADDED: Import getUserProfile
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

// Import global notification functions and populateRoleSelector from dashboard_roles.js
import { displayGlobalNotification, clearAllMessages, removeGlobalBackdrop, populateRoleSelector } from './dashboard_roles.js';

// Get elements
const usersTableBody = document.querySelector('#usersTable tbody');
const adminLogoutButton = document.getElementById('adminLogoutButton');
const statusFilter = document.getElementById('statusFilter');
const roleFilter = document.getElementById('roleFilter'); // NEW: Role filter dropdown
const userSearch = document.getElementById('userSearch'); // NEW: Search input
const refreshUsersButton = document.getElementById('refreshUsersButton');
const roleSelector = document.getElementById('roleSelector'); 
const usersTableHeader = document.querySelector('#usersTable thead tr'); // NEW: Table header for sorting

// Custom Confirmation Modal elements
const confirmationModal = document.getElementById('confirmationModal');
const confirmationMessage = document.getElementById('confirmationMessage');
const confirmActionButton = document.getElementById('confirmActionButton');
const cancelActionButton = document.getElementById('cancelActionButton');


let allUsers = []; // Stores all fetched users
let currentSortKey = null;
let currentSortDirection = 'asc'; // 'asc' or 'desc'


// Event Listeners for Role Selector and Logout Button (using imported populateRoleSelector)
if (roleSelector) {
    // populateRoleSelector will handle its own listeners for 'change'
}

if (adminLogoutButton) {
    adminLogoutButton.addEventListener('click', async () => {
        try {
            await signOut(auth);
            sessionStorage.removeItem('currentUserRole');
            sessionStorage.removeItem('isAdmin');
            window.location.href = 'index.html'; 
        } catch (error) {
            console.error("Error during logout:", error);
            displayGlobalNotification('Failed to log out: ' + error.message, 'error');
        }
    });
}


/**
 * Fetches user data from Firestore.
 * This now fetches all users and stores them in 'allUsers' for client-side filtering.
 */
async function fetchAllUsers() {
    usersTableBody.innerHTML = '<tr><td colspan="9">Loading users...</td></tr>'; // Updated colspan
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef); // Fetch all users initially
        const querySnapshot = await getDocs(q);
        allUsers = []; // Clear previous data
        querySnapshot.forEach((doc) => {
            allUsers.push({ id: doc.id, ...doc.data() });
        });
        applyFiltersAndSort(); // Apply filters and sort after fetching all data
    } catch (error) {
        console.error("Error fetching users:", error);
        usersTableBody.innerHTML = '<tr><td colspan="9" class="error-message">Error loading users. Please try again.</td></tr>'; // Updated colspan
        displayGlobalNotification('Failed to load users: ' + error.message, 'error');
    }
}

/**
 * Applies filters (status, role, search) and sorting to the allUsers array,
 * then calls renderUsers to display the filtered and sorted data.
 */
function applyFiltersAndSort() {
    let filteredUsers = [...allUsers]; // Create a mutable copy

    // 1. Apply Status Filter
    const selectedStatus = statusFilter.value;
    if (selectedStatus !== 'All') {
        filteredUsers = filteredUsers.filter(user => user.accountStatus === selectedStatus);
    }

    // 2. Apply Role Filter (NEW)
    const selectedRole = roleFilter.value;
    if (selectedRole !== 'All') {
        filteredUsers = filteredUsers.filter(user => user.role === selectedRole);
    }

    // 3. Apply Search Filter (NEW)
    const searchTerm = userSearch.value.toLowerCase().trim();
    if (searchTerm) {
        filteredUsers = filteredUsers.filter(user => 
            user.email.toLowerCase().includes(searchTerm) ||
            user.firstName.toLowerCase().includes(searchTerm) ||
            user.lastName.toLowerCase().includes(searchTerm) ||
            (user.mobile && user.mobile.includes(searchTerm)) // Check mobile if it exists
        );
    }

    // 4. Apply Sorting
    if (currentSortKey) {
        filteredUsers.sort((a, b) => {
            let valA = a[currentSortKey];
            let valB = b[currentSortKey];

            // Handle undefined/null values for sorting
            if (valA === undefined || valA === null) valA = '';
            if (valB === undefined || valB === null) valB = '';

            // Special handling for 'createdAt' (timestamps)
            if (currentSortKey === 'createdAt') {
                valA = valA ? valA.toMillis() : 0; // Convert Firestore Timestamp to milliseconds
                valB = valB ? valB.toMillis() : 0;
            } else if (typeof valA === 'string') {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
            }

            if (valA < valB) return currentSortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return currentSortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    renderUsers(filteredUsers);
}


/**
 * Renders user data into the table.
 * @param {Array<Object>} users - Array of user objects.
 */
function renderUsers(users) {
    usersTableBody.innerHTML = ''; // Clear existing rows

    if (users.length === 0) {
        usersTableBody.innerHTML = '<tr><td colspan="9">No users found with the selected criteria.</td></tr>'; // Updated colspan
        return;
    }

    users.forEach(user => {
        const row = usersTableBody.insertRow();
        row.insertCell().textContent = user.email || 'N/A';
        row.insertCell().textContent = user.firstName || 'N/A';
        row.insertCell().textContent = user.lastName || 'N/A';
        row.insertCell().textContent = user.mobile || 'N/A'; // NEW FIELD
        row.insertCell().textContent = user.gender || 'N/A'; // NEW FIELD
        row.insertCell().textContent = user.role || 'N/A';
        row.insertCell().textContent = user.accountStatus || 'N/A';

        // Display createdAt human-readable
        const createdAt = user.createdAt && user.createdAt.toDate ? user.createdAt.toDate().toLocaleString() : 'N/A';
        row.insertCell().textContent = createdAt;

        const actionsCell = row.insertCell();
        actionsCell.className = 'action-buttons';

        // Display Approve/Reject buttons if status is pending
        if (user.accountStatus === 'Awaiting Admin Approval' || user.accountStatus === 'Awaiting Email Verification') {
            const approveButton = document.createElement('button');
            approveButton.textContent = 'Approve';
            approveButton.onclick = () => showConfirmationModal(user.id, 'Access Granted', user.email); // Use confirmation modal
            actionsCell.appendChild(approveButton);

            const rejectButton = document.createElement('button');
            rejectButton.textContent = 'Reject';
            rejectButton.className = 'reject'; 
            rejectButton.onclick = () => showConfirmationModal(user.id, 'Rejected', user.email); // Use confirmation modal
            actionsCell.appendChild(rejectButton);
        } else if (user.accountStatus === 'Access Granted') {
             actionsCell.textContent = 'Approved';
        } else if (user.accountStatus === 'Rejected') {
            actionsCell.textContent = 'Rejected';
        }
    });
}

/**
 * Shows a custom confirmation modal before proceeding with an action.
 * @param {string} userId - The ID of the user to act on.
 * @param {string} newStatus - The new status to set.
 * @param {string} userEmail - The email of the user (for display in message).
 */
function showConfirmationModal(userId, newStatus, userEmail) {
    clearAllMessages(); // Clear any global notifications
    confirmationMessage.textContent = `Are you sure you want to change the status of ${userEmail} to "${newStatus}"?`;
    confirmationModal.style.display = 'flex'; // Show the modal

    // Remove any previous event listeners to prevent multiple firings
    confirmActionButton.onclick = null;
    cancelActionButton.onclick = null;

    confirmActionButton.onclick = async () => {
        confirmationModal.style.display = 'none'; // Hide modal immediately
        await updateAccountStatus(userId, newStatus);
    };

    cancelActionButton.onclick = () => {
        confirmationModal.style.display = 'none'; // Just hide the modal
    };
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
        fetchAllUsers(); // Refresh all data and re-apply filters/sort
    } catch (error) {
        console.error("Error updating user status:", error);
        let errorMessage = "Failed to update user status.";
        if (error.code === 'permission-denied') {
            errorMessage = 'Permission Denied: Ensure your admin account has the necessary Firestore permissions.';
        }
        displayGlobalNotification(errorMessage + ' ' + error.message, 'error');
    }
}


// Event Listeners for Filters, Search, and Refresh
if (statusFilter) {
    statusFilter.addEventListener('change', applyFiltersAndSort);
}

if (roleFilter) { // NEW: Role filter listener
    roleFilter.addEventListener('change', applyFiltersAndSort);
}

if (userSearch) { // NEW: Search input listener
    userSearch.addEventListener('input', applyFiltersAndSort);
}

if (refreshUsersButton) {
    refreshUsersButton.addEventListener('click', fetchAllUsers); // Now fetches all and reapplies filters
}

// NEW: Event Listener for Table Header Sorting
if (usersTableHeader) {
    usersTableHeader.addEventListener('click', (event) => {
        const target = event.target;
        if (target.tagName === 'TH' && target.dataset.sortKey) {
            const key = target.dataset.sortKey;

            // Toggle sort direction if clicking the same header
            if (currentSortKey === key) {
                currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                currentSortKey = key;
                currentSortDirection = 'asc'; // Default to ascending for new sort key
            }

            // Remove existing sort indicators
            usersTableHeader.querySelectorAll('th').forEach(th => {
                th.classList.remove('sort-asc', 'sort-desc');
            });

            // Add new sort indicator
            target.classList.add(`sort-${currentSortDirection}`);
            
            applyFiltersAndSort(); // Re-apply filters and sorting
        }
    });
}


// --- Admin Route Protection & Initialization ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const idTokenResult = await user.getIdTokenResult();
            if (idTokenResult.claims.admin) {
                console.log("Admin user logged in:", user.uid);
                
                sessionStorage.setItem('isAdmin', 'true'); 
                const userData = await getUserProfile(user.uid);
                if (userData && userData.accountStatus === 'Access Granted') {
                    sessionStorage.setItem('currentUserRole', userData.role);
                }

                if (window.location.pathname.includes('admin_dashboard.html')) {
                    populateRoleSelector(); 
                    fetchAllUsers(); // Fetch all users and render them with current filters/sort
                }

            } else {
                if (window.location.pathname.includes('admin_dashboard.html')) {
                    console.warn("Non-admin user tried to access admin dashboard:", user.uid);
                    displayGlobalNotification("You do not have administrative access.", "error", () => {
                        signOut(auth);
                        window.location.href = 'index.html';
                    });
                }
            }
        } catch (error) {
            console.error("Error fetching ID token result during admin auth check:", error);
            displayGlobalNotification("Authentication error. Please log in again.", "error", () => {
                signOut(auth);
                window.location.href = 'index.html';
            });
        }
    } else {
        if (window.location.pathname.includes('admin_dashboard.html')) {
            console.log("No user signed in. Redirecting to login.");
            window.location.href = 'index.html';
        }
    }
});
