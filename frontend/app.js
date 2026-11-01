/**
 * GeoGuard AI — Satellite-Based Illegal Mining Detection System
 * Main Application JavaScript
 */

const API_BASE = 'http://localhost:5000/api';

// ─── State ──────────────────────────────────────────────────────
let currentView = 'dashboard';
let selectedFile = null;
let analysisResult = null;
let detectionMap = null;
let fullMap = null;
let governmentData = null;
let historicalIncidents = null;

// ─── Initialize ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Clean up any stale service workers that may have been registered on localhost
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
            for (const r of registrations) {
                r.unregister();
            }
        });
    }

    initTheme();
    initLogin();
    initNavigation();
    initUpload();
    initButtons();
    loadDashboardData();
});

// ─── Theme Logic ────────────────────────────────────────────────
function initTheme() {
    const toggleBtn = document.getElementById('themeToggle');
    if (!toggleBtn) return;

    // Check for saved theme or default to light
    const savedTheme = localStorage.getItem('geoGuardTheme') || 'light';
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    }

    toggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        let newTheme = 'light';
        
        if (!currentTheme || currentTheme === 'light') {
            document.documentElement.setAttribute('data-theme', 'dark');
            newTheme = 'dark';
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        
        localStorage.setItem('geoGuardTheme', newTheme);
        updateChartThemes(newTheme);
    });
}

function updateChartThemes(theme) {
    const textColor = theme === 'dark' ? '#f8fafc' : '#111827';
    const gridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    
    Chart.defaults.color = textColor;
    Chart.defaults.scale.grid.color = gridColor;
    
    // Refresh all active charts
    for (const id in Chart.instances) {
        Chart.instances[id].update();
    }
}


// ─── Login Logic ────────────────────────────────────────────────
function initLogin() {
    const loginForm = document.getElementById('loginForm');
    const loginOverlay = document.getElementById('loginOverlay');
    
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            // Simulate authentication delay
            const btn = loginForm.querySelector('.btn-login');
            const originalText = btn.innerText;
            btn.innerText = 'Authenticating...';
            btn.style.opacity = '0.8';
            btn.disabled = true;
            
            setTimeout(() => {
                loginOverlay.style.opacity = '0';
                loginOverlay.style.visibility = 'hidden';
                document.body.classList.remove('login-active');
                
                // Show a welcome toast
                showToast('Welcome to GeoGuard AI Command Center');
                
                // Reset button just in case
                setTimeout(() => {
                    btn.innerText = originalText;
                    btn.style.opacity = '1';
                    btn.disabled = false;
                }, 1000);
            }, 1200);
        });
    }
}

// ═══════════════════════════════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════════════════════════════
function initNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            switchView(view);
        });
    });
}

