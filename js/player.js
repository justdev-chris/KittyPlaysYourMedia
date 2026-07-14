// ============================================
// PLAYER.JS - Media Controls + Keyboard
// ============================================

import { showNotification } from './ui.js';

let videoPlayer = null;
let audioPlayer = null;
let currentPlayer = null;
let isPlaying = false;

export function initPlayer(video, audio) {
    videoPlayer = video;
    audioPlayer = audio;
    
    videoPlayer.addEventListener('ended', () => {
        isPlaying = false;
        updatePlayButton(false);
    });
    audioPlayer.addEventListener('ended', () => {
        isPlaying = false;
        updatePlayButton(false);
    });
    
    videoPlayer.addEventListener('timeupdate', updateTimeDisplay);
    audioPlayer.addEventListener('timeupdate', updateTimeDisplay);
}

export function playFile(file) {
    if (!file) {
        console.warn('No file provided');
        return;
    }
    
    const isVideo = file.type?.startsWith('video/') || 
                    file.name?.match(/\.(mp4|webm|mov|avi|mkv|m4v)$/i);
    const isAudio = file.type?.startsWith('audio/') || 
                    file.name?.match(/\.(mp3|wav|flac|aac|ogg|m4a)$/i);
    
    const url = URL.createObjectURL(file);
    
    if (isVideo) {
        videoPlayer.style.display = 'block';
        audioPlayer.style.display = 'none';
        videoPlayer.src = url;
        currentPlayer = videoPlayer;
    } else if (isAudio) {
        videoPlayer.style.display = 'none';
        audioPlayer.style.display = 'block';
        audioPlayer.src = url;
        currentPlayer = audioPlayer;
    } else {
        videoPlayer.style.display = 'block';
        audioPlayer.style.display = 'none';
        videoPlayer.src = url;
        currentPlayer = videoPlayer;
    }
    
    const playPromise = currentPlayer.play();
    if (playPromise !== undefined) {
        playPromise.then(() => {
            isPlaying = true;
            updatePlayButton(true);
        }).catch(() => {
            showNotification('🐱 Click play to start');
        });
    }
}

export function togglePlay() {
    if (!currentPlayer) {
        const event = new CustomEvent('play-first-file');
        document.dispatchEvent(event);
        return;
    }
    
    if (currentPlayer.paused) {
        currentPlayer.play();
        isPlaying = true;
    } else {
        currentPlayer.pause();
        isPlaying = false;
    }
    updatePlayButton(!currentPlayer.paused);
}

export function setVolume(value) {
    const vol = Math.max(0, Math.min(1, value));
    if (videoPlayer) videoPlayer.volume = vol;
    if (audioPlayer) audioPlayer.volume = vol;
    
    const slider = document.getElementById('volume-slider');
    if (slider) slider.value = vol;
    
    const btn = document.getElementById('btn-volume');
    if (btn) {
        if (vol === 0) btn.textContent = '🔇';
        else if (vol < 0.5) btn.textContent = '🔉';
        else btn.textContent = '🔊';
    }
}

export function setSpeed(speed) {
    if (videoPlayer) videoPlayer.playbackRate = speed;
    if (audioPlayer) audioPlayer.playbackRate = speed;
}

export function seek(seconds) {
    if (currentPlayer) {
        currentPlayer.currentTime = Math.max(0, Math.min(
            currentPlayer.duration || 0,
            currentPlayer.currentTime + seconds
        ));
    }
}

function updatePlayButton(playing) {
    const btn = document.getElementById('btn-play');
    if (btn) {
        btn.textContent = playing ? '⏸' : '▶';
        btn.style.background = playing ? '#FF8C00' : '#333';
    }
}

function updateTimeDisplay() {
    const display = document.getElementById('time-display');
    if (!display || !currentPlayer) return;
    
    const current = formatTime(currentPlayer.currentTime);
    const total = formatTime(currentPlayer.duration || 0);
    display.textContent = `${current} / ${total}`;
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function getCurrentPlayer() { return currentPlayer; }
export function isCurrentlyPlaying() { return isPlaying; }