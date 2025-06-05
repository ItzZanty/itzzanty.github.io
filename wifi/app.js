// WiFi Signal Propagation Simulator with Diffraction and Interference
class WiFiSimulator {
    constructor() {
        this.canvas = document.getElementById('main-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // Simulation parameters
        this.gridSize = 4; // 1cm per pixel at 100:1 scale
        this.timeStep = 0;
        this.isRunning = false;
        this.currentMode = 'draw-walls';
        
        // Physical constants
        this.c = 299792458; // Speed of light
        this.pi = Math.PI;
        
        // Material properties from data
        this.materialProperties = {
            "drywall": {"attenuation_2_4ghz": 3.5, "attenuation_5ghz": 4.0, "color": "#d4d4aa"},
            "wood": {"attenuation_2_4ghz": 6, "attenuation_5ghz": 8, "color": "#8b4513"},
            "brick": {"attenuation_2_4ghz": 12, "attenuation_5ghz": 15, "color": "#a0522d"},
            "concrete": {"attenuation_2_4ghz": 25, "attenuation_5ghz": 30, "color": "#808080"},
            "metal": {"attenuation_2_4ghz": 35, "attenuation_5ghz": 40, "color": "#c0c0c0"}
        };
        
        // Simulation data structures
        this.walls = [];
        this.sources = [];
        this.electricField = [];
        this.magneticField = [];
        this.interferencePattern = [];
        
        // Drawing state
        this.isDrawing = false;
        this.currentWallStart = null;
        this.selectedMaterial = 'drywall';
        this.wallThickness = 200;
        
        // Source configuration
        this.sourceConfig = {
            frequency: 2.4,
            power: 20,
            phase: 0
        };
        
        // Visualization settings
        this.showHeatmap = true;
        this.showInterference = true;
        this.showFresnel = false;
        this.showDiffraction = false;
        this.showPhase = false;
        
        this.initializeFields();
        this.setupEventListeners();
        this.updateUI();
    }
    
    initializeFields() {
        // Initialize electromagnetic field arrays
        const gridWidth = Math.ceil(this.width / this.gridSize);
        const gridHeight = Math.ceil(this.height / this.gridSize);
        
        this.electricField = Array(gridHeight).fill().map(() => Array(gridWidth).fill(0));
        this.magneticField = Array(gridHeight).fill().map(() => Array(gridWidth).fill(0));
        this.interferencePattern = Array(gridHeight).fill().map(() => Array(gridWidth).fill(0));
    }
    
    setupEventListeners() {
        // Mode selector
        document.getElementById('mode-selector').addEventListener('change', (e) => {
            this.currentMode = e.target.value;
            this.updateCanvasCursor();
            this.updateStatusDisplay();
        });
        
        // Canvas interaction
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        
        // Material and thickness controls
        document.getElementById('wall-material').addEventListener('change', (e) => {
            this.selectedMaterial = e.target.value;
        });
        
        document.getElementById('wall-thickness').addEventListener('input', (e) => {
            this.wallThickness = parseInt(e.target.value);
            document.getElementById('thickness-value').textContent = e.target.value;
        });
        
        // Source configuration
        document.getElementById('source-frequency').addEventListener('change', (e) => {
            this.sourceConfig.frequency = parseFloat(e.target.value);
        });
        
        document.getElementById('source-power').addEventListener('input', (e) => {
            this.sourceConfig.power = parseInt(e.target.value);
            document.getElementById('power-value').textContent = e.target.value;
        });
        
        document.getElementById('source-phase').addEventListener('input', (e) => {
            this.sourceConfig.phase = parseInt(e.target.value);
            document.getElementById('phase-value').textContent = e.target.value;
        });
        
        // Visualization toggles
        document.getElementById('show-heatmap').addEventListener('change', (e) => {
            this.showHeatmap = e.target.checked;
            this.render();
        });
        
        document.getElementById('show-interference').addEventListener('change', (e) => {
            this.showInterference = e.target.checked;
            this.render();
        });
        
        document.getElementById('show-fresnel').addEventListener('change', (e) => {
            this.showFresnel = e.target.checked;
            this.render();
        });
        
        document.getElementById('show-diffraction').addEventListener('change', (e) => {
            this.showDiffraction = e.target.checked;
            this.render();
        });
        
        document.getElementById('show-phase').addEventListener('change', (e) => {
            this.showPhase = e.target.checked;
            this.render();
        });
        
        // Simulation controls
        document.getElementById('start-simulation').addEventListener('click', () => {
            this.startSimulation();
        });
        
        document.getElementById('stop-simulation').addEventListener('click', () => {
            this.stopSimulation();
        });
        
        document.getElementById('clear-all').addEventListener('click', () => {
            this.clearAll();
        });
        
        // Phase synchronization
        document.getElementById('sync-phases').addEventListener('click', () => {
            this.synchronizePhases();
        });
        
        document.getElementById('anti-sync-phases').addEventListener('click', () => {
            this.antiSynchronizePhases();
        });
    }
    
    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (this.currentMode === 'draw-walls') {
            this.isDrawing = true;
            this.currentWallStart = { x, y };
            console.log(`Starting wall at (${x}, ${y})`);
        }
    }
    
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Update cursor info
        this.updateCursorInfo(x, y);
        
