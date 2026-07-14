// ============================================
// APP.JS - Main Application Logic
// ============================================

import { initDB, savePlaylist, getPlaylists, saveSettings, getSettings } from './db.js';
import { initPlayer, playFile, togglePlay, setVolume, setSpeed, getCurrentPlayer } from './player.js';
import { renderTree, renderPlaylist, updateUI, showNotification } from './ui.js';

// ----- STATE -----
export const state = {
    currentTab: 'all',
    tabs: ['all', 'favorites', 'recent'],
    files: [],
    treeData: {},
    currentFile: null,
    playlists: {},
    settings: { volume: 0.8, speed: 1.0, lastTab: 'all' }
};

// ----- DOM REFS -----
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const fileInput = $('#file-input');
const mediaPlayer = $('#media-player');
const audioPlayer = $('#audio-player');
const btnPlay = $('#btn-play');
const btnUpload = $('#btn-upload');
const btnSettings = $('#btn-settings');
const btnNewTab = $('#btn-new-tab');
const btnFullscreen = $('#btn-fullscreen');
const volumeSlider = $('#volume-slider');
const speedSelect = $('#speed-select');
const tabBar = document.querySelector('.tabs-container');

// ----- PLAY FIRST FILE EVENT -----
document.addEventListener('play-first-file', () => {
    const tab = state.currentTab;
    const files = state.playlists[tab] || [];
    if (files.length > 0 && files[0].data instanceof File) {
        playFile(files[0].data);
    } else {
        showNotification('😺 No files in this playlist!');
    }
});

// ----- REMOVE FILE EVENT -----
document.addEventListener('remove-file', (e) => {
    removeFile(e.detail.id);
});

// ----- PLAY FILE EVENT -----
document.addEventListener('play-file', (e) => {
    playFileById(e.detail.id);
});

// ----- INIT -----
export async function initApp() {
    // Load settings
    const settings = await getSettings();
    if (settings) {
        state.settings = settings;
        volumeSlider.value = settings.volume;
        speedSelect.value = settings.speed;
        setVolume(settings.volume);
        setSpeed(parseFloat(settings.speed));
    }

    // Load playlists
    const playlists = await getPlaylists();
    if (playlists && playlists.length > 0) {
        playlists.forEach(p => {
            state.playlists[p.name] = p.files || [];
        });
        const tabNames = playlists.map(p => p.name);
        state.tabs = tabNames.length > 0 ? tabNames : ['all', 'favorites', 'recent'];
    }

    // Load last tab
    const lastTab = state.settings.lastTab || 'all';
    if (state.tabs.includes(lastTab)) {
        state.currentTab = lastTab;
    } else {
        state.currentTab = state.tabs[0];
    }

    // Setup UI
    renderTabs();
    renderTree(state.treeData);
    renderPlaylist(state.playlists[state.currentTab] || []);

    // Init player
    initPlayer(mediaPlayer, audioPlayer);

    // Event listeners
    setupEventListeners();

    console.log('🐱 KittyPlaysYourMedia initialized!');
}

// ----- RENDER TABS -----
function renderTabs() {
    const existingTabs = tabBar.querySelectorAll('.tab-btn:not(#btn-new-tab)');
    existingTabs.forEach(t => t.remove());

    state.tabs.forEach(tabName => {
        const btn = document.createElement('button');
        btn.className = `tab-btn${tabName === state.currentTab ? ' active' : ''}`;
        btn.dataset.tab = tabName;
        
        let label = tabName;
        if (tabName === 'all') label = '📋 All Files';
        else if (tabName === 'favorites') label = '⭐ Favorites';
        else if (tabName === 'recent') label = '🕐 Recent';
        else label = `📁 ${tabName}`;
        
        btn.innerHTML = label;
        
        if (tabName !== 'all' && tabName !== 'favorites' && tabName !== 'recent') {
            const close = document.createElement('span');
            close.className = 'close-tab';
            close.textContent = '✕';
            close.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteTab(tabName);
            });
            btn.appendChild(close);
        }
        
        btn.addEventListener('click', () => switchTab(tabName));
        tabBar.insertBefore(btn, document.getElementById('btn-new-tab'));
    });
}

// ----- TAB MANAGEMENT -----
function switchTab(tabName) {
    if (!state.tabs.includes(tabName)) return;
    
    state.currentTab = tabName;
    const tabs = tabBar.querySelectorAll('.tab-btn:not(#btn-new-tab)');
    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
    
    const files = state.playlists[tabName] || [];
    renderPlaylist(files);
    
    state.settings.lastTab = tabName;
    saveSettings(state.settings);
}

function deleteTab(tabName) {
    if (tabName === 'all' || tabName === 'favorites' || tabName === 'recent') return;
    
    const idx = state.tabs.indexOf(tabName);
    if (idx > -1) {
        state.tabs.splice(idx, 1);
        delete state.playlists[tabName];
        
        if (state.currentTab === tabName) {
            switchTab(state.tabs[0] || 'all');
        }
        renderTabs();
        savePlaylist(tabName, []);
        showNotification(`🗑️ Tab "${tabName}" deleted`);
    }
}

function createTab(name) {
    name = name.trim() || 'Untitled';
    name = name.replace(/[^a-zA-Z0-9 ]/g, '');
    if (!name) name = 'Untitled';
    
    let finalName = name;
    let counter = 1;
    while (state.tabs.includes(finalName)) {
        finalName = `${name} (${counter})`;
        counter++;
    }
    
    state.tabs.push(finalName);
    state.playlists[finalName] = [];
    renderTabs();
    switchTab(finalName);
    savePlaylist(finalName, []);
    showNotification(`📁 Tab "${finalName}" created!`);
}