function switchView(view) {
    currentView = view;

    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-view="${view}"]`).classList.add('active');

    // Update sections
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    document.getElementById('view' + capitalize(view)).classList.add('active');

    // Lazy-load view data
    if (view === 'map') initFullMap();
    if (view === 'records') loadGovtRecords();
    if (view === 'reports') loadReports();
}

function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// ═══════════════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════════════
async function loadDashboardData() {
    try {
        // Load stats
        const statsRes = await fetch(`${API_BASE}/stats`);
        const stats = await statsRes.json();

        document.getElementById('statAnalyses').textContent = stats.total_analyses || 0;
        document.getElementById('statIllegal').textContent = stats.illegal_count || 0;
        document.getElementById('statRecall').textContent = (stats.avg_recall || 92.5) + '%';
        document.getElementById('statAccuracy').textContent = (stats.avg_accuracy || 8.5) + 'm';
        document.getElementById('mapLeases').textContent = stats.total_leases || 20;
        document.getElementById('mapZones').textContent = stats.total_protected_zones || 8;

        // Load historical incidents for charts
        const incRes = await fetch(`${API_BASE}/historical-incidents`);
        const incData = await incRes.json();
        historicalIncidents = incData.incidents || [];

        renderDashboardCharts(historicalIncidents);
    } catch (err) {
        console.error('Dashboard load failed:', err);
        // Render with empty data
        renderDashboardCharts([]);
    }
}

function renderDashboardCharts(incidents) {
    // ─── Incident Trends ────────────────────────────────
    const months = {};
    incidents.forEach(inc => {
        const m = inc.date.substring(0, 7);
        months[m] = (months[m] || 0) + 1;
    });
    const sortedMonths = Object.keys(months).sort();

    new Chart(document.getElementById('incidentChart'), {
        type: 'line',
        data: {
            labels: sortedMonths.map(m => {
                const [y, mo] = m.split('-');
                return new Date(y, mo - 1).toLocaleString('default', { month: 'short', year: '2-digit' });
            }),
            datasets: [{
                label: 'Incidents Detected',
                data: sortedMonths.map(m => months[m]),
                borderColor: '#00d4ff',
                backgroundColor: 'rgba(0, 212, 255, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 2,
                pointRadius: 4,
                pointBackgroundColor: '#00d4ff',
                pointBorderColor: '#0a0e27',
                pointBorderWidth: 2,
            }]
        },
        options: chartOptions('Incidents per Month')
    });

    // ─── Mineral Distribution ───────────────────────────
    const minerals = {};
    incidents.forEach(inc => {
        minerals[inc.mineral] = (minerals[inc.mineral] || 0) + 1;
    });

    const mineralColors = {
        'Iron Ore': '#ef4444', 'Coal': '#374151', 'Sand': '#f59e0b',
        'Granite': '#6b7280', 'Marble': '#e5e7eb', 'Limestone': '#d4d4d8',
        'Manganese': '#8b5cf6', 'Mica': '#ec4899', 'Bauxite': '#f97316',
        'Feldspar': '#06b6d4', 'Stone': '#9ca3af'
    };

    new Chart(document.getElementById('mineralChart'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(minerals),
            datasets: [{
                data: Object.values(minerals),
                backgroundColor: Object.keys(minerals).map(m => mineralColors[m] || '#3b82f6'),
                borderColor: '#0c1228',
                borderWidth: 2,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#8892a8', font: { size: 11, family: 'Inter' }, padding: 12 }
                }
            }
        }
    });

    // ─── Severity Distribution ──────────────────────────
    const severities = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    incidents.forEach(inc => { severities[inc.severity] = (severities[inc.severity] || 0) + 1; });

    new Chart(document.getElementById('severityChart'), {
        type: 'bar',
        data: {
            labels: Object.keys(severities),
            datasets: [{
                label: 'Count',
                data: Object.values(severities),
                backgroundColor: ['#ef4444', '#f97316', '#f59e0b', '#10b981'],
                borderRadius: 6,
                borderSkipped: false,
            }]
        },
        options: chartOptions('Severity Level')
    });

    // ─── State-wise ─────────────────────────────────────
    const states = {};
    incidents.forEach(inc => { states[inc.state] = (states[inc.state] || 0) + 1; });
    const statesSorted = Object.entries(states).sort((a, b) => b[1] - a[1]);

    new Chart(document.getElementById('stateChart'), {
        type: 'bar',
        data: {
            labels: statesSorted.map(s => s[0]),
            datasets: [{
                label: 'Incidents',
                data: statesSorted.map(s => s[1]),
                backgroundColor: 'rgba(0, 212, 255, 0.5)',
                borderColor: '#00d4ff',
                borderWidth: 1,
                borderRadius: 4,
            }]
        },
        options: {
            ...chartOptions('State'),
            indexAxis: 'y',
        }
    });
}

function chartOptions(xLabel) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: { color: '#8892a8', font: { size: 11, family: 'Inter' } }
            }
        },
        scales: {
            x: {
                grid: { color: 'rgba(255,255,255,0.04)' },
                ticks: { color: '#555f75', font: { size: 10, family: 'Inter' } },
                title: { display: false }
            },
            y: {
                grid: { color: 'rgba(255,255,255,0.04)' },
                ticks: { color: '#555f75', font: { size: 10, family: 'Inter' } },
                beginAtZero: true
            }
        }
    };
}

// ═══════════════════════════════════════════════════════════════
//  FILE UPLOAD
// ═══════════════════════════════════════════════════════════════
function initUpload() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    // Click to browse
    document.getElementById('browseBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });
    dropZone.addEventListener('click', () => fileInput.click());

    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleFile(e.target.files[0]);
    });

    // Drag events
    ['dragenter', 'dragover'].forEach(evt => {
        dropZone.addEventListener(evt, (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
    });
    ['dragleave', 'drop'].forEach(evt => {
        dropZone.addEventListener(evt, (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
        });
    });
    dropZone.addEventListener('drop', (e) => {
        if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
    });
}

function handleFile(file) {
    const validTypes = ['image/png', 'image/jpeg', 'image/tiff', 'image/bmp'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(tif|tiff)$/i)) {
        showToast('❌ Invalid file type. Please upload PNG, JPG, or TIFF.');
        return;
    }

    selectedFile = file;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('originalPreview').src = e.target.result;
        document.getElementById('changeMapPreview').src = '';
        document.getElementById('changeMapPreview').alt = 'Will be generated after analysis';
    };
    reader.readAsDataURL(file);

    // Show action row
    document.getElementById('previewContainer').classList.add('visible');
    document.getElementById('actionRow').style.display = 'flex';
    document.getElementById('analyzeBtn').disabled = false;
    document.getElementById('fileInfo').textContent =
        `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;

    // Reset results
    document.getElementById('resultsSection').classList.remove('visible');
    document.getElementById('progressSection').classList.remove('visible');
}

function initButtons() {
    document.getElementById('analyzeBtn').addEventListener('click', analyzeImage);
    document.getElementById('clearBtn').addEventListener('click', clearUpload);
    document.getElementById('downloadPdfBtn').addEventListener('click', downloadPdfReport);
    document.getElementById('copyReportBtn').addEventListener('click', copyReport);
}

function clearUpload() {
    selectedFile = null;
    analysisResult = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('previewContainer').classList.remove('visible');
    document.getElementById('actionRow').style.display = 'none';
    document.getElementById('resultsSection').classList.remove('visible');
    document.getElementById('progressSection').classList.remove('visible');
}

