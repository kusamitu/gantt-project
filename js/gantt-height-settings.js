// 高さ設定を保持する変数
let heightSettings = {
    mainGridRow: 23,           // ガントチャートの枠線の高さ
    mainTaskBar: 19,           // ガントチャートのバーの高さ
    mainTaskBarOffset: 0,      // ガントチャートのバーのオフセット
    resourceGridRow: 17,       // 担当者/場所負荷の枠線の高さ
    resourceTaskBar: 15,       // 担当者/場所負荷のバーの高さ
    resourceTaskBarOffset: 0,  // 担当者/場所負荷のバーのオフセット
    trialBar: 19,              // 試運転バーの高さ
    trialBarOffset: 0          // 試運転バーのオフセット
};

// 高さ設定をSupabaseから読み込む
async function loadHeightSettings() {
    try {
        const { data, error } = await db.from('height_settings').select('*').limit(1).single();
        
        if (error) {
            if (error.code === 'PGRST116') await saveHeightSettings();
            return;
        }
        
        if (data) {
            heightSettings.mainGridRow = data.main_grid_row || 23;
            heightSettings.mainTaskBar = data.main_task_bar || 19;
            heightSettings.mainTaskBarOffset = data.main_task_bar_offset || 0;
            heightSettings.resourceGridRow = data.resource_grid_row || 17;
            heightSettings.resourceTaskBar = data.resource_task_bar || 15;
            heightSettings.resourceTaskBarOffset = data.resource_task_bar_offset || 0;
            heightSettings.trialBar = data.trial_bar || 19;
            heightSettings.trialBarOffset = data.trial_bar_offset || 0;
            applyHeightSettings();
        }
    } catch (error) {
        console.error('高さ設定の読み込みエラー:', error);
    }
}

// 高さ設定をSupabaseに保存
async function saveHeightSettings() {
    try {
        const payload = {
            id: 1,
            main_grid_row: heightSettings.mainGridRow,
            main_task_bar: heightSettings.mainTaskBar,
            main_task_bar_offset: heightSettings.mainTaskBarOffset,
            resource_grid_row: heightSettings.resourceGridRow,
            resource_task_bar: heightSettings.resourceTaskBar,
            resource_task_bar_offset: heightSettings.resourceTaskBarOffset,
            trial_bar: heightSettings.trialBar,
            trial_bar_offset: heightSettings.trialBarOffset
        };
        
        const { data, error } = await db.from('height_settings').upsert(payload, { onConflict: 'id' });
        
        if (error) {
            console.error('Supabase save error:', error);
            gantt.alert({ type: "error", text: "高さ設定の保存に失敗しました: " + error.message });
        }
    } catch (error) {
        console.error('Height settings save exception:', error);
    }
}

// 高さ設定を適用
function applyHeightSettings() {
    // メイングリッドの設定
    gantt.config.row_height = heightSettings.mainGridRow;
    gantt.config.task_height = heightSettings.mainTaskBar;
    gantt.config.bar_height = heightSettings.mainTaskBar;
    
    // リソースタイムラインの設定
    gantt.config.resource_row_height = heightSettings.resourceGridRow;
    
    // CSSで高さを適用
    updateHeightStyles();
    
    // ガントチャートを再描画
    if (gantt.$initialized) {
        // 既存の試運転バー要素を全て削除
        const periodElements = document.querySelectorAll('.gantt_additional_period');
        periodElements.forEach(el => {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        });
        
        // 重要: レイアウトを再構築してリソースグリッドを再描画
        gantt.resetLayout();
        
        // タスクレイヤーを完全に再描画
        gantt.render();
        
        // 再描画後、少し待ってから再度スタイルを適用(タイミング問題対策)
        setTimeout(() => {
            updateHeightStyles();
            
            // インラインスタイルを直接上書き
            forceApplyResourceGridHeight();
        }, 100);
    }
    
    // リソースタイムラインのラベルも再描画
    if (typeof renderResourceTimelineLabels === 'function') {
        renderResourceTimelineLabels();
    }
}

