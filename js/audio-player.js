import { PitchShifter } from './soundtouch.js';

// DOM Elements
const musicToggle = document.getElementById('musicToggle');
const musicPrev = document.getElementById('musicPrev');
const musicRandom = document.getElementById('musicRandom');
const musicLoop = document.getElementById('musicLoop');
const musicSkip = document.getElementById('musicSkip');
const volumeSlider = document.getElementById('volumeSlider');
const pitchSlider = document.getElementById('pitchSlider');
const pitchLabel = document.getElementById('pitchLabel');
const speedSlider = document.getElementById('speedSlider');
const speedLabel = document.getElementById('speedLabel');
const tempoSlider = document.getElementById('tempoSlider');
const tempoLabel = document.getElementById('tempoLabel');
const musicInfo = document.getElementById('musicInfo');
const musicTrack = document.getElementById('musicTrack');
const upNextTrack = document.getElementById('upNextTrack');
const musicWidget = document.getElementById('musicWidget');
const musicWidgetButton = document.getElementById('musicWidgetButton');
const musicWidgetPanel = document.getElementById('musicWidgetPanel');
const widgetClose = document.getElementById('widgetClose');
const audioEl = document.getElementById('backgroundMusic');

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
    'audio/mus_muscle.ogg',
    'audio/FriendsNoMore.ogg'
];

// State Management
let currentTrackIndex = 0;
let isRandom = false;
let isLoop = false;
let infoTimeout = null;
let audioContext = null;
let outputGain = null;
let pitchShifter = null;
let currentBuffer = null;
let currentProgressPercent = 0;
let isPlaying = false;
let nativeFallback = false;
const defaultVolume = 0.3;

// Widget Drag State
let widgetDragging = false;
let widgetDragMoved = false;
let widgetDragStart = { x: 0, y: 0 };
let widgetStart = { x: 0, y: 0 };

// --- Initialization ---
volumeSlider.value = defaultVolume * 100;
if (pitchSlider) pitchSlider.value = 100;
if (speedSlider) speedSlider.value = 100;
if (tempoSlider) tempoSlider.value = 100;

function getTrackName(source) {
    if (!source) return "Unknown";
    return decodeURIComponent(source.split('/').pop())
        .replace(/\.(mp3|wav|ogg|flac|m4a)$/i, '')
        .replace(/_/g, ' ');
}

// --- Audio Core ---

async function initAudioContext() {
    if (audioContext) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContext();
    outputGain = audioContext.createGain();
    outputGain.gain.value = volumeSlider.value / 100;
    outputGain.connect(audioContext.destination);
}

async function fetchAudioBuffer(source) {
    const response = await fetch(source);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    return await audioContext.decodeAudioData(arrayBuffer);
}

function setStatus(message, isError = false) {
    musicInfo.textContent = message;
    musicInfo.classList.toggle('error', isError);
    musicInfo.classList.add('show');
    clearTimeout(infoTimeout);
    infoTimeout = setTimeout(() => musicInfo.classList.remove('show'), 5000);
}

function stopPlayback() {
    if (pitchShifter) {
        pitchShifter.disconnect();
        pitchShifter = null;
    }
    audioEl.pause();
    isPlaying = false;
    updateButton(false);
}

async function startPlayback(startPercent = 0) {
    await initAudioContext();
    if (audioContext.state === 'suspended') await audioContext.resume();

    stopPlayback();

    if (!currentBuffer) {
        await playNativeTrack();
        return;
    }

    try {
        pitchShifter = new PitchShifter(audioContext, currentBuffer, 4096, handleTrackEnd);
        
        // Sync engine to slider values
        pitchShifter.pitch = Number(pitchSlider.value) / 100;
        pitchShifter.rate = Number(speedSlider.value) / 100;
        pitchShifter.tempo = Number(tempoSlider.value) / 100;
        
        pitchShifter.connect(outputGain);
        
        if (startPercent > 0) pitchShifter.percentagePlayed = startPercent;
        
        isPlaying = true;
        updateButton(true);
        setStatus(`Playing: ${getTrackName(tracks[currentTrackIndex])}`);
    } catch (e) {
        console.error("PitchShifter failed", e);
        await playNativeTrack();
    }
}

async function playNativeTrack() {
    nativeFallback = true;
    audioEl.src = tracks[currentTrackIndex];
    audioEl.volume = volumeSlider.value / 100;
    audioEl.playbackRate = Number(speedSlider.value) / 100;
    
    try {
        await audioEl.play();
        isPlaying = true;
        updateButton(true);
        setStatus('Native Fallback (No Pitch/Tempo)');
    } catch (error) {
        setStatus('Playback failed', true);
    }
}

