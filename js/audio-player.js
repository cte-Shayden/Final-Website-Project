const audioEl = document.getElementById('backgroundMusic');
const musicToggle = document.getElementById('musicToggle');
const volumeSlider = document.getElementById('volumeSlider');
const musicInfo = document.getElementById('musicInfo');
const musicTrack = document.getElementById('musicTrack');

const sourceEl = audioEl.querySelector('source');
const audioSource = sourceEl?.getAttribute('src') || audioEl.getAttribute('src') || '';
const trackName = audioSource
    ? decodeURIComponent(audioSource.split('/').pop()).replace(/\.(mp3|wav|ogg|flac|m4a)$/i, '')
    : 'Unknown Track';

let infoTimeout = null;

audioEl.volume = 0.3;
volumeSlider.value = 30;
musicTrack.textContent = trackName;

function updateButton(playing) {
    musicToggle.textContent = playing ? '♫ Music: ON' : '♫ Music: OFF';
    musicToggle.classList.toggle('playing', playing);
}

function showInfo() {
    musicInfo.classList.add('show');
    clearTimeout(infoTimeout);
    infoTimeout = setTimeout(() => {
        musicInfo.classList.remove('show');
    }, 5000);
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
    updateButton(false);
});

audioEl.addEventListener('error', () => {
    musicToggle.textContent = '♫ Music: ERROR';
    musicToggle.classList.remove('playing');
    console.warn('Error loading audio file', audioSource);
});
