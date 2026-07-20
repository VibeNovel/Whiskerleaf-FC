document.addEventListener('DOMContentLoaded', () => {
    fetchData();
});

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
                <td colspan="4" class="loading-state">
                    <i class="fa-solid fa-inbox" style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.5;"></i>
                    目前尚無特效開啟紀錄
                </td>
            </tr>
        `;
    }
}

function renderData(data) {
    // 更新最後更新時間
    const updatedDate = new Date(data.lastUpdated);
    document.getElementById('lastUpdated').textContent = `最後更新時間: ${updatedDate.toLocaleString('zh-TW')}`;

    const tbody = document.getElementById('history-tbody');
    tbody.innerHTML = ''; // 清空原本的載入文字

    if (!data.history || data.history.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="loading-state">目前尚無歷史紀錄</td>
            </tr>
        `;
        return;
    }

    // 渲染每一筆紀錄
    data.history.forEach(record => {
        const tr = document.createElement('tr');
        
        // 處理時間格式
        const dateStr = record.date; // e.g. "2026-07-20"
        let displayTime = dateStr;
        
        if (record.activatedAt) {
            const actDate = new Date(record.activatedAt);
            const month = (actDate.getMonth() + 1).toString().padStart(2, '0');
            const day = actDate.getDate().toString().padStart(2, '0');
            const hours = actDate.getHours().toString().padStart(2, '0');
            const mins = actDate.getMinutes().toString().padStart(2, '0');
            displayTime = `${month}/${day} ${hours}:${mins}`;
        }

        tr.innerHTML = `
            <td style="color: var(--text-secondary)">${displayTime}</td>
            <td style="font-weight: 500;">${record.action1}</td>
            <td style="font-weight: 500;">${record.action2}</td>
            <td><i class="fa-solid fa-user-check" style="color: var(--ffxiv-gold); margin-right: 5px;"></i> ${record.activatedBy}</td>
        `;
        
        tbody.appendChild(tr);
    });
}
