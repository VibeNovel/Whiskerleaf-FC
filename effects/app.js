document.addEventListener('DOMContentLoaded', () => {
    fetchData();
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
        const response = await fetch('data.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        renderData(data);
        
    } catch (error) {
        console.error('取得資料失敗:', error);
        document.getElementById('history-tbody').innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-secondary);">目前尚無特效開啟紀錄</td>
            </tr>
        `;
    }
}

function renderData(data) {


    const tbody = document.getElementById('history-tbody');
    tbody.innerHTML = ''; // 清空原本的載入文字

    const filteredHistory = data.history || [];
    filteredHistory.sort((a, b) => {
        // If Time (timestamp) exists, sort by it. Otherwise fallback to date string.
        const timeA = a.Time ? new Date(a.Time) : new Date(a.date);
        const timeB = b.Time ? new Date(b.Time) : new Date(b.date);
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
