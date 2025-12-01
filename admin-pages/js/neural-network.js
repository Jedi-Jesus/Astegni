// Brain Neural Network Visualization System

class NeuralNetwork {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.nodes = [];
        this.particles = [];
        this.connections = [];
        this.synapses = [];
        this.isAnimating = true;
        this.lastTime = 0;
        this.particleSpawnTimer = 0;
        this.pulseWave = 0;

        // Neural regions for brain-like structure
        this.neuralRegions = [
            { name: 'Memory Cortex', color: 'primary', neurons: 12 },
            { name: 'Processing Core', color: 'accent', neurons: 15 },
            { name: 'Analytics Lobe', color: 'success', neurons: 10 },
            { name: 'Security Hub', color: 'danger', neurons: 8 },
            { name: 'Communication Center', color: 'warning', neurons: 10 },
            { name: 'Storage Matrix', color: 'primary', neurons: 12 }
        ];

        // Data signal types flowing through neural pathways
        this.signalTypes = [
            { type: 'memory-pulse', color: 'primary', probability: 0.3, speed: 0.4 },
            { type: 'compute-signal', color: 'accent', probability: 0.25, speed: 0.5 },
            { type: 'data-stream', color: 'success', probability: 0.3, speed: 0.3 },
            { type: 'alert-spike', color: 'danger', probability: 0.15, speed: 0.6 }
        ];

