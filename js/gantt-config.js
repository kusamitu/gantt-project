// --- プラグインの有効化 ---
gantt.plugins({
    inline_editors: true,
    multiselect: true
});

// --- リソース設定 ---
gantt.config.resource_store = "resource";
gantt.config.resource_render_empty_cells = true;
gantt.config.order_branch = true;
gantt.config.order_branch_free = true;
gantt.config.inline_editors_date_processing = "keepDates";

// --- 表示する列の定義 ---
gantt.config.columns = [
    { 
        name: "text", 
        label: "工事番号", 
        tree: true, 
        width: 70, 
        resize: true,
        editor: { type: "text", map_to: "text" }
    },
    { 
        name: "machine-unit", 
        label: "機械", 
        align: "center", 
        width: 52, 
        resize: true,
        editor: { type: "text", map_to: "machine-unit" }
    },
    { 
        name: "overview", 
        label: "概要", 
        width: 150, 
        resize: true,
        editor: { type: "text", map_to: "overview" }
    },
    { 
        name: "customer", 
        label: "客先名", 
        width: 100, 
        resize: true,
        editor: { type: "text", map_to: "customer" }
    },
    { 
        name: "dispatch_date", 
        label: "出荷日", 
        align: "center", 
        width: 47,
        template: (task) => task.dispatch_date ? gantt.templates.date_grid(task.dispatch_date) : "",
        editor: { type: "date", map_to: "dispatch_date" }
    },
    { 
        name: "resource_id", 
        label: "担当者", 
        width: 60, 
        resize: true,
        template: (task) => {
            if (!task.resource_id || task.resource_id.length === 0) return "";
            
            const resourceOptions = gantt.serverList("resource_options");
            const resourceIds = Array.isArray(task.resource_id) ? task.resource_id : task.resource_id.toString().split(',').map(id => parseInt(id.trim(), 10));
            const names = resourceIds.map(id => {
                const resource = resourceOptions.find(r => r.key == id);
                return resource ? resource.label : "";
            }).filter(name => name !== "");
            
            const displayText = names.join(", ");
            return `<span title="${displayText}">${displayText}</span>`;
        }
    },
    { 
        name: "start_date", 
        label: "開始日", 
        align: "center", 
        width: 47,
        editor: { type: "date", map_to: "start_date" }
    },
    { 
        name: "end_date", 
        label: "終了日", 
        align: "center", 
        width: 47,
        editor: { type: "date", map_to: "end_date" }
    },
    { 
        name: "place_id", 
        label: "場所", 
        width: 60, 
        resize: true,
        template: (task) => {
            if (!task.place_id || (Array.isArray(task.place_id) && task.place_id.length === 0)) return "";
            
            const placeOptions = gantt.serverList("place_options");
            const placeIds = Array.isArray(task.place_id) ? task.place_id : task.place_id.toString().split(',').map(id => parseInt(id.trim(), 10));
            const names = placeIds.map(id => {
                const place = placeOptions.find(p => p.key == id);
                return place ? place.label : "";
            }).filter(name => name !== "");
            
            const displayText = names.join(", ");
            return `<span title="${displayText}">${displayText}</span>`;
        }
    },
    { 
        name: "delete", 
        label: "", 
        width: 25, 
        template: (task) => "<div class='gantt_grid_delete_icon'></div>" 
    },
    { name: "add", label: "", width: 25 }
];

// --- レイアウト設定用の幅計算 ---
const mainGridWidth = gantt.config.columns.reduce((total, col) => {
    return total + (typeof col.width === 'number' ? col.width : 0);
}, 0);

const deleteColumn = gantt.config.columns.find(col => col.name === "delete");
const addColumn = gantt.config.columns.find(col => col.name === "add");
const deleteColumnWidth = deleteColumn ? (typeof deleteColumn.width === 'number' ? deleteColumn.width : 0) : 0;
const addColumnWidth = addColumn ? (typeof addColumn.width === 'number' ? addColumn.width : 0) : 0;
const resourceColumnWidth = 100;
const spacerWidth = mainGridWidth - resourceColumnWidth + deleteColumnWidth + addColumnWidth - 8;

// --- レイアウト設定 ---
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
                                label: "担当者", 
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

// --- テンプレート設定 ---
gantt.templates.task_class = function(start, end, task) {
    return "";
};

gantt.templates.task_text = function(start, end, task) {
    const orderNo = task.text || '';
    const machine = task['machine-unit'] || '';
    return orderNo + machine;
};

// --- 日付・スケール設定 ---
gantt.config.date_format = "%Y-%m-%d";
gantt.config.date_grid = "%n/%j";
gantt.config.start_on_monday = true;
gantt.config.min_column_width = 45;
gantt.config.scale_height = 50;
gantt.config.row_height = 25;
gantt.config.scales = [
    { unit: "month", step: 1, format: "%n月" },
    { unit: "week", step: 1, format: "%n/%j" }
];

