// --- Setup Theme Toggle ---
const themeToggle = document.getElementById('theme-toggle');
const htmlEl = document.documentElement;
let isDark = true;

themeToggle.addEventListener('click', () => {
    isDark = !isDark;
    htmlEl.setAttribute('data-theme', isDark ? 'dark' : 'light');
    themeToggle.innerHTML = isDark ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
    updateChartTheme(); // Update Chart.js colors based on theme
});


// --- Audio Context for Buzzer ---
let audioCtx;
function playBuzzer() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); // 800Hz beep
    
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.5);
}

// --- Chart setup ---
const ctx = document.getElementById('vitalsChart').getContext('2d');
Chart.defaults.font.family = "'Outfit', sans-serif";
let chartColors = {
    text: '#f0f0f5',
    grid: 'rgba(255, 255, 255, 0.1)',
    hr: 'rgb(239, 68, 68)',
    spo2: 'rgb(59, 130, 246)'
};

const vitalsChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [
            {
                label: 'Heart Rate (bpm)',
                borderColor: chartColors.hr,
                backgroundColor: 'rgba(239, 68, 68, 0.5)',
                data: [],
                tension: 0.4,
                yAxisID: 'y'
            },
            {
                label: 'SpO2 (%)',
                borderColor: chartColors.spo2,
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                data: [],
                tension: 0.4,
                yAxisID: 'y1'
            }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
            legend: {
                labels: { color: chartColors.text }
            }
        },
        scales: {
            x: {
                ticks: { color: chartColors.text },
                grid: { color: chartColors.grid }
            },
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                min: 40,
                max: 180,
                ticks: { color: chartColors.text },
                grid: { color: chartColors.grid }
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                min: 80,
                max: 100,
                ticks: { color: chartColors.text },
                grid: { drawOnChartArea: false }
            }
        }
    }
});

function updateChartTheme() {
    chartColors.text = isDark ? '#f0f0f5' : '#0f172a';
    chartColors.grid = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    
    vitalsChart.options.plugins.legend.labels.color = chartColors.text;
    vitalsChart.options.scales.x.ticks.color = chartColors.text;
    vitalsChart.options.scales.x.grid.color = chartColors.grid;
    vitalsChart.options.scales.y.ticks.color = chartColors.text;
    vitalsChart.options.scales.y.grid.color = chartColors.grid;
    vitalsChart.options.scales.y1.ticks.color = chartColors.text;
    
    vitalsChart.update();
}

// --- Simulation Logic ---
let simInterval;
let timeSec = 0;
let isMonitoring = false;

// DOM Elements
const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');
const btnDownload = document.getElementById('btn-download');
const valHr = document.getElementById('val-hr');
const valSpo2 = document.getElementById('val-spo2');
const valTemp = document.getElementById('val-temp');
const valRisk = document.getElementById('val-risk');

const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const alertMessage = document.getElementById('alert-message');

// Modal Elements
const reportModal = document.getElementById('report-modal');
const closeModal = document.getElementById('close-modal');
const reportTextarea = document.getElementById('report-content');
const btnDownloadTxt = document.getElementById('btn-download-txt');

// Base vitals
let currentHR = 75;
let currentSpo2 = 98;
let currentTemp = 36.5;

let historyLog = [];

