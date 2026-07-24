let allHistory = [];

document.addEventListener('DOMContentLoaded', () => {
    fetchData();

    document.getElementById('refresh-history').addEventListener('click', fetchData);

    let searchTimeout;
    document.getElementById('search-history').addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(filterAndRender, 300);
    });
});

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function fetchData() {
    try {
        // 為了在 GitHub Pages 上運作，直接讀取同目錄下的 data.json
        // 本地測試時可能會遇到 CORS，建議使用 Live Server 等工具
        // 加入 timestamp 防止 GitHub Pages/CDN 快取，避免更新後仍顯示舊資料
        const response = await fetch(`data.json?t=${Date.now()}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        allHistory = data.history || [];
        filterAndRender();

    } catch (error) {
        console.error('取得資料失敗:', error);
        document.getElementById('history-tbody').innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-secondary);">目前尚無特效開啟紀錄</td>
            </tr>
        `;
    }
}

function filterAndRender() {
    const query = document.getElementById('search-history').value.toLowerCase();

    const filtered = !query ? allHistory : allHistory.filter(record =>
        (record.action1 && record.action1.toLowerCase().includes(query)) ||
        (record.action2 && record.action2.toLowerCase().includes(query)) ||
        (record.activatedBy && record.activatedBy.toLowerCase().includes(query))
    );

    renderData(filtered);
}

function renderData(filteredHistory) {
    const tbody = document.getElementById('history-tbody');
    tbody.innerHTML = ''; // 清空原本的載入文字

    filteredHistory = [...filteredHistory].sort((a, b) => {
        // 後端輸出的欄位是 activatedAt（含時間）與 date（僅日期），沒有 Time 欄位
        const timeA = a.activatedAt ? new Date(a.activatedAt) : new Date(a.date);
        const timeB = b.activatedAt ? new Date(b.activatedAt) : new Date(b.date);
        return timeB - timeA;
    });

    if (filteredHistory.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-secondary);">目前尚無特效開啟紀錄</td></tr>`;
        return;
    }

    // 渲染每一筆紀錄
    filteredHistory.forEach(record => {
        const tr = document.createElement('tr');

        // 處理時間格式
        const dateStr = record.date; // e.g. "2026-07-20"
        let displayTime = dateStr;

        if (record.activatedAt) {
            const actDate = new Date(record.activatedAt);
            displayTime = actDate.toLocaleString('zh-TW', {
                month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit'
            });
        }

        tr.innerHTML = `
            <td style="color: var(--text-secondary)">${escapeHtml(displayTime)}</td>
            <td style="font-weight: 500;">${escapeHtml(record.action1)}</td>
            <td style="font-weight: 500;">${escapeHtml(record.action2)}</td>
            <td><i class="fa-solid fa-user-check" style="color: var(--ffxiv-gold); margin-right: 5px;"></i> ${escapeHtml(record.activatedBy)}</td>
        `;

        tbody.appendChild(tr);
    });
}
