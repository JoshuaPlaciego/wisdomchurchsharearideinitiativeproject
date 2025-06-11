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
    updateDoc,
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Import global notification functions and populateRoleSelector from dashboard_roles.js
import { displayGlobalNotification, clearAllMessages, removeGlobalBackdrop, populateRoleSelector } from './dashboard_roles.js';

// --- User Management Elements ---
const usersTableBody = document.querySelector('#usersTable tbody');
const adminLogoutButton = document.getElementById('adminLogoutButton');
const statusFilter = document.getElementById('statusFilter');
const roleFilter = document.getElementById('roleFilter'); 
const userSearch = document.getElementById('userSearch'); 
const refreshUsersButton = document.getElementById('refreshUsersButton');
const exportCsvButton = document.getElementById('exportCsvButton'); 
const roleSelector = document.getElementById('roleSelector'); 
const usersTableHeader = document.querySelector('#usersTable thead tr'); 

// Custom Confirmation Modal elements (reused for user/ride actions)
const confirmationModal = document.getElementById('confirmationModal');
const confirmationMessage = document.getElementById('confirmationMessage');
const confirmActionButton = document.getElementById('confirmActionButton');
const cancelActionButton = document.getElementById('cancelActionButton');

// User Detail Modal elements
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
const suspendUserButton = document.getElementById('suspendUserButton'); 
const activateUserButton = document.getElementById('activateUserButton'); 

// User Pagination elements
const prevPageButton = document.getElementById('prevPageButton');
const nextPageButton = document.getElementById('nextPageButton');
const pageInfo = document.getElementById('pageInfo');
const itemsPerPageSelect = document.getElementById('itemsPerPageSelect');

let allUsers = []; // Stores all fetched users
let currentUserSortKey = null;
let currentUserSortDirection = 'asc'; 

// User Pagination state
let currentUserPage = 1;
let userItemsPerPage = parseInt(itemsPerPageSelect.value, 10); 


// --- Rides Monitoring Elements ---
const ridesTableBody = document.querySelector('#ridesTable tbody');
const rideStatusFilter = document.getElementById('rideStatusFilter');
const rideSearch = document.getElementById('rideSearch');
const refreshRidesButton = document.getElementById('refreshRidesButton');
const exportRidesCsvButton = document.getElementById('exportRidesCsvButton');

// Rides Pagination elements
const prevRidePageButton = document.getElementById('prevRidePageButton');
const nextRidePageButton = document.getElementById('nextRidePageButton');
const ridePageInfo = document.getElementById('ridePageInfo');
const ridesPerPageSelect = document.getElementById('ridesPerPageSelect');
const ridesTableHeader = document.querySelector('#ridesTable thead tr');

// Booked Riders Modal Elements
const rideBookedRidersModal = document.getElementById('rideBookedRidersModal');
const bookedRidersRideId = document.getElementById('bookedRidersRideId');
const bookedRidersCountInfo = document.getElementById('bookedRidersCountInfo');
const bookedRidersTableBody = document.querySelector('#bookedRidersTable tbody');
const noBookedRidersMessage = document.getElementById('noBookedRidersMessage');

// NEW: Passenger Ride History Modal Elements
const passengerRidesModal = document.getElementById('passengerRidesModal');
const passengerHistoryEmail = document.getElementById('passengerHistoryEmail');
const passengerRidesTableBody = document.querySelector('#passengerRidesTable tbody');
const noPassengerRidesMessage = document.getElementById('noPassengerRidesMessage');


let allRides = []; // Stores all fetched rides
let currentRideSortKey = null;
let currentRideSortDirection = 'asc';

// Rides Pagination state
let currentRidePage = 1;
let rideItemsPerPage = parseInt(ridesPerPageSelect.value, 10);

let unsubscribeRidesSnapshot = null;


// --- General Modal Close Buttons ---
document.querySelectorAll('.close-button').forEach(button => {
    button.addEventListener('click', (event) => {
        const modalId = event.target.dataset.modalId;
        if (modalId) {
            document.getElementById(modalId).style.display = 'none';
        }
        clearAllMessages(); 
    });
});