// CSSで高さを動的に適用
function updateHeightStyles() {
    // 中央配置のためのオフセット計算(ユーザー設定のオフセットを加算)
    const mainVerticalOffset = Math.round((heightSettings.mainGridRow - heightSettings.mainTaskBar) / 2) + heightSettings.mainTaskBarOffset;
    const resourceVerticalOffset = Math.round((heightSettings.resourceGridRow - heightSettings.resourceTaskBar) / 2) + heightSettings.resourceTaskBarOffset;
    const trialVerticalOffset = Math.round((heightSettings.mainGridRow - heightSettings.trialBar) / 2) + heightSettings.trialBarOffset;
    
    let style = document.getElementById('height-settings-style');
    if (!style) {
        style = document.createElement('style');
        style.id = 'height-settings-style';
        document.head.appendChild(style);
    }
    
    const cssContent = `
        /* メイングリッドの行の高さ */
        .gantt_task_row,
        .gantt_data_area .gantt_task_row {
            height: ${heightSettings.mainGridRow}px !important;
        }
        
        .gantt_row,
        .gantt_grid_data .gantt_row {
            height: ${heightSettings.mainGridRow}px !important;
        }
        
        .gantt_cell,
        .gantt_grid_data .gantt_cell {
            height: ${heightSettings.mainGridRow}px !important;
            line-height: ${heightSettings.mainGridRow}px !important;
        }
        
        /* タスクレイヤー全体の高さ */
        .gantt_task_bg,
        .gantt_data_area .gantt_task_bg {
            height: ${heightSettings.mainGridRow}px !important;
        }
        
        /* メイングリッドのタスクバー - transformで中央配置 */
        .gantt_task_line:not(.gantt_additional_period),
        .gantt_data_area .gantt_task_line:not(.gantt_additional_period) {
            height: ${heightSettings.mainTaskBar}px !important;
            line-height: ${heightSettings.mainTaskBar}px !important;
            transform: translateY(${mainVerticalOffset}px) !important;
        }
        
        .gantt_task_content,
        .gantt_task_line .gantt_task_content {
            height: ${heightSettings.mainTaskBar}px !important;
            line-height: ${heightSettings.mainTaskBar}px !important;
        }
        
        .gantt_task_progress,
        .gantt_task_line .gantt_task_progress {
            height: ${heightSettings.mainTaskBar}px !important;
        }
        
        /* 試運転バーの高さと中央配置 */
        .gantt_additional_period,
        .gantt_data_area .gantt_additional_period {
            height: ${heightSettings.trialBar}px !important;
            line-height: ${heightSettings.trialBar}px !important;
            transform: translateY(${trialVerticalOffset}px) !important;
        }
        
        .gantt_additional_period .gantt_task_content,
        .gantt_additional_period div {
            height: ${heightSettings.trialBar}px !important;
            line-height: ${heightSettings.trialBar}px !important;
        }
        
        /* リソースグリッドの行とセルの高さ - 重要! */
        .resourceGrid_cell .gantt_grid .gantt_row,
        .resourceGrid_cell .gantt_grid_data .gantt_row {
            height: ${heightSettings.resourceGridRow}px !important;
        }
        
        .resourceGrid_cell .gantt_grid .gantt_cell,
        .resourceGrid_cell .gantt_grid_data .gantt_cell {
            height: ${heightSettings.resourceGridRow}px !important;
            line-height: ${heightSettings.resourceGridRow}px !important;
        }
        
        /* リソースタイムラインのタスク行の高さ */
        .gantt_resource_timeline .gantt_task_row {
            height: ${heightSettings.resourceGridRow}px !important;
        }
        
        .gantt_resource_timeline .gantt_task_cell {
            height: ${heightSettings.resourceGridRow}px !important;
        }
        
        /* リソースタイムラインのバー - 高さと中央配置 */
        .resource-timeline-bar {
            height: ${heightSettings.resourceTaskBar}px !important;
            line-height: ${heightSettings.resourceTaskBar}px !important;
            margin-top: ${resourceVerticalOffset}px !important;
        }
        
        .resource-timeline-task-label {
            height: ${heightSettings.resourceTaskBar}px !important;
            line-height: ${heightSettings.resourceTaskBar}px !important;
        }
        
        /* リソースマーカー */
        .gantt_resource_marker {
            height: ${heightSettings.resourceTaskBar}px !important;
            line-height: ${heightSettings.resourceTaskBar}px !important;
            margin-top: ${resourceVerticalOffset}px !important;
        }
    `;
    
    style.innerHTML = cssContent;
}

