const audioEl = document.getElementById('backgroundMusic');
const musicToggle = document.getElementById('musicToggle');
const musicRandom = document.getElementById('musicRandom');
const volumeSlider = document.getElementById('volumeSlider');
const musicInfo = document.getElementById('musicInfo');
const musicTrack = document.getElementById('musicTrack');

const tracks = [
    'audio/mus_anothermedium.ogg',
    'audio/mus_core.ogg',
    'audio/mus_vsasgore.ogg',
    'audio/mus_x_undyne.ogg',
    'audio/mus_z_ending.ogg'
];

const sourceEl = audioEl.querySelector('source');
const audioSource = sourceEl?.getAttribute('src') || audioEl.getAttribute('src') || '';
let currentTrackIndex = tracks.findIndex((track) => track.endsWith(audioSource.split('/').pop()));
if (currentTrackIndex === -1) currentTrackIndex = 0;

let isRandom = false;
let infoTimeout = null;

audioEl.volume = 0.3;
volumeSlider.value = 30;
loadTrack(currentTrackIndex);

function getTrackName(source) {
    return decodeURIComponent(source.split('/').pop()).replace(/\.(mp3|wav|ogg|flac|m4a)$/i, '').replace(/_/g, ' ');
}

function loadTrack(index) {
    currentTrackIndex = index;
    const source = tracks[index] || tracks[0];
    audioEl.src = source;
    audioEl.load();
    musicTrack.textContent = getTrackName(source);
}

function updateButton(playing) {
    musicToggle.textContent = playing ? '♫ Music: ON' : '♫ Music: OFF';
    musicToggle.classList.toggle('playing', playing);
}

function updateRandomButton() {
    musicRandom.textContent = isRandom ? '♫ Random: ON' : '♫ Random: OFF';
    musicRandom.classList.toggle('playing', isRandom);
}

function showInfo() {
    musicInfo.classList.add('show');
    clearTimeout(infoTimeout);
    infoTimeout = setTimeout(() => {
        musicInfo.classList.remove('show');
    }, 5000);
}

function pickRandomTrack() {
    if (tracks.length <= 1) return currentTrackIndex;
    let nextIndex = currentTrackIndex;
    while (nextIndex === currentTrackIndex) {
        nextIndex = Math.floor(Math.random() * tracks.length);
    }
    return nextIndex;
}

function loadRandomTrack(playAfterLoad = false) {
    const randomIndex = pickRandomTrack();
    loadTrack(randomIndex);
    if (playAfterLoad) {
        audioEl.play().catch((error) => {
            console.warn('Audio playback failed:', error);
            musicToggle.textContent = '♫ Music: ERROR';
            musicToggle.classList.remove('playing');
        });
    }
}

musicToggle.addEventListener('click', () => {
    if (audioEl.paused) {
        audioEl.play().catch((error) => {
            console.warn('Audio playback failed:', error);
            musicToggle.textContent = '♫ Music: ERROR';
            musicToggle.classList.remove('playing');
        });
    } else {
        audioEl.pause();
    }
});

musicRandom.addEventListener('click', () => {
    isRandom = !isRandom;
    updateRandomButton();
    if (isRandom) {
        loadRandomTrack(!audioEl.paused);
    }
});

volumeSlider.addEventListener('input', (event) => {
    audioEl.volume = event.target.value / 100;
});

audioEl.addEventListener('play', () => {
    updateButton(true);
    showInfo();
});

audioEl.addEventListener('pause', () => {
    updateButton(false);
});

audioEl.addEventListener('ended', () => {
    if (isRandom) {
        loadRandomTrack(true);
    } else {
        audioEl.play().catch((error) => {
            console.warn('Audio playback failed:', error);
            musicToggle.textContent = '♫ Music: ERROR';
            musicToggle.classList.remove('playing');
        });
    }
});

audioEl.addEventListener('error', () => {
    musicToggle.textContent = '♫ Music: ERROR';
    musicToggle.classList.remove('playing');
    console.warn('Error loading audio file', audioSource);
});