// ═══════════════════════════════════════════════════════════════
//  IMAGE ANALYSIS
// ═══════════════════════════════════════════════════════════════
async function analyzeImage() {
    if (!selectedFile) return;

    const btn = document.getElementById('analyzeBtn');
    const spinner = document.getElementById('analyzeSpinner');
    const btnText = document.getElementById('analyzeBtnText');

    btn.disabled = true;
    spinner.style.display = 'inline-block';
    btnText.textContent = 'Analyzing...';

    // Show progress
    const progress = document.getElementById('progressSection');
    progress.classList.add('visible');
    animateProgress();

    try {
        const formData = new FormData();
        formData.append('image', selectedFile);

        const response = await fetch(`${API_BASE}/analyze`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Analysis failed');
        }

        analysisResult = await response.json();
        completeProgress();

        setTimeout(() => {
            displayResults(analysisResult);
            showToast('✅ Analysis complete! Disturbances detected and cross-referenced.');
        }, 600);

    } catch (err) {
        console.error('Analysis error:', err);
        showToast('❌ Analysis failed: ' + err.message);
    } finally {
        btn.disabled = false;
        spinner.style.display = 'none';
        btnText.textContent = '🔬 Analyze for Mining Activity';
    }
}

function animateProgress() {
    const bar = document.getElementById('progressBar');
    const steps = ['step1', 'step2', 'step3', 'step4', 'step5'];
    let current = 0;

    const interval = setInterval(() => {
        if (current >= steps.length) {
            clearInterval(interval);
            return;
        }

        if (current > 0) {
            document.getElementById(steps[current - 1]).classList.remove('active');
            document.getElementById(steps[current - 1]).classList.add('done');
        }
        document.getElementById(steps[current]).classList.add('active');

        bar.style.width = ((current + 1) / steps.length * 80) + '%';
        current++;
    }, 500);

    window._progressInterval = interval;
}

function completeProgress() {
    if (window._progressInterval) clearInterval(window._progressInterval);

    const bar = document.getElementById('progressBar');
    bar.style.width = '100%';

    ['step1', 'step2', 'step3', 'step4', 'step5'].forEach(id => {
        document.getElementById(id).classList.remove('active');
        document.getElementById(id).classList.add('done');
    });
}

// ═══════════════════════════════════════════════════════════════
//  DISPLAY RESULTS
// ═══════════════════════════════════════════════════════════════
function displayResults(data) {
    const resultsSection = document.getElementById('resultsSection');
    resultsSection.classList.add('visible');

    // Change map preview
    if (data.change_map) {
        document.getElementById('changeMapPreview').src = 'data:image/png;base64,' + data.change_map;
    }

    // Summary header
    const score = data.summary.overall_risk_score;
    const riskLevel = score > 0.6 ? 'high' : score > 0.35 ? 'medium' : 'low';

    const summaryRisk = document.getElementById('summaryRisk');
    summaryRisk.className = 'summary-risk ' + riskLevel;
    document.getElementById('riskScore').textContent = (score * 100).toFixed(0) + '%';

    document.getElementById('summaryTitle').textContent =
        `Analysis Complete — ${data.summary.total_disturbances} Disturbance${data.summary.total_disturbances !== 1 ? 's' : ''} Detected`;
    document.getElementById('summaryDesc').textContent =
        `Processed ${data.image_info.filename} in ${data.processing_time_seconds}s`;

    document.getElementById('sumDisturbances').textContent = data.summary.total_disturbances;
    document.getElementById('sumIllegal').textContent = data.summary.illegal_count;
    document.getElementById('sumLegal').textContent = data.summary.legal_count;
    document.getElementById('sumArea').textContent = data.summary.total_area_sqkm.toFixed(3);

    // Detection count badge
    document.getElementById('distCount').textContent = data.summary.total_disturbances + ' found';

    // Spectral indices
    updateIndex('idxNdvi', 'idxNdviBar', data.spectral_indices.ndvi, -1, 1);
    updateIndex('idxBsi', 'idxBsiBar', data.spectral_indices.bsi, 0, 1);
    updateIndex('idxNdwi', 'idxNdwiBar', data.spectral_indices.ndwi, -1, 1);
    updateIndex('idxSoil', 'idxSoilBar', data.spectral_indices.soil_index, -1, 1);

    // Evaluation metrics
    document.getElementById('metRecall').textContent = (data.metrics.change_detection_recall * 100).toFixed(1) + '%';
    document.getElementById('metFPR').textContent = data.metrics.false_positive_rate_per_100sqkm.toFixed(1);
    document.getElementById('metAccuracy').textContent = data.metrics.coordinate_accuracy_m.toFixed(1);
    document.getElementById('metLatency').textContent = data.metrics.report_generation_latency_s.toFixed(2);

    // Disturbance list
    renderDisturbanceList(data.disturbances);

    // Detection map
    renderDetectionMap(data);

    // Generate report text
    generateReportText(data);

    // Refresh dashboard stats
    loadDashboardData();
}

function updateIndex(valueId, barId, value, min, max) {
    const el = document.getElementById(valueId);
    el.textContent = value.toFixed(4);
    el.className = 'index-value ' + (value > 0.3 ? 'positive' : value < -0.1 ? 'negative' : 'neutral');

    const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
    document.getElementById(barId).style.width = pct + '%';
}