// インラインスタイルを直接上書きする関数
function forceApplyResourceGridHeight() {
    const resourceGridCell = document.querySelector('.resourceGrid_cell');
    if (resourceGridCell) {
        const rows = resourceGridCell.querySelectorAll('.gantt_row');
        const cells = resourceGridCell.querySelectorAll('.gantt_cell');
        
        rows.forEach(row => {
            const currentHeight = row.style.height;
            const expectedHeight = heightSettings.resourceGridRow + 'px';
            if (currentHeight !== expectedHeight) {
                row.style.setProperty('height', expectedHeight, 'important');
            }
        });
        
        cells.forEach(cell => {
            const currentHeight = cell.style.height;
            const expectedHeight = heightSettings.resourceGridRow + 'px';
            if (currentHeight !== expectedHeight) {
                cell.style.setProperty('height', expectedHeight, 'important');
                cell.style.setProperty('line-height', expectedHeight, 'important');
            }
        });
    }
    
    // タイムライン側も修正（重要！）
    const resourceTimelineArea = document.querySelector('.gantt_resource_timeline');
    if (resourceTimelineArea) {
        const taskRows = resourceTimelineArea.querySelectorAll('.gantt_task_row');
        
        taskRows.forEach(row => {
            const currentHeight = row.style.height;
            const expectedHeight = heightSettings.resourceGridRow + 'px';
            if (currentHeight !== expectedHeight) {
                row.style.setProperty('height', expectedHeight, 'important');
            }
        });
    }
}

