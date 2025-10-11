// カスタムツールチップの実装
(function() {
    let tooltip = null;
    let tooltipTimeout = null;
    
    // ツールチップを作成
    function createTooltip() {
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.className = 'gantt-tooltip';
            tooltip.style.display = 'none';
            document.body.appendChild(tooltip);
        }
        return tooltip;
    }
    
    // ツールチップを表示
    function showTooltip(text, x, y) {
        const tip = createTooltip();
        tip.textContent = text;
        tip.style.display = 'block';
        
        // 画面外にはみ出さないように調整
        const tipRect = tip.getBoundingClientRect();
        const maxX = window.innerWidth - tipRect.width - 10;
        const maxY = window.innerHeight - tipRect.height - 10;
        
        tip.style.left = Math.min(x + 10, maxX) + 'px';
        tip.style.top = Math.min(y + 10, maxY) + 'px';
    }
    
    // ツールチップを非表示
    function hideTooltip() {
        if (tooltip) {
            tooltip.style.display = 'none';
        }
        if (tooltipTimeout) {
            clearTimeout(tooltipTimeout);
            tooltipTimeout = null;
        }
    }
    
    // イベントリスナーを設定
    document.addEventListener('mouseover', function(e) {
        const span = e.target.closest('.gantt_cell[data-column-name="resource_id"] span, .gantt_cell[data-column-name="place_id"] span');
        
        if (span) {
            const title = span.getAttribute('title');
            if (title) {
                // ブラウザデフォルトのツールチップを無効化
                span.setAttribute('data-title', title);
                span.removeAttribute('title');
                
                // カスタムツールチップを短い遅延で表示
                tooltipTimeout = setTimeout(() => {
                    showTooltip(title, e.clientX, e.clientY);
                }, 300); // 300ms後に表示
            }
        }
    });
    
    document.addEventListener('mouseout', function(e) {
        const span = e.target.closest('.gantt_cell[data-column-name="resource_id"] span, .gantt_cell[data-column-name="place_id"] span');
        
        if (span) {
            const dataTitle = span.getAttribute('data-title');
            if (dataTitle) {
                // title属性を復元
                span.setAttribute('title', dataTitle);
            }
            hideTooltip();
        }
    });
    
    // マウス移動時にツールチップの位置を更新
    document.addEventListener('mousemove', function(e) {
        if (tooltip && tooltip.style.display === 'block') {
            const tipRect = tooltip.getBoundingClientRect();
            const maxX = window.innerWidth - tipRect.width - 10;
            const maxY = window.innerHeight - tipRect.height - 10;
            
            tooltip.style.left = Math.min(e.clientX + 10, maxX) + 'px';
            tooltip.style.top = Math.min(e.clientY + 10, maxY) + 'px';
        }
    });
})();