const today = new Date();
const start_date = new Date();
start_date.setDate(today.getDate() - 7);
gantt.config.start_date = start_date;

// --- リソースタイムライン設定 ---
gantt.config.resource_property = "resource_id";
gantt.config.resource_calendars = {};
gantt.config.process_resource_assignments = true;
gantt.config.resource_scale_unit = "day";
gantt.config.resource_scale_step = 1;

// リソースタイムラインのテンプレート設定
gantt.templates.resource_cell_class = function(start_date, end_date, resource, tasks) {
    if (tasks.length === 0) {
        return "gantt_resource_cell_empty";
    } else if (tasks.length > 1) {
        return "gantt_resource_cell_overload";
    } else {
        return "gantt_resource_cell_single";
    }
};

gantt.templates.resource_cell_value = function(start_date, end_date, resource, tasks) {
    return tasks.length || "";
};

// リソースとタスクの紐付け関数
gantt.templates.resource_task = function(task, resource) {
    if (!task.resource_id || (Array.isArray(task.resource_id) && task.resource_id.length === 0)) {
        return false;
    }
    
    const resourceIds = Array.isArray(task.resource_id) ? task.resource_id : task.resource_id.toString().split(',').map(id => parseInt(id.trim(), 10));
    return resourceIds.includes(parseInt(resource.id, 10));
};

// --- イベント設定 ---
gantt.attachEvent("onTaskClick", function(id, e) {
    // 削除アイコンのクリック処理
    if (e.target.classList.contains("gantt_grid_delete_icon")) {
        // idが有効かチェック
        if (!id || !gantt.isTaskExists(id)) {
            return false;
        }
        
        gantt.confirm({ 
            text: "このタスクを削除してもよろしいですか?", 
            ok: "はい", 
            cancel: "いいえ",
            callback: (result) => {
                if (result) {
                    // 削除前に再度存在確認
                    if (gantt.isTaskExists(id)) {
                        gantt.deleteTask(id);
                    }
                }
                // イベントリスナーを削除
                document.removeEventListener("keydown", handleKeyPress);
            }
        });
        
        // Enterキーのイベントリスナーを追加
        const handleKeyPress = function(event) {
            if (event.key === "Enter") {
                event.preventDefault();
                // 「はい」ボタンを探してクリック
                const okButton = document.querySelector('.gantt_popup_button[data-result="true"]');
                if (okButton) {
                    okButton.click();
                } else {
                    // 別の方法でボタンを探す
                    const buttons = document.querySelectorAll('.gantt_popup_button');
                    if (buttons.length > 0) {
                        buttons[0].click(); // 最初のボタン（はい）
                    }
                }
                document.removeEventListener("keydown", handleKeyPress);
            } else if (event.key === "Escape") {
                event.preventDefault();
                // 「いいえ」ボタンを探してクリック
                const cancelButton = document.querySelector('.gantt_popup_button[data-result="false"]');
                if (cancelButton) {
                    cancelButton.click();
                } else {
                    const buttons = document.querySelectorAll('.gantt_popup_button');
                    if (buttons.length > 1) {
                        buttons[1].click(); // 2番目のボタン（いいえ）
                    }
                }
                document.removeEventListener("keydown", handleKeyPress);
            }
        };
        
        // キーボードイベントを追加（少し遅延させてダイアログが表示された後に追加）
        setTimeout(() => {
            document.addEventListener("keydown", handleKeyPress);
        }, 100);
        
        return false;
    }
    
    // グリッド列のクリック処理
    const cell = e.target.closest(".gantt_cell");
    if (cell) {
        const columnName = cell.getAttribute("data-column-name");
        const column = gantt.config.columns.find(col => col.name === columnName);
        
        // 担当者列: カスタムライトボックスを開く
        if (columnName === "resource_id") {
            showCustomLightbox(id, 'resource_id', e);
            return false;
        }
        
        // 場所列: カスタムライトボックスを開く
        if (columnName === "place_id") {
            showCustomLightbox(id, 'place_id', e);
            return false;
        }
        
        // その他の列はインライン編集
        if (column && column.editor) {
            gantt.ext.inlineEditors.startEdit(id, columnName);
            return false;
        }
    }
    
    return true;
});

// ダブルクリック時はフルモードのカスタムライトボックスを開く
gantt.attachEvent("onTaskDblClick", function(id, e) {
    showCustomLightbox(id);
    return false;
});

// セル描画後にdata属性を追加
gantt.attachEvent("onGanttRender", function() {
    setTimeout(() => {
        document.querySelectorAll(".gantt_cell").forEach(cell => {
            const index = Array.from(cell.parentElement.children).indexOf(cell);
            if (gantt.config.columns[index]) {
                cell.setAttribute("data-column-name", gantt.config.columns[index].name);
            }
        });
    }, 0);
});