function generateVitals() {
    // Determine state
    // We will simulate a gradual decline into a critical state over 30 seconds
    let riskScore = 0;
    
    if (timeSec < 10) {
        // Normal State
        currentHR = 70 + Math.floor(Math.random() * 10);
        currentSpo2 = 97 + Math.floor(Math.random() * 3);
        currentTemp = 36.5 + (Math.random() * 0.4);
        riskScore = Math.floor(Math.random() * 20); // 0-20
    } else if (timeSec < 20) {
        // Warning State - Early signs of SMI (HR drops/spikes, SpO2 lowers slightly)
        currentHR = 90 + Math.floor(Math.random() * 15);
        currentSpo2 = 94 + Math.floor(Math.random() * 3);
        currentTemp = 36.1 + (Math.random() * 0.3);
        riskScore = 40 + Math.floor(Math.random() * 20); // 40-60
    } else if (timeSec < 30) {
        // Critical State - AI detects SMI patterns
        currentHR = 130 + Math.floor(Math.random() * 20); // Tachycardia
        currentSpo2 = 88 + Math.floor(Math.random() * 4); // Hypoxia
        currentTemp = 35.5 + (Math.random() * 0.5); // Sweating/Drop in temp
        riskScore = 85 + Math.floor(Math.random() * 15); // 85-100
    } else {
        // Loop back
        timeSec = 0;
    }

    currentTemp = parseFloat(currentTemp.toFixed(1));

    // Update UI
    valHr.innerText = currentHR;
    valSpo2.innerText = currentSpo2;
    valTemp.innerText = currentTemp;
    valRisk.innerText = riskScore;
    
    // Evaluate Status
    updateStatus(riskScore);

    // Update Chart
    const timeLabel = new Date().toLocaleTimeString([], {hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit'});
    
    if (vitalsChart.data.labels.length > 20) {
        vitalsChart.data.labels.shift();
        vitalsChart.data.datasets[0].data.shift();
        vitalsChart.data.datasets[1].data.shift();
    }
    
    vitalsChart.data.labels.push(timeLabel);
    vitalsChart.data.datasets[0].data.push(currentHR);
    vitalsChart.data.datasets[1].data.push(currentSpo2);
    vitalsChart.update();

    // Log for report
    historyLog.push(`[${timeLabel}] HR: ${currentHR} bpm | SpO2: ${currentSpo2}% | Temp: ${currentTemp} C | Risk: ${riskScore}/100`);

    timeSec += 1; // Increment by 1 second essentially
}

function updateStatus(riskScore) {
    statusIndicator.className = 'status-indicator';
    alertMessage.className = 'alert-box';
    const recText = document.getElementById('recommendation-text');
    
    if (riskScore < 30) {
        statusIndicator.classList.add('normal');
        statusText.innerText = "NORMAL";
        alertMessage.innerText = "All monitored vitals are within normal physiological ranges. AI detects no anomalies.";
        valRisk.style.color = 'var(--status-normal)';
        if(recText) recText.innerHTML = "<strong>Maintain current routine:</strong> Continue normal activity. Light, preventative aerobic exercises are safe and recommended to maintain baseline health.";
    } else if (riskScore < 75) {
        statusIndicator.classList.add('warning');
        statusText.innerText = "WARNING DETECTED";
        alertMessage.innerText = "AI detected irregular HRV patterns and minor hypoxia. Recommending patient rest & observation.";
        valRisk.style.color = 'var(--status-warning)';
        if(recText) recText.innerHTML = "<strong>Pursed-Lip Breathing & Rest:</strong> Pause current physical activity. Inhale deeply for 2s, exhale 4s through pursed lips to combat hypoxia safely.";
    } else {
        statusIndicator.classList.add('critical');
        statusText.innerText = "CRITICAL ALERT (SMI RISK)";
        alertMessage.classList.add('critical-bg');
        alertMessage.innerHTML = "<strong>CRITICAL:</strong> High probability of Silent Myocardial Infarction. Emergency contacts notified via SMS gateway.";
        valRisk.style.color = 'var(--status-critical)';
        playBuzzer(); // Play the web audio buzzer
        if(recText) recText.innerHTML = "<strong>EMERGENCY REST REQUIRED:</strong> Stop all exercise and movement entirely! Assume an orthopneic seating position, stay calm, and execute very slow diaphragmatic breathing while waiting for emergency services.";
    }
}

// --- Controls ---
btnStart.addEventListener('click', () => {
    if(isMonitoring) return;
    
    // For browser policy, initialize Audio Context on user interaction
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    isMonitoring = true;
    btnStart.disabled = true;
    btnStop.disabled = false;
    btnDownload.disabled = false;
    
    statusIndicator.className = 'status-indicator normal';
    statusText.innerText = "INITIALIZING...";
    alertMessage.innerText = "Connecting to wearable sensors...";
    const recContainer = document.getElementById('live-recommendation');
    if (recContainer) recContainer.style.display = 'block';
    const recText = document.getElementById('recommendation-text');
    if(recText) recText.innerText = "Waiting for initial sensor data to generate clinical protocol...";
    
    // Clear chart
    vitalsChart.data.labels = [];
    vitalsChart.data.datasets[0].data = [];
    vitalsChart.data.datasets[1].data = [];
    vitalsChart.update();
    
    historyLog = [];
    timeSec = 0;

    // Start interval
    setTimeout(() => {
        simInterval = setInterval(generateVitals, 1500); // Update every 1.5s
    }, 1000);
});

btnStop.addEventListener('click', () => {
    if(!isMonitoring) return;
    isMonitoring = false;
    clearInterval(simInterval);
    
    btnStart.disabled = false;
    btnStop.disabled = true;
    
    statusIndicator.className = 'status-indicator';
    statusText.innerText = "STANDBY";
    alertMessage.className = 'alert-box';
    alertMessage.innerText = "Monitoring paused. System on standby.";
});

// --- View / Download Report Modal ---
btnDownload.addEventListener('click', () => {
    if (historyLog.length === 0) {
        alert("No data to view yet.");
        return;
    }
    
    const header = "AI-HADS SESSION REPORT\n========================\n\n";
    const footer = "\n\nEnd of Report.";
    const reportContent = header + historyLog.join("\n") + footer;
    
    reportTextarea.value = reportContent;
    reportModal.classList.add('show');
});

closeModal.addEventListener('click', () => {
    reportModal.classList.remove('show');
});

// Close modal when clicking outside of it
window.addEventListener('click', (event) => {
    if (event.target === reportModal) {
        reportModal.classList.remove('show');
    }
});

btnDownloadTxt.addEventListener('click', () => {
    const blob = new Blob([reportTextarea.value], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `AI_HADS_Report_${new Date().getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// --- Advanced 3D Aurora Borealis Background ---
const bgCanvas = document.getElementById('bg-canvas');
if (bgCanvas) {
    const scene = new THREE.Scene();
    
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 25; // Proper depth
    camera.position.y = -5; // Look up at the "sky"
    camera.lookAt(0,0,0);

    const renderer = new THREE.WebGLRenderer({ canvas: bgCanvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Aurora Ribbons Parameters
    const ribbonCount = 5;
    const segmentsX = 50;
    const segmentsY = 8;
    const ribbons = [];
    const auroraMaterials = [];
    
    for (let i = 0; i < ribbonCount; i++) {
        // Wide planes to span across screen
        const geometry = new THREE.PlaneGeometry(100, 15, segmentsX, segmentsY);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00f3ff, 
            transparent: true,
            opacity: 0.15 + (Math.random() * 0.05), // Layered transparency
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        auroraMaterials.push(material);

        const mesh = new THREE.Mesh(geometry, material);
        // Stagger ribbons in Z-depth
        mesh.position.z = i * 2.5 - (ribbonCount * 1.5);
        mesh.position.y = (Math.random() - 0.5) * 5;
        mesh.rotation.x = -Math.PI / 6; // Angle them towards the camera like curtains
        
        // Cache original vertices for wave math
        const positions = mesh.geometry.attributes.position.array;
        const initialPositions = new Float32Array(positions.length);
        for(let j = 0; j < positions.length; j++){
            initialPositions[j] = positions[j];
        }
        mesh.userData.initial = initialPositions;
        mesh.userData.phaseOffset = Math.random() * Math.PI * 2;
        mesh.userData.speedFactor = 0.5 + Math.random() * 0.5;

        scene.add(mesh);
        ribbons.push(mesh);
    }

    // Capture mouse target for parallax
    let targetX = 0;
    let targetY = 0;
    document.addEventListener('mousemove', (e) => {
        targetX = (e.clientX - window.innerWidth / 2) * 0.005;
        targetY = (e.clientY - window.innerHeight / 2) * 0.005;
    });

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    const clock = new THREE.Clock();

    // The working dynamic color representing the patient's state
    const currentColor = new THREE.Color(0x0a9396); 

    function animateBg() {
        requestAnimationFrame(animateBg);
        const time = clock.getElapsedTime();

        let speedMult = 0.7; // Gentle default aurora sway
        let targetHex = 0x0a9396; // Bioluminescent ocean/teal
        
        // Dynamically shift color & wind speed based on health metrics
        if (typeof isMonitoring !== 'undefined' && isMonitoring) {
            if(typeof currentHR !== 'undefined' && currentHR > 120) {
                speedMult = 3.0; // Violent stormy aurora
                targetHex = 0xd90429; // Scarlet Red
            } else if (typeof currentHR !== 'undefined' && currentHR > 90) {
                speedMult = 1.8; // Alert swaying
                targetHex = 0xf48c06; // Vibrant Amber
            }
        }
        
        // Beautiful lerping allows colors to smoothly bleed from Green -> Red
        currentColor.lerp(new THREE.Color(targetHex), 0.03);
        
        auroraMaterials.forEach((mat, index) => {
            const hsl = {};
            currentColor.getHSL(hsl);
            // Slightly offset lightness for depth volume
            mat.color.setHSL(hsl.h, hsl.s, hsl.l + (index * 0.03));
        });

        // Wavy organic morphing
        ribbons.forEach((mesh) => {
            const posAttr = mesh.geometry.attributes.position;
            const initPos = mesh.userData.initial;
            const phase = mesh.userData.phaseOffset;
            const speed = mesh.userData.speedFactor * speedMult;
            
            for (let i = 0; i < posAttr.count; i++) {
                const i3 = i * 3;
                const x = initPos[i3]; 
                const y = initPos[i3 + 1]; 
                const z = initPos[i3 + 2];
                
                // Flowing wave equation combining x/y space and time
                const twist = Math.sin(x * 0.05 + time * speed + phase) * 2.5;
                const ripple = Math.cos(x * 0.1 - time * speed * 1.5) * y * 0.25;
                
                // Bend the planes physically
                posAttr.setY(i, y + twist + ripple);
                posAttr.setZ(i, z + Math.sin(time * speed + x * 0.03) * 1.5);
            }
            posAttr.needsUpdate = true;
            
            // Slow lateral global drift simulating winds
            mesh.position.x = Math.sin(time * 0.15 + phase) * 4;
        });

        // Super smooth Parallax 
        camera.position.x += (targetX - camera.position.x) * 0.05;
        camera.position.y += (-targetY - 5 - camera.position.y) * 0.05;
        camera.lookAt(0,0,0);

        renderer.render(scene, camera);
    }
    
    animateBg();
}
