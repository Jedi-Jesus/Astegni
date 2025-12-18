// Admin Portal Index JavaScript with Neural Network Animation

// API Configuration
const API_BASE_URL = 'https://api.astegni.com';

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    initializeNeuralNetwork();
    initializeDatetime();
    initializeAnimatedCounters();
    initializeModalSystem();
    checkAuthStatus();
    initializeThemeToggle();
});

// Neural Network Canvas Animation
function initializeNeuralNetwork() {
    const canvas = document.getElementById('neuralCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationId;
    let nodes = [];
    let connections = [];
    let dataPackets = [];
    let databases = [];
    let mouseX = 0;
    let mouseY = 0;

    // Resize canvas
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        initializeNetwork();
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Track mouse movement for interactive effects
    canvas.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    // Node class for network nodes
    class Node {
        constructor(x, y, type = 'regular', layer = 0) {
            this.x = x;
            this.y = y;
            this.type = type; // 'regular', 'database', 'source', 'endpoint'
            this.layer = layer;
            this.radius = type === 'database' ? 30 : 8;
            this.pulsePhase = Math.random() * Math.PI * 2;
            this.activity = 0;
            this.lastActivityTime = 0;
            this.connections = [];
            this.color = this.getColorByType();
        }

        getColorByType() {
            const isDark = document.body.getAttribute('data-theme') === 'dark';
            switch(this.type) {
                case 'database':
                    return isDark ? '34, 197, 94' : '22, 163, 74'; // Green
                case 'source':
                    return isDark ? '59, 130, 246' : '37, 99, 235'; // Blue
                case 'endpoint':
                    return isDark ? '239, 68, 68' : '220, 38, 38'; // Red
                default:
                    return isDark ? '167, 139, 250' : '139, 92, 246'; // Purple
            }
        }

        update(time) {
            this.pulsePhase += 0.02;

            // Decay activity
            if (this.activity > 0) {
                this.activity *= 0.98;
            }

            // Mouse interaction
            const dx = mouseX - this.x;
            const dy = mouseY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 100) {
                this.activity = Math.min(1, this.activity + 0.1);
            }
        }

        draw() {
            const time = Date.now();
            const pulse = Math.sin(this.pulsePhase) * 0.2 + 1;
            const radius = this.radius * pulse;

            // Activity glow
            if (this.activity > 0.01) {
                const glowRadius = radius + 20 * this.activity;
                const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, glowRadius);
                gradient.addColorStop(0, `rgba(${this.color}, ${0.3 * this.activity})`);
                gradient.addColorStop(1, `rgba(${this.color}, 0)`);
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(this.x, this.y, glowRadius, 0, Math.PI * 2);
                ctx.fill();
            }

            // Draw database icon or regular node
            if (this.type === 'database') {
                this.drawDatabase();
            } else {
                // Node circle
                ctx.beginPath();
                ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${this.color}, 0.8)`;
                ctx.fill();
                ctx.strokeStyle = `rgba(${this.color}, 1)`;
                ctx.lineWidth = 2;
                ctx.stroke();

                // Inner core
                ctx.beginPath();
                ctx.arc(this.x, this.y, radius * 0.3, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, 0.9)`;
                ctx.fill();
            }
        }

        drawDatabase() {
            const width = 40;
            const height = 50;
            const x = this.x - width/2;
            const y = this.y - height/2;

            // Database cylinder
            ctx.fillStyle = `rgba(${this.color}, 0.7)`;
            ctx.strokeStyle = `rgba(${this.color}, 1)`;
            ctx.lineWidth = 2;

            // Top ellipse
            ctx.beginPath();
            ctx.ellipse(this.x, y + 10, width/2, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Body
            ctx.fillRect(x, y + 10, width, height - 20);

            // Bottom ellipse
            ctx.beginPath();
            ctx.ellipse(this.x, y + height - 10, width/2, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Database lines
            ctx.strokeStyle = `rgba(255, 255, 255, 0.3)`;
            ctx.lineWidth = 1;
            for (let i = 1; i < 4; i++) {
                ctx.beginPath();
                ctx.ellipse(this.x, y + 10 + (i * 10), width/2, 8, 0, 0, Math.PI);
                ctx.stroke();
            }

            // Database label
            ctx.fillStyle = `rgba(255, 255, 255, 0.8)`;
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('DB', this.x, this.y + height/2 + 20);
        }

        ping() {
            this.activity = 1;
            this.lastActivityTime = Date.now();
        }
    }

    // Connection class for network connections
    class Connection {
        constructor(node1, node2) {
            this.node1 = node1;
            this.node2 = node2;
            this.strength = Math.random() * 0.5 + 0.5;
            this.activity = 0;
        }

        update() {
            if (this.activity > 0) {
                this.activity *= 0.95;
            }
        }

        draw() {
            const isDark = document.body.getAttribute('data-theme') === 'dark';
            const opacity = this.strength * 0.2 + this.activity * 0.8;

            ctx.beginPath();
            ctx.moveTo(this.node1.x, this.node1.y);
            ctx.lineTo(this.node2.x, this.node2.y);

            if (this.activity > 0.01) {
                ctx.strokeStyle = isDark
                    ? `rgba(255, 213, 79, ${opacity})`
                    : `rgba(245, 158, 11, ${opacity})`;
                ctx.lineWidth = 1 + this.activity * 2;
            } else {
                ctx.strokeStyle = isDark
                    ? `rgba(167, 139, 250, ${opacity * 0.3})`
                    : `rgba(139, 92, 246, ${opacity * 0.3})`;
                ctx.lineWidth = 0.5;
            }

            ctx.stroke();
        }

        ping() {
            this.activity = 1;
        }
    }

    // DataPacket class for animated data transfer
    class DataPacket {
        constructor(startNode, endNode, color) {
            this.startNode = startNode;
            this.endNode = endNode;
            this.progress = 0;
            this.speed = 0.01 + Math.random() * 0.02;
            this.size = 3 + Math.random() * 3;
            this.color = color || this.getRandomColor();
            this.trail = [];
            this.maxTrailLength = 10;
        }

        getRandomColor() {
            const isDark = document.body.getAttribute('data-theme') === 'dark';
            const colors = isDark ? [
                '255, 213, 79',  // Yellow
                '34, 197, 94',   // Green
                '59, 130, 246',  // Blue
                '239, 68, 68'    // Red
            ] : [
                '245, 158, 11',  // Orange
                '22, 163, 74',   // Green
                '37, 99, 235',   // Blue
                '220, 38, 38'    // Red
            ];
            return colors[Math.floor(Math.random() * colors.length)];
        }

        update() {
            this.progress += this.speed;

            if (this.progress >= 1) {
                this.endNode.ping();
                // Find connection and activate it
                const connection = connections.find(c =>
                    (c.node1 === this.startNode && c.node2 === this.endNode) ||
                    (c.node1 === this.endNode && c.node2 === this.startNode)
                );
                if (connection) connection.ping();
                return false; // Packet reached destination
            }

            // Calculate current position
            const x = this.startNode.x + (this.endNode.x - this.startNode.x) * this.progress;
            const y = this.startNode.y + (this.endNode.y - this.startNode.y) * this.progress;

            // Add to trail
            this.trail.push({ x, y, opacity: 1 });
            if (this.trail.length > this.maxTrailLength) {
                this.trail.shift();
            }

            // Fade trail
            this.trail.forEach((point, i) => {
                point.opacity = (i + 1) / this.trail.length;
            });

            return true; // Packet still traveling
        }

        draw() {
            // Draw trail
            this.trail.forEach((point, i) => {
                if (i > 0) {
                    const prevPoint = this.trail[i - 1];
                    ctx.beginPath();
                    ctx.moveTo(prevPoint.x, prevPoint.y);
                    ctx.lineTo(point.x, point.y);
                    ctx.strokeStyle = `rgba(${this.color}, ${point.opacity * 0.5})`;
                    ctx.lineWidth = this.size * 0.5 * point.opacity;
                    ctx.stroke();
                }
            });

            // Draw packet
            const x = this.startNode.x + (this.endNode.x - this.startNode.x) * this.progress;
            const y = this.startNode.y + (this.endNode.y - this.startNode.y) * this.progress;

            // Glow effect
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, this.size * 3);
            gradient.addColorStop(0, `rgba(${this.color}, 0.8)`);
            gradient.addColorStop(1, `rgba(${this.color}, 0)`);
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, this.size * 3, 0, Math.PI * 2);
            ctx.fill();

            // Core
            ctx.beginPath();
            ctx.arc(x, y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${this.color}, 1)`;
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    // Initialize network structure
    function initializeNetwork() {
        nodes = [];
        connections = [];
        databases = [];

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Create layered neural network structure
        const layers = 5;
        const nodesPerLayer = [3, 5, 7, 5, 3]; // Nodes in each layer
        const layerSpacing = canvas.width / (layers + 1);

        for (let layer = 0; layer < layers; layer++) {
            const nodeCount = nodesPerLayer[layer];
            const verticalSpacing = canvas.height / (nodeCount + 1);

            for (let i = 0; i < nodeCount; i++) {
                const x = layerSpacing * (layer + 1);
                const y = verticalSpacing * (i + 1);

                // Make some nodes databases
                let type = 'regular';
                if (layer === 0 && i % 2 === 0) {
                    type = 'source';
                } else if (layer === layers - 1 && i % 2 === 0) {
                    type = 'endpoint';
                } else if ((layer === 2 && i === Math.floor(nodeCount/2)) ||
                          (layer === 1 && i === 0) ||
                          (layer === 3 && i === nodeCount - 1)) {
                    type = 'database';
                }

                const node = new Node(x, y, type, layer);
                nodes.push(node);

                if (type === 'database') {
                    databases.push(node);
                }
            }
        }

        // Create connections between adjacent layers and some cross-layer connections
        for (let layer = 0; layer < layers - 1; layer++) {
            const currentLayerNodes = nodes.filter(n => n.layer === layer);
            const nextLayerNodes = nodes.filter(n => n.layer === layer + 1);

            currentLayerNodes.forEach(node1 => {
                nextLayerNodes.forEach(node2 => {
                    // Connect with probability based on distance
                    const dx = node2.x - node1.x;
                    const dy = node2.y - node1.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const maxDistance = Math.sqrt(layerSpacing * layerSpacing + canvas.height * canvas.height);
                    const probability = 1 - (distance / maxDistance) * 0.3;

                    if (Math.random() < probability) {
                        const connection = new Connection(node1, node2);
                        connections.push(connection);
                        node1.connections.push(node2);
                        node2.connections.push(node1);
                    }
                });
            });
        }

        // Add some skip connections for complexity
        for (let i = 0; i < 5; i++) {
            const node1 = nodes[Math.floor(Math.random() * nodes.length)];
            const node2 = nodes[Math.floor(Math.random() * nodes.length)];
            if (node1 !== node2 && Math.abs(node1.layer - node2.layer) > 1) {
                const connection = new Connection(node1, node2);
                connections.push(connection);
            }
        }
    }

    // Create data packets continuously
    function createDataPackets() {
        // Random packets between nodes
        if (Math.random() < 0.1 && dataPackets.length < 30) {
            const startNode = nodes[Math.floor(Math.random() * nodes.length)];
            const endNode = nodes[Math.floor(Math.random() * nodes.length)];

            if (startNode !== endNode && (startNode.connections.includes(endNode) || Math.random() < 0.3)) {
                dataPackets.push(new DataPacket(startNode, endNode));
                startNode.ping();
            }
        }

        // Packets specifically going to/from databases
        if (Math.random() < 0.05 && databases.length > 0) {
            const database = databases[Math.floor(Math.random() * databases.length)];
            const otherNode = nodes[Math.floor(Math.random() * nodes.length)];

            if (database !== otherNode) {
                // Randomly decide direction
                if (Math.random() < 0.5) {
                    dataPackets.push(new DataPacket(database, otherNode, '34, 197, 94')); // From database (green)
                } else {
                    dataPackets.push(new DataPacket(otherNode, database, '59, 130, 246')); // To database (blue)
                }
            }
        }
    }

    // Animation loop
    function animate(time) {
        // Semi-transparent background for trail effect
        ctx.fillStyle = document.body.getAttribute('data-theme') === 'dark'
            ? 'rgba(3, 7, 18, 0.1)'
            : 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Update and draw connections
        connections.forEach(connection => {
            connection.update();
            connection.draw();
        });

        // Update and draw nodes
        nodes.forEach(node => {
            node.update(time);
        });

        // Draw nodes (after connections so they appear on top)
        nodes.forEach(node => {
            node.draw();
        });

        // Update and draw data packets
        createDataPackets();
        dataPackets = dataPackets.filter(packet => {
            const stillTraveling = packet.update();
            if (stillTraveling) {
                packet.draw();
            }
            return stillTraveling;
        });

        // Draw stats
        drawNetworkStats();

        animationId = requestAnimationFrame(animate);
    }

    // Draw network statistics
    function drawNetworkStats() {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)';
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';

        const stats = [
            `Nodes: ${nodes.length}`,
            `Connections: ${connections.length}`,
            `Active Packets: ${dataPackets.length}`,
            `Databases: ${databases.length}`
        ];

        stats.forEach((stat, i) => {
            ctx.fillText(stat, 20, 30 + i * 20);
        });

        // Network status indicator
        ctx.fillStyle = 'rgba(34, 197, 94, 0.8)';
        ctx.beginPath();
        ctx.arc(canvas.width - 30, 30, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)';
        ctx.textAlign = 'right';
        ctx.fillText('NETWORK ACTIVE', canvas.width - 45, 35);
    }

    // Initialize
    initializeNetwork();
    animate(0);

    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
    });
}

// Initialize datetime display
function initializeDatetime() {
    const updateDateTime = () => {
        const now = new Date();
        const options = {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        const dateTimeStr = now.toLocaleDateString('en-US', options);
        const datetimeElement = document.getElementById('datetime');
        if (datetimeElement) {
            datetimeElement.textContent = dateTimeStr;
        }
    };

    updateDateTime();
    setInterval(updateDateTime, 60000); // Update every minute
}

// Animated counter effect
function initializeAnimatedCounters() {
    const counters = document.querySelectorAll('.stat-number');
    const speed = 200;

    const animateCounter = (counter) => {
        const target = +counter.getAttribute('data-count');
        const increment = target / speed;

        const updateCount = () => {
            const count = +counter.innerText;
            if (count < target) {
                counter.innerText = Math.ceil(count + increment);
                setTimeout(updateCount, 10);
            } else {
                counter.innerText = target.toLocaleString();
            }
        };

        updateCount();
    };

    // Use Intersection Observer for animation trigger
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(counter => observer.observe(counter));
}

// Modal System
function initializeModalSystem() {
    // Close modals on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });

    // Close modals on background click
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });

    // Initialize form handlers
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
}

// Modal Controls
function openLoginModal() {
    closeAllModals();
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.add('active');
        // Focus first input
        setTimeout(() => {
            const firstInput = modal.querySelector('input');
            if (firstInput) firstInput.focus();
        }, 100);
    }
}

function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function openRegisterModal() {
    closeAllModals();
    const modal = document.getElementById('registerModal');
    if (modal) {
        modal.classList.add('active');
        // Focus first input
        setTimeout(() => {
            const firstInput = modal.querySelector('input');
            if (firstInput) firstInput.focus();
        }, 100);
    }
}

function closeRegisterModal() {
    const modal = document.getElementById('registerModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.classList.remove('active');
    });
}

function switchToRegister() {
    closeLoginModal();
    setTimeout(() => openRegisterModal(), 300);
}

function switchToLogin() {
    closeRegisterModal();
    setTimeout(() => openLoginModal(), 300);
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    // Show loading state
    const submitButton = e.target.querySelector('button[type="submit"]');
    const btnText = submitButton.querySelector('.btn-text');
    const btnLoader = submitButton.querySelector('.btn-loader');

    btnText.style.display = 'none';
    btnLoader.style.display = 'flex';
    submitButton.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Store tokens
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('refreshToken', data.refresh_token);
            localStorage.setItem('user', JSON.stringify(data.user));

            // Fetch full admin profile data (including departments)
            try {
                const profileResponse = await fetch(`${API_BASE_URL}/api/admin/profile/${data.user.id}`);
                if (profileResponse.ok) {
                    const profileData = await profileResponse.json();

                    // Store admin session data for admin pages to use
                    // This is needed by manage-campaigns, manage-courses, etc.
                    // Prioritize manage-system-settings if user has it (full access)
                    const sessionDepartments = profileData.departments || [];
                    let sessionDefaultDept = 'manage-system-settings';
                    if (sessionDepartments.length > 0) {
                        sessionDefaultDept = sessionDepartments.includes('manage-system-settings')
                            ? 'manage-system-settings'
                            : sessionDepartments[0];
                    }
                    const adminSession = {
                        id: data.user.id,
                        email: profileData.email || data.user.email,
                        username: profileData.username || data.user.username,
                        first_name: profileData.first_name || data.user.first_name,
                        father_name: profileData.father_name || data.user.father_name,
                        grandfather_name: profileData.grandfather_name,
                        department: sessionDefaultDept,
                        departments: sessionDepartments
                    };
                    localStorage.setItem('adminSession', JSON.stringify(adminSession));
                    console.log('Admin session stored:', adminSession);
                } else {
                    console.warn('Could not fetch admin profile, using basic user data');
                    // Fallback to basic user data if profile fetch fails
                    const adminSession = {
                        id: data.user.id,
                        email: data.user.email,
                        username: data.user.username,
                        first_name: data.user.first_name,
                        father_name: data.user.father_name,
                        department: 'manage-system-settings',
                        departments: []
                    };
                    localStorage.setItem('adminSession', JSON.stringify(adminSession));
                }
            } catch (profileError) {
                console.error('Error fetching admin profile:', profileError);
            }

            // Show success notification
            showNotification('Authentication successful! Redirecting...', 'success');

            // Unlock portals
            unlockPortals();

            // Close modal and redirect
            setTimeout(() => {
                closeLoginModal();
                const userRoles = data.user.roles || [];
                if (userRoles.includes('super_admin')) {
                    window.location.href = 'admin-dashboard.html';
                } else if (userRoles.includes('admin')) {
                    window.location.href = 'admin-dashboard.html';
                } else {
                    window.location.href = 'manage-content.html';
                }
            }, 1500);
        } else {
            showNotification(data.detail || 'Authentication failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Connection error. Please try again.', 'error');
    } finally {
        btnText.style.display = 'block';
        btnLoader.style.display = 'none';
        submitButton.disabled = false;
    }
}

// Handle registration
async function handleRegister(e) {
    e.preventDefault();

    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const adminRole = document.getElementById('adminRole').value;

    // Show loading state
    const submitButton = e.target.querySelector('button[type="submit"]');
    const btnText = submitButton.querySelector('.btn-text');
    const btnLoader = submitButton.querySelector('.btn-loader');

    btnText.style.display = 'none';
    btnLoader.style.display = 'flex';
    submitButton.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/api/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: `${firstName.toLowerCase()}_${lastName.toLowerCase()}`,
                email: email,
                password: password,
                first_name: firstName,
                last_name: lastName,
                roles: ['admin', adminRole]
            })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('Registration request submitted! Awaiting approval.', 'success');

            // Clear form and close modal
            e.target.reset();
            setTimeout(() => {
                closeRegisterModal();
            }, 2000);
        } else {
            showNotification(data.detail || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('Connection error. Please try again.', 'error');
    } finally {
        btnText.style.display = 'block';
        btnLoader.style.display = 'none';
        submitButton.disabled = false;
    }
}

// Check authentication status
function checkAuthStatus() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (token && user) {
        const userData = JSON.parse(user);
        const userRoles = userData.roles || [];

        if (userRoles.includes('admin') || userRoles.includes('super_admin')) {
            unlockPortals();
        }
    }
}

// Unlock portal access
function unlockPortals() {
    const portalCards = document.querySelectorAll('.portal-card-advanced');
    portalCards.forEach(card => {
        card.setAttribute('data-locked', 'false');
    });
}

// Theme Toggle
function toggleTheme() {
    const body = document.body;
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    // Update theme icons
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');

    if (newTheme === 'dark') {
        if (sunIcon) sunIcon.style.display = 'none';
        if (moonIcon) moonIcon.style.display = 'block';
    } else {
        if (sunIcon) sunIcon.style.display = 'block';
        if (moonIcon) moonIcon.style.display = 'none';
    }

    // Reinitialize neural network with new colors
    initializeNeuralNetwork();

    showNotification(`${newTheme === 'dark' ? 'Dark' : 'Light'} mode enabled`);
}

// Initialize theme
function initializeThemeToggle() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);

    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');

    if (savedTheme === 'dark') {
        if (sunIcon) sunIcon.style.display = 'none';
        if (moonIcon) moonIcon.style.display = 'block';
    } else {
        if (sunIcon) sunIcon.style.display = 'block';
        if (moonIcon) moonIcon.style.display = 'none';
    }
}

// Notification system
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
    const notificationIcon = notification.querySelector('.notification-icon svg');

    notificationText.textContent = message;

    // Update icon based on type
    if (type === 'error') {
        notificationIcon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        `;
        notification.style.borderColor = 'rgba(239, 68, 68, 0.5)';
    } else if (type === 'warning') {
        notificationIcon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        `;
        notification.style.borderColor = 'rgba(245, 158, 11, 0.5)';
    } else {
        notificationIcon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        `;
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        notification.style.borderColor = isDark ? 'rgba(255, 213, 79, 0.5)' : 'rgba(245, 158, 11, 0.5)';
    }

    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 4000);
}

// Show welcome notification
setTimeout(() => {
    showNotification('Neural Network Control System - Online');
}, 1000);

// Make functions globally available
window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
window.openRegisterModal = openRegisterModal;
window.closeRegisterModal = closeRegisterModal;
window.switchToLogin = switchToLogin;
window.switchToRegister = switchToRegister;
window.toggleTheme = toggleTheme;