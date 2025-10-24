// タイムライン表示モード('resource' または 'place')
let currentTimelineMode = 'resource';

// テンプレート関数を保存する変数
let placeTemplates = null;
let resourceTemplates = null;

// タスクごとの色設定を保存するマップ
let taskColorMap = {};

// 場所負荷タイムラインのタスク色をSupabaseから読み込む
async function loadPlaceTaskColors() {
    try {
        const { data, error } = await db.from('place_task_colors').select('*');
        if (error && error.code !== 'PGRST116') {
            console.error('タスク色の読み込みエラー:', error);
            return;
        }
        
        if (data) {
            taskColorMap = {};
            data.forEach(item => {
                taskColorMap[item.task_id] = item.color;
            });
        }
    } catch (error) {
        console.error('タスク色の読み込みエラー:', error);
    }
}

// 場所負荷タイムラインのタスク色をSupabaseに保存する
async function savePlaceTaskColor(taskId, color) {
    try {
        const payload = {
            task_id: taskId,
            color: color
        };
        
        const { error } = await db.from('place_task_colors')
            .upsert(payload, { onConflict: 'task_id' });
        
        if (error) {
            console.error('タスク色の保存エラー:', error);
        }
    } catch (error) {
        console.error('タスク色の保存エラー:', error);
    }
}

