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
    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatRoute(rawRoute) {
        if (!rawRoute || rawRoute === '未設定') return rawRoute;
        const parts = rawRoute.split(/ → |->/);
        let detectedRegion = "";
        const cleanParts = parts.map(p => {
            const token = p.split(/[ 　]/).filter(Boolean)[0] || p;
            const regionMatch = token.match(/[\u4e00-\u9fa5]+/);
            const pointMatch = token.match(/[A-Za-z0-9]+/);
            
            const region = regionMatch ? regionMatch[0] : "";
            const point = pointMatch ? pointMatch[0] : token;
            
            if (!detectedRegion && region) {
                detectedRegion = region;
            }
            return point;
        });
        
        const routeStr = cleanParts.join(' → ');
        return detectedRegion ? `(${detectedRegion})${routeStr}` : routeStr;
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
        tbody.innerHTML = `<tr><td colspan="6"><div class="loading-state"><div class="spinner"></div><p>載入探索日誌中...</p></div></td></tr>`;
        
        try {
            // 加入 timestamp 防止 GitHub 快取
            const res = await fetch(`${API_BASE}?t=${new Date().getTime()}`);
            if (!res.ok) throw new Error('Data fetch failed');
            const data = await res.json();
            
            // 處理歷史資料
            allHistory = data.history || [];
            allHistory.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            filterHistory();
            
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-secondary);">無任何探索紀錄</td></tr>`;
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
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-secondary);">無任何探索紀錄</td></tr>`;
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
            
            // Format Items with Tooltips
            let itemsHtml = row.items || '---';
            if (row.itemBreakdown && row.itemBreakdown !== "[]" && row.itemBreakdown !== "") {
                try {
                    const breakdown = JSON.parse(row.itemBreakdown);
                    itemsHtml = '';
                    breakdown.forEach(b => {
                        const itemName = b.name || b.Name;
                        const qty = b.quantity || b.Quantity || 1;
                        const itemSource = b.source || b.Source;
                        const itemPrice = b.unitPrice !== undefined ? b.unitPrice : b.UnitPrice;
                        
                        const safeItemName = escapeHtml(itemName);
                        const displayName = qty > 1 ? `${safeItemName}x${escapeHtml(qty)}` : safeItemName;
                        const sourceText = itemSource === 'market' ? 'Universalis (市場均價)' : (itemSource === 'npc' ? 'NPC 商店賣價' : '無法販售');
                        const priceText = itemPrice > 0 ? `💰 ${itemPrice.toLocaleString()}` : '無法販售';
                        itemsHtml += `
                            <div class="item-container">
                                ${displayName}
                                <div class="item-tooltip">
                                    <div class="tooltip-title">${safeItemName}</div>
                                    <div class="tooltip-price">單價: <span>${priceText}</span></div>
                                    <div class="tooltip-source">來源: ${sourceText}</div>
                                </div>
                            </div>`;
                    });
                } catch (e) {
                    console.error("Failed to parse item breakdown:", e);
                }
            }

            // Format Estimated Value
            let estValueHtml = '<span class="no-sell" style="color: var(--text-secondary);">無資料</span>';
            if (row.estimatedValue !== undefined && row.estimatedValue !== null) {
                const val = row.estimatedValue === -1 ? 0 : row.estimatedValue;
                if (val === 0) {
                    estValueHtml = '<span style="color: var(--text-secondary);">💰 0</span>';
                } else {
                    estValueHtml = `<span style="color: var(--accent-color); font-weight: 600;">💰 ${val.toLocaleString()}</span>`;
                }
            }

            tr.innerHTML = `
                <td style="color: var(--text-secondary)">${escapeHtml(formatDateLocal(row.createdAt))}</td>
                <td style="font-weight: 500;">${emoji} ${escapeHtml(row.fleetName)}</td>
                <td>${escapeHtml(formatRoute(row.route))}</td>
                <td class="item-list">${itemsHtml}</td>
                <td>${estValueHtml}</td>
                <td><i class="fa-solid fa-user-check" style="color: var(--ffxiv-gold); margin-right: 5px;"></i> ${escapeHtml(row.recordedBy || '搗蛋麻糬')}</td>
            `;
            tr.dataset.rawId = row.rawId || '';
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

    // --- Row Context Menu: 複製 /fcfleet edit 指令 ---
    // 貼到 Discord 訊息框後，Discord 會辨識出這是一個合法的 slash command 並顯示互動預覽，
    // 按下 Enter 即可直接帶著這筆紀錄的 id 開啟編輯視窗，不需要再手動打指令或找 ID。
    const contextMenu = document.getElementById('context-menu');
    const copyToast = document.getElementById('copy-toast');
    let contextMenuTargetId = null;
    let copyToastTimeout;

    document.getElementById('history-tbody').addEventListener('contextmenu', (e) => {
        const row = e.target.closest('tr[data-raw-id]');
        if (!row || !row.dataset.rawId) return;

        e.preventDefault();
        contextMenuTargetId = row.dataset.rawId;

        contextMenu.style.left = `${e.clientX}px`;
        contextMenu.style.top = `${e.clientY}px`;
        contextMenu.classList.add('visible');
    });

    document.addEventListener('click', () => {
        contextMenu.classList.remove('visible');
    });

    document.getElementById('ctx-copy-edit').addEventListener('click', async () => {
        if (!contextMenuTargetId) return;
        const command = `/fcfleet edit id:${contextMenuTargetId}`;

        try {
            await navigator.clipboard.writeText(command);
        } catch (err) {
            console.error('複製失敗:', err);
            window.prompt('無法自動複製，請手動複製以下指令：', command);
            contextMenu.classList.remove('visible');
            return;
        }

        contextMenu.classList.remove('visible');

        copyToast.textContent = '✅ 已複製編輯指令，貼到 Discord 即可開啟編輯視窗';
        copyToast.classList.add('visible');
        clearTimeout(copyToastTimeout);
        copyToastTimeout = setTimeout(() => copyToast.classList.remove('visible'), 2500);
    });

    // --- Initial Load ---
    fetchData();

    // Auto refresh status every 5 minutes (for GitHub cache)
    setInterval(fetchData, 300000);
});
