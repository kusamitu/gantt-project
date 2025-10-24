// 列幅設定を保持する変数（デフォルト値）
let columnWidthSettings = {
    text: 70,
    machineUnit: 52,
    overview: 150,
    customer: 100,
    dispatchDate: 47,
    resourceId: 60,
    startDate: 47,
    endDate: 47,
    placeId: 60,
    deleteColumn: 25,
    addColumn: 25,
    resourceColumn: 100,  // 担当者負荷タイムライン開始位置
    timelineColumn: 45,
    resourceTimelineColumn: 100,
    placeTimelineColumn: 100
};

// 列幅設定をSupabaseから読み込む
async function loadColumnWidthSettings() {
    try {
        const { data, error } = await db.from('column_width_settings').select('*').limit(1).single();
        
        if (error) {
            if (error.code === 'PGRST116') await saveColumnWidthSettings();
            return;
        }
        
        if (data) {
            columnWidthSettings.text = data.text || 70;
            columnWidthSettings.machineUnit = data.machine_unit || 52;
            columnWidthSettings.overview = data.overview || 150;
            columnWidthSettings.customer = data.customer || 100;
            columnWidthSettings.dispatchDate = data.dispatch_date || 47;
            columnWidthSettings.resourceId = data.resource_id || 60;
            columnWidthSettings.startDate = data.start_date || 47;
            columnWidthSettings.endDate = data.end_date || 47;
            columnWidthSettings.placeId = data.place_id || 60;
            columnWidthSettings.resourceColumn = data.resource_column || 100;
            columnWidthSettings.timelineColumn = data.timeline_column || 45;
            columnWidthSettings.resourceTimelineColumn = data.resource_timeline_column || 100;
            columnWidthSettings.placeTimelineColumn = data.place_timeline_column || 100;
            applyColumnWidthSettings();
        }
    } catch (error) {
        console.error('列幅設定の読み込みエラー:', error);
    }
}

// 列幅設定をSupabaseに保存
async function saveColumnWidthSettings() {
    try {
        const payload = {
            id: 1,
            text: columnWidthSettings.text,
            machine_unit: columnWidthSettings.machineUnit,
            overview: columnWidthSettings.overview,
            customer: columnWidthSettings.customer,
            dispatch_date: columnWidthSettings.dispatchDate,
            resource_id: columnWidthSettings.resourceId,
            start_date: columnWidthSettings.startDate,
            end_date: columnWidthSettings.endDate,
            place_id: columnWidthSettings.placeId,
            resource_column: columnWidthSettings.resourceColumn,
            timeline_column: columnWidthSettings.timelineColumn,
            resource_timeline_column: columnWidthSettings.resourceTimelineColumn,
            place_timeline_column: columnWidthSettings.placeTimelineColumn
        };
        
        const { data, error } = await db.from('column_width_settings').upsert(payload, { onConflict: 'id' });
        
        if (error) {
            console.error('Supabase save error:', error);
            gantt.alert({ type: "error", text: "列幅設定の保存に失敗しました: " + error.message });
        }
    } catch (error) {
        console.error('Column width settings save exception:', error);
    }
}

// 列幅設定を適用
function applyColumnWidthSettings() {
    // ガントチャートの列幅を更新
    gantt.config.columns.forEach(col => {
        switch(col.name) {
            case "text":
                col.width = columnWidthSettings.text;
                break;
            case "machine-unit":
                col.width = columnWidthSettings.machineUnit;
                break;
            case "overview":
                col.width = columnWidthSettings.overview;
                break;
            case "customer":
                col.width = columnWidthSettings.customer;
                break;
            case "dispatch_date":
                col.width = columnWidthSettings.dispatchDate;
                break;
            case "resource_id":
                col.width = columnWidthSettings.resourceId;
                break;
            case "start_date":
                col.width = columnWidthSettings.startDate;
                break;
            case "end_date":
                col.width = columnWidthSettings.endDate;
                break;
            case "place_id":
                col.width = columnWidthSettings.placeId;
                break;
        }
    });
    
    // タイムラインの列幅を設定
    gantt.config.min_column_width = columnWidthSettings.timelineColumn;
    
    // レイアウトを再構築（現在のモードを考慮）
    const storeName = gantt.config.resource_store || "resource";
    const label = storeName === 'place' ? '場所' : '担当者';
    rebuildLayoutWithColumnWidths();
    
    // ガントチャートを再描画
    if (gantt.$initialized) {
        gantt.render();
    }
}

