document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    
    if (!token || !role) {
        window.location.href = '/login.html';
        return;
    }

    // Verify token validity on initial load
    verifyToken(token).then(isValid => {
        if (!isValid) {
            localStorage.clear();
            window.location.href = '/login.html';
        }
    });
    
    document.getElementById('userRoleBadge').textContent = role;
    initializeTheme();
    setupEventListeners();
    loadRoleSpecificContent(role);

    async function verifyToken(token) {
        try {
            const response = await fetch('/api/auth/verify-token', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }
});
document.getElementById('togglePasswordAddUser').addEventListener('click', function () {
    const passwordInput = document.getElementById('userPassword');
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    this.textContent = type === 'password' ? '👁️' : '🙈';
});

// WebSocket connection for real-time updates
const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => {
    console.log('WebSocket connection established');
    // Start fetching and sending speed data
    fetchAndSendSpeed(ws);
};

ws.onmessage = (event) => {
    console.log('Message from server:', event.data);
    const data = JSON.parse(event.data);
    if (data.type === 'speed') {
        document.getElementById('currentSpeed').textContent = data.speed;
    }
};

ws.onclose = () => {
    console.log('WebSocket connection closed');
};

ws.onerror = (error) => {
    console.error('WebSocket error:', error);
};

// Function to fetch and send internet speed
async function fetchAndSendSpeed(ws) {
    try {
        const speed = await fetchInternetSpeed();
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'speed', speed }));
        }
        document.getElementById('currentSpeed').textContent = speed;
    } catch (error) {
        console.error('Error fetching speed:', error);
        document.getElementById('currentSpeed').textContent = '0';
    }

    // Fetch speed every 5 seconds
    setTimeout(() => fetchAndSendSpeed(ws), 1000);
}

// Function to fetch internet speed
async function fetchInternetSpeed() {
    try {
        // Simulate a random speed for testing
        const speed = (Math.random() * 100).toFixed(2); // Random speed between 0 and 100 Mbps
        console.log('Simulated speed:', speed);
        return speed;
    } catch (error) {
        console.error('Error fetching internet speed:', error);
        return 0; // Return 0 in case of error
    }
}