// --- Logout Button ---
if (adminLogoutButton) {
    adminLogoutButton.addEventListener('click', async () => {
        try {
            await signOut(auth);
            // Stop Firestore listeners on logout to prevent memory leaks
            if (unsubscribeRidesSnapshot) {
                unsubscribeRidesSnapshot();
                unsubscribeRidesSnapshot = null;
            }
            sessionStorage.removeItem('currentUserRole');
            sessionStorage.removeItem('isAdmin');
            window.location.href = 'index.html'; 
        } catch (error) {
            console.error("Error during logout:", error);
            displayGlobalNotification('Failed to log out: ' + error.message, 'error');
        }
    });
}


// --- User Management Functions ---

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
        currentUserPage = 1; 
        applyUserFiltersAndSort(); 
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
function applyUserFiltersAndSort() {
    let filteredUsers = [...allUsers]; 

    const selectedStatus = statusFilter.value;
    if (selectedStatus !== 'All') {
        filteredUsers = filteredUsers.filter(user => user.accountStatus === selectedStatus);
    }

    const selectedRole = roleFilter.value;
    if (selectedRole !== 'All') {
        filteredUsers = filteredUsers.filter(user => user.role === selectedRole);
    }

    const searchTerm = userSearch.value.toLowerCase().trim();
    if (searchTerm) {
        filteredUsers = filteredUsers.filter(user => 
            (user.email && user.email.toLowerCase().includes(searchTerm)) ||
            (user.firstName && user.firstName.toLowerCase().includes(searchTerm)) ||
            (user.lastName && user.lastName.toLowerCase().includes(searchTerm)) ||
            (user.mobile && user.mobile.includes(searchTerm))
        );
    }

    if (currentUserSortKey) {
        filteredUsers.sort((a, b) => {
            let valA = a[currentUserSortKey];
            let valB = b[currentUserSortKey];

            if (valA === undefined || valA === null) valA = '';
            if (valB === undefined || valB === null) valB = '';

            if (currentUserSortKey === 'createdAt' || currentUserSortKey === 'updatedAt') {
                valA = valA ? valA.toMillis() : 0; 
                valB = valB ? valB.toMillis() : 0;
            } else if (typeof valA === 'string') {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
            }

            if (valA < valB) return currentUserSortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return currentUserSortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    const totalPages = Math.ceil(filteredUsers.length / userItemsPerPage);
    currentUserPage = Math.max(1, Math.min(currentUserPage, totalPages)); 

    const startIndex = (currentUserPage - 1) * userItemsPerPage;
    const endIndex = startIndex + userItemsPerPage;
    const usersToDisplay = filteredUsers.slice(startIndex, endIndex);

    renderUsers(usersToDisplay);
    updateUserPaginationControls(filteredUsers.length, totalPages);
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
        row.addEventListener('click', () => openUserDetailModal(user));

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
            suspendButton.className = 'suspend'; 
            suspendButton.onclick = (e) => { e.stopPropagation(); showConfirmationModal(user.id, 'Suspended', user.email); }; 
            actionsCell.appendChild(suspendButton);
        } else if (user.accountStatus === 'Suspended' || user.accountStatus === 'Rejected') { 
            const activateButton = document.createElement('button');
            activateButton.textContent = 'Activate';
            activateButton.className = 'activate'; 
            activateButton.onclick = (e) => { e.stopPropagation(); showConfirmationModal(user.id, 'Access Granted', user.email); }; 
            actionsCell.appendChild(activateButton);
        }

        // NEW: Add "View Rides" button for each user
        const viewRidesButton = document.createElement('button');
        viewRidesButton.textContent = 'View Rides';
        viewRidesButton.className = 'view-rides'; 
        viewRidesButton.onclick = (e) => { 
            e.stopPropagation(); 
            openPassengerRidesModal(user.email); 
        };
        actionsCell.appendChild(viewRidesButton);
    });
}

/**
 * Opens and populates the user detail modal with data for a specific user.
 * @param {Object} user - The user object to display.
 */
