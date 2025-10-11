// 複数バー表示機能

// 期間追加モードの状態管理
let addPeriodMode = false;
let dragStartDate = null;
let dragEndDate = null;
let currentTaskId = null;
let dragPreviewElement = null;

// 試運転バーのドラッグ状態管理
let isDraggingPeriod = false;
let isResizingPeriod = false;
let draggedPeriodData = null;
let resizeDirection = null; // 'left' or 'right'
let dragOffsetX = 0;

// 試運転バーの設定
const TRIAL_RUN_CONFIG = {
    name: '試運転',
    color: '#FF69B4' // ピンク色
};

// 期間追加モードの切り替え
function toggleAddPeriodMode() {
    addPeriodMode = !addPeriodMode;
    const btn = document.getElementById('add_period_btn');
    
    if (addPeriodMode) {
        btn.textContent = '期間追加モード: ON';
        btn.style.backgroundColor = '#FF69B4';
        document.body.style.cursor = 'crosshair';
    } else {
        btn.textContent = '試運転期間を追加';
        btn.style.backgroundColor = '#4a90e2';
        document.body.style.cursor = 'default';
        removeDragPreview();
    }
}

// ドラッグプレビューを削除
function removeDragPreview() {
    if (dragPreviewElement && dragPreviewElement.parentNode) {
        dragPreviewElement.parentNode.removeChild(dragPreviewElement);
        dragPreviewElement = null;
    }
}

// タスクに新しい期間を追加
function addPeriodToTask(taskId, startDate, endDate) {
    const task = gantt.getTask(taskId);
    
    // periods配列が存在しない場合は初期化
    if (!task.periods) {
        task.periods = [];
    }
    
    // 重なりチェック
    if (checkPeriodOverlap(task, startDate, endDate)) {
        gantt.alert({
            type: "error",
            text: "既存の期間と重なっています。別の期間を選択してください。"
        });
        return false;
    }
    
    // 新しい期間を追加
    const newPeriod = {
        id: generatePeriodId(),
        name: TRIAL_RUN_CONFIG.name,
        start_date: new Date(startDate),
        end_date: new Date(endDate),
        color: TRIAL_RUN_CONFIG.color
    };
    
    task.periods.push(newPeriod);
    
    // タスクを更新
    gantt.updateTask(taskId);
    
    return true;
}

// 期間の重なりをチェック
function checkPeriodOverlap(task, newStart, newEnd) {
    const newStartTime = new Date(newStart).getTime();
    const newEndTime = new Date(newEnd).getTime();
    
    // メインタスクとの重なりチェック
    if (task.start_date && task.end_date) {
        const mainStart = task.start_date.getTime();
        const mainEnd = task.end_date.getTime();
        
        if (!(newEndTime <= mainStart || newStartTime >= mainEnd)) {
            return true; // 重なりあり
        }
    }
    
    // 他の期間との重なりチェック
    if (task.periods && task.periods.length > 0) {
        for (let period of task.periods) {
            const periodStart = new Date(period.start_date).getTime();
            const periodEnd = new Date(period.end_date).getTime();
            
            if (!(newEndTime <= periodStart || newStartTime >= periodEnd)) {
                return true; // 重なりあり
            }
        }
    }
    
    return false; // 重なりなし
}