// Update computer status
document.querySelectorAll('.status-select').forEach(select => {
    select.addEventListener('change', async (e) => {
        try {
            const response = await fetch(`/api/computers/${e.target.dataset.id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ status: e.target.value })
            });
            
            if (!response.ok) throw new Error('Status update failed');
            loadAllComputers(); // Refresh data
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    });
});
// Submit issue report

// Theme Management
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.className = savedTheme;
}

function toggleTheme() {
    const currentTheme = document.body.classList.contains('dark') ? 'dark' : 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.body.className = newTheme;
    localStorage.setItem('theme', newTheme);
}

// Event Listeners
function setupEventListeners() {
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('labBookingForm').addEventListener('submit', bookLab);
    document.getElementById('addUserForm').addEventListener('submit', addNewUser);
    document.getElementById('labBookingFormAdmin').addEventListener('submit', bookLab);
    document.getElementById('staffBookingForm').addEventListener('submit', handleStaffBooking);
    document.getElementById('profileBtn').addEventListener('click', () => {window.location.href = '/profile.html';});
}

function logout() {
    localStorage.clear();
    window.location.href = '/login.html';
}

// Role-Based Content Loading
// Update loadRoleSpecificContent
function loadRoleSpecificContent(role) {
    // Hide all dashboards
    document.querySelectorAll('[id$="Dashboard"]').forEach(el => el.classList.add('hidden'));
    document.getElementById('adminView').classList.add('hidden');
// Load necessary data
    switch(role) {
        case 'admin':
            document.getElementById('adminView').classList.remove('hidden');
            document.getElementById('adminDashboard').classList.remove('hidden');
            
            loadRegistrationRequests();
            loadAllComputers();
            loadIssuesTable();
            break;
        case 'student':
            document.getElementById('studentDashboard').classList.remove('hidden');
            loadAllComputers();
            break;
        case 'staff':
            document.getElementById('staffDashboard').classList.remove('hidden');
            loadAllComputers();
            break;
    }
}

// Admin Functions
async function loadRegistrationRequests() {
    try {
        const response = await fetch('/api/computers/pending', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (!response.ok) throw new Error('Failed to fetch pending computers');
        const computers = await response.json();

        const tbody = document.querySelector('#pendingComputersTable tbody');
        tbody.innerHTML = '';

        // In loadRegistrationRequests function
        // In loadRegistrationRequests function
        computers.forEach(computer => {
            tbody.innerHTML += `
                <tr>
                    <td>${computer.name}</td>
                    <td>${computer.ipAddress}</td>
                    <td>
                        <div><strong>CPU:</strong> ${computer.specs.cpu}</div>
                        <div><strong>RAM:</strong> ${computer.specs.ram}</div>
                        <div><strong>Storage:</strong> ${computer.specs.storage}</div>
                        <div><strong>OS:</strong> ${computer.specs.os}</div>
                        <div><strong>Network:</strong> ${computer.specs.network}</div>
                    </td>
                    <td>
                        <button class="btn-approve" data-id="${computer._id}">Approve</button>
                        <button class="btn-reject" data-id="${computer._id}">Reject</button>
                    </td>
                </tr>
            `;
        });

        // Add event listeners after populating the table
        document.querySelectorAll('.btn-approve').forEach(button => {
            button.addEventListener('click', () => approveComputer(button.dataset.id));
        });

        document.querySelectorAll('.btn-reject').forEach(button => {
            button.addEventListener('click', () => rejectComputer(button.dataset.id));
        });

    } catch (error) {
        console.error('Error loading requests:', error);
        alert(`Error: ${error.message}`);
    }
}

function showRegistrationRequests() {
    document.getElementById('registrationRequests').classList.remove('hidden');
    document.getElementById('allComputers').classList.add('hidden');
    
    // Refresh the data when showing the table
    loadRegistrationRequests();
    
}

function showAllComputers() {
    document.getElementById('allComputers').classList.remove('hidden');
    document.getElementById('registrationRequests').classList.add('hidden');
}
// Add these functions
async function loadAllComputers() {
    try {
        const response = await fetch('/api/computers', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (!response.ok) throw new Error('Failed to fetch computers');
        const computers = await response.json();

        const tbody = document.querySelector('#computersTable tbody');
        tbody.innerHTML = '';

        // Populate dropdown for all roles
        const issueComputerSelectStudent = document.getElementById('issueComputerSelectStudent');
        if (issueComputerSelectStudent) { // Ensure the dropdown exists
            issueComputerSelectStudent.innerHTML = '<option value="">Select Computer</option>';

            computers.forEach(computer => {
                // Add to dropdown if approved
                if (computer.status === 'approved') {
                    issueComputerSelectStudent.innerHTML += `
                        <option value="${computer.id}">${computer.name}</option>
                    `;
                }
            });
        }

        // Populate table with real data
        computers.forEach(computer => {
            // Use real data for operational status, approval status, and network speed
            tbody.innerHTML += `
                <tr>
                    <td>${computer.id}</td>
                    <td>${computer.name}</td>
                    <td>
                        <span class="status-indicator ${computer.operationalStatus}">
                            ${computer.operationalStatus}
                        </span>
                    </td>
                    <td>
                        <span class="approval-status ${computer.status}">
                            ${computer.status}
                        </span>
                    </td>
                    <td>
                        <span class="power-status ${computer.powerStatus}">
                            ${computer.powerStatus.toUpperCase()}
                        </span>
                    </td>
                    <td>
                        <span class="network-speed">${computer.networkSpeed}</span> Mbps
                    </td>
                    <td>${computer.ipAddress}</td>
                    <td>
                        <button class="btn-edit">Edit</button>
                        <button class="btn-delete">Delete</button>
                    </td>
                </tr>
            `;
        });

        // Simulate network speed updates (if needed)
        simulateNetworkSpeedUpdates();

    } catch (error) {
        console.error('Error:', error);
        alert(`Error loading computers: ${error.message}`);
    }
}

function simulateNetworkSpeedUpdates() {
    setInterval(() => {
        document.querySelectorAll('.network-speed').forEach(element => {
            // Update speed with random value between 45-105 Mbps
            const newSpeed = (Math.random() * 60 + 45).toFixed(2);
            element.textContent = newSpeed;
        });
    }, 1000); // Update every 5 seconds
}

async function handleStatusChange(e) {
    try {
        const response = await fetch(`/api/computers/${e.target.dataset.id}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ 
                operationalStatus: e.target.value 
            })
        });
        
        if (!response.ok) throw new Error('Status update failed');
        loadAllComputers();
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

// Staff Functions
async function loadLabsForBooking() {
    // Implementation for loading labs
}

async function bookLab(event) {
    event.preventDefault();
    const formData = {
        labName: document.getElementById('labName').value,
        startTime: document.getElementById('labStartTime').value,
        endTime: document.getElementById('labEndTime').value
    };

    try {
        const response = await fetch('/api/labs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            alert('Lab booked successfully!');
            event.target.reset();
        }
    } catch (error) {
        console.error('Booking failed:', error);
    }
}

async function handleStaffBooking(e) {
    e.preventDefault();
    // Implement booking logic similar to student
}

// Student Functions
async function loadComputersForBooking() {
    // Implementation for loading available computers
}

document.getElementById('issueFormStudent').addEventListener('submit', async (e) => {
    e.preventDefault();

    const computerId = document.getElementById('issueComputerSelectStudent').value;
    const description = document.getElementById('issueDescriptionStudent').value;

    if (!computerId || !description) {
        alert('Please fill all required fields');
        return;
    }

    try {
        const response = await fetch('/api/issues', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ computer: computerId, description })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to report issue');
        }

        alert('Issue reported successfully!');
        e.target.reset();
    } catch (error) {
        console.error('Error reporting issue:', error);
        alert(`Error: ${error.message}`);
    }
});