// レイアウトを再構築する関数（列幅対応版）
function rebuildLayoutWithColumnWidths() {
    const mainGridWidth = gantt.config.columns.reduce((total, col) => {
        return total + (typeof col.width === 'number' ? col.width : 0);
    }, 0);
    
    const deleteColumn = gantt.config.columns.find(col => col.name === "delete");
    const addColumn = gantt.config.columns.find(col => col.name === "add");
    const deleteColumnWidth = deleteColumn ? (typeof deleteColumn.width === 'number' ? deleteColumn.width : 0) : 0;
    const addColumnWidth = addColumn ? (typeof addColumn.width === 'number' ? addColumn.width : 0) : 0;
    
    const storeName = gantt.config.resource_store || "resource";
    const label = storeName === 'place' ? '場所' : '担当者';
    
    // 担当者負荷または場所負荷に応じた列幅を使用
    const resourceColumnWidth = storeName === 'place' 
        ? columnWidthSettings.placeTimelineColumn 
        : columnWidthSettings.resourceTimelineColumn;
    
    const spacerWidth = mainGridWidth - columnWidthSettings.resourceColumn;
    
    // デバッグ: レイアウト再構築時の値を確認
    
    gantt.config.layout = {
        css: "gantt_container",
        rows: [
            {
                cols: [
                    { view: "grid", scrollX: "scrollHor", scrollY: "scrollVer" },
                    { view: "timeline", scrollX: "scrollHor", scrollY: "scrollVer" },
                    { view: "scrollbar", id: "scrollVer" }
                ],
                gravity: 2
            },
            { resizer: true, width: 1 },
            {
                gravity: 1,
                cols: [
                    {
                        width: spacerWidth,
                        rows: [
                            { view: "scrollbar", scroll: "y" }
                        ]
                    },
                    {
                        view: "resourceGrid",
                        scrollY: "resourceScrollVer",
                        width: resourceColumnWidth,
                        config: {
                            columns: [
                                { 
                                    name: "name", 
                                    label: label, 
                                    tree: true, 
                                    width: resourceColumnWidth,
                                    template: function(resource) { 
                                        return resource.text || resource.name || ""; 
                                    },
                                    resize: true 
                                }
                            ]
                        }
                    },
                    { resizer: true, width: 1 },
                    { view: "resourceTimeline", scrollX: "scrollHor", scrollY: "resourceScrollVer" },
                    { view: "scrollbar", id: "resourceScrollVer" }
                ]
            },
            { view: "scrollbar", id: "scrollHor" }
        ]
    };
    
    // 列幅設定を反映するため、resetLayoutを有効化
    gantt.resetLayout();
}

