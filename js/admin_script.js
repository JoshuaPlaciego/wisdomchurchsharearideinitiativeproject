// js/admin_script.js

import { 
    auth, 
    db, 
    signOut, 
    onAuthStateChanged,
    serverTimestamp,
    getUserProfile 
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
const roleFilter = document.getElementById('roleFilter'); 
const userSearch = document.getElementById('userSearch'); 
const refreshUsersButton = document.getElementById('refreshUsersButton');
const exportCsvButton = document.getElementById('exportCsvButton'); // NEW: Export CSV Button
const roleSelector = document.getElementById('roleSelector'); 
const usersTableHeader = document.querySelector('#usersTable thead tr'); 

// Custom Confirmation Modal elements
const confirmationModal = document.getElementById('confirmationModal');
const confirmationMessage = document.getElementById('confirmationMessage');
const confirmActionButton = document.getElementById('confirmActionButton');
const cancelActionButton = document.getElementById('cancelActionButton');

// NEW: User Detail Modal elements
const userDetailModal = document.getElementById('userDetailModal');
const detailUid = document.getElementById('detailUid');
const detailEmail = document.getElementById('detailEmail');
const detailFirstName = document.getElementById('detailFirstName');
const detailLastName = document.getElementById('detailLastName');
const detailMobile = document.getElementById('detailMobile');
const detailGender = document.getElementById('detailGender');
const detailFacebook = document.getElementById('detailFacebook');
const detailRole = document.getElementById('detailRole');
const detailAccountStatus = document.getElementById('detailAccountStatus');
const detailCreatedAt = document.getElementById('detailCreatedAt');
const detailUpdatedAt = document.getElementById('detailUpdatedAt');
const suspendUserButton = document.getElementById('suspendUserButton'); // NEW: Suspend Button
const activateUserButton = document.getElementById('activateUserButton'); // NEW: Activate Button

// NEW: Pagination elements
const prevPageButton = document.getElementById('prevPageButton');
const nextPageButton = document.getElementById('nextPageButton');
const pageInfo = document.getElementById('pageInfo');
const itemsPerPageSelect = document.getElementById('itemsPerPageSelect');

let allUsers = []; // Stores all fetched users
let currentSortKey = null;
let currentSortDirection = 'asc'; // 'asc' or 'desc'

// Pagination state
let currentPage = 1;
let itemsPerPage = parseInt(itemsPerPageSelect.value, 10); // Default items per page


// Event Listeners for Modals Close Buttons
document.querySelectorAll('.close-button').forEach(button => {
    button.addEventListener('click', (event) => {
        const modalId = event.target.dataset.modalId;
        if (modalId) {
            document.getElementById(modalId).style.display = 'none';
        }
        clearAllMessages(); 
    });
});


// Event Listeners for Role Selector and Logout Button
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
    usersTableBody.innerHTML = '<tr><td colspan="9">Loading users...</td></tr>'; 
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef); 
        const querySnapshot = await getDocs(q);
        allUsers = []; 
        querySnapshot.forEach((doc) => {
            allUsers.push({ id: doc.id, ...doc.data() });
        });
        currentPage = 1; // Reset to first page after fetching new data
        applyFiltersAndSort(); 
    } catch (error) {
        console.error("Error fetching users:", error);
        usersTableBody.innerHTML = '<tr><td colspan="9" class="error-message">Error loading users. Please try again.</td></tr>'; 
        displayGlobalNotification('Failed to load users: ' + error.message, 'error');
    }
}

/**
 * Applies filters (status, role, search) and sorting to the allUsers array,
 * then calls renderUsers to display the filtered and sorted data.
 */