        if (this.isDrawing && this.currentMode === 'draw-walls' && this.currentWallStart) {
            this.render();
            this.drawTemporaryWall(this.currentWallStart.x, this.currentWallStart.y, x, y);
        }
    }
    
    handleMouseUp(e) {
        if (!this.isDrawing || this.currentMode !== 'draw-walls' || !this.currentWallStart) {
            return;
        }
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Add wall
        const distance = Math.sqrt(
            Math.pow(x - this.currentWallStart.x, 2) + 
            Math.pow(y - this.currentWallStart.y, 2)
        );
        
        if (distance > 10) { // Minimum wall length
            this.addWall(this.currentWallStart.x, this.currentWallStart.y, x, y);
            console.log(`Wall completed at (${x}, ${y})`);
        }
        
        this.isDrawing = false;
        this.currentWallStart = null;
    }
    
    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (this.currentMode === 'place-sources') {
            this.addSource(x, y);
            console.log(`Source placed at (${x}, ${y})`);
        } else if (this.currentMode === 'analyze') {
            this.analyzePoint(x, y);
        }
    }
    
    addWall(x1, y1, x2, y2) {
        const wall = {
            x1, y1, x2, y2,
            material: this.selectedMaterial,
            thickness: this.wallThickness,
            id: Date.now()
        };
        
        this.walls.push(wall);
        this.render();
        console.log(`Wand hinzugefügt: ${this.selectedMaterial}, ${this.wallThickness}mm`);
    }
    
    addSource(x, y) {
        const source = {
            x, y,
            frequency: this.sourceConfig.frequency,
            power: this.sourceConfig.power,
            phase: this.sourceConfig.phase,
            active: true,
            id: Date.now()
        };
        
        this.sources.push(source);
        this.updateSourcesList();
        this.render();
        console.log(`Quelle hinzugefügt bei (${x}, ${y}): ${this.sourceConfig.frequency}GHz, ${this.sourceConfig.power}mW`);
    }
    
    updateSourcesList() {
        const sourcesList = document.getElementById('sources-list');
        
        if (this.sources.length === 0) {
            sourcesList.innerHTML = '<p class="text-secondary">Keine Quellen platziert</p>';
            return;
        }
        
        let html = '';
        for (let i = 0; i < this.sources.length; i++) {
            const source = this.sources[i];
            html += `
                <div class="source-item">
                    <div class="source-header">
                        <span class="source-title">Quelle ${i + 1}</span>
                        <label class="toggle-switch">
                            <input type="checkbox" ${source.active ? 'checked' : ''} 
                                onchange="window.simulator.toggleSource(${source.id})">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    <div class="source-controls">
                        <div class="source-control">
                            <label>Frequenz</label>
                            <select onchange="window.simulator.updateSource(${source.id}, 'frequency', this.value)">
                                <option value="2.4" ${source.frequency === 2.4 ? 'selected' : ''}>2.4 GHz</option>
                                <option value="5" ${source.frequency === 5 ? 'selected' : ''}>5 GHz</option>
                            </select>
                        </div>
                        <div class="source-control">
                            <label>Leistung</label>
                            <input type="range" min="1" max="100" value="${source.power}"
                                onchange="window.simulator.updateSource(${source.id}, 'power', this.value)">
                        </div>
                        <div class="source-control">
                            <label>Phase</label>
                            <input type="range" min="0" max="360" value="${source.phase}"
                                onchange="window.simulator.updateSource(${source.id}, 'phase', this.value)">
                        </div>
                        <div class="source-control">
                            <button onclick="window.simulator.removeSource(${source.id})" 
                                    class="btn btn--sm btn--outline">Entfernen</button>
                        </div>
                    </div>
                </div>
            `;
        }
        sourcesList.innerHTML = html;
    }
    
    toggleSource(sourceId) {
        const source = this.sources.find(s => s.id === sourceId);
        if (source) {
            source.active = !source.active;
            this.calculateFields();
            this.render();
        }
    }
    
    updateSource(sourceId, property, value) {
        const source = this.sources.find(s => s.id === sourceId);
        if (source) {
            source[property] = property === 'frequency' ? parseFloat(value) : parseInt(value);
            this.calculateFields();
            this.render();
        }
    }
    
    removeSource(sourceId) {
        this.sources = this.sources.filter(s => s.id !== sourceId);
        this.updateSourcesList();
        this.calculateFields();
        this.render();
    }
    
    startSimulation() {
        if (this.sources.length === 0) {
            alert('Bitte platzieren Sie mindestens eine Quelle vor dem Start der Simulation.');
            return;
        }
        
        this.isRunning = true;
        this.timeStep = 0;
        this.calculateFields();
        this.updateStatusDisplay('running');
        this.animationLoop();
        console.log('Simulation gestartet');
    }
    
    stopSimulation() {
        this.isRunning = false;
        this.updateStatusDisplay('stopped');
        console.log('Simulation gestoppt');
    }
    
    clearAll() {
        this.walls = [];
        this.sources = [];
        this.initializeFields();
        this.updateSourcesList();
        this.render();
        this.updatePerformanceMetrics();
        console.log('Alle Elemente gelöscht');
    }
    
    synchronizePhases() {
        this.sources.forEach(source => {
            source.phase = 0;
        });
        this.updateSourcesList();
        this.calculateFields();
        this.render();
    }
    
    antiSynchronizePhases() {
        this.sources.forEach((source, index) => {
            source.phase = index % 2 === 0 ? 0 : 180;
        });
        this.updateSourcesList();
        this.calculateFields();
        this.render();
    }
    
    calculateFields() {
        if (this.sources.length === 0) return;
        
        const gridWidth = Math.ceil(this.width / this.gridSize);
        const gridHeight = Math.ceil(this.height / this.gridSize);
        
        // Reset fields
        this.electricField = Array(gridHeight).fill().map(() => Array(gridWidth).fill(0));
        this.interferencePattern = Array(gridHeight).fill().map(() => Array(gridWidth).fill(0));
        
        // Calculate field contribution from each active source
        for (let gy = 0; gy < gridHeight; gy++) {
            for (let gx = 0; gx < gridWidth; gx++) {
                const x = gx * this.gridSize;
                const y = gy * this.gridSize;
                
                let totalRealComponent = 0;
                let totalImagComponent = 0;
                let totalSignalStrength = 0;
                
                this.sources.forEach(source => {
                    if (!source.active) return;
                    
                    const distance = Math.sqrt(Math.pow(x - source.x, 2) + Math.pow(y - source.y, 2));
                    if (distance < 1) return; // Avoid singularity at source
                    
                    // Calculate wavelength
                    const wavelength = this.c / (source.frequency * 1e9) * 100; // Convert to cm
                    
                    // Calculate attenuation from walls
                    const attenuation = this.calculateWallAttenuation(source.x, source.y, x, y, source.frequency);
                    
                    // Calculate field amplitude with distance and attenuation
                    const amplitude = Math.sqrt(source.power) / Math.pow(distance / 100, 2) * Math.pow(10, -attenuation / 20);
                    
                    // Calculate phase including propagation delay and source phase
                    const propagationPhase = (2 * this.pi * distance / 100) / wavelength;
                    const totalPhase = (source.phase * this.pi / 180) + propagationPhase + (this.timeStep * 0.1);
                    
                    // Add diffraction effects
                    const diffractionFactor = this.calculateDiffraction(source.x, source.y, x, y, wavelength);
                    const effectiveAmplitude = amplitude * diffractionFactor;
                    
                    // Vector addition for interference
                    totalRealComponent += effectiveAmplitude * Math.cos(totalPhase);
                    totalImagComponent += effectiveAmplitude * Math.sin(totalPhase);
                    
                    totalSignalStrength += amplitude;
                });
                
                // Calculate total field magnitude
                const totalAmplitude = Math.sqrt(totalRealComponent * totalRealComponent + totalImagComponent * totalImagComponent);
                this.electricField[gy][gx] = totalAmplitude;
                
                // Calculate interference pattern
                const interferenceCoeff = totalSignalStrength > 0 ? totalAmplitude / totalSignalStrength : 0;
                this.interferencePattern[gy][gx] = interferenceCoeff;
            }
        }
    }
    
    calculateWallAttenuation(x1, y1, x2, y2, frequency) {
        let totalAttenuation = 0;
        
        this.walls.forEach(wall => {
            if (this.lineIntersectsWall(x1, y1, x2, y2, wall)) {
                const material = this.materialProperties[wall.material];
                const attenuationKey = frequency === 2.4 ? 'attenuation_2_4ghz' : 'attenuation_5ghz';
                const baseAttenuation = material[attenuationKey];
                
                // Scale attenuation by thickness (normalized to 200mm)
                const thicknessFactor = wall.thickness / 200;
                totalAttenuation += baseAttenuation * thicknessFactor;
            }
        });
        
        return totalAttenuation;
    }
    
    calculateDiffraction(sourceX, sourceY, targetX, targetY, wavelength) {
        let diffractionFactor = 1.0;
        
        // Check for diffraction around wall edges
        this.walls.forEach(wall => {
            // Calculate diffraction using Fresnel-Kirchhoff principle
            const edgePoints = [
                { x: wall.x1, y: wall.y1 },
                { x: wall.x2, y: wall.y2 }
            ];
            
            edgePoints.forEach(edge => {
                const d1 = Math.sqrt(Math.pow(sourceX - edge.x, 2) + Math.pow(sourceY - edge.y, 2)) / 100;
                const d2 = Math.sqrt(Math.pow(targetX - edge.x, 2) + Math.pow(targetY - edge.y, 2)) / 100;
                
                // Check if edge causes significant diffraction
                if (this.isInShadowZone(sourceX, sourceY, targetX, targetY, wall)) {
                    // Calculate Fresnel parameter
                    const h = this.calculateClearanceHeight(sourceX, sourceY, targetX, targetY, edge);
                    const fresnelParam = h * Math.sqrt(2 * (d1 + d2) / (wavelength * d1 * d2));
                    
                    // Apply diffraction loss based on Fresnel parameter
                    if (fresnelParam < -0.78) {
                        const diffractionLoss = Math.pow(10, -(20 + 25 * Math.log10(Math.abs(fresnelParam))) / 20);
                        diffractionFactor *= diffractionLoss;
                    } else if (fresnelParam > 0) {
                        const diffractionLoss = Math.pow(10, -6.02 - 10.4 * fresnelParam / 20);
                        diffractionFactor *= Math.max(0.1, diffractionLoss);
                    }
                }
            });
        });
        
        return Math.max(0.01, diffractionFactor); // Minimum 1% of signal
    }
    
    lineIntersectsWall(x1, y1, x2, y2, wall) {
        // Line-line intersection algorithm
        const denominator = (x1 - x2) * (wall.y1 - wall.y2) - (y1 - y2) * (wall.x1 - wall.x2);
        if (Math.abs(denominator) < 0.001) return false;
        
        const t = ((x1 - wall.x1) * (wall.y1 - wall.y2) - (y1 - wall.y1) * (wall.x1 - wall.x2)) / denominator;
        const u = -((x1 - x2) * (y1 - wall.y1) - (y1 - y2) * (x1 - wall.x1)) / denominator;
        
        return t >= 0 && t <= 1 && u >= 0 && u <= 1;
    }
    
    isInShadowZone(sourceX, sourceY, targetX, targetY, wall) {
        // Simplified shadow zone detection
        const midX = (sourceX + targetX) / 2;
        const midY = (sourceY + targetY) / 2;
        return this.lineIntersectsWall(sourceX, sourceY, targetX, targetY, wall);
    }
    
    calculateClearanceHeight(sourceX, sourceY, targetX, targetY, edge) {
        // Calculate perpendicular distance from edge to line of sight
        const A = targetY - sourceY;
        const B = sourceX - targetX;
        const C = targetX * sourceY - sourceX * targetY;
        
        return Math.abs(A * edge.x + B * edge.y + C) / Math.sqrt(A * A + B * B) / 100;
    }
    
    animationLoop() {
        if (!this.isRunning) return;
        
        this.timeStep++;
        this.calculateFields();
        this.render();
        this.updatePerformanceMetrics();
        
        requestAnimationFrame(() => this.animationLoop());
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#f8f8f8';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw signal strength heatmap
        if (this.showHeatmap && this.sources.length > 0) {
            this.drawHeatmap();
        }
        
        // Draw interference patterns
        if (this.showInterference && this.sources.length > 1) {
            this.drawInterferencePattern();
        }
        
        // Draw Fresnel zones
        if (this.showFresnel && this.sources.length > 0) {
            this.drawFresnelZones();
        }
        
        // Draw walls
        this.drawWalls();
        
        // Draw sources
        this.drawSources();
        
        // Draw diffraction rays
        if (this.showDiffraction && this.sources.length > 0) {
            this.drawDiffractionRays();
        }
        
        // Draw phase relationships
        if (this.showPhase && this.sources.length > 1) {
            this.drawPhaseRelationships();
        }
    }
    
    drawHeatmap() {
        const imageData = this.ctx.createImageData(this.width, this.height);
        const data = imageData.data;
        
        const gridWidth = Math.ceil(this.width / this.gridSize);
        const gridHeight = Math.ceil(this.height / this.gridSize);
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const gx = Math.floor(x / this.gridSize);
                const gy = Math.floor(y / this.gridSize);
                
                if (gx < gridWidth && gy < gridHeight) {
                    const fieldStrength = this.electricField[gy][gx];
                    const normalizedStrength = Math.min(1, fieldStrength / 10);
                    
                    // Convert to dBm scale for realistic visualization
                    const signalDbm = 20 * Math.log10(fieldStrength + 0.001) - 30;
                    const normalizedDbm = Math.max(0, Math.min(1, (signalDbm + 90) / 60));
                    
                    const pixelIndex = (y * this.width + x) * 4;
                    
                    if (normalizedDbm > 0.1) {
                        // Color gradient from blue (weak) to red (strong)
                        data[pixelIndex] = Math.floor(255 * normalizedDbm);     // Red
                        data[pixelIndex + 1] = Math.floor(255 * (1 - normalizedDbm) * 0.5); // Green
                        data[pixelIndex + 2] = Math.floor(255 * (1 - normalizedDbm));       // Blue
                        data[pixelIndex + 3] = Math.floor(128 * normalizedDbm);  // Alpha
                    } else {
                        data[pixelIndex + 3] = 0; // Transparent for very weak signals
                    }
                }
            }
        }
        
        this.ctx.putImageData(imageData, 0, 0);
    }
    
    drawInterferencePattern() {
        const gridWidth = Math.ceil(this.width / this.gridSize);
        const gridHeight = Math.ceil(this.height / this.gridSize);
        
        for (let gy = 0; gy < gridHeight; gy += 2) {
            for (let gx = 0; gx < gridWidth; gx += 2) {
                const x = gx * this.gridSize;
                const y = gy * this.gridSize;
                const interferenceCoeff = this.interferencePattern[gy][gx];
                
                if (interferenceCoeff > 1.2) {
                    // Constructive interference - bright yellow
                    this.ctx.fillStyle = `rgba(255, 255, 0, ${Math.min(0.6, (interferenceCoeff - 1) * 2)})`;
                    this.ctx.fillRect(x, y, this.gridSize * 2, this.gridSize * 2);
                } else if (interferenceCoeff < 0.8) {
                    // Destructive interference - dark blue
                    this.ctx.fillStyle = `rgba(0, 0, 139, ${Math.min(0.6, (1 - interferenceCoeff) * 2)})`;
                    this.ctx.fillRect(x, y, this.gridSize * 2, this.gridSize * 2);
                }
            }
        }
    }
    
    drawFresnelZones() {
        if (this.sources.length === 0) return;
        
        // Draw first Fresnel zone for the first source to center of canvas
        const source = this.sources[0];
        const targetX = this.width / 2;
        const targetY = this.height / 2;
        const distance = Math.sqrt(Math.pow(targetX - source.x, 2) + Math.pow(targetY - source.y, 2)) / 100;
        
        // Calculate wavelength in meters
        const wavelength = this.c / (source.frequency * 1e9);
        const fresnelRadius = Math.sqrt(wavelength * distance / 2) * 100; // Convert back to pixels
        
        this.ctx.strokeStyle = 'rgba(255, 165, 0, 0.8)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.ellipse(
            (source.x + targetX) / 2, 
            (source.y + targetY) / 2,
            fresnelRadius, 
            fresnelRadius * 0.6, 
            Math.atan2(targetY - source.y, targetX - source.x),
            0, 
            2 * Math.PI
        );
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Update Fresnel analysis
        document.getElementById('first-zone-radius').textContent = `${(fresnelRadius / 100).toFixed(2)}m`;
    }
    
    drawWalls() {
        this.walls.forEach(wall => {
            const material = this.materialProperties[wall.material];
            this.ctx.strokeStyle = material.color;
            this.ctx.lineWidth = Math.max(2, wall.thickness / 50);
            this.ctx.lineCap = 'round';
            
            this.ctx.beginPath();
            this.ctx.moveTo(wall.x1, wall.y1);
            this.ctx.lineTo(wall.x2, wall.y2);
            this.ctx.stroke();
            
            // Draw wall edges for diffraction visualization
            if (this.showDiffraction) {
                this.ctx.fillStyle = material.color;
                this.ctx.beginPath();
                this.ctx.arc(wall.x1, wall.y1, 3, 0, 2 * Math.PI);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(wall.x2, wall.y2, 3, 0, 2 * Math.PI);
                this.ctx.fill();
            }
        });
    }
    
    drawSources() {
        this.sources.forEach((source, index) => {
            // Source circle
            this.ctx.fillStyle = source.active ? '#1FB8CD' : '#626c71';
            this.ctx.beginPath();
            this.ctx.arc(source.x, source.y, 8, 0, 2 * Math.PI);
            this.ctx.fill();
            
            // Source border
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Source label
            this.ctx.fillStyle = '#134252';
            this.ctx.font = '12px var(--font-family-base)';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`S${index + 1}`, source.x, source.y - 12);
            
            // Wave animation for active sources
            if (source.active && this.isRunning) {
                const waveRadius = (this.timeStep * 2) % 100;
                this.ctx.strokeStyle = `rgba(31, 184, 205, ${1 - waveRadius / 100})`;
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.arc(source.x, source.y, waveRadius, 0, 2 * Math.PI);
                this.ctx.stroke();
            }
        });
    }
    
    drawDiffractionRays() {
        this.sources.forEach(source => {
            if (!source.active) return;
            
            this.walls.forEach(wall => {
                // Draw diffraction rays from wall edges
                const edgePoints = [
                    { x: wall.x1, y: wall.y1 },
                    { x: wall.x2, y: wall.y2 }
                ];
                
                edgePoints.forEach(edge => {
                    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                    this.ctx.lineWidth = 1;
                    this.ctx.setLineDash([2, 4]);
                    
                    // Draw ray from source to edge
                    this.ctx.beginPath();
                    this.ctx.moveTo(source.x, source.y);
                    this.ctx.lineTo(edge.x, edge.y);
                    this.ctx.stroke();
                    
                    // Draw diffracted rays
                    for (let angle = 0; angle < 360; angle += 45) {
                        const radians = angle * Math.PI / 180;
                        const endX = edge.x + Math.cos(radians) * 50;
                        const endY = edge.y + Math.sin(radians) * 50;
                        
                        if (endX >= 0 && endX <= this.width && endY >= 0 && endY <= this.height) {
                            this.ctx.beginPath();
                            this.ctx.moveTo(edge.x, edge.y);
                            this.ctx.lineTo(endX, endY);
                            this.ctx.stroke();
                        }
                    }
                });
            });
        });
        
        this.ctx.setLineDash([]);
    }
    
    drawPhaseRelationships() {
        for (let i = 0; i < this.sources.length; i++) {
            for (let j = i + 1; j < this.sources.length; j++) {
                const source1 = this.sources[i];
                const source2 = this.sources[j];
                
                if (!source1.active || !source2.active) continue;
                
                const phaseDiff = Math.abs(source1.phase - source2.phase);
                const isConstructive = phaseDiff % 360 < 30 || phaseDiff % 360 > 330;
                
                this.ctx.strokeStyle = isConstructive ? 'rgba(255, 255, 0, 0.6)' : 'rgba(255, 0, 0, 0.6)';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([5, 5]);
                
                this.ctx.beginPath();
                this.ctx.moveTo(source1.x, source1.y);
                this.ctx.lineTo(source2.x, source2.y);
                this.ctx.stroke();
                
                // Phase difference label
                const midX = (source1.x + source2.x) / 2;
                const midY = (source1.y + source2.y) / 2;
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fillRect(midX - 20, midY - 8, 40, 16);
                this.ctx.fillStyle = '#000000';
                this.ctx.font = '10px var(--font-family-base)';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(`${phaseDiff.toFixed(0)}°`, midX, midY + 3);
            }
        }
        
        this.ctx.setLineDash([]);
    }
    
    drawTemporaryWall(x1, y1, x2, y2) {
        const material = this.materialProperties[this.selectedMaterial];
        this.ctx.strokeStyle = material.color;
        this.ctx.lineWidth = Math.max(2, this.wallThickness / 50);
        this.ctx.lineCap = 'round';
        this.ctx.globalAlpha = 0.5;
        
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
        
        this.ctx.globalAlpha = 1.0;
    }
    
    updateCursorInfo(x, y) {
        const cursorInfo = document.getElementById('cursor-info');
        
        if (this.sources.length > 0) {
            const gx = Math.floor(x / this.gridSize);
            const gy = Math.floor(y / this.gridSize);
            const gridWidth = Math.ceil(this.width / this.gridSize);
            const gridHeight = Math.ceil(this.height / this.gridSize);
            
            if (gx < gridWidth && gy < gridHeight) {
                const fieldStrength = this.electricField[gy][gx];
                const signalDbm = 20 * Math.log10(fieldStrength + 0.001) - 30;
                cursorInfo.textContent = `Signal: ${signalDbm.toFixed(1)} dBm`;
                cursorInfo.classList.add('visible');
                
                // Update detailed analysis
                document.getElementById('cursor-pos').textContent = `${(x/100).toFixed(1)}m, ${(y/100).toFixed(1)}m`;
                document.getElementById('cursor-signal').textContent = `${signalDbm.toFixed(1)} dBm`;
                
                if (this.sources.length > 1) {
                    const interferenceCoeff = this.interferencePattern[gy][gx];
                    document.getElementById('cursor-interference').textContent = interferenceCoeff > 1.1 ? 'Konstruktiv' : 
                        interferenceCoeff < 0.9 ? 'Destruktiv' : 'Neutral';
                }
            }
        } else {
            cursorInfo.classList.remove('visible');
        }
    }
    
    analyzePoint(x, y) {
        console.log(`Analysiere Punkt bei (${x}, ${y})`);
        // Detailed analysis would go here
    }
    
    updateCanvasCursor() {
        this.canvas.className = '';
        this.canvas.classList.add(this.currentMode.replace('-', '-'));
    }
    
    updateStatusDisplay(status = 'ready') {
        const statusElement = document.getElementById('simulation-status');
        statusElement.className = 'status';
        
        switch (status) {
            case 'running':
                statusElement.classList.add('status--running');
                statusElement.textContent = 'Läuft';
                break;
            case 'stopped':
                statusElement.classList.add('status--stopped');
                statusElement.textContent = 'Gestoppt';
                break;
            default:
                statusElement.classList.add('status--ready');
                statusElement.textContent = 'Bereit';
        }
    }
    
    updatePerformanceMetrics() {
        if (this.sources.length === 0) return;
        
        const gridWidth = Math.ceil(this.width / this.gridSize);
        const gridHeight = Math.ceil(this.height / this.gridSize);
        let strongSignalCount = 0;
        let deadZoneCount = 0;
        let totalSignal = 0;
        let totalPoints = 0;
        
        for (let gy = 0; gy < gridHeight; gy++) {
            for (let gx = 0; gx < gridWidth; gx++) {
                const fieldStrength = this.electricField[gy][gx];
                const signalDbm = 20 * Math.log10(fieldStrength + 0.001) - 30;
                
                totalSignal += signalDbm;
                totalPoints++;
                
                if (signalDbm > -60) strongSignalCount++;
                if (signalDbm < -85) deadZoneCount++;
            }
        }
        
        const coveragePercentage = ((strongSignalCount / totalPoints) * 100).toFixed(1);
        const deadZonePercentage = ((deadZoneCount / totalPoints) * 100).toFixed(1);
        const avgQuality = (totalSignal / totalPoints).toFixed(1);
        
        document.getElementById('coverage-area').textContent = `${coveragePercentage}%`;
        document.getElementById('dead-zones').textContent = `${deadZonePercentage}%`;
        document.getElementById('avg-quality').textContent = `${avgQuality} dBm`;
        
        if (this.sources.length > 1) {
            let totalInterference = 0;
            let interferencePoints = 0;
            
            for (let gy = 0; gy < gridHeight; gy++) {
                for (let gx = 0; gx < gridWidth; gx++) {
                    totalInterference += this.interferencePattern[gy][gx];
                    interferencePoints++;
                }
            }
            
            const avgInterference = (totalInterference / interferencePoints).toFixed(2);
            document.getElementById('interference-coeff').textContent = avgInterference;
        }
    }
    
    updateUI() {
        // Initialize UI with default values
        document.getElementById('thickness-value').textContent = this.wallThickness;
        document.getElementById('power-value').textContent = this.sourceConfig.power;
        document.getElementById('phase-value').textContent = this.sourceConfig.phase;
        
        this.updateCanvasCursor();
        this.updateStatusDisplay();
        this.render();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.simulator = new WiFiSimulator();
    console.log('WiFi Signal Propagation Simulator initialisiert');
});