async function openUserDetailModal(user) {
    clearAllMessages(); 
    if (!user) {
        displayGlobalNotification('User details not found.', 'error');
        return;
    }

    detailUid.textContent = user.id || 'N/A';
    detailEmail.textContent = user.email || 'N/A';
    detailEmail.href = `mailto:${user.email}`; 
    detailFirstName.textContent = user.firstName || 'N/A';
    detailLastName.textContent = user.lastName || 'N/A';
    detailMobile.textContent = user.mobile || 'N/A';
    detailMobile.href = `tel:${user.mobile}`; 
    detailGender.textContent = user.gender || 'N/A';
    
    if (user.facebookLink) {
        detailFacebook.textContent = user.facebookLink;
        detailFacebook.href = user.facebookLink;
        detailFacebook.style.display = 'inline';
    } else {
        detailFacebook.textContent = 'N/A';
        detailFacebook.href = '#';
        detailFacebook.style.display = 'inline'; 
    }
    
    detailRole.textContent = user.role || 'N/A';
    detailAccountStatus.textContent = user.accountStatus || 'N/A';
    detailCreatedAt.textContent = user.createdAt && user.createdAt.toDate ? user.createdAt.toDate().toLocaleString() : 'N/A';
    detailUpdatedAt.textContent = user.updatedAt && user.updatedAt.toDate ? user.updatedAt.toDate().toLocaleString() : 'N/A';

    suspendUserButton.style.display = 'none';
    activateUserButton.style.display = 'none';

    suspendUserButton.dataset.userId = user.id;
    activateUserButton.dataset.userId = user.id;

    if (user.accountStatus === 'Access Granted') {
        suspendUserButton.style.display = 'inline-block';
        suspendUserButton.onclick = (e) => { 
            e.stopPropagation(); 
            userDetailModal.style.display = 'none'; 
            showConfirmationModal(user.id, 'Suspended', user.email); 
        };
    } else if (user.accountStatus === 'Suspended' || user.accountStatus === 'Rejected' || user.accountStatus === 'Awaiting Admin Approval' || user.accountStatus === 'Awaiting Email Verification') {
        activateUserButton.style.display = 'inline-block';
        activateUserButton.onclick = (e) => { 
            e.stopPropagation(); 
            userDetailModal.style.display = 'none'; 
            showConfirmationModal(user.id, 'Access Granted', user.email); 
        };
    }

    userDetailModal.style.display = 'flex';
}

/**
 * Shows a custom confirmation modal before proceeding with an action.
 * @param {string} entityId - The ID of the entity (user or ride) to act on.
 * @param {string} newStatus - The new status to set.
 * @param {string} entityDisplay - A string for display (e.g., user email, ride ID).
 * @param {string} type - 'user' or 'ride' to differentiate action.
 */