        this.init();
    }

    init() {
        this.setupCanvas();
        this.createNodes();
        this.createConnections();
        this.updateThemeColors();
        this.animate();

        // Resize handler
        window.addEventListener('resize', () => this.setupCanvas());

        // Theme change listener
        window.addEventListener('themeChanged', () => this.updateThemeColors());
    }

    setupCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();

        // High DPI support
        const dpr = window.devicePixelRatio || 1;

        // Make canvas cover full viewport
        this.canvas.width = rect.width * dpr;
        this.canvas.height = window.innerHeight * dpr;

        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = window.innerHeight + 'px';

        // Scale context for high DPI
        this.ctx.scale(dpr, dpr);

        // Canvas dimensions for calculations
        this.width = rect.width;
        this.height = window.innerHeight;

        // Recreate nodes with new positions if already created
        if (this.nodes.length > 0) {
            this.createNodes();
            this.createConnections();
        }
    }

    updateThemeColors() {
        const theme = document.documentElement.getAttribute('data-theme');

        // Get CSS variables - extract RGB values for use in rgba()
        this.colors = {
            primary: this.getCSSVariable('--primary-color'),
            primaryRgb: this.getCSSVariable('--primary-rgb') || '245, 158, 11', // Amber/yellow fallback
            accent: this.getCSSVariable('--accent'),
            accentRgb: this.getCSSVariable('--accent-rgb') || '251, 191, 36', // Golden yellow fallback
            success: this.getCSSVariable('--text-success'),
            successRgb: this.getCSSVariable('--success-rgb') || '34, 197, 94',
            danger: this.getCSSVariable('--text-danger'),
            warning: this.getCSSVariable('--text-warning'),
            text: this.getCSSVariable('--text'),
            textMuted: this.getCSSVariable('--text-muted'),
            border: this.getCSSVariable('--border-color'),
            cardBg: this.getCSSVariable('--card-bg'),
            background: theme === 'dark' ? '#1a1a1a' : '#f9f9f9'
        };
    }

    getCSSVariable(varName) {
        return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    }

    createNodes() {
        this.nodes = [];
        this.synapses = [];

        // Create main database node at center
        const centerX = this.width / 2;
        const centerY = this.height / 2;

        this.nodes.push({
            id: 'database',
            type: 'database',
            x: centerX,
            y: centerY,
            radius: 45,
            label: 'Database Core',
            pulseRadius: 0,
            activity: 0,
            region: 'core'
        });

        // Create network that fills the entire page
        const rings = 5; // More rings for better coverage
        const nodesPerRing = [12, 20, 28, 36, 44]; // More nodes per ring

        // Calculate ring radii to fill the page
        const maxRadius = Math.sqrt(Math.pow(this.width/2, 2) + Math.pow(this.height/2, 2));
        const ringRadii = [
            maxRadius * 0.15,
            maxRadius * 0.30,
            maxRadius * 0.45,
            maxRadius * 0.65,
            maxRadius * 0.85
        ];

        let nodeId = 0;

        // Create nodes distributed across the entire viewport
        for (let ring = 0; ring < rings; ring++) {
            const nodeCount = nodesPerRing[ring];
            const radius = ringRadii[ring];

            for (let i = 0; i < nodeCount; i++) {
                const angle = (i * 2 * Math.PI) / nodeCount + (ring * Math.PI / 8); // Offset each ring
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;

                // Add organic randomness
                const offsetX = (Math.random() - 0.5) * 40;
                const offsetY = (Math.random() - 0.5) * 40;

                // Determine color based on position
                const colorIndex = Math.floor((angle / (Math.PI * 2)) * this.neuralRegions.length);
                const region = this.neuralRegions[colorIndex % this.neuralRegions.length];

                this.nodes.push({
                    id: `neuron-${nodeId++}`,
                    type: 'neuron',
                    x: x + offsetX,
                    y: y + offsetY,
                    radius: 6 + Math.random() * 6, // Larger nodes
                    ring: ring,
                    angle: angle,
                    activity: Math.random() * 0.2,
                    region: region.name,
                    color: region.color,
                    connections: [],
                    pulsePhase: Math.random() * Math.PI * 2,
                    glowIntensity: 0.4 + Math.random() * 0.4
                });
            }
        }

        // Add edge nodes to fill corners
        this.createEdgeNodes(centerX, centerY);

        // Create additional cluster nodes for density
        this.createClusterNodes(centerX, centerY);

        // Create synaptic connections
        this.createSynapticConnections();
    }

    createEdgeNodes(centerX, centerY) {
        // Add nodes near edges and corners to fill the entire page
        const edgeMargin = 50;
        const cornerNodes = [
            // Corners
            { x: edgeMargin, y: edgeMargin },
            { x: this.width - edgeMargin, y: edgeMargin },
            { x: edgeMargin, y: this.height - edgeMargin },
            { x: this.width - edgeMargin, y: this.height - edgeMargin },
            // Mid edges
            { x: this.width / 2, y: edgeMargin },
            { x: this.width / 2, y: this.height - edgeMargin },
            { x: edgeMargin, y: this.height / 2 },
            { x: this.width - edgeMargin, y: this.height / 2 }
        ];

        cornerNodes.forEach((pos, i) => {
            // Add cluster of nodes near each edge position
            for (let j = 0; j < 5; j++) {
                const offsetX = (Math.random() - 0.5) * 100;
                const offsetY = (Math.random() - 0.5) * 100;
                const region = this.neuralRegions[i % this.neuralRegions.length];

                this.nodes.push({
                    id: `edge-${i}-${j}`,
                    type: 'neuron',
                    x: pos.x + offsetX,
                    y: pos.y + offsetY,
                    radius: 5 + Math.random() * 5,
                    activity: Math.random() * 0.15,
                    region: region.name,
                    color: region.color,
                    connections: [],
                    pulsePhase: Math.random() * Math.PI * 2,
                    glowIntensity: 0.3 + Math.random() * 0.3
                });
            }
        });
    }

    createClusterNodes(centerX, centerY) {
        // Add clustered nodes throughout the page for organic density
        const clusters = 12; // More clusters
        const nodesPerCluster = 6;

        // Distribute clusters across the entire viewport
        for (let c = 0; c < clusters; c++) {
            const clusterAngle = (c * 2 * Math.PI) / clusters;
            const clusterRadius = (200 + Math.random() * 200) * (Math.max(this.width, this.height) / 1000);
            const clusterX = centerX + Math.cos(clusterAngle) * clusterRadius;
            const clusterY = centerY + Math.sin(clusterAngle) * clusterRadius;

            for (let n = 0; n < nodesPerCluster; n++) {
                const nodeAngle = (n * 2 * Math.PI) / nodesPerCluster;
                const nodeRadius = 40 + Math.random() * 60;
                const x = clusterX + Math.cos(nodeAngle) * nodeRadius;
                const y = clusterY + Math.sin(nodeAngle) * nodeRadius;

                // Skip nodes outside viewport
                if (x < 0 || x > this.width || y < 0 || y > this.height) continue;

                const region = this.neuralRegions[c % this.neuralRegions.length];

                this.nodes.push({
                    id: `cluster-${c}-${n}`,
                    type: 'neuron',
                    x: x,
                    y: y,
                    radius: 4 + Math.random() * 4,
                    cluster: c,
                    activity: Math.random() * 0.15,
                    region: region.name,
                    color: region.color,
                    connections: [],
                    pulsePhase: Math.random() * Math.PI * 2,
                    glowIntensity: 0.25 + Math.random() * 0.25
                });
            }
        }
    }

    createSynapticConnections() {
        const database = this.nodes[0];

        // Create intricate connection patterns
        for (let i = 1; i < this.nodes.length; i++) {
            const neuron = this.nodes[i];
            if (neuron.type !== 'neuron') continue;

            // Connect to nearby neurons for web-like pattern
            const nearbyNeurons = this.findNearbyNeurons(neuron, 150);
            const maxConnections = 2 + Math.floor(Math.random() * 2);

            for (let j = 0; j < Math.min(maxConnections, nearbyNeurons.length); j++) {
                const target = nearbyNeurons[j];

                // Avoid duplicate connections
                const existingConnection = this.synapses.find(s =>
                    (s.from.id === neuron.id && s.to.id === target.id) ||
                    (s.from.id === target.id && s.to.id === neuron.id)
                );

                if (!existingConnection) {
                    this.synapses.push({
                        from: neuron,
                        to: target,
                        strength: 0.1 + Math.random() * 0.3,
                        active: false,
                        pulseIntensity: 0,
                        type: 'neural'
                    });
                }
            }

            // Connect inner ring nodes to database
            if (neuron.ring === 0 || (neuron.ring === 1 && Math.random() < 0.3)) {
                this.synapses.push({
                    from: neuron,
                    to: database,
                    strength: 0.6 + Math.random() * 0.4,
                    active: false,
                    pulseIntensity: 0,
                    isMainPath: true,
                    type: 'data'
                });
            }

            // Create cross-ring connections for data flow
            if (neuron.ring !== undefined && neuron.ring < 3) {
                const nextRingNodes = this.nodes.filter(n =>
                    n.type === 'neuron' &&
                    n.ring === neuron.ring + 1 &&
                    Math.abs(n.angle - neuron.angle) < Math.PI / 4
                );

                if (nextRingNodes.length > 0) {
                    const target = nextRingNodes[Math.floor(Math.random() * nextRingNodes.length)];
                    this.synapses.push({
                        from: neuron,
                        to: target,
                        strength: 0.3 + Math.random() * 0.3,
                        active: false,
                        pulseIntensity: 0,
                        type: 'flow'
                    });
                }
            }
        }
    }

    findNearbyNeurons(neuron, maxDistance) {
        const nearby = [];
        for (const node of this.nodes) {
            if (node.id === neuron.id || node.type !== 'neuron') continue;

            const distance = Math.sqrt(
                Math.pow(node.x - neuron.x, 2) +
                Math.pow(node.y - neuron.y, 2)
            );

            if (distance < maxDistance) {
                nearby.push({ node, distance });
            }
        }

        // Sort by distance and return closest
        nearby.sort((a, b) => a.distance - b.distance);
        return nearby.slice(0, 6).map(item => item.node);
    }

    createConnections() {
        // Synaptic connections are now created in createSynapticConnections
        // This method is kept for compatibility but connections are handled via synapses
        this.connections = this.synapses;
    }

    spawnParticle() {
        if (!this.isAnimating || this.particles.length >= 30) return; // More particles for neural activity

        // 40% chance to create a sun-like particle going to database
        const createDatabaseParticle = Math.random() < 0.4;

        let synapse;
        if (createDatabaseParticle) {
            // Find synapses connected to database
            const databaseSynapses = this.synapses.filter(s => s.to.type === 'database');
            if (databaseSynapses.length > 0) {
                synapse = databaseSynapses[Math.floor(Math.random() * databaseSynapses.length)];
            } else {
                // Fallback to random synapse
                const synapseIndex = Math.floor(Math.random() * this.synapses.length);
                synapse = this.synapses[synapseIndex];
            }
        } else {
            // Select random synapse for normal particles
            const synapseIndex = Math.floor(Math.random() * this.synapses.length);
            synapse = this.synapses[synapseIndex];
        }

        // Determine signal type
        const rand = Math.random();
        let accumProb = 0;
        let selectedType = this.signalTypes[0];

        for (const type of this.signalTypes) {
            accumProb += type.probability;
            if (rand <= accumProb) {
                selectedType = type;
                break;
            }
        }

        // Neural signals flow from neuron to neuron or to database
        const particle = {
            from: synapse.from,
            to: synapse.to,
            x: synapse.from.x,
            y: synapse.from.y,
            progress: 0,
            type: selectedType.type,
            color: this.colors[selectedType.color],
            speed: selectedType.speed,
            trail: [],
            synapse: synapse,
            intensity: 0.5 + Math.random() * 0.5,
            isSunlike: synapse.to.type === 'database' // Mark database-bound particles
        };

        this.particles.push(particle);

        // Activate synapse and neurons
        synapse.active = true;
        synapse.pulseIntensity = 1;
        synapse.from.activity = Math.min(1, synapse.from.activity + 0.3);

        setTimeout(() => {
            synapse.active = false;
        }, 1500);
    }

    updateParticles(deltaTime) {
        // Update pulse wave for organic movement
        this.pulseWave += deltaTime * 0.002;

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];

            // Add current position to trail with neural glow
            if (particle.trail.length > 12) {
                particle.trail.shift();
            }
            particle.trail.push({
                x: particle.x,
                y: particle.y,
                opacity: particle.intensity * 0.8
            });

            // Update progress with variable speed
            particle.progress += particle.speed * deltaTime / 1000;

            if (particle.progress >= 1) {
                // Signal reached destination
                if (particle.to.type === 'database') {
                    particle.to.pulseRadius = 30;
                    particle.to.activity = 1;
                } else if (particle.to.type === 'neuron') {
                    particle.to.activity = Math.min(1, particle.to.activity + 0.5);
                    particle.to.pulseRadius = 10;

                    // Chance to propagate signal
                    if (Math.random() < 0.3 && particle.to.connections.length > 0) {
                        this.spawnParticle();
                    }
                }

                this.particles.splice(i, 1);
                continue;
            }

            // Calculate position with organic curved path
            const t = particle.progress;

            // Add slight waviness to path for organic feel
            const waveOffset = Math.sin(t * Math.PI * 2 + this.pulseWave) * 10;

            // Use smoother bezier curve
            const cx = (particle.from.x + particle.to.x) / 2 + waveOffset;
            const cy = (particle.from.y + particle.to.y) / 2 - 30;

            particle.x = Math.pow(1 - t, 2) * particle.from.x +
                        2 * (1 - t) * t * cx +
                        Math.pow(t, 2) * particle.to.x;

            particle.y = Math.pow(1 - t, 2) * particle.from.y +
                        2 * (1 - t) * t * cy +
                        Math.pow(t, 2) * particle.to.y;
        }

        // Update neuron activities (decay over time)
        for (const node of this.nodes) {
            if (node.type === 'neuron' && node.activity > 0) {
                node.activity *= 0.98;
            }
            if (node.pulseRadius > 0) {
                node.pulseRadius -= 0.5;
            }
        }

        // Update synapse pulse intensities
        for (const synapse of this.synapses) {
            if (synapse.pulseIntensity > 0) {
                synapse.pulseIntensity *= 0.95;
            }
        }

        // Update particle spawn timer with variable rate
        this.particleSpawnTimer += deltaTime;
        const spawnInterval = 500 + Math.sin(this.pulseWave) * 200; // Variable spawn rate
        if (this.particleSpawnTimer > spawnInterval) {
            this.spawnParticle();
            this.particleSpawnTimer = 0;
        }
    }

    draw() {
        // Clear canvas with gradient background
        const bgGradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        bgGradient.addColorStop(0, this.colors.background);
        bgGradient.addColorStop(1, this.colors.background + 'ee');
        this.ctx.fillStyle = bgGradient;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw neural background pattern
        this.drawNeuralBackground();

        // Draw synaptic connections
        this.drawSynapses();

        // Draw particles (signals)
        this.drawParticles();

        // Draw neurons
        this.drawNeurons();

        // Draw database core
        this.drawDatabase();
    }

    drawNeuralBackground() {
        // Create dark background with subtle gradient
        const bgGradient = this.ctx.createRadialGradient(
            this.width / 2, this.height / 2, 0,
            this.width / 2, this.height / 2, Math.max(this.width, this.height) / 2
        );

        const theme = document.documentElement.getAttribute('data-theme');
        if (theme === 'dark') {
            bgGradient.addColorStop(0, '#0a0a0f');
            bgGradient.addColorStop(0.5, '#050508');
            bgGradient.addColorStop(1, '#000000');
        } else {
            bgGradient.addColorStop(0, '#f8f8fc');
            bgGradient.addColorStop(0.5, '#f0f0f5');
            bgGradient.addColorStop(1, '#e8e8f0');
        }

        this.ctx.fillStyle = bgGradient;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Add subtle grid dots for depth
        this.ctx.fillStyle = this.colors.border + '10';
        const gridSize = 30;
        for (let x = 0; x < this.width; x += gridSize) {
            for (let y = 0; y < this.height; y += gridSize) {
                this.ctx.beginPath();
                this.ctx.arc(x, y, 0.5, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }

    drawSynapses() {
        // Draw thick, organic neural connections
        for (const synapse of this.synapses) {
            const isDataPath = synapse.type === 'data';
            const baseOpacity = isDataPath ? 0.4 : 0.25;
            const opacity = baseOpacity + synapse.strength * 0.3 + synapse.pulseIntensity * 0.6;

            const theme = document.documentElement.getAttribute('data-theme');

            // Draw multiple layers for thickness and glow
            for (let layer = 2; layer >= 0; layer--) {
                const layerOpacity = opacity * (layer === 0 ? 1 : 0.3 / (layer + 1));
                const layerWidth = layer === 0 ? 1 : layer * 3;

                // Create gradient for connections
                const gradient = this.ctx.createLinearGradient(
                    synapse.from.x, synapse.from.y,
                    synapse.to.x, synapse.to.y
                );

                if (synapse.active) {
                    // Active connections with amber/yellow glow
                    gradient.addColorStop(0, `rgba(${this.colors.primaryRgb}, ${layerOpacity})`);
                    gradient.addColorStop(0.3, `rgba(255, 213, 79, ${layerOpacity * 0.9})`); // Golden yellow
                    gradient.addColorStop(0.7, `rgba(${this.colors.primaryRgb}, ${layerOpacity * 0.9})`);
                    gradient.addColorStop(1, `rgba(255, 193, 7, ${layerOpacity * 0.7})`); // Deep amber
                    this.ctx.lineWidth = (isDataPath ? 6 : 4) + layerWidth;
                } else {
                    // Inactive connections - subtle amber colors
                    gradient.addColorStop(0, `rgba(${this.colors.primaryRgb}, ${layerOpacity * 0.3})`);
                    gradient.addColorStop(1, `rgba(255, 193, 7, ${layerOpacity * 0.2})`);
                    this.ctx.lineWidth = (isDataPath ? 4 : 3) + layerWidth * 0.5;
                }

                this.ctx.strokeStyle = gradient;
                this.ctx.lineCap = 'round';
                this.ctx.lineJoin = 'round';

                // Draw the connection with organic curve
                this.ctx.beginPath();
                this.ctx.moveTo(synapse.from.x, synapse.from.y);

                if (isDataPath) {
                    // Slight curve even for database connections
                    const dx = synapse.to.x - synapse.from.x;
                    const dy = synapse.to.y - synapse.from.y;
                    const cx = synapse.from.x + dx * 0.5 + Math.sin(this.pulseWave) * 10;
                    const cy = synapse.from.y + dy * 0.5 + Math.cos(this.pulseWave) * 10;
                    this.ctx.quadraticCurveTo(cx, cy, synapse.to.x, synapse.to.y);
                } else {
                    // More pronounced curves for neuron connections
                    const dx = synapse.to.x - synapse.from.x;
                    const dy = synapse.to.y - synapse.from.y;
                    const curve = 20 + Math.sin(this.pulseWave * 0.5 + synapse.from.x * 0.01) * 10;
                    const cx = synapse.from.x + dx * 0.5 + dy * 0.1 * curve;
                    const cy = synapse.from.y + dy * 0.5 - dx * 0.1 * curve;

                    this.ctx.quadraticCurveTo(cx, cy, synapse.to.x, synapse.to.y);
                }

                this.ctx.stroke();
            }

            // Add bright core for active synapses
            if (synapse.active && synapse.pulseIntensity > 0.5) {
                this.ctx.globalAlpha = synapse.pulseIntensity;
                this.ctx.strokeStyle = `rgba(${this.colors.primaryRgb}, 0.9)`;
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
                this.ctx.globalAlpha = 1;
            }
        }
    }

    drawParticles() {
        for (const particle of this.particles) {
            // Show bright sun-like particles going to database
            const isGoingToDatabase = particle.to.type === 'database' || particle.isSunlike;

            if (isGoingToDatabase) {
                // Draw bright sun-like trail with amber/yellow theme
                for (let i = 0; i < particle.trail.length; i++) {
                    const trail = particle.trail[i];
                    const trailOpacity = trail.opacity * (i / particle.trail.length);

                    // Bright amber/golden glow for trail
                    const trailGradient = this.ctx.createRadialGradient(
                        trail.x, trail.y, 0,
                        trail.x, trail.y, 10
                    );
                    trailGradient.addColorStop(0, `rgba(255, 255, 220, ${trailOpacity})`);
                    trailGradient.addColorStop(0.3, `rgba(${this.colors.primaryRgb}, ${trailOpacity * 0.8})`);
                    trailGradient.addColorStop(0.6, `rgba(255, 193, 7, ${trailOpacity * 0.5})`);
                    trailGradient.addColorStop(1, 'transparent');

                    this.ctx.fillStyle = trailGradient;
                    this.ctx.beginPath();
                    this.ctx.arc(trail.x, trail.y, 10, 0, Math.PI * 2);
                    this.ctx.fill();
                }

                // Draw sun-like particle with amber/yellow theme
                this.ctx.globalAlpha = particle.intensity;

                // Outer glow - large and bright amber
                const outerGlow = this.ctx.createRadialGradient(
                    particle.x, particle.y, 0,
                    particle.x, particle.y, 30
                );
                outerGlow.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
                outerGlow.addColorStop(0.2, `rgba(${this.colors.primaryRgb}, 0.8)`); // Amber
                outerGlow.addColorStop(0.4, 'rgba(255, 213, 79, 0.6)'); // Golden yellow
                outerGlow.addColorStop(0.7, 'rgba(255, 193, 7, 0.3)'); // Deep amber
                outerGlow.addColorStop(1, 'transparent');

                this.ctx.fillStyle = outerGlow;
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, 30, 0, Math.PI * 2);
                this.ctx.fill();

                // Middle glow - amber core
                const middleGlow = this.ctx.createRadialGradient(
                    particle.x, particle.y, 0,
                    particle.x, particle.y, 15
                );
                middleGlow.addColorStop(0, 'rgba(255, 255, 255, 1)');
                middleGlow.addColorStop(0.3, `rgba(${this.colors.primaryRgb}, 0.95)`);
                middleGlow.addColorStop(0.6, 'rgba(255, 213, 79, 0.7)');
                middleGlow.addColorStop(1, 'transparent');

                this.ctx.fillStyle = middleGlow;
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, 15, 0, Math.PI * 2);
                this.ctx.fill();

                // Bright white-amber core
                const coreGradient = this.ctx.createRadialGradient(
                    particle.x, particle.y, 0,
                    particle.x, particle.y, 5
                );
                coreGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
                coreGradient.addColorStop(0.7, `rgba(${this.colors.primaryRgb}, 0.9)`);
                coreGradient.addColorStop(1, `rgba(${this.colors.primaryRgb}, 0.7)`);

                this.ctx.fillStyle = coreGradient;
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, 5, 0, Math.PI * 2);
                this.ctx.fill();

                // Add sun ray effect with amber color
                this.ctx.strokeStyle = `rgba(${this.colors.primaryRgb}, 0.4)`;
                this.ctx.lineWidth = 2;
                const rayTime = Date.now() * 0.001;
                for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
                    const rayLength = 15 + Math.sin(rayTime + angle) * 5;
                    this.ctx.beginPath();
                    this.ctx.moveTo(
                        particle.x + Math.cos(angle) * 7,
                        particle.y + Math.sin(angle) * 7
                    );
                    this.ctx.lineTo(
                        particle.x + Math.cos(angle) * rayLength,
                        particle.y + Math.sin(angle) * rayLength
                    );
                    this.ctx.stroke();
                }

                this.ctx.globalAlpha = 1;
            } else {
                // Smaller particles for neuron-to-neuron with amber theme
                const particleGradient = this.ctx.createRadialGradient(
                    particle.x, particle.y, 0,
                    particle.x, particle.y, 8
                );
                particleGradient.addColorStop(0, `rgba(${this.colors.primaryRgb}, ${particle.intensity})`);
                particleGradient.addColorStop(0.5, `rgba(255, 193, 7, ${particle.intensity * 0.5})`);
                particleGradient.addColorStop(1, 'transparent');

                this.ctx.fillStyle = particleGradient;
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, 8, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        this.ctx.globalAlpha = 1;
    }

    drawNeurons() {
        const theme = document.documentElement.getAttribute('data-theme');

        for (const node of this.nodes) {
            if (node.type !== 'neuron') continue;

            // Calculate glow intensity
            const glowIntensity = (node.glowIntensity || 0.5) + node.activity * 0.5;
            const glowRadius = node.radius * 4; // Larger glow radius

            // Draw multiple glow layers for depth
            for (let layer = 2; layer >= 0; layer--) {
                const layerRadius = glowRadius * (1 + layer * 0.5);
                const layerOpacity = glowIntensity * (0.2 / (layer + 1));

                const glowGradient = this.ctx.createRadialGradient(
                    node.x, node.y, node.radius,
                    node.x, node.y, layerRadius
                );

                // Use amber/yellow theme colors for glow
                glowGradient.addColorStop(0, `rgba(${this.colors.primaryRgb}, ${layerOpacity})`);
                glowGradient.addColorStop(0.4, `rgba(255, 213, 79, ${layerOpacity * 0.8})`); // Golden
                glowGradient.addColorStop(0.7, `rgba(${this.colors.primaryRgb}, ${layerOpacity * 0.5})`);
                glowGradient.addColorStop(1, 'transparent');

                this.ctx.fillStyle = glowGradient;
                this.ctx.beginPath();
                this.ctx.arc(node.x, node.y, layerRadius, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // Draw thick neuron body with organic shape
            const bodyGradient = this.ctx.createRadialGradient(
                node.x - node.radius * 0.3, node.y - node.radius * 0.3, 0,
                node.x, node.y, node.radius * 1.5
            );

            // Bright theme-colored core
            bodyGradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
            bodyGradient.addColorStop(0.3, `rgba(${this.colors.primaryRgb}, 0.9)`);
            bodyGradient.addColorStop(0.6, `rgba(${this.colors.accentRgb}, 0.8)`);
            bodyGradient.addColorStop(1, `rgba(${this.colors.primaryRgb}, 0.6)`);

            // Draw main neuron body
            this.ctx.fillStyle = bodyGradient;
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, node.radius * 1.2, 0, Math.PI * 2);
            this.ctx.fill();

            // Add bright highlight spot
            const highlightGradient = this.ctx.createRadialGradient(
                node.x - node.radius * 0.3, node.y - node.radius * 0.3, 0,
                node.x - node.radius * 0.3, node.y - node.radius * 0.3, node.radius * 0.6
            );

            highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
            highlightGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
            highlightGradient.addColorStop(1, 'transparent');

            this.ctx.fillStyle = highlightGradient;
            this.ctx.beginPath();
            this.ctx.arc(node.x - node.radius * 0.2, node.y - node.radius * 0.2, node.radius * 0.5, 0, Math.PI * 2);
            this.ctx.fill();

            // Add organic texture dots
            this.ctx.fillStyle = `rgba(${this.colors.accentRgb}, 0.3)`;
            for (let i = 0; i < 3; i++) {
                const angle = (i * Math.PI * 2) / 3 + node.pulsePhase;
                const dotX = node.x + Math.cos(angle) * node.radius * 0.5;
                const dotY = node.y + Math.sin(angle) * node.radius * 0.5;
                this.ctx.beginPath();
                this.ctx.arc(dotX, dotY, 1.5, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // Add pulse ring for active nodes
            if (node.pulseRadius > 0) {
                this.ctx.strokeStyle = `rgba(${this.colors.primaryRgb}, 0.4)`;
                this.ctx.globalAlpha = 0.6 * (node.pulseRadius / 10);
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(node.x, node.y, node.radius + node.pulseRadius, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.globalAlpha = 1;
            }
        }
    }

    drawDatabase() {
        const db = this.nodes[0];
        if (!db || db.type !== 'database') return;

        const theme = document.documentElement.getAttribute('data-theme');

        // Draw database pulse waves with theme colors
        if (db.pulseRadius > 0) {
            for (let i = 0; i < 3; i++) {
                this.ctx.strokeStyle = `rgba(${this.colors.primaryRgb}, 0.4)`;
                this.ctx.globalAlpha = 0.4 * (db.pulseRadius / 30) * (1 - i * 0.3);
                this.ctx.lineWidth = 2 - i * 0.5;
                this.ctx.beginPath();
                this.ctx.arc(db.x, db.y, db.radius + db.pulseRadius + i * 15, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        }

        // Draw database outer glow with theme colors
        const dbGlowGradient = this.ctx.createRadialGradient(
            db.x, db.y, 0,
            db.x, db.y, db.radius * 3
        );

        dbGlowGradient.addColorStop(0, `rgba(${this.colors.primaryRgb}, 0.6)`);
        dbGlowGradient.addColorStop(0.3, `rgba(${this.colors.accentRgb}, 0.4)`);
        dbGlowGradient.addColorStop(0.6, `rgba(${this.colors.primaryRgb}, 0.2)`);
        dbGlowGradient.addColorStop(1, 'transparent');

        this.ctx.globalAlpha = 0.8 + db.activity * 0.2;
        this.ctx.fillStyle = dbGlowGradient;
        this.ctx.beginPath();
        this.ctx.arc(db.x, db.y, db.radius * 3, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.globalAlpha = 1;

        // Draw outer ring with theme colors
        const ringGradient = this.ctx.createLinearGradient(
            db.x - db.radius, db.y - db.radius,
            db.x + db.radius, db.y + db.radius
        );

        ringGradient.addColorStop(0, `rgba(${this.colors.primaryRgb}, 0.8)`);
        ringGradient.addColorStop(0.5, `rgba(${this.colors.accentRgb}, 0.8)`);
        ringGradient.addColorStop(1, `rgba(${this.colors.primaryRgb}, 0.8)`);

        this.ctx.strokeStyle = ringGradient;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(db.x, db.y, db.radius, 0, Math.PI * 2);
        this.ctx.stroke();

        // Inner background
        this.ctx.fillStyle = theme === 'dark' ? 'rgba(10, 10, 20, 0.8)' : 'rgba(240, 240, 250, 0.8)';
        this.ctx.beginPath();
        this.ctx.arc(db.x, db.y, db.radius - 3, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw database icon (cylinder) with theme colors
        const iconColor = `rgba(${this.colors.primaryRgb}, 0.9)`;
        this.ctx.fillStyle = iconColor;
        this.ctx.strokeStyle = iconColor;
        this.ctx.lineWidth = 2;

        const scale = 0.7;
        const w = 30 * scale;
        const h = 35 * scale;

        // Top ellipse
        this.ctx.beginPath();
        this.ctx.ellipse(db.x, db.y - h/2, w, w/3, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Body sides
        this.ctx.beginPath();
        this.ctx.moveTo(db.x - w, db.y - h/2);
        this.ctx.lineTo(db.x - w, db.y + h/2);
        this.ctx.moveTo(db.x + w, db.y - h/2);
        this.ctx.lineTo(db.x + w, db.y + h/2);
        this.ctx.stroke();

        // Bottom ellipse
        this.ctx.beginPath();
        this.ctx.ellipse(db.x, db.y + h/2, w, w/3, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Middle ellipse (for layered effect)
        this.ctx.globalAlpha = 0.5;
        this.ctx.beginPath();
        this.ctx.ellipse(db.x, db.y, w, w/3, 0, 0, Math.PI * 2);
        this.ctx.stroke();

        // Data dots
        this.ctx.globalAlpha = 0.8;
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                if (i === 0 && j === 0) continue;
                this.ctx.beginPath();
                this.ctx.arc(db.x + j * 12, db.y + i * 10, 1.5, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        // Label
        this.ctx.globalAlpha = 1;
        this.ctx.fillStyle = theme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(50, 50, 80, 0.9)';
        this.ctx.font = 'bold 12px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('DATABASE', db.x, db.y + db.radius + 20);
    }

    animate() {
        if (!this.isAnimating) return;

        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // Update particles
        this.updateParticles(deltaTime);

        // Draw everything
        this.draw();

        // Continue animation
        requestAnimationFrame(() => this.animate());
    }

    pause() {
        this.isAnimating = false;
    }

    resume() {
        if (!this.isAnimating) {
            this.isAnimating = true;
            this.lastTime = performance.now();
            this.animate();
        }
    }

    reset() {
        this.particles = [];
        this.particleSpawnTimer = 0;
        this.createNodes();
        this.createConnections();
    }
}

// Initialize neural network when document is ready
let neuralNetwork = null;

// Export the class for global access
window.NeuralNetwork = NeuralNetwork;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize neural network immediately (no authentication required)
    setTimeout(() => {
        const canvas = document.getElementById('neural-network');
        if (canvas && !window.neuralNetwork) {
            neuralNetwork = new NeuralNetwork('neural-network');
            window.neuralNetwork = neuralNetwork; // Export for global access
        }
    }, 100); // Small delay to ensure DOM is ready
});

// Control functions
function toggleAnimation() {
    if (!neuralNetwork) return;

    const icon = document.getElementById('animation-toggle');
    const container = document.querySelector('.network-container');

    if (neuralNetwork.isAnimating) {
        neuralNetwork.pause();
        icon.classList.remove('fa-pause');
        icon.classList.add('fa-play');
        container.classList.add('paused');
    } else {
        neuralNetwork.resume();
        icon.classList.remove('fa-play');
        icon.classList.add('fa-pause');
        container.classList.remove('paused');
    }
}

function resetVisualization() {
    if (!neuralNetwork) return;
    neuralNetwork.reset();
}