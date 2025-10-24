// --- プラグインの有効化 ---
gantt.plugins({
    inline_editors: true,
    multiselect: true
});

// --- デフォルトタスク名の無効化 ---
gantt.locale.labels.new_task = "";

// --- ライトボックスの無効化 ---
gantt.config.details_on_create = false;
gantt.config.details_on_dblclick = false;

// --- 自動スケジューリングの無効化 ---
gantt.config.auto_scheduling = false;
gantt.config.auto_scheduling_initial = false;

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
        editor: { type: "text", map_to: "text" },
        template: function(task) {
            // textが空文字列またはタスクIDと同じ場合は空欄を表示
            if (!task.text || task.text === "" || task.text === task.id.toString()) {
                return "";
            }
            return task.text;
        }
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
// タスクバーに工事番号の最初の1文字に応じたクラスを付与
gantt.templates.task_class = function(start, end, task) {
    // 工事番号の最初の1文字を取得
    const orderNo = task.text || '';
    const firstChar = orderNo.charAt(0);
    
    if (firstChar === '2') {
        return "task-2000";
    } else if (firstChar === 'D' || firstChar === 'd') {
        return "task-d";
    } else if (orderNo && orderNo.trim() !== '') {
        return "task-other";
    }
    
    // 担当者未設定の場合
    if (!task.resource_id || task.resource_id.length === 0) {
        return "task-no-resource";
    }
    
    // 電装の判定
    const resourceOptions = gantt.serverList("resource_options");
    const resourceIds = Array.isArray(task.resource_id) ? task.resource_id : [task.resource_id];
    
    const firstResourceId = resourceIds[0];
    const resource = resourceOptions.find(r => r.key == firstResourceId);
    
    if (resource && resource.department === '電装') {
        return "task-electrical";
    }
    
    return "task-no-resource";
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
gantt.config.round_dnd_dates = false;
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
gantt.config.resource_render_empty_cells = true;

// リソースタイムラインのテンプレート設定
gantt.templates.resource_cell_class = function(start_date, end_date, resource, tasks) {
    if (tasks.length === 0) {
        return "gantt_resource_cell_empty";
    } else if (tasks.length > 1) {
        return "gantt_resource_cell_overload";
    } else {
        const task = tasks[0];
        const taskStart = task.start_date;
        const taskEnd = task.end_date;
        
        let classes = "gantt_resource_cell_single";
        
        if (start_date <= taskStart && taskStart < end_date) {
            classes += " resource-task-start";
        }
        
        if (start_date < taskEnd && taskEnd <= end_date) {
            classes += " resource-task-end";
        }
        
        if (start_date <= taskStart && taskEnd <= end_date) {
            classes = "gantt_resource_cell_single resource-task-single";
        }
        
        return classes;
    }
};

gantt.templates.resource_cell_value = function(start_date, end_date, resource, tasks) {
    return "";
};

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
        if (!id || !gantt.isTaskExists(id)) {
            return false;
        }
        
        gantt.confirm({ 
            text: "このタスクを削除してもよろしいですか?", 
            ok: "はい", 
            cancel: "いいえ",
            callback: (result) => {
                if (result) {
                    if (gantt.isTaskExists(id)) {
                        gantt.deleteTask(id);
                    }
                }
                document.removeEventListener("keydown", handleKeyPress);
            }
        });
        
        const handleKeyPress = function(event) {
            if (event.key === "Enter") {
                event.preventDefault();
                const okButton = document.querySelector('.gantt_popup_button[data-result="true"]');
                if (okButton) {
                    okButton.click();
                } else {
                    const buttons = document.querySelectorAll('.gantt_popup_button');
                    if (buttons.length > 0) {
                        buttons[0].click();
                    }
                }
                document.removeEventListener("keydown", handleKeyPress);
            } else if (event.key === "Escape") {
                event.preventDefault();
                const cancelButton = document.querySelector('.gantt_popup_button[data-result="false"]');
                if (cancelButton) {
                    cancelButton.click();
                } else {
                    const buttons = document.querySelectorAll('.gantt_popup_button');
                    if (buttons.length > 1) {
                        buttons[1].click();
                    }
                }
                document.removeEventListener("keydown", handleKeyPress);
            }
        };
        
        setTimeout(() => {
            document.addEventListener("keydown", handleKeyPress);
        }, 100);
        
        return false;
    }
    
    // ＋ボタンのクリック処理 - 空白の新規タスクを追加
    if (e.target.closest('.gantt_add')) {
        e.preventDefault();
        e.stopPropagation();
        
        // クリックされた行のタスクIDを取得
        const row = e.target.closest('.gantt_row');
        const parentId = row ? row.getAttribute('task_id') : null;
        
        if (parentId && gantt.isTaskExists(parentId)) {
            // 子タスクの作成（親タスクのデータを複製）
            const parentTask = gantt.getTask(parentId);
            const newId = gantt.uid();
            const newTask = {
                id: newId,
                text: parentTask.text || "",
                overview: parentTask.overview || "",
                customer: parentTask.customer || "",
                'machine-unit': parentTask['machine-unit'] || "",
                dispatch_date: parentTask.dispatch_date ? new Date(parentTask.dispatch_date) : null,
                start_date: parentTask.start_date ? new Date(parentTask.start_date) : null,
                end_date: parentTask.end_date ? new Date(parentTask.end_date) : null,
                duration: parentTask.duration || 0,
                resource_id: [],
                place_id: [],
                periods: [],
                parent: parentId
            };
            
            gantt.addTask(newTask, parentId);
            
            // タスク追加後、表示を更新
            setTimeout(() => {
                gantt.open(parentId); // 親タスクを展開
                gantt.refreshData();
            }, 0);
        } else {
            // 親タスクの作成（完全に新規）
            const newId = gantt.uid();
            const newTask = {
                id: newId,
                text: "",
                overview: "",
                customer: "",
                'machine-unit': "",
                start_date: null,
                end_date: null,
                duration: 0,
                dispatch_date: null,
                resource_id: [],
                place_id: [],
                periods: []
            };
            
            gantt.addTask(newTask);
            
            // タスク追加後、強制的に値をクリア
            setTimeout(() => {
                const task = gantt.getTask(newId);
                task.text = "";
                gantt.updateTask(newId);
                gantt.refreshData();
            }, 0);
        }
        
        return false;
    }
    
    // グリッド列のクリック処理
    const cell = e.target.closest(".gantt_cell");
    if (cell) {
        const columnName = cell.getAttribute("data-column-name");
        const column = gantt.config.columns.find(col => col.name === columnName);
        
        if (columnName === "resource_id") {
            showCustomLightbox(id, 'resource_id', e);
            return false;
        }
        
        if (columnName === "place_id") {
            showCustomLightbox(id, 'place_id', e);
            return false;
        }
        
        if (column && column.editor) {
            gantt.ext.inlineEditors.startEdit(id, columnName);
            return false;
        }
    }
    
    return true;
});

