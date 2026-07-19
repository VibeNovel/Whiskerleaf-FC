document.addEventListener('DOMContentLoaded', () => {
    // --- Tabs Logic ---
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });

    // --- State Variables ---
    let allHistory = [];
    let filteredHistory = [];
    let currentPage = 1;
    const itemsPerPage = 15;

    // --- API Endpoints ---
    const API_BASE = 'data.json'; // 靜態 JSON 檔案

    // --- Formatting Helpers ---
    function formatRoute(rawRoute) {
        if (!rawRoute || rawRoute === '未設定') return rawRoute;
        const parts = rawRoute.split(/ → |->/);
        return parts.map(p => {
            const token = p.split(/[ 　]/).filter(Boolean)[0];
            return token || p;
        }).join(' → ');
    }

    function formatTimeRelative(targetDateStr) {
        const target = new Date(targetDateStr);
        const now = new Date();
        const diffMs = target - now;
        
        if (diffMs <= 0) return '已返航等待處理';
        
        const diffMins = Math.floor(diffMs / 60000);
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        
        return `剩餘 ${hours} 小時 ${mins} 分鐘`;
    }
    
    function formatDateLocal(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleString('zh-TW', {
            month: '2-digit', day: '2-digit', 
            hour: '2-digit', minute: '2-digit'
        });
    }

    // --- Fetch Data ---
    async function fetchData() {
        const grid = document.getElementById('fleet-grid');
        const tbody = document.getElementById('history-tbody');
        grid.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>同步衛星訊號中...</p></div>`;
        tbody.innerHTML = `<tr><td colspan="4" class="loading-state"><div class="spinner"></div><p>載入航海日誌中...</p></td></tr>`;
        
        try {
            // 加入 timestamp 防止 GitHub 快取
            const res = await fetch(`${API_BASE}?t=${new Date().getTime()}`);
            if (!res.ok) throw new Error('Data fetch failed');
            const data = await res.json();
            
            // 處理狀態資料
            renderStatus(data.status || []);
            
            // 處理歷史資料
            allHistory = data.history || [];
            filterHistory();
            
        } catch (err) {
            grid.innerHTML = `<div class="loading-state" style="color: #ef4444;"><i class="fa-solid fa-triangle-exclamation fa-2x"></i><p>無法讀取艦隊資料</p></div>`;
            tbody.innerHTML = `<tr><td colspan="4" class="loading-state" style="color: #ef4444;"><i class="fa-solid fa-triangle-exclamation fa-2x"></i><p>無法讀取艦隊資料</p></td></tr>`;
            console.error(err);
        }
    }

    function renderStatus(data) {
        const grid = document.getElementById('fleet-grid');
        grid.innerHTML = '';
            
        // Sort: Subs first, then Airships, then by Name
            data.sort((a, b) => {
                if (a.type !== b.type) return a.type === 'SUBMERSIBLE' ? -1 : 1;
                return a.name.localeCompare(b.name);
            });

            data.forEach(ship => {
                const isExploring = ship.status === 'EXPLORING';
                let isReturned = false;
                let timeText = '--';
                let percent = 0;
                let statusClass = 'idle';
                let statusText = '待機中';
                let statusIcon = 'fa-anchor';

                if (isExploring && ship.returnAt) {
                    const returnAt = new Date(ship.returnAt);
                    const now = new Date();
                    isReturned = now >= returnAt;
                    
                    if (isReturned) {
                        statusClass = 'returned';
                        statusText = '已回航';
                        statusIcon = 'fa-check-circle';
                        timeText = `於 ${formatDateLocal(returnAt)}`;
                        percent = 100;
                    } else {
                        statusClass = 'exploring';
                        statusText = '探索中';
                        statusIcon = 'fa-compass fa-spin';
                        timeText = `${formatTimeRelative(returnAt)} (預估: ${formatDateLocal(returnAt)})`;
                        
                        // Calculate dummy progress percentage based on lastDurationMinutes
                        // Actually we don't have start time sent from API easily, so we just show an animated bar
                        percent = 100; // Will use CSS animation if we want
                    }
                }

                const emoji = ship.type === 'SUBMERSIBLE' ? '🚤' : '🚁';
                const dest = isExploring && ship.selectedSectors ? formatRoute(ship.selectedSectors) : '未設定';
                const fav = ship.favoriteRoute ? formatRoute(ship.favoriteRoute) : '未設定';

                const card = document.createElement('div');
                card.className = 'fleet-card glass-panel';
                card.innerHTML = `
                    <div class="card-header">
                        <div class="ship-info">
                            <h3>${emoji} ${ship.name}</h3>
                            <span>Lv.${ship.rank}</span>
                        </div>
                        <div class="status-badge ${statusClass}">
                            <i class="fa-solid ${statusIcon}"></i> ${statusText}
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="info-row">
                            <span class="info-label">目前航線</span>
                            <span class="info-value">${dest}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">時間資訊</span>
                            <span class="info-value">${timeText}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">喜好航線</span>
                            <span class="info-value">${fav}</span>
                        </div>
                        ${isExploring && !isReturned ? `
                        <div class="progress-container">
                            <div class="progress-bar" style="width: 100%; animation: pulse 2s infinite"></div>
                        </div>` : ''}
                    </div>
                `;
                grid.appendChild(card);
            });
        }
    }

    // --- Search & Pagination Logic ---
    function filterHistory() {
        const query = document.getElementById('search-history').value.toLowerCase();
        
        if (!query) {
            filteredHistory = [...allHistory];
        } else {
            filteredHistory = allHistory.filter(h => 
                (h.fleetName && h.fleetName.toLowerCase().includes(query)) ||
                (h.route && h.route.toLowerCase().includes(query)) ||
                (h.items && h.items.toLowerCase().includes(query))
            );
        }
        
        currentPage = 1;
        renderTable();
    }

    function renderTable() {
        const tbody = document.getElementById('history-tbody');
        const pagination = document.getElementById('pagination');
        
        if (filteredHistory.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-secondary);">沒有找到符合的紀錄</td></tr>`;
            pagination.innerHTML = '';
            return;
        }

        const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageData = filteredHistory.slice(start, end);

        tbody.innerHTML = '';
        pageData.forEach(row => {
            const emoji = row.fleetType === 'SUBMERSIBLE' ? '🚤' : '🚁';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="color: var(--text-secondary)">${formatDateLocal(row.createdAt)}</td>
                <td style="font-weight: 500;">${emoji} ${row.fleetName}</td>
                <td>${formatRoute(row.route)}</td>
                <td class="item-list">${row.items || '---'}</td>
            `;
            tbody.appendChild(tr);
        });

        // Render Pagination
        pagination.innerHTML = '';
        
        // Prev button
        if (currentPage > 1) {
            const btn = document.createElement('button');
            btn.className = 'page-btn';
            btn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
            btn.onclick = () => { currentPage--; renderTable(); };
            pagination.appendChild(btn);
        }

        // Page numbers
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }

        for (let i = startPage; i <= endPage; i++) {
            const btn = document.createElement('button');
            btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
            btn.innerText = i;
            btn.onclick = () => { currentPage = i; renderTable(); };
            pagination.appendChild(btn);
        }

        // Next button
        if (currentPage < totalPages) {
            const btn = document.createElement('button');
            btn.className = 'page-btn';
            btn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
            btn.onclick = () => { currentPage++; renderTable(); };
            pagination.appendChild(btn);
        }
    }

    // --- Event Listeners ---
    document.getElementById('refresh-status').addEventListener('click', fetchData);
    document.getElementById('refresh-history').addEventListener('click', fetchData);
    
    let searchTimeout;
    document.getElementById('search-history').addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(filterHistory, 300);
    });

    // --- Initial Load ---
    fetchData();
    
    // Auto refresh status every 5 minutes (for GitHub cache)
    setInterval(fetchData, 300000);
});
