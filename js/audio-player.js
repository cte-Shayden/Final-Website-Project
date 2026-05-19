import { PitchShifter } from './soundtouch.js';

// --- UI Elements ---
const musicToggle = document.getElementById('musicToggle');
const musicPrev = document.getElementById('musicPrev');
const musicSkip = document.getElementById('musicSkip');
const musicRandom = document.getElementById('musicRandom');
const musicLoop = document.getElementById('musicLoop');

const volumeSlider = document.getElementById('volumeSlider');
const pitchSlider = document.getElementById('pitchSlider');
const speedSlider = document.getElementById('speedSlider');
const tempoSlider = document.getElementById('tempoSlider');

const pitchLabel = document.getElementById('pitchLabel');
const speedLabel = document.getElementById('speedLabel');
const tempoLabel = document.getElementById('tempoLabel');

const musicInfo = document.getElementById('musicInfo');
const musicTrack = document.getElementById('musicTrack');
const upNextTrack = document.getElementById('upNextTrack');

const musicWidget = document.getElementById('musicWidget');
const musicWidgetButton = document.getElementById('musicWidgetButton');
const musicWidgetPanel = document.getElementById('musicWidgetPanel');
const widgetClose = document.getElementById('widgetClose');
const audioEl = document.getElementById('backgroundMusic');

// --- Playlist ---
const tracks = [
    'audio/mus_anothermedium.ogg',
    'audio/mus_core.ogg',
    'audio/mus_vsasgore.ogg',
    'audio/mus_x_undyne.ogg',
    'audio/mus_z_ending.ogg',
    'audio/mus_amalgam.ogg',
    'audio/mus_ambientwater.ogg',
    'audio/mus_battle1.ogg',
    'audio/mus_battle2.ogg',
    'audio/mus_reunited.ogg',
    'audio/mus_ruins.ogg',
    'audio/mus_sansdate.ogg',
    'audio/mus_snowy.ogg',
    'audio/mus_mettaton_neo.ogg',
    'audio/mus_dummybattle.ogg',
    'audio/Give_Up.mp3',
    'audio/mus_muscle.ogg'
];

// --- State Variables ---
let currentTrackIndex = 0;
let isPlaying = false;
let isRandom = false;
let isLoop = false;

let audioContext = null;
let outputGain = null;
let pitchShifter = null;
let currentBuffer = null;
let currentProgressPercent = 0;
let nativeFallback = false;

let infoTimeout;
const defaultVolume = 0.3;

// Dragging state for the widget
let isDragging = false;
let hasMoved = false;
let startX, startY, widgetX, widgetY;

// Initialize sliders
volumeSlider.value = defaultVolume * 100;
if (pitchSlider) pitchSlider.value = 100;
if (speedSlider) speedSlider.value = 100;
if (tempoSlider) tempoSlider.value = 100;


// --- Helper Functions ---

// Cleans up file path to get a pretty track title
function getTrackName(source) {
    if (!source) return "Unknown";
    let filename = source.split('/').pop();
    // Strip extension and replace underscores with spaces
    return decodeURIComponent(filename)
        .replace(/\.[^/.]+$/, "")
        .replace(/_/g, ' ');
}

function setStatus(message, isError = false) {
    musicInfo.textContent = message;
    if (isError) {
        musicInfo.classList.add('error');
    } else {
        musicInfo.classList.remove('error');
    }
    musicInfo.classList.add('show');
    
    clearTimeout(infoTimeout);
    infoTimeout = setTimeout(() => {
        musicInfo.classList.remove('show');
    }, 5000);
}

function updateUpNext() {
    let nextIndex;
    if (isRandom) {
        nextIndex = Math.floor(Math.random() * tracks.length);
    } else {
        nextIndex = (currentTrackIndex + 1) % tracks.length;
    }
    upNextTrack.textContent = getTrackName(tracks[nextIndex]);
}

function updateButtonState() {
    musicToggle.textContent = isPlaying ? '♫ Music: ON' : '♫ Music: OFF';
    if (isPlaying) {
        musicToggle.classList.add('playing');
    } else {
        musicToggle.classList.remove('playing');
    }
}


// --- Audio Core Logic ---

async function initAudio() {
    if (audioContext) return;
    
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContextClass();
    outputGain = audioContext.createGain();
    outputGain.gain.value = volumeSlider.value / 100;
    outputGain.connect(audioContext.destination);
}

function stopPlayback() {
    if (pitchShifter) {
        pitchShifter.disconnect();
        pitchShifter = null;
    }
    audioEl.pause();
    isPlaying = false;
    updateButtonState();
}

async function playNative() {
    nativeFallback = true;
    audioEl.src = tracks[currentTrackIndex];
    audioEl.volume = volumeSlider.value / 100;
    audioEl.playbackRate = speedSlider.value / 100;
    
    try {
        await audioEl.play();
        isPlaying = true;
        updateButtonState();
        setStatus('Playing (Native Fallback - No Pitch/Tempo adjustment)');
    } catch (err) {
        console.error(err);
        setStatus('Playback failed entirely.', true);
    }
}