async function loadTrack(index, autoPlay = false) {
    stopPlayback();
    currentTrackIndex = (index + tracks.length) % tracks.length;
    const source = tracks[currentTrackIndex];
    musicTrack.textContent = getTrackName(source);
    
    try {
        await initAudioContext();
        setStatus('Loading audio...');
        currentBuffer = await fetchAudioBuffer(source);
        nativeFallback = false;
        setStatus('Ready');
    } catch (error) {
        console.warn('Advanced audio failed, using native mode.');
        nativeFallback = true;
        currentBuffer = null;
    }

    currentProgressPercent = 0;
    if (autoPlay) await startPlayback(0);
    updateUpNext();
}

function handleTrackEnd() {
    isLoop ? loadTrack(currentTrackIndex, true) : loadNextTrack(true);
}

function updateUpNext() {
    let nextIdx = isRandom ? Math.floor(Math.random() * tracks.length) : (currentTrackIndex + 1) % tracks.length;
    upNextTrack.textContent = getTrackName(tracks[nextIdx]);
}

async function loadNextTrack(play = false) {
    let nextIdx = isRandom ? Math.floor(Math.random() * tracks.length) : (currentTrackIndex + 1) % tracks.length;
    await loadTrack(nextIdx, play);
}

async function loadPreviousTrack(play = false) {
    const prevIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    await loadTrack(prevIndex, play);
}

function updateButton(playing) {
    musicToggle.textContent = playing ? '♫ Music: ON' : '♫ Music: OFF';
    musicToggle.classList.toggle('playing', playing);
}

// --- EVENT LISTENERS ---

// Play/Pause
musicToggle.addEventListener('click', async () => {
    if (isPlaying) {
        if (pitchShifter) currentProgressPercent = pitchShifter.percentagePlayed;
        stopPlayback();
    } else {
        await startPlayback(currentProgressPercent);
    }
});

// Navigation
musicPrev.addEventListener('click', () => loadPreviousTrack(isPlaying));
musicSkip.addEventListener('click', () => loadNextTrack(isPlaying));

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

// Sliders
volumeSlider.addEventListener('input', (e) => {
    const val = e.target.value / 100;
    if (outputGain) outputGain.gain.value = val;
    audioEl.volume = val;
});

pitchSlider?.addEventListener('input', (e) => {
    const val = e.target.value;
    pitchLabel.textContent = `${val}%`;
    if (pitchShifter) pitchShifter.pitch = val / 100;
});

speedSlider?.addEventListener('input', (e) => {
    const val = e.target.value;
    speedLabel.textContent = `${val}%`;
    if (pitchShifter) pitchShifter.rate = val / 100;
    audioEl.playbackRate = val / 100;
});

tempoSlider?.addEventListener('input', (e) => {
    const val = e.target.value;
    tempoLabel.textContent = `${val}%`;
    if (pitchShifter) pitchShifter.tempo = val / 100;
});

// Widget Dragging
musicWidgetButton.addEventListener('pointerdown', (e) => {
    widgetDragging = true;
    widgetDragMoved = false;
    widgetDragStart = { x: e.clientX, y: e.clientY };
    const rect = musicWidget.getBoundingClientRect();
    widgetStart = { x: rect.left, y: rect.top };
    musicWidgetButton.setPointerCapture(e.pointerId);
});

musicWidgetButton.addEventListener('pointermove', (e) => {
    if (!widgetDragging) return;
    const dx = e.clientX - widgetDragStart.x;
    const dy = e.clientY - widgetDragStart.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) widgetDragMoved = true;
    
    musicWidget.style.left = `${widgetStart.x + dx}px`;
    musicWidget.style.top = `${widgetStart.y + dy}px`;
});

musicWidgetButton.addEventListener('pointerup', (e) => {
    widgetDragging = false;
    musicWidgetButton.releasePointerCapture(e.pointerId);
});

musicWidgetButton.addEventListener('click', () => {
    if (!widgetDragMoved) musicWidgetPanel.classList.toggle('open');
});

widgetClose.addEventListener('click', () => musicWidgetPanel.classList.remove('open'));

// Native Audio End Event
audioEl.addEventListener('ended', () => {
    if (nativeFallback) handleTrackEnd();
});

// Initial Load
loadTrack(currentTrackIndex, false);