function showConfirmationModal(entityId, newStatus, entityDisplay, type = 'user') {
    clearAllMessages(); 
    confirmationMessage.textContent = `Are you sure you want to change the status of ${entityDisplay} to "${newStatus}"?`;
    confirmationModal.style.display = 'flex'; 

    confirmActionButton.onclick = null;
    cancelActionButton.onclick = null;

    confirmActionButton.onclick = async () => {
        confirmationModal.style.display = 'none'; 
        if (type === 'user') {
            await updateAccountStatus(entityId, newStatus);
        } else if (type === 'ride') {
            await updateRideStatus(entityId, newStatus);
        }
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


// --- User Management Event Listeners ---
if (statusFilter) {
    statusFilter.addEventListener('change', () => { currentUserPage = 1; applyUserFiltersAndSort(); });
}

if (roleFilter) { 
    roleFilter.addEventListener('change', () => { currentUserPage = 1; applyUserFiltersAndSort(); });
}

if (userSearch) { 
    userSearch.addEventListener('input', () => { currentUserPage = 1; applyUserFiltersAndSort(); });
}

if (refreshUsersButton) {
    refreshUsersButton.addEventListener('click', fetchAllUsers); 
}

// Export User Data to CSV
if (exportCsvButton) {
    exportCsvButton.addEventListener('click', () => {
        const headers = ['Email', 'First Name', 'Last Name', 'Mobile', 'Gender', 'Facebook Link', 'Role', 'Account Status', 'Registered On', 'Last Updated'];
        
        let usersToExport = [...allUsers]; 
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
        if (currentUserSortKey) {
            usersToExport.sort((a, b) => {
                let valA = a[currentUserSortKey];
                let valB = b[currentUserSortKey];

                if (valA === undefined || valA === null) valA = '';
                if (valB === undefined || valB === null) valB = '';

                if (currentUserSortKey === 'createdAt' || currentUserSortKey === 'updatedAt') {
                    valA = valA ? valA.toMillis() : 0; 
                    valB = valB ? valB.toMillis() : 0;
                } else if (typeof valA === 'string') {
                    valA = valA.toLowerCase();
                    valB = valB.toLowerCase();
                }

                if (valA < valB) return currentUserSortDirection === 'asc' ? -1 : 1;
                if (valA > valB) return currentUserSortDirection === 'asc' ? 1 : -1;
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
                (user.createdAt && user.createdAt.toDate ? `"${user.createdAt.toDate().toLocaleString()}"` : ''), 
                (user.updatedAt && user.updatedAt.toDate ? `"${user.updatedAt.toDate().toLocaleString()}"` : '') 
            ];
            csvContent += row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',') + '\n'; 
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


// User Table Header Sorting
if (usersTableHeader) {
    usersTableHeader.addEventListener('click', (event) => {
        const target = event.target;
        if (target.tagName === 'TH' && target.dataset.sortKey) {
            const key = target.dataset.sortKey;

            if (currentUserSortKey === key) {
                currentUserSortDirection = currentUserSortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                currentUserSortKey = key;
                currentUserSortDirection = 'asc'; 
            }

            usersTableHeader.querySelectorAll('th').forEach(th => {
                th.classList.remove('sort-asc', 'sort-desc');
            });

            target.classList.add(`sort-${currentUserSortDirection}`);
            
            applyUserFiltersAndSort(); 
        }
    });
}

// User Pagination Event Listeners
if (prevPageButton) {
    prevPageButton.addEventListener('click', () => {
        if (currentUserPage > 1) {
            currentUserPage--;
            applyUserFiltersAndSort();
        }
    });
}

if (nextPageButton) {
    nextPageButton.addEventListener('click', () => {
        const totalPages = Math.ceil(allUsers.length / userItemsPerPage); 
        if (currentUserPage < totalPages) {
            currentUserPage++;
            applyUserFiltersAndSort();
        }
    });
}

if (itemsPerPageSelect) {
    itemsPerPageSelect.addEventListener('change', (event) => {
        userItemsPerPage = parseInt(event.target.value, 10);
        currentUserPage = 1; 
        applyUserFiltersAndSort();
    });
}

/**
 * Updates the user pagination buttons and page info text.
 * @param {number} totalItems - The total number of items after filtering.
 * @param {number} totalPages - The total number of pages.
 */
function updateUserPaginationControls(totalItems, totalPages) {
    pageInfo.textContent = `Page ${currentUserPage} of ${totalPages} (${totalItems} users)`;
    prevPageButton.disabled = currentUserPage === 1;
    nextPageButton.disabled = currentUserPage === totalPages || totalItems === 0; 
}


// --- Rides Monitoring Functions ---

/**
 * Establishes a real-time Firestore listener for ride data.
 */
async function setupRidesLiveMonitoring() {
    ridesTableBody.innerHTML = '<tr><td colspan="12">Loading rides data...</td></tr>'; 
    try {
        const ridesRef = collection(db, 'rides'); 
        const q = query(ridesRef);

        if (unsubscribeRidesSnapshot) {
            unsubscribeRidesSnapshot();
            unsubscribeRidesSnapshot = null;
        }

        unsubscribeRidesSnapshot = onSnapshot(q, (querySnapshot) => {
            allRides = [];
            querySnapshot.forEach((doc) => {
                allRides.push({ id: doc.id, ...doc.data() });
            });
            currentRidePage = 1; 
            applyRideFiltersAndSort();
        }, (error) => {
            console.error("Error setting up live rides monitoring:", error);
            ridesTableBody.innerHTML = '<tr><td colspan="12" class="error-message">Error loading rides. Live monitoring failed.</td></tr>'; 
            displayGlobalNotification('Failed to set up live rides monitoring: ' + error.message, 'error');
        });
        displayGlobalNotification('Live monitoring for rides established!', 'info');

    } catch (error) {
        console.error("Error initiating live rides monitoring setup:", error);
        ridesTableBody.innerHTML = '<tr><td colspan="12" class="error-message">Error initializing rides monitoring.</td></tr>'; 
        displayGlobalNotification('Error initializing rides monitoring: ' + error.message, 'error');
    }
}

/**
 * Applies filters (status, search) and sorting to the allRides array,
 * then calls renderRidesTable to display the filtered and sorted data.
 */
function applyRideFiltersAndSort() {
    let filteredRides = [...allRides];

    const selectedStatus = rideStatusFilter.value;
    if (selectedStatus !== 'All') {
        filteredRides = filteredRides.filter(ride => ride.status === selectedStatus);
    }

    const searchTerm = rideSearch.value.toLowerCase().trim();
    if (searchTerm) {
        filteredRides = filteredRides.filter(ride => 
            (ride.driverEmail && ride.driverEmail.toLowerCase().includes(searchTerm)) ||
            (ride.startLocation && ride.startLocation.toLowerCase().includes(searchTerm)) ||
            (ride.endLocation && ride.endLocation.toLowerCase().includes(searchTerm)) ||
            (ride.passengerEmails && Array.isArray(ride.passengerEmails) && ride.passengerEmails.some(email => email.toLowerCase().includes(searchTerm)))
        );
    }

    if (currentRideSortKey) {
        filteredRides.sort((a, b) => {
            let valA = a[currentRideSortKey];
            let valB = b[currentRideSortKey];

            if (valA === undefined || valA === null) valA = '';
            if (valB === undefined || valB === null) valB = '';

            // Handle numeric values for sorting (seats, numBookedRiders)
            if (currentRideSortKey === 'availableSeats' || currentRideSortKey === 'numBookedRiders') { 
                valA = parseFloat(valA) || 0;
                valB = parseFloat(valB) || 0;
            } else if (currentRideSortKey === 'createdAt' || currentRideSortKey === 'rideDate') { 
                valA = valA ? valA.toMillis() : 0;
                valB = valB ? valB.toMillis() : 0;
            } else if (typeof valA === 'string') {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
            }

            if (valA < valB) return currentRideSortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return currentRideSortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    const totalPages = Math.ceil(filteredRides.length / rideItemsPerPage);
    currentRidePage = Math.max(1, Math.min(currentRidePage, totalPages));

    const startIndex = (currentRidePage - 1) * rideItemsPerPage;
    const endIndex = startIndex + rideItemsPerPage;
    const ridesToDisplay = filteredRides.slice(startIndex, endIndex);

    renderRidesTable(ridesToDisplay);
    updateRidePaginationControls(filteredRides.length, totalPages);
}

/**
 * Renders ride data into the rides table.
 * @param {Array<Object>} rides - Array of ride objects.
 */
function renderRidesTable(rides) {
    ridesTableBody.innerHTML = ''; 

    if (rides.length === 0) {
        ridesTableBody.innerHTML = '<tr><td colspan="12">No rides found with the selected criteria.</td></tr>'; 
        return;
    }

    rides.forEach(ride => {
        const row = ridesTableBody.insertRow();
        row.insertCell().textContent = ride.id || 'N/A';
        row.insertCell().textContent = ride.driverEmail || 'N/A';
        row.insertCell().textContent = (Array.isArray(ride.passengerEmails) && ride.passengerEmails.length > 0) ? ride.passengerEmails.join(', ') : 'None';
        
        const numBookedRiders = (Array.isArray(ride.passengerEmails) ? ride.passengerEmails.length : 0);
        const bookedRidersCell = row.insertCell();
        bookedRidersCell.textContent = numBookedRiders;
        bookedRidersCell.style.cursor = 'pointer'; 
        bookedRidersCell.style.textDecoration = 'underline';
        bookedRidersCell.style.color = '#3498db';
        if (numBookedRiders > 0) {
            bookedRidersCell.addEventListener('click', (e) => {
                e.stopPropagation(); 
                openBookedRidersModal(ride.id, ride.passengerEmails);
            });
        } else {
            bookedRidersCell.style.cursor = 'default';
            bookedRidersCell.style.textDecoration = 'none';
            bookedRidersCell.style.color = '#777';
        }

        row.insertCell().textContent = ride.startLocation || 'N/A';
        row.insertCell().textContent = ride.endLocation || 'N/A';
        
        const rideDate = ride.rideDate && ride.rideDate.toDate ? ride.rideDate.toDate().toLocaleDateString() : 'N/A';
        row.insertCell().textContent = rideDate;
        
        row.insertCell().textContent = ride.rideTime || 'N/A'; 
        row.insertCell().textContent = ride.availableSeats !== undefined ? ride.availableSeats : 'N/A';
        row.insertCell().textContent = ride.status || 'N/A';

        const createdAt = ride.createdAt && ride.createdAt.toDate ? ride.createdAt.toDate().toLocaleString() : 'N/A';
        row.insertCell().textContent = createdAt;

        const actionsCell = row.insertCell();
        actionsCell.className = 'action-buttons';

        if (ride.status === 'Offered' || ride.status === 'Booked') {
            const cancelButton = document.createElement('button');
            cancelButton.textContent = 'Cancel';
            cancelButton.className = 'reject'; 
            cancelButton.onclick = (e) => { e.stopPropagation(); showConfirmationModal(ride.id, 'Cancelled', `Ride ${ride.id}`, 'ride'); };
            actionsCell.appendChild(cancelButton);
        }
        if (ride.status === 'Booked') {
            const completeButton = document.createElement('button');
            completeButton.textContent = 'Complete';
            completeButton.className = 'approve'; 
            completeButton.onclick = (e) => { e.stopPropagation(); showConfirmationModal(ride.id, 'Completed', `Ride ${ride.id}`, 'ride'); };
            actionsCell.appendChild(completeButton);
        }
        if (ride.status === 'Cancelled' || ride.status === 'Completed') {
            const relistButton = document.createElement('button');
            relistButton.textContent = 'Relist';
            relistButton.className = 'activate'; 
            relistButton.onclick = (e) => { e.stopPropagation(); showConfirmationModal(ride.id, 'Offered', `Ride ${ride.id}`, 'ride'); };
            actionsCell.appendChild(relistButton);
        }
    });
}

/**
 * Opens the modal to display the list of riders who booked a specific ride.
 * @param {string} rideId - The ID of the ride.
 * @param {Array<string>} passengerEmails - An array of emails of the passengers who booked.
 */
async function openBookedRidersModal(rideId, passengerEmails) {
    clearAllMessages();
    bookedRidersTableBody.innerHTML = ''; 
    bookedRidersRideId.textContent = rideId;
    bookedRidersCountInfo.textContent = `Total Booked: ${passengerEmails.length}`;
    noBookedRidersMessage.style.display = 'none';

    if (passengerEmails.length === 0) {
        noBookedRidersMessage.style.display = 'block';
        rideBookedRidersModal.style.display = 'flex';
        return;
    }

    const bookedRidersDetails = passengerEmails.map(email => 
        allUsers.find(user => user.email === email)
    ).filter(Boolean); 

    if (bookedRidersDetails.length === 0) {
        noBookedRidersMessage.style.display = 'block';
        rideBookedRidersModal.style.display = 'flex';
        return;
    }

    bookedRidersDetails.forEach(rider => {
        const row = bookedRidersTableBody.insertRow();
        row.insertCell().textContent = rider.email || 'N/A';
        row.insertCell().textContent = `${rider.firstName || ''} ${rider.lastName || ''}`.trim() || 'N/A';
        row.insertCell().textContent = rider.mobile || 'N/A';
    });

    rideBookedRidersModal.style.display = 'flex';
}

/**
 * NEW: Opens the modal to display the ride history for a specific passenger.
 * @param {string} passengerEmail - The email of the passenger whose ride history to display.
 */
async function openPassengerRidesModal(passengerEmail) {
    clearAllMessages();
    passengerRidesTableBody.innerHTML = ''; // Clear previous data
    passengerHistoryEmail.textContent = passengerEmail;
    noPassengerRidesMessage.style.display = 'none';

    const passengerRideHistory = allRides.filter(ride => 
        Array.isArray(ride.passengerEmails) && ride.passengerEmails.includes(passengerEmail)
    );

    if (passengerRideHistory.length === 0) {
        noPassengerRidesMessage.style.display = 'block';
        passengerRidesModal.style.display = 'flex';
        return;
    }

    passengerRideHistory.forEach(ride => {
        const row = passengerRidesTableBody.insertRow();
        row.insertCell().textContent = ride.id || 'N/A';
        row.insertCell().textContent = ride.driverEmail || 'N/A';
        row.insertCell().textContent = ride.startLocation || 'N/A';
        row.insertCell().textContent = ride.endLocation || 'N/A';
        row.insertCell().textContent = ride.rideDate && ride.rideDate.toDate ? ride.rideDate.toDate().toLocaleDateString() : 'N/A';
        row.insertCell().textContent = ride.rideTime || 'N/A';
        row.insertCell().textContent = ride.status || 'N/A';
        row.insertCell().textContent = ride.createdAt && ride.createdAt.toDate ? ride.createdAt.toDate().toLocaleString() : 'N/A';
    });

    passengerRidesModal.style.display = 'flex';
}


/**
 * Updates a ride's status in Firestore.
 * @param {string} rideId - The ID of the ride to update.
 * @param {string} newStatus - The new status to set ('Offered', 'Booked', 'Completed', 'Cancelled').
 */
async function updateRideStatus(rideId, newStatus) {
    try {
        const rideDocRef = doc(db, 'rides', rideId);
        await updateDoc(rideDocRef, {
            status: newStatus,
            updatedAt: serverTimestamp()
        });
        displayGlobalNotification(`Ride status updated to "${newStatus}" for Ride ID: ${rideId}`, 'success');
    } catch (error) {
        console.error("Error updating ride status:", error);
        let errorMessage = "Failed to update ride status.";
        if (error.code === 'permission-denied') {
            errorMessage = 'Permission Denied: Ensure your admin account has the necessary Firestore permissions to update rides.';
        }
        displayGlobalNotification(errorMessage + ' ' + error.message, 'error');
    }
}

// --- Rides Monitoring Event Listeners ---
if (rideStatusFilter) {
    rideStatusFilter.addEventListener('change', () => { currentRidePage = 1; applyRideFiltersAndSort(); });
}

if (rideSearch) {
    rideSearch.addEventListener('input', () => { currentRidePage = 1; applyRideFiltersAndSort(); });
}

if (refreshRidesButton) {
    refreshRidesButton.addEventListener('click', () => { currentRidePage = 1; applyRideFiltersAndSort(); });
}

// Export Rides Data to CSV
if (exportRidesCsvButton) {
    exportRidesCsvButton.addEventListener('click', () => {
        const headers = [
            'Ride ID', 'Driver Email', 'Passenger(s) Email', 'Number of Booked Riders', 'Start Location', 'End Location',
            'Ride Date', 'Ride Time', 'Available Seats', 'Status', 'Created On'
        ];
        
        let ridesToExport = [...allRides];
        const selectedStatus = rideStatusFilter.value;
        if (selectedStatus !== 'All') {
            ridesToExport = ridesToExport.filter(ride => ride.status === selectedStatus);
        }
        const searchTerm = rideSearch.value.toLowerCase().trim();
        if (searchTerm) {
            ridesToExport = ridesToExport.filter(ride => 
                (ride.driverEmail && ride.driverEmail.toLowerCase().includes(searchTerm)) ||
                (ride.startLocation && ride.startLocation.toLowerCase().includes(searchTerm)) ||
                (ride.endLocation && ride.endLocation.toLowerCase().includes(searchTerm)) ||
                (ride.passengerEmails && Array.isArray(ride.passengerEmails) && ride.passengerEmails.some(email => email.toLowerCase().includes(searchTerm)))
            );
        }
        if (currentRideSortKey) {
            ridesToExport.sort((a, b) => {
                let valA = a[currentRideSortKey];
                let valB = b[currentRideSortKey];

                if (valA === undefined || valA === null) valA = '';
                if (valB === undefined || valB === null) valB = '';

                if (currentRideSortKey === 'availableSeats' || currentRideSortKey === 'numBookedRiders') {
                    valA = parseFloat(valA) || 0;
                    valB = parseFloat(valB) || 0;
                } else if (currentRideSortKey === 'createdAt' || currentRideSortKey === 'rideDate') {
                    valA = valA ? valA.toMillis() : 0;
                    valB = valB ? valB.toMillis() : 0;
                } else if (typeof valA === 'string') {
                    valA = valA.toLowerCase();
                    valB = valB.toLowerCase();
                }

                if (valA < valB) return currentRideSortDirection === 'asc' ? -1 : 1;
                if (valA > valB) return currentRideSortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }


        let csvContent = headers.join(',') + '\n';

        ridesToExport.forEach(ride => {
            const row = [
                ride.id || '',
                ride.driverEmail || '',
                (Array.isArray(ride.passengerEmails) && ride.passengerEmails.length > 0) ? `"${ride.passengerEmails.join(', ')}"` : '',
                (Array.isArray(ride.passengerEmails) ? ride.passengerEmails.length : 0), 
                `"${String(ride.startLocation || '').replace(/"/g, '""')}"`,
                `"${String(ride.endLocation || '').replace(/"/g, '""')}"`,
                (ride.rideDate && ride.rideDate.toDate ? `"${ride.rideDate.toDate().toLocaleDateString()}"` : ''),
                (ride.rideTime || ''),
                (ride.availableSeats !== undefined ? ride.availableSeats : ''),
                (ride.status || ''),
                (ride.createdAt && ride.createdAt.toDate ? `"${ride.createdAt.toDate().toLocaleString()}"` : '')
            ];
            csvContent += row.join(',') + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'share_a_ride_rides.csv');
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        displayGlobalNotification('Ride data exported successfully to CSV!', 'success');
    });
}

// Rides Table Header Sorting
if (ridesTableHeader) {
    ridesTableHeader.addEventListener('click', (event) => {
        const target = event.target;
        if (target.tagName === 'TH' && target.dataset.sortKey) {
            const key = target.dataset.sortKey;

            if (currentRideSortKey === key) {
                currentRideSortDirection = currentRideSortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                currentRideSortKey = key;
                currentRideSortDirection = 'asc';
            }

            ridesTableHeader.querySelectorAll('th').forEach(th => {
                th.classList.remove('sort-asc', 'sort-desc');
            });

            target.classList.add(`sort-${currentRideSortDirection}`);
            
            applyRideFiltersAndSort();
        }
    });
}

// Rides Pagination Event Listeners
if (prevRidePageButton) {
    prevRidePageButton.addEventListener('click', () => {
        if (currentRidePage > 1) {
            currentRidePage--;
            applyRideFiltersAndSort();
        }
    });
}

if (nextRidePageButton) {
    nextRidePageButton.addEventListener('click', () => {
        const totalPages = Math.ceil(allRides.length / rideItemsPerPage);
        if (currentRidePage < totalPages) {
            currentRidePage++;
            applyRideFiltersAndSort();
        }
    });
}

if (ridesPerPageSelect) {
    ridesPerPageSelect.addEventListener('change', (event) => {
        rideItemsPerPage = parseInt(event.target.value, 10);
        currentRidePage = 1; 
        applyRideFiltersAndSort();
    });
}

/**
 * Updates the ride pagination buttons and page info text.
 * @param {number} totalItems - The total number of items after filtering.
 * @param {number} totalPages - The total number of pages.
 */
function updateRidePaginationControls(totalItems, totalPages) {
    ridePageInfo.textContent = `Page ${currentRidePage} of ${totalPages} (${totalItems} rides)`;
    prevRidePageButton.disabled = currentRidePage === 1;
    nextRidePageButton.disabled = currentRidePage === totalPages || totalItems === 0;
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
                    fetchAllUsers(); 
                    setupRidesLiveMonitoring(); 
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