async function startPlayback(resumePercent = 0) {
    await initAudio();
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }

    stopPlayback();

    // If buffer failed to load earlier, drop straight to native HTML5 audio
    if (!currentBuffer) {
        playNative();
        return;
    }

    try {
        pitchShifter = new PitchShifter(audioContext, currentBuffer, 4096, handleTrackEnd);
        
        // Apply current slider values
        pitchShifter.pitch = pitchSlider.value / 100;
        pitchShifter.rate = speedSlider.value / 100;
        pitchShifter.tempo = tempoSlider.value / 100;
        
        pitchShifter.connect(outputGain);
        
        if (resumePercent > 0) {
            pitchShifter.percentagePlayed = resumePercent;
        }
        
        isPlaying = true;
        updateButtonState();
        setStatus(`Playing: ${getTrackName(tracks[currentTrackIndex])}`);
    } catch (e) {
        console.warn("SoundTouch PitchShifter failed, falling back to native:", e);
        playNative();
    }
}

async function loadTrack(index, autoPlay = false) {
    stopPlayback();
    
    // Keep index in array bounds
    currentTrackIndex = (index + tracks.length) % tracks.length;
    const currentSource = tracks[currentTrackIndex];
    musicTrack.textContent = getTrackName(currentSource);
    
    try {
        await initAudio();
        setStatus('Loading track...');
        
        // Fetch and decode audio data
        const res = await fetch(currentSource);
        const arrayBuffer = await res.arrayBuffer();
        currentBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        nativeFallback = false;
        setStatus('Ready');
    } catch (err) {
        console.warn('Advanced audio loading failed. Will use native mode.', err);
        currentBuffer = null;
        nativeFallback = true;
    }

    currentProgressPercent = 0;
    if (autoPlay) {
        startPlayback(0);
    }
    updateUpNext();
}

function handleTrackEnd() {
    if (isLoop) {
        loadTrack(currentTrackIndex, true);
    } else {
        changeTrack(1); // Next track
    }
}

function changeTrack(direction) {
    let nextIndex;
    if (isRandom) {
        nextIndex = Math.floor(Math.random() * tracks.length);
    } else {
        nextIndex = currentTrackIndex + direction;
    }
    loadTrack(nextIndex, isPlaying);
}


// --- Event Listeners ---

musicToggle.addEventListener('click', () => {
    if (isPlaying) {
        if (pitchShifter) {
            currentProgressPercent = pitchShifter.percentagePlayed;
        }
        stopPlayback();
    } else {
        startPlayback(currentProgressPercent);
    }
});

musicPrev.addEventListener('click', () => changeTrack(-1));
musicSkip.addEventListener('click', () => changeTrack(1));

musicRandom.addEventListener('click', () => {
    isRandom = !isRandom;
    musicRandom.textContent = isRandom ? '♫ Random: ON' : '♫ Random: OFF';
    musicRandom.classList.toggle('playing', isRandom);
    updateUpNext();
});

musicLoop.addEventListener('click', () => {
    isLoop = !isLoop;
    musicLoop.textContent = isLoop ? '♫ Loop: ON' : '♫ Loop: OFF';
    musicLoop.classList.toggle('playing', isLoop);
});

// Slider Inputs
volumeSlider.addEventListener('input', (e) => {
    const volumeLevel = e.target.value / 100;
    if (outputGain) outputGain.gain.value = volumeLevel;
    audioEl.volume = volumeLevel;
});

pitchSlider?.addEventListener('input', (e) => {
    pitchLabel.textContent = `${e.target.value}%`;
    if (pitchShifter) pitchShifter.pitch = e.target.value / 100;
});

speedSlider?.addEventListener('input', (e) => {
    speedLabel.textContent = `${e.target.value}%`;
    if (pitchShifter) pitchShifter.rate = e.target.value / 100;
    audioEl.playbackRate = e.target.value / 100;
});

tempoSlider?.addEventListener('input', (e) => {
    tempoLabel.textContent = `${e.target.value}%`;
    if (pitchShifter) pitchShifter.tempo = e.target.value / 100;
} );


// --- Widget Dragging & Toggling ---

musicWidgetButton.addEventListener('mousedown', (e) => {
    isDragging = true;
    hasMoved = false;
    startX = e.clientX;
    startY = e.clientY;
    
    const rect = musicWidget.getBoundingClientRect();
    widgetX = rect.left;
    widgetY = rect.top;
    
    e.preventDefault(); // Prevents weird text selection while dragging
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const movementX = e.clientX - startX;
    const movementY = e.clientY - startY;
    
    if (Math.abs(movementX) > 4 || Math.abs(movementY) > 4) {
        hasMoved = true;
    }
    
    musicWidget.style.left = `${widgetX + movementX}px`;
    musicWidget.style.top = `${widgetY + movementY}px`;
});

document.addEventListener('mouseup', () => {
    isDragging = false;
});

musicWidgetButton.addEventListener('click', () => {
    // Only toggle panel if the user clicked instead of dragged
    if (!hasMoved) {
        musicWidgetPanel.classList.toggle('open');
    }
});

widgetClose.addEventListener('click', () => {
    musicWidgetPanel.classList.remove('open');
});

audioEl.addEventListener('ended', () => {
    if (nativeFallback) handleTrackEnd();
});


// Kick off the first track layout setup on load
loadTrack(currentTrackIndex, false);