// スクロールイベントのリスナーを追加する関数
function attachScrollListener() {
    let scrollTimer = null;
    let isApplying = false; // 無限ループ防止フラグ
    
    // onGanttScrollイベント
    gantt.attachEvent("onGanttScroll", function() {
        forceApplyResourceGridHeight();
        
        if (scrollTimer) clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
            forceApplyResourceGridHeight();
        }, 100);
    });
    
    // MutationObserverでDOM変更を監視
    const observer = new MutationObserver(function(mutations) {
        if (isApplying) return; // 無限ループ防止
        
        mutations.forEach(function(mutation) {
            // 属性変更 - 高さが間違っていたら即座に修正
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                const target = mutation.target;
                const resourceGridCell = target.closest('.resourceGrid_cell');
                
                if (resourceGridCell && (target.classList.contains('gantt_row') || target.classList.contains('gantt_cell'))) {
                    isApplying = true;
                    
                    if (target.classList.contains('gantt_row')) {
                        const currentHeight = window.getComputedStyle(target).height;
                        const expectedHeight = heightSettings.resourceGridRow + 'px';
                        if (currentHeight !== expectedHeight) {
                            target.style.setProperty('height', expectedHeight, 'important');
                        }
                    } else if (target.classList.contains('gantt_cell')) {
                        const currentHeight = window.getComputedStyle(target).height;
                        const expectedHeight = heightSettings.resourceGridRow + 'px';
                        if (currentHeight !== expectedHeight) {
                            target.style.setProperty('height', expectedHeight, 'important');
                            target.style.setProperty('line-height', expectedHeight, 'important');
                        }
                    }
                    
                    isApplying = false;
                }
            }
            
            // 子要素の追加 - 追加された要素に即座に適用
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) {
                        const resourceGridCell = node.closest ? node.closest('.resourceGrid_cell') : null;
                        const parentIsResourceGrid = mutation.target.closest('.resourceGrid_cell');
                        
                        if (resourceGridCell || parentIsResourceGrid) {
                            isApplying = true;
                            
                            // 追加されたノード自体
                            if (node.classList) {
                                if (node.classList.contains('gantt_row')) {
                                    node.style.setProperty('height', heightSettings.resourceGridRow + 'px', 'important');
                                } else if (node.classList.contains('gantt_cell')) {
                                    node.style.setProperty('height', heightSettings.resourceGridRow + 'px', 'important');
                                    node.style.setProperty('line-height', heightSettings.resourceGridRow + 'px', 'important');
                                }
                            }
                            
                            // 子孫要素
                            if (node.querySelectorAll) {
                                const childRows = node.querySelectorAll('.gantt_row');
                                const childCells = node.querySelectorAll('.gantt_cell');
                                
                                childRows.forEach(row => {
                                    row.style.setProperty('height', heightSettings.resourceGridRow + 'px', 'important');
                                });
                                
                                childCells.forEach(cell => {
                                    cell.style.setProperty('height', heightSettings.resourceGridRow + 'px', 'important');
                                    cell.style.setProperty('line-height', heightSettings.resourceGridRow + 'px', 'important');
                                });
                            }
                            
                            isApplying = false;
                        }
                    }
                });
            }
        });
    });
    
    // resourceGrid_cellを監視
    const resourceGridCell = document.querySelector('.resourceGrid_cell');
    if (resourceGridCell) {
        observer.observe(resourceGridCell, {
            attributes: true,
            attributeFilter: ['style'],
            childList: true,
            subtree: true
        });
    }
    
    // DOMイベントでもキャッチ
    document.addEventListener('scroll', function(e) {
        if (e.target.closest('.resourceGrid_cell')) {
            forceApplyResourceGridHeight();
            
            if (scrollTimer) clearTimeout(scrollTimer);
            scrollTimer = setTimeout(() => {
                forceApplyResourceGridHeight();
            }, 100);
        }
    }, true);
    
    // 定期的な監視（最終手段）
    setInterval(() => {
        const resourceGridCell = document.querySelector('.resourceGrid_cell');
        const resourceTimelineArea = document.querySelector('.gantt_resource_timeline');
        
        // グリッド部分の確認
        if (resourceGridCell) {
            const rows = resourceGridCell.querySelectorAll('.gantt_row');
            const cells = resourceGridCell.querySelectorAll('.gantt_cell');
            
            let needsFix = false;
            
            rows.forEach((row) => {
                const currentHeight = window.getComputedStyle(row).height;
                const expectedHeight = heightSettings.resourceGridRow + 'px';
                if (currentHeight !== expectedHeight) {
                    needsFix = true;
                }
            });
            
            cells.forEach((cell) => {
                const currentHeight = window.getComputedStyle(cell).height;
                const expectedHeight = heightSettings.resourceGridRow + 'px';
                if (currentHeight !== expectedHeight) {
                    needsFix = true;
                }
            });
            
            if (needsFix) {
                forceApplyResourceGridHeight();
            }
        }
        
        // タイムライン部分の確認
        if (resourceTimelineArea) {
            const taskRows = resourceTimelineArea.querySelectorAll('.gantt_task_row');
            let needsFix = false;
            
            taskRows.forEach((row) => {
                const currentHeight = window.getComputedStyle(row).height;
                const expectedHeight = heightSettings.resourceGridRow + 'px';
                if (currentHeight !== expectedHeight) {
                    needsFix = true;
                }
            });
            
            if (needsFix) {
                taskRows.forEach(row => {
                    row.style.setProperty('height', heightSettings.resourceGridRow + 'px', 'important');
                });
            }
        }
    }, 500);
}

