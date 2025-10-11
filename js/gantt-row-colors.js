// 行ごとの色設定機能

// 30色のカラーパレット（原色・ビビット・パステル・蛍光色を組み合わせて最大限の差を出す）
const rowColorPalette = [
    '#FF0000', // 1. 原色の赤
    '#B3E5FC', // 2. パステルブルー
    '#00FF00', // 3. 原色の緑（蛍光）
    '#8B4513', // 4. ダークブラウン
    '#FF00FF', // 5. 原色のマゼンタ
    '#FFFACD', // 6. パステルイエロー
    '#0000FF', // 7. 原色の青
    '#FFB6C1', // 8. パステルピンク
    '#00FFFF', // 9. 原色のシアン
    '#4B0082', // 10. インディゴ（濃い紫）
    '#FFFF00', // 11. 原色の黄色
    '#E6E6FA', // 12. パステルラベンダー
    '#FF6600', // 13. ビビットオレンジ
    '#98D8C8', // 14. パステルミント
    '#C71585', // 15. ビビットピンク
    '#2F4F4F', // 16. ダークグレー
    '#39FF14', // 17. 蛍光グリーン
    '#FFE4E1', // 18. パステルローズ
    '#1E90FF', // 19. ビビットブルー
    '#FFD700', // 20. ゴールド
    '#8B008B', // 21. ダークマゼンタ
    '#BDFCC9', // 22. パステルライムグリーン
    '#FF1493', // 23. ビビットディープピンク
    '#556B2F', // 24. ダークオリーブグリーン
    '#FF69B4', // 25. ホットピンク
    '#E0FFFF', // 26. パステルシアン
    '#DC143C', // 27. クリムゾンレッド
    '#F0E68C', // 28. パステルカーキ
    '#00CED1', // 29. ビビットターコイズ
    '#9370DB'  // 30. ミディアムパープル
];

// 色の明度を計算する関数（0-255の範囲）
function getLuminance(hexColor) {
    // HEXカラーをRGBに変換
    const r = parseInt(hexColor.substring(1, 3), 16);
    const g = parseInt(hexColor.substring(3, 5), 16);
    const b = parseInt(hexColor.substring(5, 7), 16);
    
    // 相対輝度を計算（知覚的な明るさ）
    return (0.299 * r + 0.587 * g + 0.114 * b);
}

// 背景色に応じて適切なテキスト色を返す関数
function getTextColor(backgroundColor) {
    const luminance = getLuminance(backgroundColor);
    // 明度が128以上なら黒、未満なら白
    return luminance > 128 ? '#000000' : '#FFFFFF';
}

// 各色を少し暗くした進捗バー用の色を生成
function getProgressColor(baseColor, percent = -25) {
    let R = parseInt(baseColor.substring(1,3),16);
    let G = parseInt(baseColor.substring(3,5),16);
    let B = parseInt(baseColor.substring(5,7),16);

    R = parseInt(R * (100 + percent) / 100);
    G = parseInt(G * (100 + percent) / 100);
    B = parseInt(B * (100 + percent) / 100);

    R = (R<255)?R:255;  
    G = (G<255)?G:255;  
    B = (B<255)?B:255;  

    const RR = ((R.toString(16).length==1)?"0"+R.toString(16):R.toString(16));
    const GG = ((G.toString(16).length==1)?"0"+G.toString(16):G.toString(16));
    const BB = ((B.toString(16).length==1)?"0"+B.toString(16):B.toString(16));

    return "#"+RR+GG+BB;
}

// タスクのインデックスに基づいて色を取得
function getRowColor(task) {
    // 全タスクを取得してソート順を維持
    const tasks = gantt.getTaskByTime();
    const taskIndex = tasks.findIndex(t => t.id === task.id);
    
    if (taskIndex === -1) return rowColorPalette[0];
    
    // 20色を循環させる
    const colorIndex = taskIndex % rowColorPalette.length;
    return rowColorPalette[colorIndex];
}