gantt.attachEvent("onTaskDblClick", function(id, e) {
    // ダブルクリック時は何もしない（ライトボックスを開かない）
    return false;
});

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

// 新規タスク追加時にデフォルト値を空にする
gantt.attachEvent("onBeforeTaskAdd", function(id, task) {
    // 親タスクがある場合（子タスク）は日付をクリアしない
    if (task.parent) {
        if (!task.text || task.text === id.toString()) {
            task.text = "";
        }
        return true;
    }
    
    // 親タスクの場合のみ日付をクリア
    if (!task.text || task.text === id.toString()) {
        task.text = "";
    }
    task.start_date = null;
    task.end_date = null;
    task.duration = 0;
    return true;
});

// 出荷日マーカーを追加するカスタムレイヤー
gantt.addTaskLayer(function(task) {
    if (!task.dispatch_date) return false;
    
    const dispatchPos = gantt.posFromDate(task.dispatch_date);
    const taskTop = gantt.getTaskTop(task.id);
    const rowHeight = gantt.config.row_height;
    const barHeight = gantt.config.task_height;
    const verticalOffset = Math.floor((rowHeight - barHeight) / 2);
    
    const marker = document.createElement('div');
    marker.className = 'dispatch-date-marker';
    marker.innerHTML = '★';
    marker.style.cssText = `
        position: absolute;
        left: ${dispatchPos - 8}px;
        top: ${taskTop + verticalOffset + Math.floor(barHeight / 2) - 10}px;
        width: 16px;
        height: 20px;
        color: #FF0000;
        font-size: 20px;
        line-height: 20px;
        text-align: center;
        pointer-events: none;
        z-index: 5;
        text-shadow: 0 0 3px white;
    `;
    
    return marker;
});