// ユニークなIDを生成
function generatePeriodId() {
    return 'period_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// カスタムレイヤーで追加の期間を描画
gantt.addTaskLayer(function(task) {
    if (!task.periods || task.periods.length === 0) {
        return false;
    }
    
    const elements = [];
    
    task.periods.forEach(period => {
        try {
            const sizes = gantt.getTaskPosition(task, period.start_date, period.end_date);
            
            const el = document.createElement('div');
            el.className = 'gantt_task_line gantt_additional_period';
            el.setAttribute('data-period-id', period.id);
            el.setAttribute('data-task-id', task.id);
            el.style.left = sizes.left + 'px';
            el.style.top = (sizes.top + 5) + 'px';
            el.style.width = sizes.width + 'px';
            el.style.height = (gantt.config.row_height - 10) + 'px';
            el.style.backgroundColor = period.color + ' !important';
            el.style.border = `1px solid ${shadeColor(period.color, -20)} !important`;
            el.style.borderRadius = '3px';
            el.style.lineHeight = (gantt.config.row_height - 10) + 'px';
            el.style.position = 'absolute';
            el.style.zIndex = '2';
            el.style.cursor = 'move';
            el.style.cssText += `background-color: ${period.color} !important; border-color: ${shadeColor(period.color, -20)} !important;`;
            
            const textColor = getTextColorForBackground(period.color);
            const textDiv = document.createElement('div');
            textDiv.style.cssText = `color: ${textColor}; padding: 0 8px; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; pointer-events: none;`;
            textDiv.textContent = period.name;
            el.appendChild(textDiv);
            
            // 左端のリサイズハンドル
            const leftHandle = document.createElement('div');
            leftHandle.className = 'period_resize_handle period_resize_left';
            leftHandle.style.cssText = `
                position: absolute;
                left: 0;
                top: 0;
                width: 10px;
                height: 100%;
                cursor: ew-resize;
                z-index: 11;
                background-color: rgba(255, 255, 255, 0.3);
            `;
            el.appendChild(leftHandle);
            
            // 右端のリサイズハンドル
            const rightHandle = document.createElement('div');
            rightHandle.className = 'period_resize_handle period_resize_right';
            rightHandle.style.cssText = `
                position: absolute;
                right: 0;
                top: 0;
                width: 10px;
                height: 100%;
                cursor: ew-resize;
                z-index: 11;
                background-color: rgba(255, 255, 255, 0.3);
            `;
            el.appendChild(rightHandle);
            
            const deleteIcon = document.createElement('span');
            deleteIcon.className = 'period_delete_icon';
            deleteIcon.innerHTML = '×';
            deleteIcon.style.cssText = `
                position: absolute;
                right: 3px;
                top: 50%;
                transform: translateY(-50%);
                color: ${textColor};
                cursor: pointer;
                font-size: 16px;
                font-weight: bold;
                padding: 0 4px;
                display: none;
                z-index: 10;
            `;
            
            el.appendChild(deleteIcon);
            
            el.addEventListener('mouseenter', (e) => {
                e.stopPropagation();
                if (!isDraggingPeriod && !isResizingPeriod) {
                    deleteIcon.style.display = 'block';
                }
            });
            
            el.addEventListener('mouseleave', (e) => {
                e.stopPropagation();
                deleteIcon.style.display = 'none';
            });
            
            // ドラッグ開始（移動）
            el.addEventListener('mousedown', (e) => {
                console.log('Period mousedown', { addPeriodMode, target: e.target.className });
                
                if (addPeriodMode) return;
                
                // リサイズハンドルまたは削除アイコンをクリックした場合は無視
                if (e.target.classList.contains('period_resize_handle') || 
                    e.target.classList.contains('period_delete_icon')) {
                    console.log('Clicked on handle or delete icon, ignoring');
                    return;
                }
                
                e.stopPropagation();
                e.preventDefault();
                
                console.log('Starting drag');
                isDraggingPeriod = true;
                draggedPeriodData = {
                    taskId: task.id,
                    periodId: period.id,
                    element: el,
                    startDate: new Date(period.start_date),
                    endDate: new Date(period.end_date)
                };
                
                const rect = el.getBoundingClientRect();
                dragOffsetX = e.clientX - rect.left;
                
                el.style.opacity = '0.7';
                deleteIcon.style.display = 'none';
            });
            
            // リサイズハンドルのイベント
            leftHandle.addEventListener('mousedown', (e) => {
                console.log('Left handle mousedown');
                
                if (addPeriodMode) return;
                
                e.stopPropagation();
                e.preventDefault();
                
                console.log('Starting left resize');
                isResizingPeriod = true;
                resizeDirection = 'left';
                draggedPeriodData = {
                    taskId: task.id,
                    periodId: period.id,
                    element: el,
                    startDate: new Date(period.start_date),
                    endDate: new Date(period.end_date)
                };
                
                el.style.opacity = '0.7';
                deleteIcon.style.display = 'none';
            });
            
            rightHandle.addEventListener('mousedown', (e) => {
                console.log('Right handle mousedown');
                
                if (addPeriodMode) return;
                
                e.stopPropagation();
                e.preventDefault();
                
                console.log('Starting right resize');
                isResizingPeriod = true;
                resizeDirection = 'right';
                draggedPeriodData = {
                    taskId: task.id,
                    periodId: period.id,
                    element: el,
                    startDate: new Date(period.start_date),
                    endDate: new Date(period.end_date)
                };
                
                el.style.opacity = '0.7';
                deleteIcon.style.display = 'none';
            });
            
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
            });
            
            deleteIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                gantt.confirm({
                    text: `「${period.name}」期間を削除しますか?`,
                    ok: "はい",
                    cancel: "いいえ",
                    callback: (result) => {
                        if (result) {
                            deletePeriod(task.id, period.id);
                        }
                    }
                });
            });
            
            elements.push(el);
        } catch (error) {
            console.error('Error rendering period:', error, period);
        }
    });
    
    if (elements.length === 0) {
        return false;
    } else if (elements.length === 1) {
        return elements[0];
    } else {
        const container = document.createElement('div');
        container.style.cssText = 'position: absolute; width: 100%; height: 100%; pointer-events: none;';
        elements.forEach(el => {
            el.style.pointerEvents = 'auto';
            container.appendChild(el);
        });
        return container;
    }
});