// 列幅設定ウィンドウを表示
function showColumnWidthSettings() {
    const content = document.createElement("div");
    content.className = "column-width-settings-editor";
    
    // 各列の調整可能範囲を計算（±50%）
    const getRange = (value) => ({
        min: Math.round(value * 0.5),
        max: Math.round(value * 1.5)
    });
    
    const columns = [
        { key: 'text', label: '工事番号', default: 70 },
        { key: 'machineUnit', label: '機械', default: 52 },
        { key: 'overview', label: '概要', default: 150 },
        { key: 'customer', label: '客先名', default: 100 },
        { key: 'dispatchDate', label: '出荷日', default: 47 },
        { key: 'resourceId', label: '担当者', default: 60 },
        { key: 'startDate', label: '開始日', default: 47 },
        { key: 'endDate', label: '終了日', default: 47 },
        { key: 'placeId', label: '場所', default: 60 },
        { key: 'resourceColumn', label: '担当者負荷タイムライン開始位置', default: 100 },
        { key: 'timelineColumn', label: 'タイムラインの列幅', default: 45 },
        { key: 'resourceTimelineColumn', label: '担当者負荷の担当者列', default: 100 },
        { key: 'placeTimelineColumn', label: '場所負荷の場所列', default: 100 }
    ];
    
    const columnsHtml = columns.map(col => {
        const range = getRange(col.default);
        const currentValue = columnWidthSettings[col.key];
        return `
            <div class="column-width-setting-item">
                <label>${col.label}</label>
                <div class="column-width-setting-controls">
                    <input type="range" id="${col.key}" min="${range.min}" max="${range.max}" value="${currentValue}">
                    <input type="number" id="${col.key}Num" min="${range.min}" max="${range.max}" value="${currentValue}">
                    <span class="px-label">px</span>
                </div>
            </div>
        `;
    }).join('');
    
    content.innerHTML = `
        <style>
            .column-width-settings-container {
                display: flex;
                flex-direction: column;
                height: 600px;
                max-height: 80vh;
                overflow-x: hidden;
            }
            .column-width-settings-editor {
                padding: 15px;
                overflow-y: auto;
                overflow-x: hidden;
                flex: 1;
            }
            .column-width-setting-item {
                margin-bottom: 15px;
            }
            .column-width-setting-item label {
                display: block;
                font-size: 12px;
                font-weight: bold;
                margin-bottom: 6px;
                color: #333;
            }
            .column-width-setting-controls {
                display: grid;
                grid-template-columns: 200px 60px 20px;
                align-items: center;
                gap: 8px;
            }
            .column-width-setting-controls input[type="range"] {
                width: 100%;
                height: 6px;
            }
            .column-width-setting-controls input[type="number"] {
                width: 100%;
                padding: 4px 2px;
                border: 1px solid #ccc;
                border-radius: 3px;
                text-align: center;
                font-size: 12px;
            }
            .column-width-setting-controls .px-label {
                font-size: 11px;
                color: #666;
            }
            .column-width-settings-buttons {
                display: flex;
                gap: 8px;
                justify-content: space-between;
                background-color: white;
                padding: 15px;
                border-top: 1px solid #ddd;
                flex-shrink: 0;
            }
            .column-width-settings-buttons button {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
            }
            .column-width-settings-save-default {
                background-color: #4CAF50;
                color: white;
            }
            .column-width-settings-save-default:hover {
                background-color: #45a049;
            }
            .column-width-settings-reset {
                background-color: #999;
                color: white;
            }
            .column-width-settings-reset:hover {
                background-color: #888;
            }
            .column-width-settings-close {
                background-color: #4a90e2;
                color: white;
            }
            .column-width-settings-close:hover {
                background-color: #357abd;
            }
        </style>
        <div class="column-width-settings-container">
            <div class="column-width-settings-editor">
                ${columnsHtml}
            </div>
            <div class="column-width-settings-buttons">
                <button class="column-width-settings-save-default">現在の設定値をデフォルトにする</button>
                <div style="display: flex; gap: 8px;">
                    <button class="column-width-settings-reset">デフォルトに戻す</button>
                    <button class="column-width-settings-close">閉じる</button>
                </div>
            </div>
        </div>
    `;

    const modalbox = gantt.modalbox({ 
        title: "列幅設定", 
        content: content, 
        width: '380px'
    });

    // 画面の左下にモーダルを配置
    setTimeout(() => {
        const modalContainer = document.querySelector('.gantt_modal_box');

        if (modalContainer) {
            modalContainer.style.position = 'fixed';
            modalContainer.style.bottom = '10px';
            modalContainer.style.left = '10px';
            modalContainer.style.top = 'auto';
            modalContainer.style.transform = 'none';
            modalContainer.style.marginLeft = '0';
            modalContainer.style.marginTop = '0';
        }
    }, 0);

    // 入力要素の同期
    columns.forEach(col => {
        const slider = content.querySelector(`#${col.key}`);
        const number = content.querySelector(`#${col.key}Num`);
        
        slider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            number.value = value;
            columnWidthSettings[col.key] = value;
            applyColumnWidthSettings();
            saveColumnWidthSettings();
        });
        
        number.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            if (!isNaN(value)) {
                const range = getRange(col.default);
                if (value >= range.min && value <= range.max) {
                    slider.value = value;
                    columnWidthSettings[col.key] = value;
                    applyColumnWidthSettings();
                    saveColumnWidthSettings();
                }
            }
        });
    });

    // 現在の設定値をデフォルトにするボタン
    content.querySelector('.column-width-settings-save-default').addEventListener('click', async () => {
        // 現在の設定値を保存
        await saveColumnWidthSettings();
        
        gantt.alert({
            type: "info",
            text: "現在の設定値をデフォルトとして保存しました"
        });
    });

    // デフォルトに戻すボタン
    content.querySelector('.column-width-settings-reset').addEventListener('click', () => {
        columns.forEach(col => {
            columnWidthSettings[col.key] = col.default;
            content.querySelector(`#${col.key}`).value = col.default;
            content.querySelector(`#${col.key}Num`).value = col.default;
        });
        
        applyColumnWidthSettings();
        saveColumnWidthSettings();
    });

    // 閉じるボタン
    content.querySelector('.column-width-settings-close').addEventListener('click', () => {
        saveColumnWidthSettings();
        gantt.modalbox.hide(modalbox);
    });
}