// ----- FILE MANAGEMENT -----
export function addFiles(fileList) {
    const tab = state.currentTab;
    if (!state.playlists[tab]) {
        state.playlists[tab] = [];
    }
    
    const newFiles = [];
    for (const file of fileList) {
        const exists = state.playlists[tab].some(f => 
            f.name === file.name && f.size === file.size
        );
        if (exists) continue;
        
        const fileData = {
            id: Date.now() + Math.random() * 1000 + newFiles.length,
            name: file.name,
            path: file.webkitRelativePath || file.name,
            size: file.size,
            type: file.type || 'unknown',
            data: file,
            addedAt: Date.now()
        };
        newFiles.push(fileData);
        state.playlists[tab].push(fileData);
    }
    
    if (newFiles.length > 0) {
        renderPlaylist(state.playlists[tab]);
        updateTree(state.playlists[tab]);
        savePlaylist(tab, state.playlists[tab]);
        showNotification(`🐱 ${newFiles.length} file(s) added!`);
        
        const player = document.getElementById('media-player');
        if (!player.src || player.paused) {
            const firstFile = state.playlists[tab][0];
            if (firstFile && firstFile.data instanceof File) {
                playFile(firstFile.data);
            }
        }
    } else {
        showNotification('😺 Files already in playlist!');
    }
}

export function removeFile(fileId) {
    const tab = state.currentTab;
    if (!state.playlists[tab]) return;
    
    const idx = state.playlists[tab].findIndex(f => f.id === fileId);
    if (idx > -1) {
        state.playlists[tab].splice(idx, 1);
        renderPlaylist(state.playlists[tab]);
        updateTree(state.playlists[tab]);
        savePlaylist(tab, state.playlists[tab]);
        showNotification('🗑️ File removed');
    }
}

export function playFileById(fileId) {
    const tab = state.currentTab;
    if (!state.playlists[tab]) return;
    
    const file = state.playlists[tab].find(f => f.id === fileId);
    if (file && file.data instanceof File) {
        state.currentFile = file;
        playFile(file.data);
        renderPlaylist(state.playlists[tab], fileId);
    } else {
        showNotification('⚠️ File not found. Please re-add it.');
    }
}

// ----- TREE VIEW -----
function updateTree(files) {
    const tree = {};
    files.forEach(file => {
        const parts = file.path.split('/');
        if (parts.length > 1) {
            let current = tree;
            for (let i = 0; i < parts.length - 1; i++) {
                const folder = parts[i];
                if (!current[folder]) current[folder] = {};
                current = current[folder];
            }
            const fileName = parts[parts.length - 1];
            if (!current._files) current._files = [];
            current._files.push(file);
        } else {
            if (!tree._files) tree._files = [];
            tree._files.push(file);
        }
    });
    
    state.treeData = tree;
    renderTree(tree);
}

// ----- EVENT LISTENERS -----
function setupEventListeners() {
    btnUpload.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            addFiles(e.target.files);
        }
        fileInput.value = '';
    });

    btnPlay.addEventListener('click', togglePlay);

    volumeSlider.addEventListener('input', (e) => {
        const vol = parseFloat(e.target.value);
        setVolume(vol);
        state.settings.volume = vol;
        saveSettings(state.settings);
    });

    speedSelect.addEventListener('change', (e) => {
        const speed = parseFloat(e.target.value);
        setSpeed(speed);
        state.settings.speed = speed;
        saveSettings(state.settings);
    });

    btnFullscreen.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.();
        } else {
            document.exitFullscreen?.();
        }
    });

    btnNewTab.addEventListener('click', () => {
        const name = prompt('🐱 Enter tab name:');
        if (name) createTab(name);
    });

    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
        
        switch(e.key) {
            case ' ': e.preventDefault(); togglePlay(); break;
            case 'ArrowLeft': e.preventDefault(); mediaPlayer.currentTime = Math.max(0, mediaPlayer.currentTime - 10); break;
            case 'ArrowRight': e.preventDefault(); mediaPlayer.currentTime = Math.min(mediaPlayer.duration || 0, mediaPlayer.currentTime + 10); break;
            case 'ArrowUp': e.preventDefault(); setVolume(Math.min(1, parseFloat(volumeSlider.value) + 0.05)); break;
            case 'ArrowDown': e.preventDefault(); setVolume(Math.max(0, parseFloat(volumeSlider.value) - 0.05)); break;
            case 'f': e.preventDefault(); btnFullscreen.click(); break;
            case 'm': e.preventDefault(); setVolume(volumeSlider.value > 0 ? 0 : state.settings.volume || 0.8); break;
        }
    });

    document.addEventListener('dragover', (e) => e.preventDefault());
    document.addEventListener('drop', (e) => {
        e.preventDefault();
        if (e.dataTransfer.files.length > 0) {
            addFiles(e.dataTransfer.files);
        }
    });

    btnSettings.addEventListener('click', () => {
        const treePanel = document.getElementById('tree-panel');
        if (window.innerWidth <= 480) {
            treePanel.classList.toggle('open');
        } else {
            showNotification('⚙️ Settings coming soon!');
        }
    });
}

// ----- START APP -----
document.addEventListener('DOMContentLoaded', initApp);

window.__kitty = { state, addFiles, removeFile, playFileById, createTab, switchTab };