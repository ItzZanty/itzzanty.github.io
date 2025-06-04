// Global variables and state
let cy, flowCy; // Cytoscape instances
let edgeMode = false; // Edge creation mode flag
let sourceNode = null; // Source node for edge creation
let currentTab = 'graph-editor'; // Current active tab
let maxFlow = 0; // Maximum flow value
let currentSource = null; // Source node for flow network
let currentSink = null; // Sink node for flow network
let currentGroupType = null; // Current group type
let currentGroupOrder = null; // Current group order
let currentGroupElements = []; // Current group elements
let isCreatingEdge = false; // Flag to track edge creation state

// Initialize the application when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    initTabs();
    initThemeToggle();
    initGraphEditor();
    initFlowNetworks();
    initCombinatorics();
    initNumberTheory();
    initGroupTheory();
});

// ================ THEME HANDLING ================
function initThemeToggle() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    
    // Check for saved theme preference or use system preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-color-scheme', savedTheme);
    }
    
    themeToggleBtn.addEventListener('click', function() {
        const currentTheme = document.documentElement.getAttribute('data-color-scheme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-color-scheme', newTheme);
        try {
            localStorage.setItem('theme', newTheme);
        } catch (e) {
            console.warn('Unable to save theme preference to localStorage:', e);
        }
    });
}

// ================ TAB NAVIGATION ================
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            // Update active tab
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            button.classList.add('active');
            document.getElementById(tabId).classList.add('active');
            
            currentTab = tabId;
            
            // Special handling for tabs with Cytoscape
            if (tabId === 'flow-networks' && cy && cy.elements().length > 0) {
                initFlowGraphFromEditor();
            }
            
            // Resize any visualizations in the newly active tab
            setTimeout(() => {
                if (cy && tabId === 'graph-editor') cy.resize();
                if (flowCy && tabId === 'flow-networks') flowCy.resize();
            }, 100);
        });
    });
}

// ================ GRAPH EDITOR ================
function initGraphEditor() {
    // Initialize Cytoscape
    cy = cytoscape({
        container: document.getElementById('cy'),
        style: [
            {
                selector: 'node',
                style: {
                    'background-color': '#1FB8CD',
                    'label': 'data(id)',
                    'color': '#fff',
                    'text-outline-width': 2,
                    'text-outline-color': '#1FB8CD',
                    'font-weight': 'bold',
                    'width': 30,
                    'height': 30
                }
            },
            {
                selector: 'node:selected',
                style: {
                    'border-width': 3,
                    'border-color': '#13343B'
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 3,
                    'line-color': '#B4413C',
                    'curve-style': 'bezier',
                    'target-arrow-shape': 'triangle',
                    'target-arrow-color': '#B4413C'
                }
            },
            {
                selector: '.bridge',
                style: {
                    'line-color': '#D2BA4C',
                    'width': 5,
                    'target-arrow-color': '#D2BA4C'
                }
            },
            {
                selector: '.component-0',
                style: { 'background-color': '#1FB8CD' }
            },
            {
                selector: '.component-1',
                style: { 'background-color': '#FFC185' }
            },
            {
                selector: '.component-2',
                style: { 'background-color': '#B4413C' }
            },
            {
                selector: '.component-3',
                style: { 'background-color': '#5D878F' }
            },
            {
                selector: '.component-4',
                style: { 'background-color': '#DB4545' }
            },
            {
                selector: '.source',
                style: { 
                    'background-color': '#1FB8CD',
                    'border-width': 4,
                    'border-color': '#13343B'
                }
            },
            {
                selector: '.sink',
                style: { 
                    'background-color': '#B4413C',
                    'border-width': 4,
                    'border-color': '#13343B'
                }
            },
            {
                selector: '.edge-creating',
                style: {
                    'background-color': '#FFC185',
                    'border-width': 3,
                    'border-color': '#D2BA4C'
                }
            }
        ],
        layout: {
            name: 'grid',
            rows: 1
        },
        minZoom: 0.5,
        maxZoom: 2,
        wheelSensitivity: 0.2,
        userPanningEnabled: true,
        userZoomingEnabled: true,
        boxSelectionEnabled: false
    });

    // Setup event handlers
    setupGraphEvents();
    setupGraphButtons();
    
    // Update graph information display
    updateGraphInfo();
    
    // Add some initial nodes for demo
    setTimeout(() => {
        addInitialNodes();
    }, 500);
}

function addInitialNodes() {
    // Add a few nodes to demonstrate the functionality
    cy.add([
        { group: 'nodes', data: { id: 'A' }, position: { x: 100, y: 100 } },
        { group: 'nodes', data: { id: 'B' }, position: { x: 200, y: 100 } },
        { group: 'nodes', data: { id: 'C' }, position: { x: 150, y: 200 } }
    ]);
    
    // Add an edge
    cy.add({
        group: 'edges',
        data: { 
            id: 'AB',
            source: 'A',
            target: 'B',
            capacity: 10
        }
    });
    
    updateGraphInfo();
}

function setupGraphEvents() {
    // Click on background to add a node
    cy.on('tap', function(event) {
        if (event.target === cy && !edgeMode && !isCreatingEdge) {
            const position = event.position;
            const id = String.fromCharCode(65 + cy.nodes().length); // A, B, C, etc.
            cy.add({
                group: 'nodes',
                data: { id: id },
                position: position
            });
            updateGraphInfo();
        }
    });
    
    // Improved edge creation with visual feedback
    cy.on('tap', 'node', function(event) {
        if (edgeMode || event.originalEvent.shiftKey) {
            event.stopPropagation();
            
            if (!isCreatingEdge) {
                // Start edge creation
                sourceNode = event.target;
                isCreatingEdge = true;
                sourceNode.addClass('edge-creating');
                
                // Show visual feedback
                document.body.style.cursor = 'crosshair';
                
                // Add temporary message
                showMessage('Klicken Sie auf einen anderen Knoten, um eine Kante zu erstellen');
            } else {
                // Complete edge creation
                const targetNode = event.target;
                
                if (sourceNode && sourceNode.id() !== targetNode.id()) {
                    // Check if edge already exists
                    const existingEdge = cy.edges().filter(edge => 
                        (edge.source().id() === sourceNode.id() && edge.target().id() === targetNode.id()) ||
                        (edge.source().id() === targetNode.id() && edge.target().id() === sourceNode.id())
                    );
                    
                    if (existingEdge.length === 0) {
                        const edgeId = sourceNode.id() + targetNode.id();
                        cy.add({
                            group: 'edges',
                            data: { 
                                id: edgeId,
                                source: sourceNode.id(),
                                target: targetNode.id(),
                                capacity: 10 // Default capacity for flow networks
                            }
                        });
                        showMessage('Kante erstellt!');
                    } else {
                        showMessage('Kante existiert bereits!');
                    }
                    
                    updateGraphInfo();
                } else {
                    showMessage('Wählen Sie einen anderen Knoten!');
                }
                
                // Reset edge creation state
                if (sourceNode) {
                    sourceNode.removeClass('edge-creating');
                }
                sourceNode = null;
                isCreatingEdge = false;
                document.body.style.cursor = 'default';
            }
        }
    });
    
    // Cancel edge creation on background click
    cy.on('tap', function(event) {
        if (event.target === cy && isCreatingEdge) {
            if (sourceNode) {
                sourceNode.removeClass('edge-creating');
            }
            sourceNode = null;
            isCreatingEdge = false;
            document.body.style.cursor = 'default';
            showMessage('Kanten-Erstellung abgebrochen');
        }
    });
    
    // Double click to remove elements
    cy.on('dblclick', 'node, edge', function(event) {
        event.stopPropagation();
        cy.remove(event.target);
        updateGraphInfo();
        showMessage('Element gelöscht');
    });
    
    // Show node info on hover
    cy.on('mouseover', 'node', function(event) {
        const node = event.target;
        node.qtip({
            content: `Knoten: ${node.id()}\nDoppelklick zum Löschen`,
            position: {
                my: 'bottom center',
                at: 'top center'
            },
            style: {
                classes: 'qtip-bootstrap'
            },
            show: {
                event: false,
                ready: true
            },
            hide: {
                event: 'mouseleave'
            }
        });
    });
    
    // Show edge info on hover
    cy.on('mouseover', 'edge', function(event) {
        const edge = event.target;
        edge.qtip({
            content: `Kante: ${edge.source().id()} → ${edge.target().id()}\nKapazität: ${edge.data('capacity') || 10}\nDoppelklick zum Löschen`,
            position: {
                my: 'bottom center',
                at: 'top center'
            },
            style: {
                classes: 'qtip-bootstrap'
            },
            show: {
                event: false,
                ready: true
            },
            hide: {
                event: 'mouseleave'
            }
        });
    });
}

