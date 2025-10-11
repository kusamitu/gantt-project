// タイムライン表示モード（'resource' または 'place'）
let currentTimelineMode = 'resource';

// テンプレート関数を保存する変数
let placeTemplates = null;
let resourceTemplates = null;

// 場所用のテンプレートを定義
function getPlaceTemplates() {
    return {
        resource_cell_class: function(start_date, end_date, place, tasks) {
            if (tasks.length === 0) {
                return "gantt_resource_cell_empty";
            } else if (tasks.length > 1) {
                return "gantt_resource_cell_overload";
            } else {
                return "gantt_resource_cell_single";
            }
        },
        resource_cell_value: function(start_date, end_date, place, tasks) {
            return tasks.length || "";
        },
        resource_task: function(task, place) {
            if (!task.place_id || (Array.isArray(task.place_id) && task.place_id.length === 0)) {
                return false;
            }
            
            const placeIds = Array.isArray(task.place_id) ? task.place_id : task.place_id.toString().split(',').map(id => parseInt(id.trim(), 10));
            return placeIds.includes(parseInt(place.id, 10));
        }
    };
}

// 担当者用のテンプレートを定義
function getResourceTemplates() {
    return {
        resource_cell_class: function(start_date, end_date, resource, tasks) {
            if (tasks.length === 0) {
                return "gantt_resource_cell_empty";
            } else if (tasks.length > 1) {
                return "gantt_resource_cell_overload";
            } else {
                return "gantt_resource_cell_single";
            }
        },
        resource_cell_value: function(start_date, end_date, resource, tasks) {
            return tasks.length || "";
        },
        resource_task: function(task, resource) {
            if (!task.resource_id || (Array.isArray(task.resource_id) && task.resource_id.length === 0)) {
                return false;
            }
            const resourceIds = Array.isArray(task.resource_id) ? task.resource_id : task.resource_id.toString().split(',').map(id => parseInt(id.trim(), 10));
            return resourceIds.includes(parseInt(resource.id, 10));
        }
    };
}

// テンプレートを適用する関数
function applyTemplates(templates) {
    gantt.templates.resource_cell_class = templates.resource_cell_class;
    gantt.templates.resource_cell_value = templates.resource_cell_value;
    gantt.templates.resource_task = templates.resource_task;
}

// レイアウトを再構築する関数
function rebuildLayout(storeName, label) {
    const mainGridWidth = gantt.config.columns.reduce((total, col) => {
        return total + (typeof col.width === 'number' ? col.width : 0);
    }, 0);
    
    const deleteColumn = gantt.config.columns.find(col => col.name === "delete");
    const addColumn = gantt.config.columns.find(col => col.name === "add");
    const deleteColumnWidth = deleteColumn ? (typeof deleteColumn.width === 'number' ? deleteColumn.width : 0) : 0;
    const addColumnWidth = addColumn ? (typeof addColumn.width === 'number' ? addColumn.width : 0) : 0;
    const resourceColumnWidth = 100;
    const spacerWidth = mainGridWidth - resourceColumnWidth + deleteColumnWidth + addColumnWidth;
    
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
    
    gantt.resetLayout();
}

// 場所負荷タイムラインに切り替え
function switchToPlaceTimeline() {
    // ボタンのテキストを変更
    const btn = document.getElementById('toggle_timeline_btn');
    if (btn) btn.textContent = '担当者負荷に切替';
    
    // 場所タイムラインの設定
    gantt.config.resource_store = "place";
    gantt.config.resource_property = "place_id";
    gantt.config.process_resource_assignments = true;
    
    // テンプレートを設定
    placeTemplates = getPlaceTemplates();
    applyTemplates(placeTemplates);
    
    // レイアウトを再構築
    rebuildLayout('place', '場所');
    
    // ガントチャートを完全に破棄して再初期化
    gantt.clearAll();
    
    // タスクデータを再読み込み
    loadAllData().then(() => {
        applyTemplates(placeTemplates);
        gantt.render();
    });
}

// 担当者負荷タイムラインに切り替え
function switchToResourceTimeline() {
    // ボタンのテキストを変更
    const btn = document.getElementById('toggle_timeline_btn');
    if (btn) btn.textContent = '場所負荷に切替';
    
    // リソースタイムラインの設定
    gantt.config.resource_store = "resource";
    gantt.config.resource_property = "resource_id";
    gantt.config.process_resource_assignments = true;
    
    // テンプレートを設定
    resourceTemplates = getResourceTemplates();
    applyTemplates(resourceTemplates);
    
    // レイアウトを再構築
    rebuildLayout('resource', '担当者');
    
    // ガントチャートを完全に破棄して再初期化
    gantt.clearAll();
    
    // タスクデータを再読み込み
    loadAllData().then(() => {
        applyTemplates(resourceTemplates);
        gantt.render();
    });
}

// タイムラインを切り替える関数
function toggleTimeline() {
    if (currentTimelineMode === 'resource') {
        currentTimelineMode = 'place';
        switchToPlaceTimeline();
    } else {
        currentTimelineMode = 'resource';
        switchToResourceTimeline();
    }
}