// 高さ設定ウィンドウを表示
function showHeightSettings() {
    const content = document.createElement("div");
    content.className = "height-settings-editor";
    content.innerHTML = `
        <style>
            .height-settings-editor {
                padding: 15px;
            }
            .height-setting-item {
                margin-bottom: 20px;
            }
            .height-setting-item label {
                display: block;
                font-size: 12px;
                font-weight: bold;
                margin-bottom: 8px;
                color: #333;
            }
            .height-setting-controls {
                display: grid;
                grid-template-columns: 150px 30px 20px 80px 30px 20px;
                align-items: center;
                gap: 6px;
            }
            .height-setting-controls input[type="range"] {
                width: 100%;
                height: 6px;
            }
            .height-setting-controls input[type="number"] {
                width: 100%;
                padding: 4px 2px;
                border: 1px solid #ccc;
                border-radius: 3px;
                text-align: center;
                font-size: 12px;
            }
            .height-setting-controls .offset-label {
                font-size: 11px;
                color: #666;
                text-align: right;
            }
            .height-setting-controls .px-label {
                font-size: 11px;
                color: #666;
            }
            .height-settings-buttons {
                margin-top: 20px;
                display: flex;
                gap: 8px;
                justify-content: flex-end;
            }
            .height-settings-buttons button {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
            }
            .height-settings-reset {
                background-color: #999;
                color: white;
            }
            .height-settings-reset:hover {
                background-color: #888;
            }
            .height-settings-close {
                background-color: #4a90e2;
                color: white;
            }
            .height-settings-close:hover {
                background-color: #357abd;
            }
        </style>
        <div class="height-setting-item">
            <label>ガントチャートの枠線の高さ</label>
            <div class="height-setting-controls">
                <input type="range" id="mainGridRow" min="10" max="25" value="${heightSettings.mainGridRow}">
                <input type="number" id="mainGridRowNum" min="10" max="25" value="${heightSettings.mainGridRow}">
                <span class="px-label">px</span>
            </div>
        </div>
        <div class="height-setting-item">
            <label>ガントチャートのバーの高さ</label>
            <div class="height-setting-controls">
                <input type="range" id="mainTaskBar" min="10" max="25" value="${heightSettings.mainTaskBar}">
                <input type="number" id="mainTaskBarNum" min="10" max="25" value="${heightSettings.mainTaskBar}">
                <span class="px-label">px</span>
                <span class="offset-label">オフセット:</span>
                <input type="number" id="mainTaskBarOffset" min="-5" max="5" value="${heightSettings.mainTaskBarOffset}">
                <span class="px-label">px</span>
            </div>
        </div>
        <div class="height-setting-item">
            <label>試運転バーの高さ</label>
            <div class="height-setting-controls">
                <input type="range" id="trialBar" min="10" max="25" value="${heightSettings.trialBar}">
                <input type="number" id="trialBarNum" min="10" max="25" value="${heightSettings.trialBar}">
                <span class="px-label">px</span>
                <span class="offset-label">オフセット:</span>
                <input type="number" id="trialBarOffset" min="-5" max="5" value="${heightSettings.trialBarOffset}">
                <span class="px-label">px</span>
            </div>
        </div>
        <div class="height-setting-item">
            <label>担当者/場所負荷の枠線の高さ</label>
            <div class="height-setting-controls">
                <input type="range" id="resourceGridRow" min="10" max="25" value="${heightSettings.resourceGridRow}">
                <input type="number" id="resourceGridRowNum" min="10" max="25" value="${heightSettings.resourceGridRow}">
                <span class="px-label">px</span>
            </div>
        </div>
        <div class="height-setting-item">
            <label>担当者/場所負荷のバーの高さ</label>
            <div class="height-setting-controls">
                <input type="range" id="resourceTaskBar" min="10" max="25" value="${heightSettings.resourceTaskBar}">
                <input type="number" id="resourceTaskBarNum" min="10" max="25" value="${heightSettings.resourceTaskBar}">
                <span class="px-label">px</span>
                <span class="offset-label">オフセット:</span>
                <input type="number" id="resourceTaskBarOffset" min="-5" max="5" value="${heightSettings.resourceTaskBarOffset}">
                <span class="px-label">px</span>
            </div>
        </div>
        <div class="height-settings-buttons">
            <button class="height-settings-reset">デフォルトに戻す</button>
            <button class="height-settings-close">閉じる</button>
        </div>
    `;

    const modalbox = gantt.modalbox({ 
        title: "高さ設定", 
        content: content, 
        width: '380px'
    });

    // ボタンの近くにモーダルを配置
    const heightSettingsBtn = document.getElementById('height_settings_btn');
    if (heightSettingsBtn) {
        const rect = heightSettingsBtn.getBoundingClientRect();
        const modalContainer = document.querySelector('.gantt_modal_box');

        if (modalContainer) {
            modalContainer.style.position = 'fixed';
            modalContainer.style.top = (rect.bottom + 5) + 'px';
            modalContainer.style.left = rect.left + 'px';
            modalContainer.style.transform = 'none';
            modalContainer.style.marginLeft = '0';
            modalContainer.style.marginTop = '0';
        }
    }

    // 入力要素の同期
    const syncInputs = (sliderId, numberId, key) => {
        const slider = content.querySelector(`#${sliderId}`);
        const number = content.querySelector(`#${numberId}`);
        
        slider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            number.value = value;
            heightSettings[key] = value;
            applyHeightSettings();
            saveHeightSettings();
        });
        
        number.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            if (!isNaN(value)) {
                slider.value = value;
                heightSettings[key] = value;
                applyHeightSettings();
                saveHeightSettings();
            }
        });
    };

    // オフセット入力の同期
    const syncOffsetInput = (inputId, key) => {
        const input = content.querySelector(`#${inputId}`);
        
        input.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            if (!isNaN(value)) {
                heightSettings[key] = value;
                applyHeightSettings();
                saveHeightSettings();
            }
        });
    };

    syncInputs('mainGridRow', 'mainGridRowNum', 'mainGridRow');
    syncInputs('mainTaskBar', 'mainTaskBarNum', 'mainTaskBar');
    syncOffsetInput('mainTaskBarOffset', 'mainTaskBarOffset');
    syncInputs('trialBar', 'trialBarNum', 'trialBar');
    syncOffsetInput('trialBarOffset', 'trialBarOffset');
    syncInputs('resourceGridRow', 'resourceGridRowNum', 'resourceGridRow');
    syncInputs('resourceTaskBar', 'resourceTaskBarNum', 'resourceTaskBar');
    syncOffsetInput('resourceTaskBarOffset', 'resourceTaskBarOffset');

    // デフォルトに戻すボタン
    content.querySelector('.height-settings-reset').addEventListener('click', () => {
        heightSettings = {
            mainGridRow: 23,
            mainTaskBar: 19,
            mainTaskBarOffset: 0,
            trialBar: 19,
            trialBarOffset: 0,
            resourceGridRow: 17,
            resourceTaskBar: 15,
            resourceTaskBarOffset: 0
        };
        
        content.querySelector('#mainGridRow').value = 23;
        content.querySelector('#mainGridRowNum').value = 23;
        content.querySelector('#mainTaskBar').value = 19;
        content.querySelector('#mainTaskBarNum').value = 19;
        content.querySelector('#mainTaskBarOffset').value = 0;
        content.querySelector('#trialBar').value = 19;
        content.querySelector('#trialBarNum').value = 19;
        content.querySelector('#trialBarOffset').value = 0;
        content.querySelector('#resourceGridRow').value = 17;
        content.querySelector('#resourceGridRowNum').value = 17;
        content.querySelector('#resourceTaskBar').value = 15;
        content.querySelector('#resourceTaskBarNum').value = 15;
        content.querySelector('#resourceTaskBarOffset').value = 0;
        
        applyHeightSettings();
        saveHeightSettings();
    });

    // 閉じるボタン
    content.querySelector('.height-settings-close').addEventListener('click', () => {
        saveHeightSettings();
        gantt.modalbox.hide(modalbox);
    });
}