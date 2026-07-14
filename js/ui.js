// ============================================
// UI.JS - DOM Updates + Cat Animations
// ============================================

import { playFileById } from './app.js';

// ----- RENDER PLAYLIST -----
export function renderPlaylist(files, activeId = null) {
    const container = document.getElementById('playlist-items');
    if (!container) return;
    
    if (!files || files.length === 0) {
        container.innerHTML = '<li class="empty-playlist">🐱 No files yet. Click 📂 to add!</li>';
        return;
    }
    
    container.innerHTML = files.map(file => `
        <li data-id="${file.id}" class="${activeId === file.id ? 'active' : ''}">
            <span class="play-icon">${activeId === file.id ? '▶️' : '🎵'}</span>
            <span class="file-name">${escapeHtml(file.name)}</span>
            <span class="file-size">${formatSize(file.size)}</span>
            <span class="file-delete" data-id="${file.id}">🐟</span>
        </li>
    `).join('');
    
    // Event listeners
    container.querySelectorAll('li[data-id]').forEach(li => {
        const id = parseFloat(li.dataset.id);
        li.addEventListener('click', () => playFileById(id));
        const deleteBtn = li.querySelector('.file-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const event = new CustomEvent('remove-file', { detail: { id } });
                document.dispatchEvent(event);
            });
        }
    });
    
    // Update count
    const count = document.getElementById('file-count');
    if (count) count.textContent = `${files.length} files`;
}

// ----- RENDER TREE -----
export function renderTree(tree, container = null) {
    const treeContainer = container || document.getElementById('tree-container');
    if (!treeContainer) return;
    
    if (!tree || Object.keys(tree).length === 0 || 
        (tree._files && tree._files.length === 0 && Object.keys(tree).length === 1)) {
        treeContainer.innerHTML = '<div class="tree-empty">🌳 No folders yet</div>';
        return;
    }
    
    treeContainer.innerHTML = buildTreeHTML(tree, 0);
    
    // Add expand/collapse listeners
    treeContainer.querySelectorAll('.tree-toggle').forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const parent = toggle.closest('.tree-item');
            const children = parent?.nextElementSibling;
            if (children && children.classList.contains('tree-children')) {
                children.classList.toggle('collapsed');
                toggle.classList.toggle('collapsed');
            }
        });
    });
    
    // File click listeners
    treeContainer.querySelectorAll('.tree-item.file').forEach(item => {
        item.addEventListener('click', () => {
            const id = parseFloat(item.dataset.id);
            if (id) playFileById(id);
        });
    });
}

function buildTreeHTML(node, depth) {
    let html = '';
    const indent = '&nbsp;'.repeat(depth * 4);
    
    // Sort keys: folders first, then files
    const keys = Object.keys(node).filter(k => k !== '_files').sort();
    const files = node._files || [];
    
    // Folders
    for (const key of keys) {
        const childNode = node[key];
        const hasChildren = Object.keys(childNode).filter(k => k !== '_files').length > 0 || 
                           (childNode._files && childNode._files.length > 0);
        
        html += `
            <div class="tree-item folder" data-path="${key}">
                <span class="tree-toggle collapsed">▼</span>
                <span class="folder-icon">📁</span>
                <span>${escapeHtml(key)}</span>
                <span style="font-size:12px;color:#888;margin-left:auto;">${childNode._files?.length || 0}</span>
            </div>
            <div class="tree-children collapsed">
                ${buildTreeHTML(childNode, depth + 1)}
            </div>
        `;
    }
    
    // Files
    for (const file of files) {
        const icon = file.type?.startsWith('video/') ? '🎬' : 
                     file.type?.startsWith('audio/') ? '🎵' : '📄';
        html += `
            <div class="tree-item file" data-id="${file.id}">
                <span class="file-icon">${icon}</span>
                <span>${escapeHtml(file.name)}</span>
                <span style="font-size:11px;color:#888;margin-left:auto;">${formatSize(file.size)}</span>
            </div>
        `;
    }
    
    return html;
}

// ----- UPDATE UI -----
export function updateUI(data) {
    // Generic UI update function
    if (data.playlist) renderPlaylist(data.playlist);
    if (data.tree) renderTree(data.tree);
}

// ----- NOTIFICATIONS -----
export function showNotification(message, duration = 2000) {
    // Remove old notification
    const old = document.querySelector('.kitty-notification');
    if (old) old.remove();
    
    const div = document.createElement('div');
    div.className = 'kitty-notification';
    div.textContent = message;
    Object.assign(div.style, {
        position: 'fixed',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#2a2a2a',
        color: '#f5e6d3',
        padding: '12px 24px',
        borderRadius: '20px',
        border: '2px solid #FF8C00',
        boxShadow: '0 4px 20px rgba(0,0,0,0.8)',
        zIndex: '9999',
        fontSize: '14px',
        fontWeight: '600',
        transition: 'opacity 0.3s ease',
        opacity: '1',
        fontFamily: 'Segoe UI, sans-serif'
    });
    
    document.body.appendChild(div);
    
    setTimeout(() => {
        div.style.opacity = '0';
        setTimeout(() => div.remove(), 300);
    }, duration);
}

// ----- HELPERS -----
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

// ----- LOADING SPINNER -----
export function showLoading(show) {
    const overlay = document.getElementById('loading-overlay') || createLoadingOverlay();
    overlay.style.display = show ? 'flex' : 'none';
}

function createLoadingOverlay() {
    const div = document.createElement('div');
    div.id = 'loading-overlay';
    div.style.cssText = `
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.7);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    div.innerHTML = `
        <div style="text-align:center;">
            <div class="yarn-spinner"></div>
            <p style="color:#f5e6d3;margin-top:16px;font-size:16px;">🐱 Loading...</p>
        </div>
    `;
    document.body.appendChild(div);
    return div;
}

// ----- EXPOSE FOR APP.JS -----
export default {
    renderPlaylist,
    renderTree,
    updateUI,
    showNotification,
    showLoading
};