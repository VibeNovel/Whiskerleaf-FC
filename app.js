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

    function formatDateLocal(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleString('zh-TW', {
            month: '2-digit', day: '2-digit', 
            hour: '2-digit', minute: '2-digit'
        });
    }

    // --- Fetch Data ---
    async function fetchData() {
        const tbody = document.getElementById('history-tbody');
        tbody.innerHTML = `<tr><td colspan="4"><div class="loading-state"><div class="spinner"></div><p>載入探索日誌中...</p></div></td></tr>`;
        
        try {
            // 加入 timestamp 防止 GitHub 快取
            const res = await fetch(`${API_BASE}?t=${new Date().getTime()}`);
            if (!res.ok) throw new Error('Data fetch failed');
            const data = await res.json();
            
            // 處理歷史資料
            allHistory = data.history || [];
            filterHistory();
            
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-secondary);">無任何探索紀錄</td></tr>`;
            console.error(err);
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
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-secondary);">無任何探索紀錄</td></tr>`;
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