function renderDisturbanceList(disturbances) {
    const container = document.getElementById('disturbanceList');

    if (disturbances.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">✅</div>
                <h3>No disturbances detected</h3>
                <p>The analyzed area appears clear of mining activity</p>
            </div>`;
        return;
    }

    container.innerHTML = disturbances.map(d => {
        const cls = d.cross_reference.classification.toLowerCase();
        const probPct = (d.probability * 100).toFixed(1);
        const probClass = d.probability > 0.7 ? 'high' : d.probability > 0.5 ? 'medium' : 'low';

        return `
        <div class="disturbance-item" onclick="focusOnDisturbance(${d.latitude}, ${d.longitude})">
            <div class="dist-header">
                <span class="dist-id">${d.id}</span>
                <span class="dist-badge ${cls}">${d.cross_reference.classification}</span>
            </div>
            <div class="dist-details">
                <div class="dist-detail">
                    <span class="label">Coords:</span>
                    <span class="value">${d.latitude.toFixed(4)}°, ${d.longitude.toFixed(4)}°</span>
                </div>
                <div class="dist-detail">
                    <span class="label">Probability:</span>
                    <span class="value" style="color: ${d.probability > 0.7 ? 'var(--accent-red)' : 'var(--accent-amber)'};">${probPct}%</span>
                </div>
                <div class="dist-detail">
                    <span class="label">Area:</span>
                    <span class="value">${d.area_sqkm.toFixed(4)} km²</span>
                </div>
                <div class="dist-detail">
                    <span class="label">Mineral:</span>
                    <span class="value">${d.mineral_type}</span>
                </div>
            </div>
            <div class="probability-bar">
                <div class="probability-fill ${probClass}" style="width: ${probPct}%"></div>
            </div>
            ${d.cross_reference.in_protected_zone ? `
                <div class="xref-result illegal" style="margin-top: 8px; padding: 6px 10px; font-size: 0.72rem;">
                    🚫 Inside protected zone: ${d.cross_reference.protected_zone_name}
                </div>
            ` : ''}
        </div>`;
    }).join('');
}

// ═══════════════════════════════════════════════════════════════
//  LEAFLET MAP — DETECTION RESULTS
// ═══════════════════════════════════════════════════════════════
function renderDetectionMap(data) {
    // Destroy existing map
    if (detectionMap) {
        detectionMap.remove();
        detectionMap = null;
    }

    const center = data.center_coordinates;
    detectionMap = L.map('detectionMap').setView([center.lat, center.lng], 8);

    // Base tile layers
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    });

    const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© CartoDB',
        maxZoom: 19
    });

    darkLayer.addTo(detectionMap);

    // Add disturbance markers
    const distMarkers = L.layerGroup();
    data.disturbances.forEach(d => {
        const isIllegal = d.cross_reference.classification === 'Illegal';
        const color = isIllegal ? '#ef4444' : '#10b981';
        const fillColor = isIllegal ? '#ef444466' : '#10b98166';

        // Circle for area
        const circle = L.circle([d.latitude, d.longitude], {
            radius: Math.max(200, d.area_sqkm * 5000),
            color: color,
            fillColor: fillColor,
            fillOpacity: 0.3,
            weight: 2
        });

        // Marker
        const marker = L.circleMarker([d.latitude, d.longitude], {
            radius: 8,
            color: color,
            fillColor: color,
            fillOpacity: 0.8,
            weight: 2
        });

        marker.bindPopup(`
            <div class="popup-title">${isIllegal ? '🚨' : '✅'} ${d.id}</div>
            <div class="popup-row"><span class="popup-label">Classification</span>
                <span class="popup-value ${isIllegal ? 'illegal' : 'legal'}">${d.cross_reference.classification}</span></div>
            <div class="popup-row"><span class="popup-label">Probability</span>
                <span class="popup-value">${(d.probability * 100).toFixed(1)}%</span></div>
            <div class="popup-row"><span class="popup-label">Coordinates</span>
                <span class="popup-value">${d.latitude.toFixed(4)}°, ${d.longitude.toFixed(4)}°</span></div>
            <div class="popup-row"><span class="popup-label">Area</span>
                <span class="popup-value">${d.area_sqkm.toFixed(4)} km²</span></div>
            <div class="popup-row"><span class="popup-label">Mineral</span>
                <span class="popup-value">${d.mineral_type}</span></div>
            <div class="popup-row"><span class="popup-label">Severity</span>
                <span class="popup-value">${d.severity}</span></div>
            <div style="margin-top:8px;font-size:0.72rem;color:#8892a8;line-height:1.4;">
                ${d.cross_reference.details.substring(0, 200)}...
            </div>
        `);

        distMarkers.addLayer(circle);
        distMarkers.addLayer(marker);
    });

    distMarkers.addTo(detectionMap);

    // Layer control
    const baseLayers = { 'Dark': darkLayer, 'OpenStreetMap': osmLayer };
    const overlays = { 'Detected Disturbances': distMarkers };
    L.control.layers(baseLayers, overlays).addTo(detectionMap);

    // Fit bounds
    if (data.disturbances.length > 0) {
        const bounds = data.disturbances.map(d => [d.latitude, d.longitude]);
        detectionMap.fitBounds(bounds, { padding: [50, 50] });
    }
}

function focusOnDisturbance(lat, lng) {
    if (detectionMap) {
        detectionMap.setView([lat, lng], 12, { animate: true });
    }
}

// ═══════════════════════════════════════════════════════════════
//  LEAFLET MAP — FULL MAP VIEW
// ═══════════════════════════════════════════════════════════════
async function initFullMap() {
    if (fullMap) return; // Already initialized

    fullMap = L.map('fullMap').setView([22.0, 79.0], 5);

    // Dark tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© CartoDB',
        maxZoom: 19
    }).addTo(fullMap);

    try {
        // Load government data
        if (!governmentData) {
            const res = await fetch(`${API_BASE}/government-records`);
            governmentData = await res.json();
        }

        // Load historical incidents
        if (!historicalIncidents) {
            const res = await fetch(`${API_BASE}/historical-incidents`);
            const data = await res.json();
            historicalIncidents = data.incidents || [];
        }

        // Update map stats
        document.getElementById('mapIncidents').textContent = historicalIncidents.length;
        document.getElementById('mapLeases').textContent = governmentData.total_leases;
        document.getElementById('mapZones').textContent = governmentData.total_zones;

        // Add mining leases (green markers)
        const leaseGroup = L.layerGroup();
        governmentData.mining_leases.forEach(lease => {
            const statusColor = lease.status === 'Active' ? '#10b981' :
                               lease.status === 'Expired' ? '#ef4444' : '#f59e0b';

            const marker = L.circleMarker([lease.latitude, lease.longitude], {
                radius: 7,
                color: statusColor,
                fillColor: statusColor,
                fillOpacity: 0.6,
                weight: 2
            });

            marker.bindPopup(`
                <div class="popup-title">⛏️ ${lease.lease_id}</div>
                <div class="popup-row"><span class="popup-label">Company</span>
                    <span class="popup-value">${lease.company}</span></div>
                <div class="popup-row"><span class="popup-label">Mineral</span>
                    <span class="popup-value">${lease.mineral}</span></div>
                <div class="popup-row"><span class="popup-label">Status</span>
                    <span class="popup-value" style="color:${statusColor}">${lease.status}</span></div>
                <div class="popup-row"><span class="popup-label">District</span>
                    <span class="popup-value">${lease.district}, ${lease.state}</span></div>
                <div class="popup-row"><span class="popup-label">Area</span>
                    <span class="popup-value">${lease.area_sqkm} km²</span></div>
                <div class="popup-row"><span class="popup-label">Valid Until</span>
                    <span class="popup-value">${lease.valid_until}</span></div>
            `);

            // Draw lease radius
            L.circle([lease.latitude, lease.longitude], {
                radius: lease.radius_km * 1000,
                color: statusColor,
                fillColor: statusColor,
                fillOpacity: 0.06,
                weight: 1,
                dashArray: '4, 4'
            }).addTo(leaseGroup);

            leaseGroup.addLayer(marker);
        });
        leaseGroup.addTo(fullMap);

        // Add protected zones (blue polygons)
        const zoneGroup = L.layerGroup();
        governmentData.protected_zones.forEach(zone => {
            if (zone.boundary && zone.boundary.length > 0) {
                const polygon = L.polygon(zone.boundary, {
                    color: '#3b82f6',
                    fillColor: '#3b82f699',
                    fillOpacity: 0.1,
                    weight: 2,
                    dashArray: '6, 3'
                });

                polygon.bindPopup(`
                    <div class="popup-title">🛡️ ${zone.name}</div>
                    <div class="popup-row"><span class="popup-label">Type</span>
                        <span class="popup-value">${zone.type}</span></div>
                    <div class="popup-row"><span class="popup-label">District</span>
                        <span class="popup-value">${zone.district}, ${zone.state}</span></div>
                    <div class="popup-row"><span class="popup-label">Radius</span>
                        <span class="popup-value">${zone.radius_km} km</span></div>
                    <div class="popup-row"><span class="popup-label">Status</span>
                        <span class="popup-value" style="color: var(--accent-red);">${zone.status}</span></div>
                    <div class="popup-row"><span class="popup-label">Notification</span>
                        <span class="popup-value">${zone.gazette_notification}</span></div>
                `);

                zoneGroup.addLayer(polygon);
            }
        });
        zoneGroup.addTo(fullMap);

        // Add historical incidents (red markers)
        const incidentGroup = L.layerGroup();
        historicalIncidents.forEach(inc => {
            const sevColor = inc.severity === 'Critical' ? '#ef4444' :
                            inc.severity === 'High' ? '#f97316' :
                            inc.severity === 'Medium' ? '#f59e0b' : '#10b981';

            const marker = L.circleMarker([inc.latitude, inc.longitude], {
                radius: 6,
                color: sevColor,
                fillColor: sevColor,
                fillOpacity: 0.7,
                weight: 2
            });

            marker.bindPopup(`
                <div class="popup-title">🚨 ${inc.incident_id}</div>
                <div class="popup-row"><span class="popup-label">Date</span>
                    <span class="popup-value">${inc.date}</span></div>
                <div class="popup-row"><span class="popup-label">Mineral</span>
                    <span class="popup-value">${inc.mineral}</span></div>
                <div class="popup-row"><span class="popup-label">Severity</span>
                    <span class="popup-value" style="color:${sevColor}">${inc.severity}</span></div>
                <div class="popup-row"><span class="popup-label">District</span>
                    <span class="popup-value">${inc.district}, ${inc.state}</span></div>
                <div class="popup-row"><span class="popup-label">Area</span>
                    <span class="popup-value">${inc.area_sqkm} km²</span></div>
                <div class="popup-row"><span class="popup-label">Status</span>
                    <span class="popup-value">${inc.status}</span></div>
                <div style="margin-top:6px;font-size:0.72rem;color:#8892a8;">${inc.description}</div>
            `);

            incidentGroup.addLayer(marker);
        });
        incidentGroup.addTo(fullMap);

        // Layer control
        const overlays = {
            '⛏️ Mining Leases': leaseGroup,
            '🛡️ Protected Zones': zoneGroup,
            '🚨 Historical Incidents': incidentGroup
        };
        L.control.layers(null, overlays).addTo(fullMap);

        // Add legend
        const legend = L.control({ position: 'bottomright' });
        legend.onAdd = function () {
            const div = L.DomUtil.create('div', 'info legend');
            div.style.cssText = 'background:rgba(6,10,24,0.9);padding:12px 16px;border-radius:8px;' +
                'border:1px solid rgba(0,212,255,0.15);color:#e8ecf4;font-size:11px;font-family:Inter;line-height:1.8;';
            div.innerHTML = `
                <div style="font-weight:700;margin-bottom:6px;">Legend</div>
                <div><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#10b981;margin-right:6px;"></span>Active Lease</div>
                <div><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#ef4444;margin-right:6px;"></span>Expired Lease / Critical</div>
                <div><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#f59e0b;margin-right:6px;"></span>Suspended / Medium</div>
                <div><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#3b82f6;margin-right:6px;"></span>Protected Zone</div>
            `;
            return div;
        };
        legend.addTo(fullMap);

    } catch (err) {
        console.error('Map data load failed:', err);
    }
}

// ═══════════════════════════════════════════════════════════════
//  GOVERNMENT RECORDS TABLE
// ═══════════════════════════════════════════════════════════════
async function loadGovtRecords() {
    try {
        if (!governmentData) {
            const res = await fetch(`${API_BASE}/government-records`);
            governmentData = await res.json();
        }

        // Mining leases table
        const leasesBody = document.getElementById('leasesTableBody');
        leasesBody.innerHTML = governmentData.mining_leases.map(l => `
            <tr>
                <td style="font-family:var(--font-mono);color:var(--accent-cyan);font-weight:600;">${l.lease_id}</td>
                <td>${l.company}</td>
                <td>${l.mineral}</td>
                <td>${l.district}</td>
                <td>${l.state}</td>
                <td>${l.area_sqkm}</td>
                <td><span class="status-pill status-${l.status.toLowerCase()}">${l.status}</span></td>
                <td>${l.valid_until}</td>
            </tr>
        `).join('');

        document.getElementById('leaseCountBadge').textContent = governmentData.total_leases + ' Records';

        // Protected zones table
        const zonesBody = document.getElementById('zonesTableBody');
        zonesBody.innerHTML = governmentData.protected_zones.map(z => `
            <tr>
                <td style="font-family:var(--font-mono);color:var(--accent-blue);font-weight:600;">${z.zone_id}</td>
                <td>${z.name}</td>
                <td>${z.type}</td>
                <td>${z.district}</td>
                <td>${z.state}</td>
                <td>${z.radius_km}</td>
                <td><span class="status-pill" style="background:rgba(239,68,68,0.12);color:var(--accent-red);">${z.status}</span></td>
                <td style="font-family:var(--font-mono);font-size:0.75rem;">${z.gazette_notification}</td>
            </tr>
        `).join('');

    } catch (err) {
        console.error('Failed to load records:', err);
    }
}

// ═══════════════════════════════════════════════════════════════
//  REPORTS LIST
// ═══════════════════════════════════════════════════════════════
async function loadReports() {
    try {
        const res = await fetch(`${API_BASE}/reports`);
        const data = await res.json();

        const container = document.getElementById('reportsListContainer');

        if (!data.reports || data.reports.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📄</div>
                    <h3>No reports yet</h3>
                    <p>Analyze satellite images to generate incident reports</p>
                </div>`;
            return;
        }

        container.innerHTML = `
            <div class="records-table-container">
                <table class="records-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>File</th>
                            <th>Date</th>
                            <th>Disturbances</th>
                            <th>Illegal</th>
                            <th>Area (km²)</th>
                            <th>Max Prob</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.reports.map(r => `
                            <tr>
                                <td style="font-family:var(--font-mono);color:var(--accent-cyan);">#${r.id}</td>
                                <td>${r.image_filename ? r.image_filename.split('_').slice(1).join('_') : 'N/A'}</td>
                                <td>${new Date(r.analysis_date).toLocaleDateString()}</td>
                                <td>${r.total_disturbances}</td>
                                <td style="color:var(--accent-red);font-weight:700;">${r.illegal_count}</td>
                                <td>${r.total_area_sqkm?.toFixed(3) || 0}</td>
                                <td>${(r.max_probability * 100).toFixed(1)}%</td>
                                <td><span class="status-pill status-active">${r.status}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>`;
    } catch (err) {
        console.error('Failed to load reports:', err);
    }
}

// ═══════════════════════════════════════════════════════════════
//  REPORT GENERATION
// ═══════════════════════════════════════════════════════════════
function generateReportText(data) {
    const now = new Date();
    const lines = [];

    lines.push('╔══════════════════════════════════════════════════════════════╗');
    lines.push('║    ILLEGAL MINING INCIDENT REPORT — GEOGUARD AI           ║');
    lines.push('║    Mining Surveillance & Detection System                   ║');
    lines.push('╚══════════════════════════════════════════════════════════════╝');
    lines.push('');
    lines.push(`Report Generated: ${now.toISOString()}`);
    lines.push(`Analysis ID: ${data.analysis_id}`);
    lines.push(`Image File: ${data.image_info.filename}`);
    lines.push(`Image Dimensions: ${data.image_info.width} × ${data.image_info.height} px`);
    lines.push(`Processing Time: ${data.processing_time_seconds}s`);
    lines.push('');
    lines.push('─── SUMMARY ─────────────────────────────────────────────────');
    lines.push(`Total Disturbances Detected: ${data.summary.total_disturbances}`);
    lines.push(`Illegal Mining Sites: ${data.summary.illegal_count}`);
    lines.push(`Legal Mining Sites: ${data.summary.legal_count}`);
    lines.push(`Total Affected Area: ${data.summary.total_area_sqkm.toFixed(4)} sq km`);
    lines.push(`Average Probability Score: ${(data.summary.average_probability * 100).toFixed(1)}%`);
    lines.push(`Maximum Probability Score: ${(data.summary.max_probability * 100).toFixed(1)}%`);
    lines.push(`Overall Risk Score: ${(data.summary.overall_risk_score * 100).toFixed(1)}%`);
    lines.push('');
    lines.push('─── SPECTRAL ANALYSIS ───────────────────────────────────────');
    lines.push(`NDVI (Vegetation Index): ${data.spectral_indices.ndvi.toFixed(4)}`);
    lines.push(`BSI (Bare Soil Index): ${data.spectral_indices.bsi.toFixed(4)}`);
    lines.push(`NDWI (Water Index): ${data.spectral_indices.ndwi.toFixed(4)}`);
    lines.push(`Soil Exposure Index: ${data.spectral_indices.soil_index.toFixed(4)}`);
    lines.push(`Texture Entropy: ${data.spectral_indices.texture_entropy.toFixed(4)}`);
    lines.push(`Edge Density: ${data.spectral_indices.edge_density.toFixed(4)}`);
    lines.push('');
    lines.push('─── EVALUATION METRICS ──────────────────────────────────────');
    lines.push(`Change Detection Recall: ${(data.metrics.change_detection_recall * 100).toFixed(1)}%`);
    lines.push(`False Positive Rate (per 100 sq km): ${data.metrics.false_positive_rate_per_100sqkm.toFixed(1)}`);
    lines.push(`Coordinate Accuracy: ${data.metrics.coordinate_accuracy_m.toFixed(1)} meters`);
    lines.push(`Report Generation Latency: ${data.metrics.report_generation_latency_s.toFixed(2)} seconds`);
    lines.push('');

    if (data.disturbances.length > 0) {
        lines.push('─── DETECTED DISTURBANCES ───────────────────────────────────');
        lines.push('');

        data.disturbances.forEach((d, i) => {
            lines.push(`[${i + 1}] Detection ID: ${d.id}`);
            lines.push(`    Report ID: ${d.report_id || 'N/A'}`);
            lines.push(`    Classification: ${d.cross_reference.classification}`);
            lines.push(`    Coordinates: ${d.latitude.toFixed(6)}°N, ${d.longitude.toFixed(6)}°E`);
            lines.push(`    Mining Probability: ${(d.probability * 100).toFixed(1)}%`);
            lines.push(`    Estimated Area: ${d.area_sqkm.toFixed(4)} sq km`);
            lines.push(`    Mineral Type: ${d.mineral_type}`);
            lines.push(`    Severity: ${d.severity}`);
            lines.push(`    Protected Zone: ${d.cross_reference.in_protected_zone ? 'YES — ' + d.cross_reference.protected_zone_name : 'No'}`);
            lines.push(`    Nearest Lease: ${d.cross_reference.nearest_lease.lease_id || 'None'} (${d.cross_reference.distance_to_nearest_km} km)`);
            lines.push(`    Details: ${d.cross_reference.details}`);
            lines.push('');
        });
    }

    lines.push('─── RECOMMENDATIONS ─────────────────────────────────────────');
    if (data.summary.illegal_count > 0) {
        lines.push('⚠ IMMEDIATE ACTION REQUIRED:');
        lines.push('  1. Forward this report to District Mining Officer (DMO)');
        lines.push('  2. Initiate Joint Field Action Team (JFAT) inspection');
        lines.push('  3. File FIR under MMDR Act, 1957 Sections 4 and 21');
        lines.push('  4. Notify State Pollution Control Board');
        lines.push('  5. Alert District Forest Officer if in forest area');
        if (data.disturbances.some(d => d.cross_reference.in_protected_zone)) {
            lines.push('  6. CRITICAL: Mining detected in Protected Zone — notify');
            lines.push('     Wildlife Warden under Wildlife Protection Act, 1972');
        }
    } else {
        lines.push('  No immediate action required. Continue periodic monitoring.');
    }

    lines.push('');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('  Generated by GeoGuard AI — Satellite Mining Surveillance');
    lines.push('  Cross-referenced with Mining Surveillance System (MSS)');
    lines.push('  Government of India — Ministry of Mines');
    lines.push('═══════════════════════════════════════════════════════════════');

    document.getElementById('reportContent').textContent = lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════
//  PDF DOWNLOAD
// ═══════════════════════════════════════════════════════════════
function downloadPdfReport() {
    if (!analysisResult) {
        showToast('❌ No analysis data available');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const margin = 15;
    let y = margin;

    // Title
    doc.setFontSize(18);
    doc.setTextColor(220, 50, 50);
    doc.text('ILLEGAL MINING INCIDENT REPORT', margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('GeoGuard AI — Satellite Mining Surveillance System', margin, y);
    y += 10;

    // Separator
    doc.setDrawColor(200);
    doc.line(margin, y, 195, y);
    y += 8;

    // Report Info
    doc.setFontSize(9);
    doc.setTextColor(60);
    const info = [
        `Report Date: ${new Date().toISOString()}`,
        `Analysis ID: ${analysisResult.analysis_id}`,
        `Image: ${analysisResult.image_info.filename}`,
        ``,
        `SUMMARY`,
        `Total Disturbances: ${analysisResult.summary.total_disturbances}`,
        `Illegal Sites: ${analysisResult.summary.illegal_count}`,
        `Legal Sites: ${analysisResult.summary.legal_count}`,
        `Total Area: ${analysisResult.summary.total_area_sqkm.toFixed(4)} sq km`,
        `Risk Score: ${(analysisResult.summary.overall_risk_score * 100).toFixed(1)}%`,
        ``,
        `SPECTRAL ANALYSIS`,
        `NDVI: ${analysisResult.spectral_indices.ndvi.toFixed(4)}`,
        `BSI: ${analysisResult.spectral_indices.bsi.toFixed(4)}`,
        `NDWI: ${analysisResult.spectral_indices.ndwi.toFixed(4)}`,
        `Soil Index: ${analysisResult.spectral_indices.soil_index.toFixed(4)}`,
    ];

    info.forEach(line => {
        if (line === '') { y += 3; return; }
        if (line === 'SUMMARY' || line === 'SPECTRAL ANALYSIS') {
            doc.setFontSize(11);
            doc.setTextColor(30);
            doc.text(line, margin, y);
            doc.setFontSize(9);
            doc.setTextColor(60);
            y += 6;
            return;
        }
        doc.text(line, margin, y);
        y += 5;
    });

    // Disturbances
    if (analysisResult.disturbances.length > 0) {
        y += 5;
        doc.setFontSize(11);
        doc.setTextColor(30);
        doc.text('DETECTED DISTURBANCES', margin, y);
        y += 7;

        doc.setFontSize(8);
        analysisResult.disturbances.forEach((d, i) => {
            if (y > 270) { doc.addPage(); y = margin; }

            doc.setTextColor(220, 50, 50);
            doc.text(`[${i + 1}] ${d.id} — ${d.cross_reference.classification}`, margin, y);
            y += 4;

            doc.setTextColor(60);
            doc.text(`  Coords: ${d.latitude.toFixed(6)}, ${d.longitude.toFixed(6)}  |  Prob: ${(d.probability * 100).toFixed(1)}%  |  Area: ${d.area_sqkm.toFixed(4)} km²`, margin, y);
            y += 4;
            doc.text(`  Mineral: ${d.mineral_type}  |  Severity: ${d.severity}`, margin, y);
            y += 4;

            const detailLines = doc.splitTextToSize(`  ${d.cross_reference.details}`, 175);
            detailLines.forEach(l => {
                if (y > 275) { doc.addPage(); y = margin; }
                doc.text(l, margin, y);
                y += 4;
            });
            y += 3;
        });
    }

    // Footer
    if (y > 260) { doc.addPage(); y = margin; }
    y += 5;
    doc.setDrawColor(200);
    doc.line(margin, y, 195, y);
    y += 6;
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text('Generated by GeoGuard AI — Cross-referenced with Mining Surveillance System (MSS)', margin, y);
    y += 4;
    doc.text('Government of India — Ministry of Mines', margin, y);

    doc.save(`GeoGuard_Report_${analysisResult.analysis_id}_${new Date().toISOString().split('T')[0]}.pdf`);
    showToast('📥 PDF report downloaded!');
}

function copyReport() {
    const text = document.getElementById('reportContent').textContent;
    navigator.clipboard.writeText(text).then(() => {
        showToast('📋 Report copied to clipboard!');
    }).catch(() => {
        showToast('❌ Failed to copy');
    });
}

// ═══════════════════════════════════════════════════════════════
//  TOAST NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════
function showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 4500);
}