// ガントチャート描画時に行ごとの色を適用
function applyRowColors() {
    const style = document.getElementById('gantt-row-colors-style') || document.createElement('style');
    style.id = 'gantt-row-colors-style';
    
    // 各タスクに対して個別のスタイルを生成
    const tasks = gantt.getTaskByTime();
    let cssRules = '';
    
    tasks.forEach((task, index) => {
        const baseColor = rowColorPalette[index % rowColorPalette.length];
        const progressColor = getProgressColor(baseColor, -25);
        const textColor = getTextColor(baseColor);
        
        cssRules += `
            .gantt_task_line[data-task-id="${task.id}"]:not(.gantt_additional_period) {
                background-color: ${baseColor} !important;
                border-color: ${baseColor} !important;
            }
            .gantt_task_line[data-task-id="${task.id}"]:not(.gantt_additional_period) .gantt_task_progress {
                background-color: ${progressColor} !important;
            }
            .gantt_task_line[data-task-id="${task.id}"]:not(.gantt_additional_period) .gantt_task_content {
                color: ${textColor} !important;
            }
        `;
    });
    
    // リソース/場所タイムラインのスタイル
    cssRules += `
        .gantt_resource_cell_empty {
            background-color: transparent !important;
        }
        .gantt_resource_cell_single .gantt_resource_marker {
            /* タスクの色が動的に適用される */
        }
        .gantt_resource_cell_overload {
            background-color: #000000 !important;
        }
        .gantt_resource_cell_overload .gantt_resource_marker {
            background-color: #000000 !important;
        }
        
        /* 試運転バーのスタイルを確実に適用 */
        .gantt_additional_period {
            background-color: #FF69B4 !important;
            border-color: #E91E63 !important;
            z-index: 2 !important;
        }
    `;
    
    style.innerHTML = cssRules;
    
    if (!document.getElementById('gantt-row-colors-style')) {
        document.head.appendChild(style);
    }
}

// リソース/場所タイムラインのセルに色を適用する関数
function applyResourceTimelineColors() {
    setTimeout(() => {
        // .gantt_resource_markerクラスを持つ要素を直接取得（single用）
        const singleMarkers = document.querySelectorAll('.gantt_resource_marker.gantt_resource_cell_single');
        
        // 全タスクのリストを取得
        const tasks = gantt.getTaskByTime();
        
        let cssRules = '';
        
        // タスクIDとリソース/場所IDのマッピングを作成
        const colorMap = new Map(); // key: "resourceId-placeId", value: color
        
        singleMarkers.forEach((marker) => {
            // data-resource-idまたはdata-place-idを取得
            const resourceId = marker.getAttribute('data-resource-id');
            const placeId = marker.getAttribute('data-place-id');
            
            // このマーカーが表示するタスクを見つける
            // 現在のタイムラインモードに応じて適切なプロパティを使用
            const currentMode = gantt.config.resource_property; // 'resource_id' または 'place_id'
            const targetId = currentMode === 'resource_id' ? resourceId : placeId;
            
            if (!targetId) return;
            
            // このリソース/場所に割り当てられているタスクを探す
            const matchingTask = tasks.find(task => {
                const taskIds = task[currentMode];
                if (!taskIds) return false;
                
                const idArray = Array.isArray(taskIds) ? taskIds : taskIds.toString().split(',').map(id => parseInt(id.trim(), 10));
                return idArray.includes(parseInt(targetId, 10));
            });
            
            if (!matchingTask) return;
            
            // タスクのインデックスを取得
            const taskIndex = tasks.findIndex(t => t.id === matchingTask.id);
            
            if (taskIndex === -1) return;
            
            // タスクの色を取得
            const baseColor = rowColorPalette[taskIndex % rowColorPalette.length];
            
            // テキスト色を取得（明度に基づいて白または黒）
            const textColor = getTextColor(baseColor);
            
            // CSSルールを生成（data属性セレクタを使用）
            const selector = currentMode === 'resource_id' 
                ? `.gantt_resource_marker.gantt_resource_cell_single[data-resource-id="${targetId}"]`
                : `.gantt_resource_marker.gantt_resource_cell_single[data-place-id="${targetId}"]`;
            
            if (!colorMap.has(targetId)) {
                colorMap.set(targetId, baseColor);
                cssRules += `${selector} { background-color: ${baseColor} !important; color: ${textColor} !important; }\n`;
            }
        });
        
        // 重複（overload）のマーカーを黒色にし、テキストは白色にする
        cssRules += `.gantt_resource_marker.gantt_resource_cell_overload { background-color: #000000 !important; color: #FFFFFF !important; }\n`;
        
        // 既存のスタイルを更新
        let styleElement = document.getElementById('gantt-resource-timeline-colors');
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = 'gantt-resource-timeline-colors';
            document.head.appendChild(styleElement);
        }
        styleElement.innerHTML = cssRules;
    }, 100);
}