// 場所用のテンプレートを定義
function getPlaceTemplates() {
    return {
        resource_cell_class: function(start_date, end_date, place, tasks) {
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
        },
        resource_cell_value: function(start_date, end_date, place, tasks) {
            return "";
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
        },
        resource_cell_value: function(start_date, end_date, resource, tasks) {
            return "";
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
    
    // 列幅設定がある場合はモードに応じて使用、なければデフォルト値
    const resourceColumnWidth = (typeof columnWidthSettings !== 'undefined') 
        ? (storeName === 'place' ? columnWidthSettings.placeTimelineColumn : columnWidthSettings.resourceTimelineColumn)
        : 100;
    
    // 担当者負荷タイムライン開始位置を使用してスペーサーの幅を計算
    const resourceColumnStartPosition = (typeof columnWidthSettings !== 'undefined') 
        ? columnWidthSettings.resourceColumn 
        : 100;
    
    // スペーサーの幅を正確に計算（メイングリッドの幅から担当者負荷タイムライン開始位置を引く）
    const spacerWidth = mainGridWidth - resourceColumnStartPosition;
    
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

// リソースタイムラインエリアにクラスを追加する汎用関数
function ensureResourceTimelineClass(isPlaceMode) {
    const allDataAreas = document.querySelectorAll('.gantt_data_area');
    if (allDataAreas.length > 1) {
        const resourceTimelineArea = allDataAreas[1];
        
        if (!resourceTimelineArea.classList.contains('gantt_resource_timeline')) {
            resourceTimelineArea.classList.add('gantt_resource_timeline');
        }
        
        if (isPlaceMode) {
            resourceTimelineArea.classList.add('place-timeline');
        } else {
            resourceTimelineArea.classList.remove('place-timeline');
        }
        
        return resourceTimelineArea;
    }
    return null;
}

// リソースタイムラインの位置を調整する関数（無効化版）
function adjustResourceTimelinePosition() {
    // 罫線消失を防ぐため、位置調整を無効化
    return;
    
    // 以下の処理は無効化
    /*
    try {
        // メイングリッドの位置を取得
        const mainGrid = document.querySelector('.gantt_grid');
        if (!mainGrid) return;
        
        const mainGridRect = mainGrid.getBoundingClientRect();
        
        // リソースタイムラインの開始位置を計算（担当者負荷タイムライン開始位置を使用）
        const resourceColumnStartPosition = (typeof columnWidthSettings !== 'undefined' && columnWidthSettings.resourceColumn) 
            ? columnWidthSettings.resourceColumn 
            : 100;
        const timelineStartX = mainGridRect.left + resourceColumnStartPosition;
        
        // リソースタイムラインの位置のみを調整（最小限の操作）
        const resourceTimeline = document.querySelector('.gantt_resource_timeline');
        if (resourceTimeline) {
            resourceTimeline.style.left = timelineStartX + 'px';
            resourceTimeline.style.position = 'absolute';
            resourceTimeline.style.marginLeft = '0px';
        }
        
    } catch (error) {
        console.warn('リソースタイムライン位置調整エラー:', error);
    }
    */
}

// 場所負荷タイムラインに切り替え
function switchToPlaceTimeline() {
    
    const btn = document.getElementById('toggle_timeline_btn');
    if (btn) btn.textContent = '担当者負荷に切替';
    
    // 現在の横スクロール位置を保存
    const currentScrollState = gantt.getScrollState();
    const savedScrollX = currentScrollState.x;
    
    gantt.config.resource_store = "place";
    gantt.config.resource_property = "place_id";
    gantt.config.process_resource_assignments = true;
    
    placeTemplates = getPlaceTemplates();
    applyTemplates(placeTemplates);
    
    gantt.clearAll();
    
    // レイアウト再構築を有効化（列幅設定の反映のため）
    rebuildLayout('place', '場所');
    
    loadAllData().then(async () => {
        await loadPlaceTaskColors();
        
        applyTemplates(placeTemplates);
        
        db.from('places').select('*').then(({ data: places }) => {
            const formattedPlaces = places.map(p => ({
                id: p.id,
                text: p.name,
                parent: 0,
                open: false
            }));
            const placeStore = gantt.getDatastore("place");
            if (placeStore) {
                placeStore.clearAll();
                placeStore.parse(formattedPlaces);
            }
            
            updatePlaceTimelineColor();
            updateElectricalBarColor();
            updateNoResourceBarColor();
            updateTrialBarColor();
            
            gantt.render();
            
            // レイアウト再構築をレンダリング後に実行
            setTimeout(() => {
                rebuildLayout('place', '場所');
                
                // レイアウト再構築後に横スクロール位置を復元
            setTimeout(() => {
                gantt.scrollTo(savedScrollX, currentScrollState.y);
            }, 50);
            }, 100);
            
            // レイアウト再構築後の位置調整を無効化（罫線消失を防ぐため）
            setTimeout(() => {
                ensureResourceTimelineClass(true);
                // リソースタイムラインの位置調整を無効化
                // adjustResourceTimelinePosition();
            }, 100);
            
            renderResourceTimelineLabels();
        });
    });
}

// 担当者負荷タイムラインに切り替え
function switchToResourceTimeline() {
    
    const btn = document.getElementById('toggle_timeline_btn');
    if (btn) btn.textContent = '場所負荷に切替';
    
    // 現在の横スクロール位置を保存
    const currentScrollState = gantt.getScrollState();
    const savedScrollX = currentScrollState.x;
    
    gantt.config.resource_store = "resource";
    gantt.config.resource_property = "resource_id";
    gantt.config.process_resource_assignments = true;
    
    resourceTemplates = getResourceTemplates();
    applyTemplates(resourceTemplates);
    
    gantt.clearAll();
    
    // レイアウト再構築を有効化（列幅設定の反映のため）
    rebuildLayout('resource', '担当者');
    
    loadAllData().then(() => {
        applyTemplates(resourceTemplates);
        
        db.from('resources').select('*').then(({ data: resources }) => {
            const formattedResources = resources.map(r => ({
                id: r.id,
                text: r.name,
                parent: 0
            }));
            const resourceStore = gantt.getDatastore("resource");
            if (resourceStore) {
                resourceStore.clearAll();
                resourceStore.parse(formattedResources);
            }
            
            updateResourceTimelineColor();
            updateElectricalBarColor();
            updateNoResourceBarColor();
            updateTrialBarColor();
            
            gantt.render();
            
            // レイアウト再構築をレンダリング後に実行
            setTimeout(() => {
                rebuildLayout('resource', '担当者');
                
                // レイアウト再構築後に横スクロール位置を復元
            setTimeout(() => {
                gantt.scrollTo(savedScrollX, currentScrollState.y);
            }, 50);
            }, 100);
            
            // レイアウト再構築後の位置調整を無効化（罫線消失を防ぐため）
            setTimeout(() => {
                ensureResourceTimelineClass(false);
                // リソースタイムラインの位置調整を無効化
                // adjustResourceTimelinePosition();
            }, 100);
            
            renderResourceTimelineLabels();
        });
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

// リソース/場所タイムラインにタスクラベルを表示する関数
function renderResourceTimelineLabels() {
    setTimeout(() => {
        document.querySelectorAll('.resource-timeline-task-label').forEach(el => el.remove());
        document.querySelectorAll('.resource-timeline-bar').forEach(el => el.remove());

        const storeName = gantt.config.resource_store;
        const store = gantt.getDatastore(storeName);
        
        if (!store) return;

        const allDataAreas = document.querySelectorAll('.gantt_data_area');
        let resourceTimelineArea = allDataAreas.length > 1 ? allDataAreas[1] : null;
        
        if (!resourceTimelineArea) return;

        const allRows = resourceTimelineArea.querySelectorAll('.gantt_task_row');
        const scrollLeft = gantt.getScrollState().x;
        
        const barHeight = (typeof heightSettings !== 'undefined' && heightSettings.resourceTaskBar) ? heightSettings.resourceTaskBar : 15;
        const rowHeight = (typeof heightSettings !== 'undefined' && heightSettings.resourceGridRow) ? heightSettings.resourceGridRow : 17;
        const verticalOffset = (rowHeight - barHeight) / 2;

        store.eachItem(function(resource) {
            const tasks = getResourceTasks(resource);
            
            if (tasks.length === 0) return;
            
            tasks.forEach(task => {
                if (!task.start_date || !task.end_date) return;
                
                const resourceIndex = store.getIndexById(resource.id);
                const resourceRow = allRows[resourceIndex];
                
                if (!resourceRow) return;

                const rowRect = resourceRow.getBoundingClientRect();
                const timelineRect = resourceTimelineArea.getBoundingClientRect();
                
                const startPos = gantt.posFromDate(task.start_date) - scrollLeft;
                const endPos = gantt.posFromDate(task.end_date) - scrollLeft;
                const width = endPos - startPos;

                const top = rowRect.top - timelineRect.top + verticalOffset;

                const overlappingTasks = tasks.filter(t => {
                    if (!t.start_date || !t.end_date) return false;
                    const tStart = t.start_date.getTime();
                    const tEnd = t.end_date.getTime();
                    const taskStartTime = task.start_date.getTime();
                    const taskEndTime = task.end_date.getTime();
                    return !(tEnd <= taskStartTime || tStart >= taskEndTime);
                });

                let barColor;
                if (overlappingTasks.length > 1) {
                    barColor = '#ff0000';
                } else if (storeName === 'place' && taskColorMap[task.id]) {
                    barColor = taskColorMap[task.id];
                } else {
                    barColor = storeName === 'resource' 
                        ? (colorSettings.resourceBar || '#3db9d3')
                        : (colorSettings.placeBar || '#3db9d3');
                }

                const bar = document.createElement('div');
                bar.className = 'resource-timeline-bar';
                bar.setAttribute('data-task-id', task.id);
                bar.style.cssText = `
                    position: absolute;
                    left: ${startPos}px;
                    top: ${top}px;
                    width: ${width}px;
                    height: ${barHeight}px;
                    background-color: ${barColor};
                    border-radius: 3px;
                    pointer-events: ${storeName === 'place' ? 'auto' : 'none'};
                    z-index: 2;
                    cursor: ${storeName === 'place' ? 'pointer' : 'default'};
                `;
                
                if (storeName === 'place') {
                    bar.addEventListener('click', function(e) {
                        e.stopPropagation();
                        showPlaceTaskColorPicker(task.id, e.clientX, e.clientY);
                    });
                }
                
                resourceTimelineArea.appendChild(bar);

                const orderNo = task.text || '';
                const machine = task['machine-unit'] || '';
                const labelText = orderNo + machine;

                const label = document.createElement('div');
                label.className = 'resource-timeline-task-label';
                label.textContent = labelText;
                
                const r = parseInt(barColor.substring(1, 3), 16);
                const g = parseInt(barColor.substring(3, 5), 16);
                const b = parseInt(barColor.substring(5, 7), 16);
                const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
                const textColor = luminance > 128 ? '#000000' : '#FFFFFF';
                
                const fontSize = 11;
                
                label.style.cssText = `
                    position: absolute;
                    left: ${startPos}px;
                    top: ${top}px;
                    width: ${width}px;
                    height: ${barHeight}px;
                    line-height: ${barHeight}px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    padding: 0 4px;
                    font-size: ${fontSize}px;
                    pointer-events: none;
                    z-index: 3;
                    color: ${textColor};
                    font-weight: ${overlappingTasks.length > 1 ? 'bold' : 'normal'};
                `;

                resourceTimelineArea.appendChild(label);
            });
        });
    }, 500);
}

// リソースに紐づくタスクを取得
function getResourceTasks(resource) {
    const tasks = [];
    gantt.eachTask(function(task) {
        if (gantt.templates.resource_task(task, resource)) {
            tasks.push(task);
        }
    });
    return tasks;
}

// ガントチャートの描画後にラベルを更新
gantt.attachEvent("onGanttRender", function() {
    if (gantt.config.resource_store === 'resource' || gantt.config.resource_store === 'place') {
        renderResourceTimelineLabels();
        
        setTimeout(() => {
            const isPlaceMode = gantt.config.resource_property === 'place_id';
            ensureResourceTimelineClass(isPlaceMode);
            // レンダリング後の位置調整を無効化（罫線消失を防ぐため）
            // adjustResourceTimelinePosition();
        }, 100);
    }
});

// スクロール時にもラベルを更新
gantt.attachEvent("onGanttScroll", function() {
    if (gantt.config.resource_store === 'resource' || gantt.config.resource_store === 'place') {
        renderResourceTimelineLabels();
    }
});

// データ更新時にもラベルを更新
gantt.attachEvent("onAfterTaskUpdate", function() {
    if (gantt.config.resource_store === 'resource' || gantt.config.resource_store === 'place') {
        renderResourceTimelineLabels();
    }
});

// ガントチャート準備完了時にもクラスを適用
gantt.attachEvent("onGanttReady", function() {
    setTimeout(() => {
        const isPlaceMode = gantt.config.resource_property === 'place_id';
        ensureResourceTimelineClass(isPlaceMode);
        // 初期化時の位置調整を無効化（罫線消失を防ぐため）
        // adjustResourceTimelinePosition();
    }, 100);
});

// 場所負荷タイムラインのタスク用カラーピッカーを表示
function showPlaceTaskColorPicker(taskId, x, y) {
    const existingPicker = document.querySelector('.place-task-color-picker');
    if (existingPicker) {
        existingPicker.remove();
    }
    
    const colorPalette = (typeof COLOR_PALETTE !== 'undefined') ? COLOR_PALETTE : [
        '#E65100', '#F9A825', '#1B5E20', '#689F38', '#0097A7', '#0D47A1', '#880E4F', '#4A148C',
        '#FF6F00', '#FBC02D', '#2E7D32', '#7CB342', '#00ACC1', '#1565C0', '#AD1457', '#6A1B9A',
        '#FF8F00', '#FDD835', '#43A047', '#9CCC65', '#26C6DA', '#42A5F5', '#EC407A', '#AB47BC',
        '#FFB74D', '#FFEB3B', '#66BB6A', '#C5E1A5', '#80DEEA', '#90CAF9', '#F48FB1', '#CE93D8'
    ];
    
    const currentColor = taskColorMap[taskId] || (colorSettings.placeBar || '#3db9d3');
    
    const picker = document.createElement('div');
    picker.className = 'place-task-color-picker';
    picker.innerHTML = `
        <style>
            .place-task-color-picker {
                position: fixed;
                background-color: white;
                border: 1px solid #ccc;
                border-radius: 4px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                z-index: 10000;
                padding: 10px;
            }
            .place-task-color-picker-title {
                font-size: 12px;
                font-weight: bold;
                margin-bottom: 8px;
                color: #333;
            }
            .place-task-color-palette {
                display: grid;
                grid-template-columns: repeat(8, 1fr);
                gap: 6px;
                margin-bottom: 10px;
            }
            .place-task-color-option {
                width: 32px;
                height: 32px;
                border-radius: 4px;
                cursor: pointer;
                border: 2px solid transparent;
                transition: all 0.2s;
            }
            .place-task-color-option:hover {
                transform: scale(1.1);
                border-color: #666;
            }
            .place-task-color-option.selected {
                border-color: #4285f4;
                border-width: 3px;
            }
            .place-task-color-picker-current {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px;
                background-color: #f9f9f9;
                border-radius: 4px;
                font-size: 11px;
                margin-bottom: 8px;
            }
            .place-task-color-picker-current-box {
                width: 24px;
                height: 24px;
                border-radius: 3px;
                border: 1px solid #ddd;
            }
            .place-task-color-picker-buttons {
                display: flex;
                gap: 6px;
                justify-content: flex-end;
            }
            .place-task-color-picker-buttons button {
                padding: 5px 10px;
                border: none;
                border-radius: 3px;
                cursor: pointer;
                font-size: 12px;
            }
            .place-task-color-picker-reset {
                background-color: #999;
                color: white;
            }
            .place-task-color-picker-reset:hover {
                background-color: #888;
            }
            .place-task-color-picker-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 9999;
            }
        </style>
        <div class="place-task-color-picker-title">タスクの色を選択</div>
        <div class="place-task-color-picker-current">
            <div class="place-task-color-picker-current-box" style="background-color: ${currentColor};"></div>
            <span>${currentColor}</span>
        </div>
        <div class="place-task-color-palette">
            ${colorPalette.map(color => `
                <div class="place-task-color-option ${color === currentColor ? 'selected' : ''}" 
                     style="background-color: ${color};" 
                     data-color="${color}"></div>
            `).join('')}
        </div>
        <div class="place-task-color-picker-buttons">
            <button class="place-task-color-picker-reset">デフォルトに戻す</button>
        </div>
    `;
    
    const overlay = document.createElement('div');
    overlay.className = 'place-task-color-picker-overlay';
    
    const maxX = window.innerWidth - 300;
    const maxY = window.innerHeight - 350;
    
    picker.style.left = Math.max(10, Math.min(x + 10, maxX)) + 'px';
    picker.style.top = Math.max(10, Math.min(y + 10, maxY)) + 'px';
    
    document.body.appendChild(overlay);
    document.body.appendChild(picker);
    
    const closePicker = () => {
        if (picker.parentNode) document.body.removeChild(picker);
        if (overlay.parentNode) document.body.removeChild(overlay);
    };
    
    overlay.addEventListener('click', closePicker);
    
    picker.querySelectorAll('.place-task-color-option').forEach(option => {
        option.addEventListener('click', async (e) => {
            const selectedColor = e.target.dataset.color;
            
            picker.querySelectorAll('.place-task-color-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            e.target.classList.add('selected');
            
            picker.querySelector('.place-task-color-picker-current-box').style.backgroundColor = selectedColor;
            picker.querySelector('.place-task-color-picker-current span').textContent = selectedColor;
            
            taskColorMap[taskId] = selectedColor;
            await savePlaceTaskColor(taskId, selectedColor);
            
            renderResourceTimelineLabels();
        });
    });
    
    picker.querySelector('.place-task-color-picker-reset').addEventListener('click', async () => {
        const defaultColor = colorSettings.placeBar || '#3db9d3';
        
        delete taskColorMap[taskId];
        
        try {
            await db.from('place_task_colors').delete().eq('task_id', taskId);
        } catch (error) {
            console.error('タスク色の削除エラー:', error);
        }
        
        renderResourceTimelineLabels();
        
        closePicker();
    });
}