// 期間を削除
function deletePeriod(taskId, periodId) {
    const task = gantt.getTask(taskId);
    if (task.periods) {
        task.periods = task.periods.filter(p => p.id !== periodId);
        gantt.updateTask(taskId);
        gantt.render();
    }
}

// 期間の日付を更新
function updatePeriodDates(taskId, periodId, newStartDate, newEndDate) {
    const task = gantt.getTask(taskId);
    if (task.periods) {
        const period = task.periods.find(p => p.id === periodId);
        if (period) {
            // 重なりチェック（自分自身を除外）
            const tempPeriods = task.periods.filter(p => p.id !== periodId);
            const tempTask = Object.assign({}, task, { periods: tempPeriods });
            
            if (checkPeriodOverlap(tempTask, newStartDate, newEndDate)) {
                gantt.alert({
                    type: "error",
                    text: "既存の期間と重なっています。"
                });
                gantt.render();
                return;
            }
            
            period.start_date = new Date(newStartDate);
            period.end_date = new Date(newEndDate);
            gantt.updateTask(taskId);
            gantt.render();
        }
    }
}

// 背景色に応じたテキスト色を取得
function getTextColorForBackground(hexColor) {
    const r = parseInt(hexColor.substring(1, 3), 16);
    const g = parseInt(hexColor.substring(3, 5), 16);
    const b = parseInt(hexColor.substring(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
    return luminance > 128 ? '#000000' : '#FFFFFF';
}

// タイムラインでのドラッグイベントを設定
gantt.attachEvent("onGanttReady", function() {
    const timelineElement = gantt.$task_data;
    
    let isDrawing = false;
    let startX = 0;
    
    timelineElement.addEventListener('mousedown', function(e) {
        if (!addPeriodMode) return;
        
        // 試運転バーをクリックした場合は無視
        if (e.target.closest('.gantt_additional_period')) {
            return;
        }
        
        // タスク行を特定 - より広範囲で検索
        let taskElement = e.target.closest('.gantt_task_row');
        
        // gantt_task_rowが見つからない場合、別の方法で探す
        if (!taskElement) {
            // クリック位置のY座標からタスクを特定
            const y = e.clientY;
            const taskRows = document.querySelectorAll('.gantt_task_row');
            for (let row of taskRows) {
                const rect = row.getBoundingClientRect();
                if (y >= rect.top && y <= rect.bottom) {
                    taskElement = row;
                    break;
                }
            }
        }
        
        if (!taskElement) return;
        
        const taskId = taskElement.getAttribute('task_id');
        
        if (!taskId || !gantt.isTaskExists(taskId)) return;
        
        currentTaskId = taskId;
        isDrawing = true;
        startX = e.clientX;
        
        // ドラッグ開始位置の日付を取得
        const pos = gantt.getScrollState();
        const x = e.clientX - timelineElement.getBoundingClientRect().left + pos.x;
        dragStartDate = gantt.dateFromPos(x);
        
        e.preventDefault();
    });
    
    timelineElement.addEventListener('mousemove', function(e) {
        if (!isDrawing || !addPeriodMode || !currentTaskId) return;
        
        // 現在位置の日付を取得
        const pos = gantt.getScrollState();
        const x = e.clientX - timelineElement.getBoundingClientRect().left + pos.x;
        dragEndDate = gantt.dateFromPos(x);
        
        // プレビューを表示
        showDragPreview(currentTaskId, dragStartDate, dragEndDate);
        
        e.preventDefault();
    });
    
    document.addEventListener('mouseup', function(e) {
        if (!isDrawing || !addPeriodMode || !currentTaskId) {
            isDrawing = false;
            return;
        }
        
        isDrawing = false;
        removeDragPreview();
        
        if (dragStartDate && dragEndDate) {
            // 開始と終了を正しい順序に
            let start = dragStartDate;
            let end = dragEndDate;
            
            if (start.getTime() > end.getTime()) {
                [start, end] = [end, start];
            }
            
            // 期間が1日未満の場合は1日に設定
            if (end.getTime() - start.getTime() < 24 * 60 * 60 * 1000) {
                end = new Date(start);
                end.setDate(end.getDate() + 1);
            }
            
            // 期間を追加
            if (addPeriodToTask(currentTaskId, start, end)) {
                gantt.render();
            }
        }
        
        dragStartDate = null;
        dragEndDate = null;
        currentTaskId = null;
    });
    
    // 試運転バーのドラッグ中の処理
    document.addEventListener('mousemove', function(e) {
        if (isDraggingPeriod && draggedPeriodData) {
            e.preventDefault();
            
            const timelineElement = gantt.$task_data;
            const pos = gantt.getScrollState();
            const x = e.clientX - timelineElement.getBoundingClientRect().left + pos.x;
            
            const newDate = gantt.dateFromPos(x - dragOffsetX);
            const duration = draggedPeriodData.endDate.getTime() - draggedPeriodData.startDate.getTime();
            const newEndDate = new Date(newDate.getTime() + duration);
            
            // リアルタイムで位置を更新
            const task = gantt.getTask(draggedPeriodData.taskId);
            const sizes = gantt.getTaskPosition(task, newDate, newEndDate);
            draggedPeriodData.element.style.left = sizes.left + 'px';
            
        } else if (isResizingPeriod && draggedPeriodData) {
            e.preventDefault();
            
            const timelineElement = gantt.$task_data;
            const pos = gantt.getScrollState();
            const x = e.clientX - timelineElement.getBoundingClientRect().left + pos.x;
            const newDate = gantt.dateFromPos(x);
            
            const task = gantt.getTask(draggedPeriodData.taskId);
            
            if (resizeDirection === 'left') {
                // 左端をリサイズ
                if (newDate < draggedPeriodData.endDate) {
                    const sizes = gantt.getTaskPosition(task, newDate, draggedPeriodData.endDate);
                    draggedPeriodData.element.style.left = sizes.left + 'px';
                    draggedPeriodData.element.style.width = sizes.width + 'px';
                }
            } else if (resizeDirection === 'right') {
                // 右端をリサイズ
                if (newDate > draggedPeriodData.startDate) {
                    const sizes = gantt.getTaskPosition(task, draggedPeriodData.startDate, newDate);
                    draggedPeriodData.element.style.width = sizes.width + 'px';
                }
            }
        }
    });
    
    // 試運転バーのドラッグ終了
    document.addEventListener('mouseup', function(e) {
        if (isDraggingPeriod && draggedPeriodData) {
            const timelineElement = gantt.$task_data;
            const pos = gantt.getScrollState();
            const x = e.clientX - timelineElement.getBoundingClientRect().left + pos.x;
            
            const newStartDate = gantt.dateFromPos(x - dragOffsetX);
            const duration = draggedPeriodData.endDate.getTime() - draggedPeriodData.startDate.getTime();
            const newEndDate = new Date(newStartDate.getTime() + duration);
            
            // 期間を更新
            updatePeriodDates(draggedPeriodData.taskId, draggedPeriodData.periodId, newStartDate, newEndDate);
            
            draggedPeriodData.element.style.opacity = '1';
            isDraggingPeriod = false;
            draggedPeriodData = null;
            dragOffsetX = 0;
            
        } else if (isResizingPeriod && draggedPeriodData) {
            const timelineElement = gantt.$task_data;
            const pos = gantt.getScrollState();
            const x = e.clientX - timelineElement.getBoundingClientRect().left + pos.x;
            const newDate = gantt.dateFromPos(x);
            
            let newStartDate = draggedPeriodData.startDate;
            let newEndDate = draggedPeriodData.endDate;
            
            if (resizeDirection === 'left') {
                if (newDate < draggedPeriodData.endDate) {
                    newStartDate = newDate;
                }
            } else if (resizeDirection === 'right') {
                if (newDate > draggedPeriodData.startDate) {
                    newEndDate = newDate;
                }
            }
            
            // 期間を更新
            updatePeriodDates(draggedPeriodData.taskId, draggedPeriodData.periodId, newStartDate, newEndDate);
            
            draggedPeriodData.element.style.opacity = '1';
            isResizingPeriod = false;
            draggedPeriodData = null;
            resizeDirection = null;
        }
    });
});

// ドラッグ中のプレビューを表示
function showDragPreview(taskId, startDate, endDate) {
    if (!startDate || !endDate) return;
    
    const task = gantt.getTask(taskId);
    
    // 開始と終了を正しい順序に
    let start = new Date(startDate);
    let end = new Date(endDate);
    
    if (start.getTime() > end.getTime()) {
        [start, end] = [end, start];
    }
    
    // 既存のプレビューを削除
    removeDragPreview();
    
    // 新しいプレビューを作成
    const sizes = gantt.getTaskPosition(task, start, end);
    
    dragPreviewElement = document.createElement('div');
    dragPreviewElement.className = 'gantt_drag_preview';
    dragPreviewElement.style.cssText = `
        position: absolute;
        left: ${sizes.left}px;
        top: ${sizes.top + 5}px;
        width: ${sizes.width}px;
        height: ${gantt.config.row_height - 10}px;
        background-color: ${TRIAL_RUN_CONFIG.color};
        opacity: 0.6;
        border: 2px dashed ${shadeColor(TRIAL_RUN_CONFIG.color, -30)};
        border-radius: 3px;
        pointer-events: none;
        z-index: 10;
    `;
    
    gantt.$task_data.appendChild(dragPreviewElement);
}

// 色を暗くする関数
function shadeColor(color, percent) {
    let R = parseInt(color.substring(1,3),16);
    let G = parseInt(color.substring(3,5),16);
    let B = parseInt(color.substring(5,7),16);

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

// periodsデータをSupabaseに保存できる形式に変換
function serializePeriodsForDB(periods) {
    if (!periods || periods.length === 0) return null;
    return JSON.stringify(periods.map(p => ({
        id: p.id,
        name: p.name,
        start_date: p.start_date instanceof Date ? p.start_date.toISOString() : p.start_date,
        end_date: p.end_date instanceof Date ? p.end_date.toISOString() : p.end_date,
        color: p.color
    })));
}

// Supabaseから取得したperiodsデータを変換
function deserializePeriodsFromDB(periodsJson) {
    if (!periodsJson) return [];
    try {
        const periods = JSON.parse(periodsJson);
        return periods.map(p => ({
            id: p.id,
            name: p.name,
            start_date: new Date(p.start_date),
            end_date: new Date(p.end_date),
            color: p.color
        }));
    } catch (e) {
        console.error('Failed to parse periods:', e);
        return [];
    }
}