// タスクのdata-task-id属性を設定
gantt.attachEvent("onTaskLoading", function(task) {
    return true;
});

// ガント描画後に色を適用
gantt.attachEvent("onGanttRender", function() {
    // data-task-id属性を各タスクバーに追加してから色を適用
    setTimeout(() => {
        document.querySelectorAll(".gantt_task_line").forEach(element => {
            const taskId = element.getAttribute("task_id");
            if (taskId) {
                element.setAttribute("data-task-id", taskId);
            }
        });
        // 属性追加後にスタイルを適用
        applyRowColors();
        // リソース/場所タイムラインにも色を適用
        applyResourceTimelineColors();
    }, 50);
});

// タスク追加・削除・並び替え時に色を再適用
gantt.attachEvent("onAfterTaskAdd", function() {
    setTimeout(() => {
        document.querySelectorAll(".gantt_task_line").forEach(element => {
            const taskId = element.getAttribute("task_id");
            if (taskId) {
                element.setAttribute("data-task-id", taskId);
            }
        });
        applyRowColors();
        applyResourceTimelineColors();
    }, 100);
    return true;
});

gantt.attachEvent("onAfterTaskDelete", function() {
    setTimeout(() => {
        document.querySelectorAll(".gantt_task_line").forEach(element => {
            const taskId = element.getAttribute("task_id");
            if (taskId) {
                element.setAttribute("data-task-id", taskId);
            }
        });
        applyRowColors();
        applyResourceTimelineColors();
    }, 100);
    return true;
});

gantt.attachEvent("onAfterTaskUpdate", function() {
    setTimeout(() => {
        document.querySelectorAll(".gantt_task_line").forEach(element => {
            const taskId = element.getAttribute("task_id");
            if (taskId) {
                element.setAttribute("data-task-id", taskId);
            }
        });
        applyRowColors();
        applyResourceTimelineColors();
    }, 100);
    return true;
});

// リソースタイムラインが再描画された時にも色を適用
gantt.attachEvent("onDataRender", function() {
    setTimeout(() => {
        applyResourceTimelineColors();
    }, 200);
});

// MutationObserverでリソースタイムラインの変更を監視
(function() {
    let observerInitialized = false;
    let reapplyTimer = null;
    
    function initResourceTimelineObserver() {
        if (observerInitialized) return;
        
        // リソースタイムライン全体のコンテナを監視
        const ganttContainer = document.querySelector('#gantt_here');
        if (!ganttContainer) {
            setTimeout(initResourceTimelineObserver, 500);
            return;
        }
        
        const observer = new MutationObserver(function(mutations) {
            let shouldReapply = false;
            let hasResourceMarkerChange = false;
            
            mutations.forEach(function(mutation) {
                // リソースマーカーに関連する変更をチェック
                if (mutation.target.classList && 
                    (mutation.target.classList.contains('gantt_resource_marker') ||
                     mutation.target.classList.contains('gantt_task_cell') ||
                     mutation.target.closest('.gantt_resource_timeline'))) {
                    hasResourceMarkerChange = true;
                }
                
                if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1 && 
                            (node.classList.contains('gantt_resource_marker') ||
                             node.querySelector && node.querySelector('.gantt_resource_marker'))) {
                            hasResourceMarkerChange = true;
                        }
                    });
                    shouldReapply = true;
                }
            });
            
            if (shouldReapply || hasResourceMarkerChange) {
                // 既存のタイマーをキャンセル
                if (reapplyTimer) {
                    clearTimeout(reapplyTimer);
                }
                
                // 複数回色を適用して確実に反映させる
                reapplyTimer = setTimeout(() => {
                    applyResourceTimelineColors();
                    // 少し遅延させてもう一度適用（ちらつき対策）
                    setTimeout(() => {
                        applyResourceTimelineColors();
                    }, 50);
                    reapplyTimer = null;
                }, 100);
            }
        });
        
        observer.observe(ganttContainer, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
        });
        
        observerInitialized = true;
    }
    
    // ガント初期化後に監視を開始
    setTimeout(initResourceTimelineObserver, 1000);
})();