function applyFiltersAndSort() {
    let filteredUsers = [...allUsers]; 

    // 1. Apply Status Filter
    const selectedStatus = statusFilter.value;
    if (selectedStatus !== 'All') {
        filteredUsers = filteredUsers.filter(user => user.accountStatus === selectedStatus);
    }

    // 2. Apply Role Filter
    const selectedRole = roleFilter.value;
    if (selectedRole !== 'All') {
        filteredUsers = filteredUsers.filter(user => user.role === selectedRole);
    }

    // 3. Apply Search Filter
    const searchTerm = userSearch.value.toLowerCase().trim();
    if (searchTerm) {
        filteredUsers = filteredUsers.filter(user => 
            (user.email && user.email.toLowerCase().includes(searchTerm)) ||
            (user.firstName && user.firstName.toLowerCase().includes(searchTerm)) ||
            (user.lastName && user.lastName.toLowerCase().includes(searchTerm)) ||
            (user.mobile && user.mobile.includes(searchTerm))
        );
    }

    // 4. Apply Sorting
    if (currentSortKey) {
        filteredUsers.sort((a, b) => {
            let valA = a[currentSortKey];
            let valB = b[currentSortKey];

            if (valA === undefined || valA === null) valA = '';
            if (valB === undefined || valB === null) valB = '';

            if (currentSortKey === 'createdAt') {
                valA = valA ? valA.toMillis() : 0; 
                valB = valB ? valB.toMillis() : 0;
            } else if (currentSortKey === 'updatedAt') { // NEW: Sorting by updatedAt
                valA = valA ? valA.toMillis() : 0;
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

    // NEW: Apply Pagination
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    currentPage = Math.max(1, Math.min(currentPage, totalPages)); // Ensure currentPage is valid

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const usersToDisplay = filteredUsers.slice(startIndex, endIndex);

    renderUsers(usersToDisplay);
    updatePaginationControls(filteredUsers.length, totalPages);
}


/**
 * Renders user data into the table.
 * @param {Array<Object>} users - Array of user objects.
 */
function renderUsers(users) {
    usersTableBody.innerHTML = ''; 

    if (users.length === 0) {
        usersTableBody.innerHTML = '<tr><td colspan="9">No users found with the selected criteria.</td></tr>'; 
        return;
    }

    users.forEach(user => {
        const row = usersTableBody.insertRow();
        row.insertCell().textContent = user.email || 'N/A';
        row.insertCell().textContent = user.firstName || 'N/A';
        row.insertCell().textContent = user.lastName || 'N/A';
        row.insertCell().textContent = user.mobile || 'N/A'; 
        row.insertCell().textContent = user.gender || 'N/A'; 
        row.insertCell().textContent = user.role || 'N/A';
        row.insertCell().textContent = user.accountStatus || 'N/A';

        const createdAt = user.createdAt && user.createdAt.toDate ? user.createdAt.toDate().toLocaleString() : 'N/A';
        row.insertCell().textContent = createdAt;

        const actionsCell = row.insertCell();
        actionsCell.className = 'action-buttons';

        // Add event listener to the row to open user detail modal
        row.dataset.userId = user.id; // Store user ID on the row
        row.style.cursor = 'pointer'; // Indicate interactivity
        row.addEventListener('click', () => openUserDetailModal(user.id));

        // Display Approve/Reject/Suspend/Activate buttons directly in the table row for quick actions
        if (user.accountStatus === 'Awaiting Admin Approval' || user.accountStatus === 'Awaiting Email Verification') {
            const approveButton = document.createElement('button');
            approveButton.textContent = 'Approve';
            approveButton.onclick = (e) => { e.stopPropagation(); showConfirmationModal(user.id, 'Access Granted', user.email); };
            actionsCell.appendChild(approveButton);

            const rejectButton = document.createElement('button');
            rejectButton.textContent = 'Reject';
            rejectButton.className = 'reject'; 
            rejectButton.onclick = (e) => { e.stopPropagation(); showConfirmationModal(user.id, 'Rejected', user.email); };
            actionsCell.appendChild(rejectButton);
        } else if (user.accountStatus === 'Access Granted') {
            const suspendButton = document.createElement('button');
            suspendButton.textContent = 'Suspend';
            suspendButton.className = 'suspend'; // NEW CLASS FOR SUSPEND BUTTON
            suspendButton.onclick = (e) => { e.stopPropagation(); showConfirmationModal(user.id, 'Suspended', user.email); }; // NEW STATUS
            actionsCell.appendChild(suspendButton);
        } else if (user.accountStatus === 'Suspended' || user.accountStatus === 'Rejected') { // If suspended or rejected, offer to activate
            const activateButton = document.createElement('button');
            activateButton.textContent = 'Activate';
            activateButton.className = 'activate'; // NEW CLASS FOR ACTIVATE BUTTON
            activateButton.onclick = (e) => { e.stopPropagation(); showConfirmationModal(user.id, 'Access Granted', user.email); }; // NEW STATUS
            actionsCell.appendChild(activateButton);
        }
    });
}

/**
 * Opens and populates the user detail modal with data for a specific user.
 * @param {string} userId - The UID of the user whose details to display.
 */
async function openUserDetailModal(userId) {
    clearAllMessages(); // Clear any global notifications
    const user = allUsers.find(u => u.id === userId); // Find user from cached data
    if (!user) {
        displayGlobalNotification('User details not found.', 'error');
        return;
    }

    detailUid.textContent = user.id || 'N/A';
    detailEmail.textContent = user.email || 'N/A';
    detailEmail.href = `mailto:${user.email}`; // Direct communication link
    detailFirstName.textContent = user.firstName || 'N/A';
    detailLastName.textContent = user.lastName || 'N/A';
    detailMobile.textContent = user.mobile || 'N/A';
    detailMobile.href = `tel:${user.mobile}`; // Direct communication link
    detailGender.textContent = user.gender || 'N/A';
    
    if (user.facebookLink) {
        detailFacebook.textContent = user.facebookLink;
        detailFacebook.href = user.facebookLink;
        detailFacebook.style.display = 'inline';
    } else {
        detailFacebook.textContent = 'N/A';
        detailFacebook.href = '#';
        detailFacebook.style.display = 'inline'; // Still show N/A
    }
    
    detailRole.textContent = user.role || 'N/A';
    detailAccountStatus.textContent = user.accountStatus || 'N/A';
    detailCreatedAt.textContent = user.createdAt && user.createdAt.toDate ? user.createdAt.toDate().toLocaleString() : 'N/A';
    detailUpdatedAt.textContent = user.updatedAt && user.updatedAt.toDate ? user.updatedAt.toDate().toLocaleString() : 'N/A';

    // Set up suspend/activate buttons based on current status
    suspendUserButton.style.display = 'none';
    activateUserButton.style.display = 'none';

    if (user.accountStatus === 'Access Granted') {
        suspendUserButton.style.display = 'inline-block';
        suspendUserButton.onclick = () => { userDetailModal.style.display = 'none'; showConfirmationModal(user.id, 'Suspended', user.email); };
    } else if (user.accountStatus === 'Suspended' || user.accountStatus === 'Rejected' || user.accountStatus === 'Awaiting Admin Approval' || user.accountStatus === 'Awaiting Email Verification') {
        activateUserButton.style.display = 'inline-block';
        activateUserButton.onclick = () => { userDetailModal.style.display = 'none'; showConfirmationModal(user.id, 'Access Granted', user.email); };
    }

    userDetailModal.style.display = 'flex';
}

/**
 * Shows a custom confirmation modal before proceeding with an action.
 * @param {string} userId - The ID of the user to act on.
 * @param {string} newStatus - The new status to set.
 * @param {string} userEmail - The email of the user (for display in message).
 */
function showConfirmationModal(userId, newStatus, userEmail) {
    clearAllMessages(); 
    confirmationMessage.textContent = `Are you sure you want to change the status of ${userEmail} to "${newStatus}"?`;
    confirmationModal.style.display = 'flex'; 

    confirmActionButton.onclick = null;
    cancelActionButton.onclick = null;

    confirmActionButton.onclick = async () => {
        confirmationModal.style.display = 'none'; 
        await updateAccountStatus(userId, newStatus);
    };

    cancelActionButton.onclick = () => {
        confirmationModal.style.display = 'none'; 
    };
}


/**
 * Updates a user's account status in Firestore.
 * @param {string} userId - The UID of the user to update.
 * @param {string} newStatus - The new status to set ('Access Granted', 'Rejected', 'Suspended', etc.).
 */
async function updateAccountStatus(userId, newStatus) {
    try {
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, {
            accountStatus: newStatus,
            updatedAt: serverTimestamp() 
        });
        displayGlobalNotification(`User status updated to "${newStatus}" for user ID: ${userId}`, 'success');
        fetchAllUsers(); 
    } catch (error) {
        console.error("Error updating user status:", error);
        let errorMessage = "Failed to update user status.";
        if (error.code === 'permission-denied') {
            errorMessage = 'Permission Denied: Ensure your admin account has the necessary Firestore permissions.';
        }
        displayGlobalNotification(errorMessage + ' ' + error.message, 'error');
    }
}


// NEW: Export User Data to CSV
if (exportCsvButton) {
    exportCsvButton.addEventListener('click', () => {
        const headers = ['Email', 'First Name', 'Last Name', 'Mobile', 'Gender', 'Facebook Link', 'Role', 'Account Status', 'Registered On', 'Last Updated'];
        
        // Use the currently filtered and sorted users for export
        let usersToExport = [...allUsers]; // Start with all users
        // Re-apply filters to get the exact data currently shown in the table
        const selectedStatus = statusFilter.value;
        if (selectedStatus !== 'All') {
            usersToExport = usersToExport.filter(user => user.accountStatus === selectedStatus);
        }
        const selectedRole = roleFilter.value;
        if (selectedRole !== 'All') {
            usersToExport = usersToExport.filter(user => user.role === selectedRole);
        }
        const searchTerm = userSearch.value.toLowerCase().trim();
        if (searchTerm) {
            usersToExport = usersToExport.filter(user => 
                (user.email && user.email.toLowerCase().includes(searchTerm)) ||
                (user.firstName && user.firstName.toLowerCase().includes(searchTerm)) ||
                (user.lastName && user.lastName.toLowerCase().includes(searchTerm)) ||
                (user.mobile && user.mobile.includes(searchTerm))
            );
        }
        // Apply sorting to the exported data
        if (currentSortKey) {
            usersToExport.sort((a, b) => {
                let valA = a[currentSortKey];
                let valB = b[currentSortKey];

                if (valA === undefined || valA === null) valA = '';
                if (valB === undefined || valB === null) valB = '';

                if (currentSortKey === 'createdAt') {
                    valA = valA ? valA.toMillis() : 0; 
                    valB = valB ? valB.toMillis() : 0;
                } else if (currentSortKey === 'updatedAt') {
                    valA = valA ? valA.toMillis() : 0;
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


        let csvContent = headers.join(',') + '\n';

        usersToExport.forEach(user => {
            const row = [
                user.email || '',
                user.firstName || '',
                user.lastName || '',
                user.mobile || '',
                user.gender || '',
                user.facebookLink || '',
                user.role || '',
                user.accountStatus || '',
                (user.createdAt && user.createdAt.toDate ? `"${user.createdAt.toDate().toLocaleString()}"` : ''), // Quote to handle commas in date
                (user.updatedAt && user.updatedAt.toDate ? `"${user.updatedAt.toDate().toLocaleString()}"` : '') 
            ];
            csvContent += row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',') + '\n'; // Quote fields and escape existing quotes
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'share_a_ride_users.csv');
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        displayGlobalNotification('User data exported successfully to CSV!', 'success');
    });
}


// Event Listeners for Filters, Search, and Refresh
if (statusFilter) {
    statusFilter.addEventListener('change', applyFiltersAndSort);
}

if (roleFilter) { 
    roleFilter.addEventListener('change', applyFiltersAndSort);
}

if (userSearch) { 
    userSearch.addEventListener('input', applyFiltersAndSort);
}

if (refreshUsersButton) {
    refreshUsersButton.addEventListener('click', fetchAllUsers); 
}

// Event Listener for Table Header Sorting
if (usersTableHeader) {
    usersTableHeader.addEventListener('click', (event) => {
        const target = event.target;
        if (target.tagName === 'TH' && target.dataset.sortKey) {
            const key = target.dataset.sortKey;

            if (currentSortKey === key) {
                currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                currentSortKey = key;
                currentSortDirection = 'asc'; 
            }

            usersTableHeader.querySelectorAll('th').forEach(th => {
                th.classList.remove('sort-asc', 'sort-desc');
            });

            target.classList.add(`sort-${currentSortDirection}`);
            
            applyFiltersAndSort(); 
        }
    });
}

// NEW: Pagination Event Listeners
if (prevPageButton) {
    prevPageButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            applyFiltersAndSort();
        }
    });
}

if (nextPageButton) {
    nextPageButton.addEventListener('click', () => {
        const totalPages = Math.ceil(allUsers.length / itemsPerPage); // Recalculate total pages based on *all* users, not just filtered
        if (currentPage < totalPages) {
            currentPage++;
            applyFiltersAndSort();
        }
    });
}

if (itemsPerPageSelect) {
    itemsPerPageSelect.addEventListener('change', (event) => {
        itemsPerPage = parseInt(event.target.value, 10);
        currentPage = 1; // Reset to first page when items per page changes
        applyFiltersAndSort();
    });
}

/**
 * Updates the pagination buttons and page info text.
 * @param {number} totalItems - The total number of items after filtering (not just items on current page).
 * @param {number} totalPages - The total number of pages.
 */
function updatePaginationControls(totalItems, totalPages) {
    pageInfo.textContent = `Page ${currentPage} of ${totalPages} (${totalItems} users)`;
    prevPageButton.disabled = currentPage === 1;
    nextPageButton.disabled = currentPage === totalPages || totalItems === 0; // Disable next if no items or on last page
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