function showMessage(text) {
    // Create or update message display
    let messageDiv = document.getElementById('message-display');
    if (!messageDiv) {
        messageDiv = document.createElement('div');
        messageDiv.id = 'message-display';
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--color-primary);
            color: var(--color-btn-primary-text);
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: var(--shadow-md);
            z-index: 1000;
            font-size: 14px;
            max-width: 300px;
        `;
        document.body.appendChild(messageDiv);
    }
    
    messageDiv.textContent = text;
    messageDiv.style.display = 'block';
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        if (messageDiv) {
            messageDiv.style.display = 'none';
        }
    }, 3000);
}

function setupGraphButtons() {
    // Add node button
    document.getElementById('add-node').addEventListener('click', function() {
        const id = String.fromCharCode(65 + cy.nodes().length); // A, B, C, etc.
        cy.add({
            group: 'nodes',
            data: { id: id },
            position: { x: cy.width() / 2 + Math.random() * 100 - 50, y: cy.height() / 2 + Math.random() * 100 - 50 }
        });
        updateGraphInfo();
        showMessage(`Knoten ${id} hinzugefügt`);
    });
    
    // Toggle edge mode button
    document.getElementById('toggle-edge-mode').addEventListener('click', function() {
        edgeMode = !edgeMode;
        
        // Reset edge creation state when toggling mode
        if (sourceNode) {
            sourceNode.removeClass('edge-creating');
        }
        sourceNode = null;
        isCreatingEdge = false;
        document.body.style.cursor = 'default';
        
        this.classList.toggle('btn--primary');
        this.classList.toggle('btn--secondary');
        this.textContent = edgeMode ? 'Kanten-Modus: AN' : 'Kanten-Modus';
        
        if (edgeMode) {
            showMessage('Kanten-Modus aktiviert. Klicken Sie auf Knoten, um Kanten zu erstellen.');
        } else {
            showMessage('Kanten-Modus deaktiviert.');
        }
    });
    
    // Clear graph button
    document.getElementById('clear-graph').addEventListener('click', function() {
        if (confirm('Möchten Sie wirklich den gesamten Graphen löschen?')) {
            cy.elements().remove();
            updateGraphInfo();
            showMessage('Graph gelöscht');
        }
    });
    
    // Find bridges button
    document.getElementById('find-bridges').addEventListener('click', findBridges);
    
    // Find components button
    document.getElementById('find-components').addEventListener('click', findComponents);
    
    // Save graph button
    document.getElementById('save-graph').addEventListener('click', saveGraph);
    
    // Load graph button
    document.getElementById('load-graph').addEventListener('click', loadGraph);
}

function updateGraphInfo() {
    const nodeCount = cy.nodes().length;
    const edgeCount = cy.edges().length;
    const componentCount = findConnectedComponents().length;
    
    document.getElementById('node-count').textContent = nodeCount;
    document.getElementById('edge-count').textContent = edgeCount;
    document.getElementById('component-count').textContent = componentCount;
}

function findBridges() {
    // Reset previous bridges
    cy.edges().removeClass('bridge');
    
    // For each edge, check if removing it increases the number of connected components
    const initialComponents = findConnectedComponents().length;
    let bridgeCount = 0;
    
    cy.edges().forEach(edge => {
        edge.style('visibility', 'hidden'); // Temporarily hide edge
        
        const newComponents = findConnectedComponents().length;
        if (newComponents > initialComponents) {
            edge.addClass('bridge');
            bridgeCount++;
        }
        
        edge.style('visibility', 'visible'); // Restore edge
    });
    
    showMessage(`${bridgeCount} Brücke(n) gefunden und markiert`);
}

function findComponents() {
    // Reset previous component styling
    cy.nodes().removeClass('component-0 component-1 component-2 component-3 component-4');
    
    const components = findConnectedComponents();
    
    // Assign colors to each component (up to 5 different colors)
    components.forEach((component, index) => {
        const colorClass = `component-${index % 5}`;
        component.forEach(nodeId => {
            cy.$id(nodeId).addClass(colorClass);
        });
    });
    
    showMessage(`${components.length} zusammenhängende Komponente(n) gefunden`);
}

function findConnectedComponents() {
    const visited = {};
    const components = [];
    
    // DFS function to explore a component
    function dfs(nodeId, component) {
        if (visited[nodeId]) return;
        
        visited[nodeId] = true;
        component.push(nodeId);
        
        // Visit all neighbors
        const neighbors = cy.$id(nodeId).neighborhood('node');
        neighbors.forEach(neighbor => {
            dfs(neighbor.id(), component);
        });
    }
    
    // Find all components
    cy.nodes().forEach(node => {
        if (!visited[node.id()]) {
            const component = [];
            dfs(node.id(), component);
            components.push(component);
        }
    });
    
    return components;
}

function saveGraph() {
    try {
        const graphData = cy.json();
        const jsonString = JSON.stringify(graphData);
        localStorage.setItem('savedGraph', jsonString);
        showMessage('Graph erfolgreich gespeichert!');
    } catch (e) {
        console.error('Fehler beim Speichern des Graphen:', e);
        showMessage('Fehler beim Speichern des Graphen');
    }
}

function loadGraph() {
    try {
        const savedGraph = localStorage.getItem('savedGraph');
        if (savedGraph) {
            const graphData = JSON.parse(savedGraph);
            cy.json(graphData);
            updateGraphInfo();
            showMessage('Graph erfolgreich geladen!');
        } else {
            showMessage('Kein gespeicherter Graph gefunden');
        }
    } catch (e) {
        console.error('Fehler beim Laden des Graphen:', e);
        showMessage('Fehler beim Laden des Graphen');
    }
}

// ================ FLOW NETWORKS ================
function initFlowNetworks() {
    // Initialize Cytoscape for flow networks
    flowCy = cytoscape({
        container: document.getElementById('flow-cy'),
        style: [
            {
                selector: 'node',
                style: {
                    'background-color': '#1FB8CD',
                    'label': 'data(id)',
                    'color': '#fff',
                    'text-outline-width': 2,
                    'text-outline-color': '#1FB8CD',
                    'font-weight': 'bold',
                    'width': 30,
                    'height': 30
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 3,
                    'line-color': '#B4413C',
                    'curve-style': 'bezier',
                    'label': 'data(displayLabel)',
                    'text-background-color': '#fff',
                    'text-background-opacity': 0.8,
                    'text-background-padding': '2px',
                    'text-background-shape': 'rectangle',
                    'color': '#13343B',
                    'target-arrow-shape': 'triangle',
                    'target-arrow-color': '#B4413C',
                    'font-size': '10px'
                }
            },
            {
                selector: '.source',
                style: { 
                    'background-color': '#1FB8CD',
                    'border-width': 4,
                    'border-color': '#13343B'
                }
            },
            {
                selector: '.sink',
                style: { 
                    'background-color': '#B4413C',
                    'border-width': 4,
                    'border-color': '#13343B'
                }
            },
            {
                selector: '.augmenting-path',
                style: {
                    'line-color': '#D2BA4C',
                    'width': 5,
                    'target-arrow-color': '#D2BA4C'
                }
            },
            {
                selector: '.min-cut',
                style: {
                    'line-color': '#DB4545',
                    'width': 5,
                    'line-style': 'dashed',
                    'target-arrow-color': '#DB4545'
                }
            }
        ],
        layout: {
            name: 'grid',
            rows: 1
        },
        minZoom: 0.5,
        maxZoom: 2,
        wheelSensitivity: 0.2
    });
    
    // Setup flow network buttons
    setupFlowNetworkButtons();
    
    // Initialize with sample network if no graph exists
    setTimeout(() => {
        if (flowCy.elements().length === 0) {
            initSampleFlowNetwork();
        }
    }, 500);
}

function initSampleFlowNetwork() {
    // Add sample flow network
    const sampleNodes = [
        { id: 'S', position: { x: 100, y: 150 } },
        { id: 'A', position: { x: 200, y: 100 } },
        { id: 'B', position: { x: 200, y: 200 } },
        { id: 'C', position: { x: 300, y: 150 } },
        { id: 'T', position: { x: 400, y: 150 } }
    ];
    
    const sampleEdges = [
        { id: 'SA', source: 'S', target: 'A', capacity: 10 },
        { id: 'SB', source: 'S', target: 'B', capacity: 10 },
        { id: 'AC', source: 'A', target: 'C', capacity: 25 },
        { id: 'BC', source: 'B', target: 'C', capacity: 6 },
        { id: 'AT', source: 'A', target: 'T', capacity: 10 },
        { id: 'CT', source: 'C', target: 'T', capacity: 10 }
    ];
    
    // Add nodes
    sampleNodes.forEach(node => {
        flowCy.add({
            group: 'nodes',
            data: { id: node.id },
            position: node.position
        });
    });
    
    // Add edges
    sampleEdges.forEach(edge => {
        flowCy.add({
            group: 'edges',
            data: { 
                id: edge.id,
                source: edge.source,
                target: edge.target,
                capacity: edge.capacity,
                flow: 0,
                displayLabel: `0/${edge.capacity}`
            }
        });
    });
    
    // Set default source and sink
    currentSource = 'S';
    currentSink = 'T';
    flowCy.$id('S').addClass('source');
    flowCy.$id('T').addClass('sink');
    
    resetFlowInfo();
}

function setupFlowNetworkButtons() {
    // Set source button
    document.getElementById('set-source').addEventListener('click', function() {
        showMessage('Klicken Sie auf einen Knoten, um ihn als Quelle zu setzen');
        flowCy.nodes().once('tap', function(event) {
            const node = event.target;
            
            // Remove existing source
            flowCy.nodes().removeClass('source');
            
            // Set new source
            node.addClass('source');
            currentSource = node.id();
            document.getElementById('current-source').textContent = currentSource;
            showMessage(`Quelle auf ${currentSource} gesetzt`);
        });
    });
    
    // Set sink button
    document.getElementById('set-sink').addEventListener('click', function() {
        showMessage('Klicken Sie auf einen Knoten, um ihn als Senke zu setzen');
        flowCy.nodes().once('tap', function(event) {
            const node = event.target;
            
            // Remove existing sink
            flowCy.nodes().removeClass('sink');
            
            // Set new sink
            node.addClass('sink');
            currentSink = node.id();
            document.getElementById('current-sink').textContent = currentSink;
            showMessage(`Senke auf ${currentSink} gesetzt`);
        });
    });
    
    // Set capacity button
    document.getElementById('set-capacity').addEventListener('click', function() {
        showMessage('Klicken Sie auf eine Kante, um ihre Kapazität zu setzen');
        flowCy.edges().once('tap', function(event) {
            const edge = event.target;
            const capacity = prompt('Kapazität eingeben:', edge.data('capacity') || 10);
            
            if (capacity !== null && !isNaN(capacity) && parseInt(capacity) > 0) {
                edge.data('capacity', parseInt(capacity));
                // Initialize flow to 0 if not already set
                if (edge.data('flow') === undefined) {
                    edge.data('flow', 0);
                }
                edge.data('displayLabel', `${edge.data('flow')}/${edge.data('capacity')}`);
                showMessage(`Kapazität auf ${capacity} gesetzt`);
            }
        });
    });
    
    // Run Ford-Fulkerson button
    document.getElementById('run-ford-fulkerson').addEventListener('click', runFordFulkerson);
    
    // Step algorithm button
    document.getElementById('step-algorithm').addEventListener('click', stepFordFulkerson);
    
    // Reset flow button
    document.getElementById('reset-flow').addEventListener('click', resetFlow);
}

function initFlowGraphFromEditor() {
    if (!cy || cy.elements().length === 0) return;
    
    // Clear existing flow graph
    flowCy.elements().remove();
    
    // Copy nodes
    cy.nodes().forEach(node => {
        flowCy.add({
            group: 'nodes',
            data: { id: node.id() },
            position: node.position()
        });
    });
    
    // Copy edges with capacity
    cy.edges().forEach(edge => {
        const capacity = edge.data('capacity') || 10;
        flowCy.add({
            group: 'edges',
            data: { 
                id: edge.id(), 
                source: edge.source().id(), 
                target: edge.target().id(),
                capacity: capacity,
                flow: 0,
                displayLabel: `0/${capacity}`
            }
        });
    });
    
    // Apply layout
    flowCy.layout({ name: 'preset' }).run();
    
    // Reset flow information
    resetFlowInfo();
    showMessage('Graph aus Editor importiert');
}

function resetFlowInfo() {
    maxFlow = 0;
    document.getElementById('max-flow').textContent = '0';
    document.getElementById('current-source').textContent = currentSource || 'Nicht gesetzt';
    document.getElementById('current-sink').textContent = currentSink || 'Nicht gesetzt';
    document.getElementById('algorithm-log').innerHTML = '';
}

function resetFlow() {
    // Reset flow values on all edges
    flowCy.edges().forEach(edge => {
        edge.data('flow', 0);
        edge.data('displayLabel', `0/${edge.data('capacity')}`);
    });
    
    // Reset flow displays
    maxFlow = 0;
    document.getElementById('max-flow').textContent = '0';
    document.getElementById('algorithm-log').innerHTML = '';
    
    // Remove any augmenting path or min-cut highlighting
    flowCy.elements().removeClass('augmenting-path min-cut');
    showMessage('Fluss zurückgesetzt');
}

function runFordFulkerson() {
    // Check if source and sink are set
    if (!currentSource || !currentSink) {
        showMessage('Bitte setzen Sie zunächst Quelle und Senke');
        return;
    }
    
    // Reset flow
    resetFlow();
    
    // Add algorithm steps to log
    const algorithmLog = document.getElementById('algorithm-log');
    algorithmLog.innerHTML = '';
    
    const steps = [
        "1. Initialisiere Fluss zu 0 auf allen Kanten",
        "2. Solange ein erweiternder Pfad von Quelle zur Senke existiert:",
        "3.   Finde die minimale Kapazität entlang des Pfades", 
        "4.   Aktualisiere den Fluss entlang des Pfades",
        "5.   Aktualisiere den Residualgraphen",
        "6. Gib den maximalen Fluss zurück"
    ];
    
    steps.forEach(step => {
        const stepElement = document.createElement('div');
        stepElement.className = 'step';
        stepElement.textContent = step;
        algorithmLog.appendChild(stepElement);
    });
    
    // Step 1: Initialize flow to 0 (already done in resetFlow)
    addLogEntry('Initialisiere Fluss zu 0 auf allen Kanten');
    
    // Run Ford-Fulkerson algorithm
    const maxFlowValue = fordFulkerson();
    
    // Update max flow display
    maxFlow = maxFlowValue;
    document.getElementById('max-flow').textContent = maxFlowValue;
    
    // Find and highlight min-cut
    findMinCut();
    
    showMessage(`Ford-Fulkerson abgeschlossen. Maximaler Fluss: ${maxFlowValue}`);
}

function addLogEntry(text) {
    const algorithmLog = document.getElementById('algorithm-log');
    const entry = document.createElement('div');
    entry.className = 'step';
    entry.textContent = text;
    algorithmLog.appendChild(entry);
    algorithmLog.scrollTop = algorithmLog.scrollHeight;
}

// Global variables for step-by-step execution
let stepExecutionState = {
    inProgress: false,
    path: null,
    step: 0
};

function stepFordFulkerson() {
    // Check if source and sink are set
    if (!currentSource || !currentSink) {
        showMessage('Bitte setzen Sie zunächst Quelle und Senke');
        return;
    }
    
    // If not already in progress, initialize
    if (!stepExecutionState.inProgress) {
        resetFlow();
        document.getElementById('algorithm-log').innerHTML = '';
        addLogEntry('Initialisiere Fluss zu 0 auf allen Kanten');
        stepExecutionState = {
            inProgress: true,
            path: null,
            step: 0
        };
        showMessage('Schritt-für-Schritt-Modus gestartet');
    }
    
    // Execute next step
    if (stepExecutionState.path === null) {
        // Find a new augmenting path
        const path = findAugmentingPath();
        if (path.length > 0) {
            stepExecutionState.path = path;
            flowCy.elements().removeClass('augmenting-path');
            
            // Highlight the path
            path.forEach(edge => {
                flowCy.$id(edge.id).addClass('augmenting-path');
            });
            
            addLogEntry('Erweiternder Pfad gefunden');
            
            // Find the bottleneck capacity
            const bottleneck = findBottleneckCapacity(path);
            addLogEntry(`Minimale Kapazität entlang des Pfades: ${bottleneck}`);
            
            // Move to the next step
            stepExecutionState.step = 1;
            showMessage('Erweiternder Pfad markiert. Klicken Sie erneut für den nächsten Schritt.');
        } else {
            // No more augmenting paths, algorithm complete
            addLogEntry('Kein weiterer erweiternder Pfad gefunden. Ford-Fulkerson-Algorithmus abgeschlossen.');
            addLogEntry(`Maximaler Fluss: ${maxFlow}`);
            stepExecutionState.inProgress = false;
            
            // Find and highlight min-cut
            findMinCut();
            showMessage(`Algorithmus abgeschlossen. Maximaler Fluss: ${maxFlow}`);
        }
    } else if (stepExecutionState.step === 1) {
        // Augment flow along the path
        const path = stepExecutionState.path;
        const bottleneck = findBottleneckCapacity(path);
        
        augmentFlow(path, bottleneck);
        addLogEntry(`Fluss entlang des Pfades um ${bottleneck} erhöht`);
        
        // Update max flow
        maxFlow += bottleneck;
        document.getElementById('max-flow').textContent = maxFlow;
        
        // Reset for next path
        stepExecutionState.path = null;
        stepExecutionState.step = 0;
        
        // Remove path highlighting
        flowCy.elements().removeClass('augmenting-path');
        
        showMessage(`Fluss um ${bottleneck} erhöht. Gesamtfluss: ${maxFlow}`);
    }
}

function fordFulkerson() {
    let totalFlow = 0;
    
    // While there is an augmenting path
    let path = findAugmentingPath();
    while (path.length > 0) {
        // Find bottleneck capacity
        const bottleneck = findBottleneckCapacity(path);
        
        // Add log entry
        addLogEntry(`Erweiternder Pfad gefunden, minimale Kapazität: ${bottleneck}`);
        
        // Augment flow
        augmentFlow(path, bottleneck);
        
        // Update total flow
        totalFlow += bottleneck;
        
        // Add log entry
        addLogEntry(`Fluss entlang des Pfades erhöht. Aktueller Gesamtfluss: ${totalFlow}`);
        
        // Find next path
        path = findAugmentingPath();
    }
    
    addLogEntry(`Kein weiterer erweiternder Pfad gefunden. Maximaler Fluss: ${totalFlow}`);
    
    return totalFlow;
}

function findAugmentingPath() {
    // BFS to find augmenting path
    const visited = {};
    const parent = {};
    const queue = [currentSource];
    visited[currentSource] = true;
    
    // BFS
    while (queue.length > 0) {
        const nodeId = queue.shift();
        
        // Check all outgoing edges
        flowCy.$id(nodeId).outgoers('edge').forEach(edge => {
            const targetId = edge.target().id();
            const capacity = edge.data('capacity');
            const flow = edge.data('flow') || 0;
            
            // Check if there is residual capacity
            if (!visited[targetId] && capacity > flow) {
                visited[targetId] = true;
                parent[targetId] = { id: edge.id(), forward: true };
                queue.push(targetId);
            }
        });
        
        // Check all incoming edges (for reverse flow)
        flowCy.$id(nodeId).incomers('edge').forEach(edge => {
            const sourceId = edge.source().id();
            const flow = edge.data('flow') || 0;
            
            // Check if there is flow to reduce
            if (!visited[sourceId] && flow > 0) {
                visited[sourceId] = true;
                parent[sourceId] = { id: edge.id(), forward: false };
                queue.push(sourceId);
            }
        });
    }
    
    // If sink was not reached, no augmenting path exists
    if (!visited[currentSink]) {
        return [];
    }
    
    // Reconstruct the path
    const path = [];
    let current = currentSink;
    
    while (current !== currentSource) {
        const edgeInfo = parent[current];
        path.unshift({
            id: edgeInfo.id,
            forward: edgeInfo.forward
        });
        
        const edge = flowCy.$id(edgeInfo.id);
        current = edgeInfo.forward ? edge.source().id() : edge.target().id();
    }
    
    return path;
}

function findBottleneckCapacity(path) {
    let bottleneck = Infinity;
    
    path.forEach(edgeInfo => {
        const edge = flowCy.$id(edgeInfo.id);
        if (edgeInfo.forward) {
            // Forward edge - residual capacity is capacity - flow
            const residualCapacity = edge.data('capacity') - (edge.data('flow') || 0);
            bottleneck = Math.min(bottleneck, residualCapacity);
        } else {
            // Backward edge - residual capacity is flow
            bottleneck = Math.min(bottleneck, edge.data('flow') || 0);
        }
    });
    
    return bottleneck;
}

function augmentFlow(path, bottleneck) {
    path.forEach(edgeInfo => {
        const edge = flowCy.$id(edgeInfo.id);
        
        if (edgeInfo.forward) {
            // Forward edge - increase flow
            const newFlow = (edge.data('flow') || 0) + bottleneck;
            edge.data('flow', newFlow);
            edge.data('displayLabel', `${newFlow}/${edge.data('capacity')}`);
        } else {
            // Backward edge - decrease flow
            const newFlow = (edge.data('flow') || 0) - bottleneck;
            edge.data('flow', newFlow);
            edge.data('displayLabel', `${newFlow}/${edge.data('capacity')}`);
        }
    });
}

function findMinCut() {
    // After max-flow is computed, find the min-cut
    // The min-cut consists of edges from reachable to non-reachable vertices
    
    // Reset any previous min-cut highlighting
    flowCy.edges().removeClass('min-cut');
    
    // Find all nodes reachable from the source in the residual graph
    const reachable = {};
    const queue = [currentSource];
    reachable[currentSource] = true;
    
    while (queue.length > 0) {
        const nodeId = queue.shift();
        
        // Check all outgoing edges
        flowCy.$id(nodeId).outgoers('edge').forEach(edge => {
            const targetId = edge.target().id();
            const capacity = edge.data('capacity');
            const flow = edge.data('flow') || 0;
            
            // Check if there is residual capacity
            if (!reachable[targetId] && capacity > flow) {
                reachable[targetId] = true;
                queue.push(targetId);
            }
        });
        
        // Check all incoming edges (for reverse flow)
        flowCy.$id(nodeId).incomers('edge').forEach(edge => {
            const sourceId = edge.source().id();
            const flow = edge.data('flow') || 0;
            
            // Check if there is flow to reduce
            if (!reachable[sourceId] && flow > 0) {
                reachable[sourceId] = true;
                queue.push(sourceId);
            }
        });
    }
    
    // Find all edges crossing from reachable to non-reachable
    flowCy.edges().forEach(edge => {
        const sourceId = edge.source().id();
        const targetId = edge.target().id();
        
        if (reachable[sourceId] && !reachable[targetId]) {
            edge.addClass('min-cut');
        }
    });
    
    addLogEntry('Min-Cut identifiziert und markiert.');
}

// ================ COMBINATORICS ================
function initCombinatorics() {
    // Setup event listeners for combinatorics calculators
    document.getElementById('calculate-combo').addEventListener('click', calculateCombinatorics);
    document.getElementById('demonstrate-pigeonhole').addEventListener('click', demonstratePigeonhole);
    document.getElementById('generate-pascal').addEventListener('click', generatePascalTriangle);
    
    // Initialize with example values
    setTimeout(() => {
        calculateCombinatorics();
        generatePascalTriangle();
    }, 500);
}

function calculateCombinatorics() {
    const n = parseInt(document.getElementById('combo-n').value);
    const r = parseInt(document.getElementById('combo-r').value);
    const resultsDiv = document.getElementById('combo-results');
    
    // Validate inputs
    if (isNaN(n) || isNaN(r) || n < 0 || r < 0 || r > n) {
        resultsDiv.innerHTML = '<p style="color: var(--color-error);">Ungültige Eingabe. Es muss 0 ≤ r ≤ n gelten.</p>';
        return;
    }
    
    // Calculate permutations
    const permutations = calculatePermutations(n, r);
    
    // Calculate combinations
    const combinations = calculateCombinations(n, r);
    
    // Display results
    resultsDiv.innerHTML = `
        <div style="margin-bottom: 16px;">
            <p><strong>Permutationen P(${n},${r}):</strong> ${permutations.toLocaleString()}</p>
            <p><strong>Kombinationen C(${n},${r}):</strong> ${combinations.toLocaleString()}</p>
        </div>
        <div style="background: var(--color-secondary); padding: 12px; border-radius: 8px;">
            <p><strong>Formeln:</strong></p>
            <p>P(n,r) = n! / (n-r)! = ${n}! / ${n-r}!</p>
            <p>C(n,r) = n! / (r!(n-r)!) = ${n}! / (${r}!${n-r}!)</p>
        </div>
        <div style="margin-top: 12px; color: var(--color-text-secondary);">
            <p><strong>Erklärung:</strong></p>
            <p>Permutationen: Anzahl der Möglichkeiten, ${r} Objekte aus ${n} Objekten auszuwählen und anzuordnen.</p>
            <p>Kombinationen: Anzahl der Möglichkeiten, ${r} Objekte aus ${n} Objekten auszuwählen (ohne Berücksichtigung der Reihenfolge).</p>
        </div>
    `;
}

function calculatePermutations(n, r) {
    let result = 1;
    for (let i = n; i > n - r; i--) {
        result *= i;
    }
    return result;
}

function calculateCombinations(n, r) {
    // Optimize by using the smaller of r and n-r
    r = Math.min(r, n - r);
    
    let numerator = 1;
    let denominator = 1;
    
    for (let i = 1; i <= r; i++) {
        numerator *= (n - r + i);
        denominator *= i;
    }
    
    return numerator / denominator;
}

function demonstratePigeonhole() {
    const pigeons = parseInt(document.getElementById('pigeonhole-objects').value);
    const holes = parseInt(document.getElementById('pigeonhole-holes').value);
    const visualDiv = document.getElementById('pigeonhole-visual');
    
    // Validate inputs
    if (isNaN(pigeons) || isNaN(holes) || pigeons < 1 || holes < 1) {
        visualDiv.innerHTML = '<p style="color: var(--color-error);">Bitte geben Sie positive Zahlen ein.</p>';
        return;
    }
    
    // Clear the visual
    visualDiv.innerHTML = '';
    
    // Create the holes
    for (let i = 0; i < holes; i++) {
        const holeDiv = document.createElement('div');
        holeDiv.className = 'hole';
        holeDiv.setAttribute('data-hole', i);
        visualDiv.appendChild(holeDiv);
    }
    
    // Distribute pigeons
    let minimumPigeonsPerHole = Math.floor(pigeons / holes);
    let remainingPigeons = pigeons % holes;
    
    // Add an explanation
    const explanation = document.createElement('div');
    explanation.style.cssText = `
        margin-top: 16px;
        padding: 12px;
        background: var(--color-secondary);
        border-radius: 8px;
    `;
    explanation.innerHTML = `
        <p><strong>Taubenschlagprinzip:</strong></p>
        <p>Wenn ${pigeons} Objekte auf ${holes} Fächer verteilt werden${pigeons > holes ? ', und ' + pigeons + ' > ' + holes : ''}, dann ${pigeons > holes ? 'muss mindestens ein Fach mehr als ein Objekt enthalten' : 'können alle Fächer höchstens ein Objekt enthalten'}.</p>
        <p>Mindestanzahl pro Fach: ${minimumPigeonsPerHole}</p>
        <p>Anzahl der Fächer mit zusätzlichem Objekt: ${remainingPigeons}</p>
    `;
    visualDiv.appendChild(explanation);
    
    // Add pigeons to holes
    const holeElements = visualDiv.querySelectorAll('.hole');
    for (let i = 0; i < holes; i++) {
        const pigeonsInThisHole = minimumPigeonsPerHole + (i < remainingPigeons ? 1 : 0);
        
        for (let j = 0; j < pigeonsInThisHole; j++) {
            const pigeonDiv = document.createElement('div');
            pigeonDiv.className = 'pigeon';
            holeElements[i].appendChild(pigeonDiv);
        }
    }
}

function generatePascalTriangle() {
    const rows = parseInt(document.getElementById('pascal-rows').value);
    const triangleDiv = document.getElementById('pascal-triangle');
    
    // Validate input
    if (isNaN(rows) || rows < 1 || rows > 15) {
        triangleDiv.innerHTML = '<p style="color: var(--color-error);">Bitte geben Sie eine Zahl zwischen 1 und 15 ein.</p>';
        return;
    }
    
    // Clear the triangle
    triangleDiv.innerHTML = '';
    
    // Generate Pascal's triangle
    let triangle = [];
    for (let i = 0; i < rows; i++) {
        triangle[i] = [];
        for (let j = 0; j <= i; j++) {
            if (j === 0 || j === i) {
                triangle[i][j] = 1;
            } else {
                triangle[i][j] = triangle[i-1][j-1] + triangle[i-1][j];
            }
        }
    }
    
    // Display the triangle
    for (let i = 0; i < rows; i++) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'pascal-row';
        
        for (let j = 0; j <= i; j++) {
            const cellDiv = document.createElement('div');
            cellDiv.className = 'pascal-cell';
            cellDiv.textContent = triangle[i][j];
            cellDiv.title = `C(${i},${j}) = ${triangle[i][j]}`;
            rowDiv.appendChild(cellDiv);
        }
        
        triangleDiv.appendChild(rowDiv);
    }
    
    // Add explanation
    const explanation = document.createElement('div');
    explanation.style.cssText = `
        margin-top: 16px;
        padding: 12px;
        background: var(--color-secondary);
        border-radius: 8px;
        color: var(--color-text-secondary);
    `;
    explanation.innerHTML = `
        <p><strong>Das Pascal'sche Dreieck:</strong></p>
        <p>• Jede Zahl ist die Summe der beiden Zahlen darüber</p>
        <p>• Die Einträge der n-ten Zeile sind die Binomialkoeffizienten C(n,k)</p>
        <p>• Zeile ${rows-1} zeigt alle möglichen Werte von C(${rows-1},k) für k = 0 bis ${rows-1}</p>
    `;
    triangleDiv.appendChild(explanation);
}

// ================ NUMBER THEORY ================
function initNumberTheory() {
    // Setup event listeners for number theory tools
    document.getElementById('run-euclidean').addEventListener('click', runEuclideanAlgorithm);
    document.getElementById('calculate-mod').addEventListener('click', calculateModularArithmetic);
    document.getElementById('factorize').addEventListener('click', factorizeNumber);
    
    // Initialize with example calculations
    setTimeout(() => {
        runEuclideanAlgorithm();
        calculateModularArithmetic();
        factorizeNumber();
    }, 500);
}

function runEuclideanAlgorithm() {
    const a = parseInt(document.getElementById('euclidean-a').value);
    const b = parseInt(document.getElementById('euclidean-b').value);
    const stepsDiv = document.getElementById('euclidean-steps');
    
    // Validate inputs
    if (isNaN(a) || isNaN(b) || a <= 0 || b <= 0) {
        stepsDiv.innerHTML = '<p style="color: var(--color-error);">Bitte geben Sie positive Zahlen ein.</p>';
        return;
    }
    
    // Clear previous results
    stepsDiv.innerHTML = '';
    
    // Run Euclidean algorithm
    let x = Math.max(a, b);
    let y = Math.min(a, b);
    let steps = [];
    
    steps.push(`Start mit a = ${x}, b = ${y}`);
    
    while (y !== 0) {
        const quotient = Math.floor(x / y);
        const remainder = x % y;
        steps.push(`${x} = ${y} × ${quotient} + ${remainder}`);
        x = y;
        y = remainder;
    }
    
    steps.push(`GCD(${a}, ${b}) = ${x}`);
    
    // Display steps
    steps.forEach((step, index) => {
        const stepDiv = document.createElement('div');
        stepDiv.className = 'step';
        stepDiv.style.cssText = `
            padding: 8px;
            margin: 4px 0;
            background: ${index === steps.length - 1 ? 'var(--color-success)' : 'var(--color-secondary)'};
            color: ${index === steps.length - 1 ? 'var(--color-btn-primary-text)' : 'var(--color-text)'};
            border-radius: 4px;
            font-family: var(--font-family-mono);
        `;
        stepDiv.textContent = step;
        stepsDiv.appendChild(stepDiv);
    });
}

function calculateModularArithmetic() {
    const a = parseInt(document.getElementById('mod-a').value);
    const m = parseInt(document.getElementById('mod-m').value);
    const resultsDiv = document.getElementById('mod-results');
    const visualDiv = document.getElementById('mod-visual');
    
    // Validate inputs
    if (isNaN(a) || isNaN(m) || m <= 0) {
        resultsDiv.innerHTML = '<p style="color: var(--color-error);">Bitte geben Sie gültige Zahlen ein (Modul muss positiv sein).</p>';
        return;
    }
    
    // Calculate modular result
    const result = ((a % m) + m) % m;
    
    // Display results
    resultsDiv.innerHTML = `
        <div style="text-align: center; margin-bottom: 16px;">
            <p style="font-size: 18px; font-weight: bold; color: var(--color-primary);">${a} ≡ ${result} (mod ${m})</p>
        </div>
        <div style="background: var(--color-secondary); padding: 12px; border-radius: 8px;">
            <p><strong>Erklärung:</strong> ${a} dividiert durch ${m} ergibt den Rest ${result}.</p>
            <p><strong>Berechnung:</strong> ${a} = ${Math.floor(a/m)} × ${m} + ${result}</p>
        </div>
    `;
    
    // Create visual representation
    visualDiv.innerHTML = '';
    
    // Create modular circle
    for (let i = 0; i < m; i++) {
        const pointDiv = document.createElement('div');
        pointDiv.className = 'mod-point' + (i === result ? ' highlight' : '');
        pointDiv.textContent = i;
        
        // Position in a circle
        const angle = (i / m) * 2 * Math.PI;
        const radius = 80; // pixels
        const x = 100 + radius * Math.cos(angle - Math.PI/2);
        const y = 100 + radius * Math.sin(angle - Math.PI/2);
        
        pointDiv.style.left = `${x}px`;
        pointDiv.style.top = `${y}px`;
        
        visualDiv.appendChild(pointDiv);
    }
    
    // Add center label
    const centerLabel = document.createElement('div');
    centerLabel.style.cssText = `
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        font-weight: bold;
        color: var(--color-text);
    `;
    centerLabel.textContent = `mod ${m}`;
    visualDiv.appendChild(centerLabel);
}

function factorizeNumber() {
    const number = parseInt(document.getElementById('prime-number').value);
    const resultsDiv = document.getElementById('prime-results');
    const treeDiv = document.getElementById('factor-tree');
    
    // Validate input
    if (isNaN(number) || number < 2) {
        resultsDiv.innerHTML = '<p style="color: var(--color-error);">Bitte geben Sie eine Zahl größer oder gleich 2 ein.</p>';
        return;
    }
    
    // Factorize the number
    const factors = findPrimeFactors(number);
    
    // Display the factorization
    resultsDiv.innerHTML = `
        <div style="text-align: center; margin-bottom: 16px;">
            <p style="font-size: 18px; font-weight: bold; color: var(--color-primary);">${number} = ${factors.join(' × ')}</p>
        </div>
        <div style="background: var(--color-secondary); padding: 12px; border-radius: 8px;">
            <p><strong>Primfaktoren:</strong> {${[...new Set(factors)].join(', ')}}</p>
            <p><strong>Anzahl Faktoren:</strong> ${factors.length}</p>
            <p><strong>Ist Primzahl:</strong> ${factors.length === 1 ? 'Ja' : 'Nein'}</p>
        </div>
    `;
    
    // Create a simple factor tree visualization
    treeDiv.innerHTML = '';
    createFactorTree(number, treeDiv);
}

function findPrimeFactors(n) {
    const factors = [];
    let divisor = 2;
    
    while (n > 1) {
        while (n % divisor === 0) {
            factors.push(divisor);
            n /= divisor;
        }
        divisor++;
        if (divisor * divisor > n && n > 1) {
            factors.push(n);
            break;
        }
    }
    
    return factors;
}

function createFactorTree(n, container) {
    if (isPrime(n)) {
        // Base case: n is prime
        const nodeDiv = document.createElement('div');
        nodeDiv.className = 'tree-node';
        nodeDiv.style.cssText = 'display: flex; flex-direction: column; align-items: center;';
        
        const nodeContent = document.createElement('div');
        nodeContent.className = 'node-content prime-node';
        nodeContent.textContent = n;
        
        nodeDiv.appendChild(nodeContent);
        container.appendChild(nodeDiv);
        return;
    }
    
    // Find the smallest factor
    let factor = 2;
    while (n % factor !== 0) {
        factor++;
    }
    
    const otherFactor = n / factor;
    
    // Create the node
    const nodeDiv = document.createElement('div');
    nodeDiv.className = 'tree-node';
    nodeDiv.style.cssText = 'display: flex; flex-direction: column; align-items: center;';
    
    const nodeContent = document.createElement('div');
    nodeContent.className = 'node-content';
    nodeContent.textContent = n;
    
    const nodeChildren = document.createElement('div');
    nodeChildren.className = 'node-children';
    nodeChildren.style.cssText = 'display: flex; gap: 16px; margin-top: 8px;';
    
    nodeDiv.appendChild(nodeContent);
    nodeDiv.appendChild(nodeChildren);
    container.appendChild(nodeDiv);
    
    // Recursively create children
    createFactorTree(factor, nodeChildren);
    createFactorTree(otherFactor, nodeChildren);
}

function isPrime(n) {
    if (n <= 1) return false;
    if (n <= 3) return true;
    if (n % 2 === 0 || n % 3 === 0) return false;
    
    for (let i = 5; i * i <= n; i += 6) {
        if (n % i === 0 || n % (i + 2) === 0) return false;
    }
    
    return true;
}

// ================ GROUP THEORY ================
function initGroupTheory() {
    // Setup event listeners for group theory tools
    document.getElementById('generate-cayley').addEventListener('click', generateCayleyTable);
    document.getElementById('generate-subgroup').addEventListener('click', generateSubgroup);
    
    // Initialize subgroup element select
    updateSubgroupElements();
    
    // Generate initial example
    setTimeout(() => {
        generateCayleyTable();
    }, 500);
}

function generateCayleyTable() {
    const groupType = document.getElementById('group-type').value;
    const parameter = parseInt(document.getElementById('group-param').value);
    const tableDiv = document.getElementById('cayley-table');
    
    // Validate input
    if (isNaN(parameter) || parameter < 2 || parameter > 8) {
        tableDiv.innerHTML = '<p style="color: var(--color-error);">Bitte geben Sie einen Parameter zwischen 2 und 8 ein.</p>';
        return;
    }
    
    // Clear previous table
    tableDiv.innerHTML = '';
    
    // Generate group elements based on type
    let elements = [];
    let operation;
    
    if (groupType === 'cyclic') {
        // Cyclic group Z_n
        elements = Array.from({length: parameter}, (_, i) => i);
        operation = (a, b) => (a + b) % parameter;
        
        currentGroupType = 'Zyklische Gruppe Z_' + parameter;
        currentGroupOrder = parameter;
        currentGroupElements = elements;
    } 
    else if (groupType === 'multiplication') {
        // Multiplicative group (Z/nZ)*
        elements = [];
        for (let i = 1; i < parameter; i++) {
            if (gcd(i, parameter) === 1) {
                elements.push(i);
            }
        }
        operation = (a, b) => (a * b) % parameter;
        
        currentGroupType = 'Multiplikative Gruppe (Z/' + parameter + 'Z)*';
        currentGroupOrder = elements.length;
        currentGroupElements = elements;
    } 
    else if (groupType === 'symmetric') {
        // Symmetric group S_n (restricted to n ≤ 4 for simplicity)
        if (parameter > 4) {
            tableDiv.innerHTML = '<p style="color: var(--color-error);">Symmetrische Gruppen werden nur bis S_4 unterstützt.</p>';
            return;
        }
        
        elements = generatePermutations(parameter);
        operation = composePermutations;
        
        currentGroupType = 'Symmetrische Gruppe S_' + parameter;
        currentGroupOrder = factorial(parameter);
        currentGroupElements = elements;
    }
    
    // Create Cayley table
    const table = document.createElement('table');
    table.className = 'cayley-table';
    
    // Header row
    const headerRow = document.createElement('tr');
    const cornerCell = document.createElement('th');
    cornerCell.textContent = '∘';
    cornerCell.style.background = 'var(--color-primary)';
    cornerCell.style.color = 'var(--color-btn-primary-text)';
    headerRow.appendChild(cornerCell);
    
    elements.forEach(element => {
        const headerCell = document.createElement('th');
        headerCell.textContent = formatElement(element, groupType);
        headerCell.style.background = 'var(--color-secondary)';
        headerRow.appendChild(headerCell);
    });
    
    table.appendChild(headerRow);
    
    // Data rows
    elements.forEach(rowElement => {
        const row = document.createElement('tr');
        
        // Row header
        const rowHeader = document.createElement('th');
        rowHeader.textContent = formatElement(rowElement, groupType);
        rowHeader.style.background = 'var(--color-secondary)';
        row.appendChild(rowHeader);
        
        // Calculate and display each cell
        elements.forEach(colElement => {
            const cell = document.createElement('td');
            const result = operation(rowElement, colElement);
            cell.textContent = formatElement(result, groupType);
            
            // Highlight identity element
            if (JSON.stringify(result) === JSON.stringify(elements[0])) {
                cell.className = 'identity';
                cell.style.background = 'rgba(var(--color-success-rgb), 0.2)';
            }
            
            cell.style.border = '1px solid var(--color-border)';
            cell.style.padding = '8px';
            cell.style.textAlign = 'center';
            
            row.appendChild(cell);
        });
        
        table.appendChild(row);
    });
    
    tableDiv.appendChild(table);
    
    // Display group properties
    displayGroupProperties();
    
    // Update subgroup element dropdown
    updateSubgroupElements();
    
    showMessage(`Cayley-Tabelle für ${currentGroupType} generiert`);
}

function formatElement(element, groupType) {
    if (groupType === 'symmetric') {
        // Format permutation in cycle notation
        return formatPermutation(element);
    }
    return element.toString();
}

function generatePermutations(n) {
    if (n === 1) return [[0]];
    if (n === 2) return [[0, 1], [1, 0]];
    
    const permutations = [];
    const smaller = generatePermutations(n - 1);
    
    smaller.forEach(perm => {
        for (let i = 0; i <= perm.length; i++) {
            const newPerm = [...perm.slice(0, i), n - 1, ...perm.slice(i)];
            permutations.push(newPerm);
        }
    });
    
    return permutations;
}

function composePermutations(p1, p2) {
    // Apply p2 then p1
    return p1.map(i => p2[i]);
}

function formatPermutation(perm) {
    // Convert permutation array to cycle notation
    const visited = new Array(perm.length).fill(false);
    const cycles = [];
    
    for (let i = 0; i < perm.length; i++) {
        if (!visited[i]) {
            const cycle = [];
            let current = i;
            
            while (!visited[current]) {
                visited[current] = true;
                cycle.push(current + 1); // Convert to 1-based indexing
                current = perm[current];
                
                if (current === i) break;
            }
            
            if (cycle.length > 1) {
                cycles.push(cycle);
            }
        }
    }
    
    if (cycles.length === 0) return 'e';
    
    return cycles.map(cycle => `(${cycle.join(' ')})`).join('');
}

function updateSubgroupElements() {
    const select = document.getElementById('subgroup-element');
    select.innerHTML = '';
    
    if (!currentGroupElements || currentGroupElements.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Erst Gruppe generieren';
        select.appendChild(option);
        return;
    }
    
    currentGroupElements.forEach((element, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = formatElement(element, document.getElementById('group-type').value);
        select.appendChild(option);
    });
}

function generateSubgroup() {
    const selectedIndex = document.getElementById('subgroup-element').value;
    const displayDiv = document.getElementById('subgroup-display');
    
    if (!selectedIndex || !currentGroupElements || currentGroupElements.length === 0) {
        displayDiv.innerHTML = '<p>Bitte wählen Sie ein Element aus.</p>';
        return;
    }
    
    const generator = currentGroupElements[selectedIndex];
    const groupType = document.getElementById('group-type').value;
    
    // Determine the operation based on group type
    let operation;
    if (groupType === 'cyclic') {
        operation = (a, b) => (a + b) % currentGroupOrder;
    } else if (groupType === 'multiplication') {
        operation = (a, b) => (a * b) % document.getElementById('group-param').value;
    } else if (groupType === 'symmetric') {
        operation = composePermutations;
    }
    
    // Generate subgroup elements
    const subgroupElements = [];
    let current = currentGroupElements[0]; // Identity element
    subgroupElements.push(current);
    
    while (true) {
        current = operation(current, generator);
        
        // Check if we've returned to the identity
        const isIdentity = groupType === 'symmetric' 
            ? JSON.stringify(current) === JSON.stringify(currentGroupElements[0])
            : current === currentGroupElements[0];
            
        if (isIdentity) break;
        
        subgroupElements.push(current);
    }
    
    // Display the subgroup
    displayDiv.innerHTML = '';
    
    const header = document.createElement('h4');
    header.textContent = `Zyklische Untergruppe erzeugt von ${formatElement(generator, groupType)}`;
    displayDiv.appendChild(header);
    
    const elementsList = document.createElement('div');
    elementsList.style.cssText = `
        background: var(--color-secondary);
        padding: 12px;
        border-radius: 8px;
        margin: 12px 0;
    `;
    elementsList.innerHTML = `
        <p><strong>Elemente:</strong> {${subgroupElements.map(el => formatElement(el, groupType)).join(', ')}}</p>
        <p><strong>Ordnung:</strong> ${subgroupElements.length}</p>
        <p><strong>Index:</strong> [G:H] = ${currentGroupElements.length / subgroupElements.length}</p>
    `;
    displayDiv.appendChild(elementsList);
    
    showMessage(`Untergruppe der Ordnung ${subgroupElements.length} generiert`);
}

function displayGroupProperties() {
    const propertiesDiv = document.getElementById('group-properties');
    
    if (!currentGroupType || !currentGroupElements) {
        propertiesDiv.innerHTML = '<p>Wählen Sie eine Gruppe aus, um ihre Eigenschaften zu sehen.</p>';
        return;
    }
    
    propertiesDiv.innerHTML = '';
    
    // Basic properties
    const properties = [
        { name: 'Typ', value: currentGroupType },
        { name: 'Ordnung', value: currentGroupOrder },
        { name: 'Abelsch', value: isAbelianGroup() ? 'Ja' : 'Nein' },
        { name: 'Zyklisch', value: isCyclicGroup() ? 'Ja' : 'Nein' }
    ];
    
    properties.forEach(prop => {
        const propDiv = document.createElement('div');
        propDiv.className = 'property-item';
        propDiv.style.cssText = `
            display: flex;
            margin-bottom: 8px;
            padding: 8px;
            background: var(--color-secondary);
            border-radius: 4px;
        `;
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'property-name';
        nameSpan.style.cssText = `
            font-weight: var(--font-weight-medium);
            width: 120px;
        `;
        nameSpan.textContent = prop.name + ':';
        
        const valueSpan = document.createElement('span');
        valueSpan.className = 'property-value';
        valueSpan.style.flex = '1';
        valueSpan.textContent = prop.value;
        
        propDiv.appendChild(nameSpan);
        propDiv.appendChild(valueSpan);
        
        propertiesDiv.appendChild(propDiv);
    });
}

function isAbelianGroup() {
    // Determine if the current group is abelian (commutative)
    const groupType = document.getElementById('group-type').value;
    
    // Cyclic groups are always abelian
    if (groupType === 'cyclic') return true;
    
    // Multiplicative groups modulo n are abelian
    if (groupType === 'multiplication') return true;
    
    // Symmetric groups S_n are abelian only for n ≤ 2
    if (groupType === 'symmetric') {
        return parseInt(document.getElementById('group-param').value) <= 2;
    }
    
    return false;
}

function isCyclicGroup() {
    // Determine if the current group is cyclic
    const groupType = document.getElementById('group-type').value;
    
    // Cyclic groups are cyclic by definition
    if (groupType === 'cyclic') return true;
    
    // For multiplicative groups, need to check if any element generates the whole group
    if (groupType === 'multiplication') {
        // All multiplicative groups (Z/nZ)* with n = 2, 4, p^k, 2p^k 
        // (where p is an odd prime) are cyclic
        const n = parseInt(document.getElementById('group-param').value);
        
        // Simplified check
        return [2, 4].includes(n) || isPrime(n) || (n % 2 === 0 && isPrime(n / 2));
    }
    
    // Symmetric groups S_n are cyclic only for n ≤ 2
    if (groupType === 'symmetric') {
        return parseInt(document.getElementById('group-param').value) <= 2;
    }
    
    return false;
}

// ================ UTILITY FUNCTIONS ================
function gcd(a, b) {
    if (b === 0) return a;
    return gcd(b, a % b);
}

function factorial(n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}