async function loadIssuesTable() {
    try {
        const response = await fetch('/api/issues', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch issues');
        const issues = await response.json();

        const tbody = document.querySelector('#issuesTable tbody');
        tbody.innerHTML = '';

        issues.forEach(issue => {
            // Add null checks for populated fields
            tbody.innerHTML += `
                <tr>
                    <td>${issue._id}</td>
                    <td>${issue.computer?.name || 'N/A'}</td>
                    <td>${issue.reportedBy?.username || 'Unknown'}</td>
                    <td>${new Date(issue.createdAt).toLocaleDateString()}</td>
                    <td>${issue.description}</td>
                    <td>
                        <span class="status-indicator ${issue.status}">
                            ${issue.status.replace('-', ' ')}
                        </span>
                    </td>
                    <td>
                        ${issue.status === 'open' ? `
                            <button class="btn-in-progress" data-id="${issue._id}">In-Progress</button>
                        ` : ''}
                        ${issue.status === 'in-progress' ? `
                            <button class="btn-resolve" data-id="${issue._id}">Issue Resolved</button>
                        ` : ''}
                    </td>
                </tr>
            `;
        });
        // Add event listener for in-progress button
        document.querySelectorAll('.btn-in-progress').forEach(button => {
            button.addEventListener('click', async () => {
                const issueId = button.dataset.id;
                try {
                    const response = await fetch(`/api/issues/${issueId}/in-progress`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    });
        
                    const data = await response.json();
        
                    if (!response.ok) {
                        throw new Error(data.error || 'Failed to mark in-progress');
                    }
        
                    alert('Issue marked as in-progress!');
                    loadIssuesTable();
                    loadAllComputers();
                } catch (error) {
                    console.error('Error marking in-progress:', error);
                    alert(`Error: ${error.message}`);
                }
            });
        });

        // Add event listeners for buttons
        document.querySelectorAll('.btn-resolve').forEach(button => {
            button.addEventListener('click', async () => {
                const issueId = button.dataset.id;
                try {
                    const response = await fetch(`/api/issues/${issueId}/resolve`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    });

                    if (!response.ok) throw new Error('Failed to resolve issue');
                    alert('Issue resolved successfully!');
                    loadIssuesTable(); // Refresh the issues table
                    loadAllComputers(); // Refresh the computers table
                } catch (error) {
                    alert(`Error: ${error.message}`);
                }
            });
        });

    } catch (error) {
        console.error('Error loading issues:', error);
        alert(`Error: ${error.message}`);
    }
}
// Computer Approval/Rejection
// Updated approveComputer function
async function approveComputer(computerId) {
    try {
        if (!computerId) throw new Error('Invalid computer ID');
        
        const response = await fetch(`/api/computers/${computerId}/approve`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Approval failed');
        }

        alert('Computer approved!');
        loadRegistrationRequests();
        loadAllComputers();

    } catch (error) {
        console.error('Approval error:', error);
        alert(`Approval failed: ${error.message}`);
    }
}

async function rejectComputer(computerId) {
    try {
        if (!computerId) throw new Error('Invalid computer ID');
        
        const response = await fetch(`/api/computers/${computerId}/reject`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Rejection failed');
        }

        alert('Computer rejected!');
        loadRegistrationRequests();
        loadAllComputers();

    } catch (error) {
        console.error('Rejection error:', error);
        alert(`Rejection failed: ${error.message}`);
    }
}

async function addNewUser(event) {
    event.preventDefault();
    
    const userData = {
        username: document.getElementById('userUsername').value,
        name: document.getElementById('userName').value,
        email: document.getElementById('userEmail').value,
        role: document.getElementById('userRole').value,
        password: document.getElementById('userPassword').value
    };

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(userData)
        });

        const responseData = await response.json();
        
        if (!response.ok) {
            // Handle specific conflict messages
            if (responseData.conflict === 'username') {
                throw new Error('Username already exists!');
            }
            if (responseData.conflict === 'email') {
                throw new Error('Email already exists!');
            }
            throw new Error(responseData.message || 'Failed to add user');
        }

        alert('User added successfully!');
        event.target.reset();
        
    } catch (error) {
        console.error('Error adding user:', error);
        alert(`Error: ${error.message}`);
    }
}