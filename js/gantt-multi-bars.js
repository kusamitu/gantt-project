// 複数バー表示機能（スリム化版）

// 状態管理変数
let addPeriodMode = false;
let dragStartDate = null;
let dragEndDate = null;
let currentTaskId = null;
let dragPreviewElement = null;

const TRIAL_RUN_CONFIG = {
    name: '試運転',
    color: '#FF69B4'
};

// ユーティリティ関数
function shadeColor(color, percent) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    const newR = Math.min(255, Math.max(0, Math.round(r * (100 + percent) / 100)));
    const newG = Math.min(255, Math.max(0, Math.round(g * (100 + percent) / 100)));
    const newB = Math.min(255, Math.max(0, Math.round(b * (100 + percent) / 100)));
    
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

function getTextColorForBackground(hexColor) {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
    return luminance > 128 ? '#000000' : '#FFFFFF';
}

function normalizeDate(date) {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
}

// 位置計算関数
function getDirectPosition(date) {
    const timelineElement = gantt.$task_data;
    if (!timelineElement) return 0;
    
    const startDate = gantt.getState().min_date;
    const endDate = gantt.getState().max_date;
    const totalWidth = timelineElement.offsetWidth;
    const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
    const dayWidth = totalWidth / totalDays;
    
    const daysFromStart = (date - startDate) / (1000 * 60 * 60 * 24);
    return daysFromStart * dayWidth;
}

function getDirectDate(position) {
    const timelineElement = gantt.$task_data;
    if (!timelineElement) return new Date();
    
    const startDate = gantt.getState().min_date;
    const endDate = gantt.getState().max_date;
    const totalWidth = timelineElement.offsetWidth;
    const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
    const dayWidth = totalWidth / totalDays;
    
    const daysFromStart = position / dayWidth;
    const resultDate = new Date(startDate.getTime() + (daysFromStart * 24 * 60 * 60 * 1000));
    return normalizeDate(resultDate);
}

function getTaskTopPosition(taskId) {
    try {
        const taskPosition = gantt.getTaskPosition(gantt.getTask(taskId));
        if (taskPosition && typeof taskPosition.top === 'number') {
            return taskPosition.top;
        }
    } catch (e) {
        console.warn('[Y座標取得失敗]', e);
    }
    
    const taskRow = document.querySelector(`.gantt_task_row[task_id="${taskId}"]`);
    if (taskRow) {
        const timelineRect = gantt.$task_data.getBoundingClientRect();
        const pos = gantt.getScrollState();
        const rowRect = taskRow.getBoundingClientRect();
        const rowTop = (rowRect.top - timelineRect.top) + pos.y;
        
        const mainBar = document.querySelector(`.gantt_task_line[task_id="${taskId}"]:not(.gantt_additional_period)`);
        const barOffset = mainBar && mainBar.style.top ? parseInt(mainBar.style.top) || 1 : 1;
        
        return rowTop + barOffset;
    }
    
    return null;
}

// 重複検出関数
function detectTaskBarCollision(taskId, startDate, endDate) {
    const task = gantt.getTask(taskId);
    if (!task) return null;
    
    const taskStart = normalizeDate(task.start_date);
    const taskEnd = normalizeDate(task.end_date);
    const trialStart = normalizeDate(startDate);
    const trialEnd = normalizeDate(endDate);
    
    const hasOverlap = trialStart <= taskEnd && trialEnd >= taskStart;
    
    return hasOverlap ? {
        taskStart, taskEnd, trialStart, trialEnd, overlap: true
    } : null;
}

function detectTrialBarCollision(taskId, startDate, endDate) {
    const task = gantt.getTask(taskId);
    if (!task || !task.periods) return null;
    
    const trialStart = normalizeDate(startDate);
    const trialEnd = normalizeDate(endDate);
    
    for (const period of task.periods) {
        if (period.type === 'trial') {
            const existingStart = normalizeDate(period.start_date);
            const existingEnd = normalizeDate(period.end_date);
            
            const hasOverlap = trialStart <= existingEnd && trialEnd >= existingStart;
            
            if (hasOverlap) {
                return {
                    taskStart: existingStart, taskEnd: existingEnd,
                    trialStart, trialEnd, overlap: true
                };
            }
        }
    }
    
    return null;
}

// 試運転バー自動調整関数
function adjustTrialBarToAvoidCollision(taskId, startDate, endDate) {
    const taskCollision = detectTaskBarCollision(taskId, startDate, endDate);
    const trialCollision = detectTrialBarCollision(taskId, startDate, endDate);
    
    if (!taskCollision && !trialCollision) {
        return { startDate, endDate, adjusted: false };
    }
    
    const collision = taskCollision || trialCollision;
    const { taskStart, taskEnd, trialStart, trialEnd } = collision;
    
    let adjustedStart = new Date(trialStart);
    let adjustedEnd = new Date(trialEnd);
    
    // 境界の日付を完全に同一にする
    if (trialStart < taskStart) {
        adjustedEnd = new Date(taskStart);
        adjustedEnd.setHours(0, 0, 0, 0);
    } else if (trialEnd > taskEnd) {
        adjustedStart = new Date(taskEnd);
        adjustedStart.setHours(0, 0, 0, 0);
    } else {
        const beforeDuration = (taskStart - trialStart) / (1000 * 60 * 60 * 24);
        const afterDuration = (trialEnd - taskEnd) / (1000 * 60 * 60 * 24);
        
        if (beforeDuration >= afterDuration) {
            adjustedEnd = new Date(taskStart);
            adjustedEnd.setHours(0, 0, 0, 0);
        } else {
            adjustedStart = new Date(taskEnd);
            adjustedStart.setHours(0, 0, 0, 0);
        }
    }
    
    // 最小期間を確保
    const duration = (adjustedEnd - adjustedStart) / (1000 * 60 * 60 * 24);
    const minDuration = 1;
    
    if (duration < minDuration) {
        if (adjustedStart < taskStart) {
            adjustedStart = new Date(taskStart);
            adjustedStart.setDate(adjustedStart.getDate() - minDuration);
            adjustedStart.setHours(0, 0, 0, 0);
            adjustedEnd = new Date(taskStart);
            adjustedEnd.setHours(0, 0, 0, 0);
        } else {
            adjustedStart = new Date(taskEnd);
            adjustedStart.setHours(0, 0, 0, 0);
            adjustedEnd = new Date(taskEnd);
            adjustedEnd.setDate(adjustedEnd.getDate() + minDuration);
            adjustedEnd.setHours(0, 0, 0, 0);
        }
    }
    
    return { startDate: adjustedStart, endDate: adjustedEnd, adjusted: true };
}

// 期間管理関数
function updatePeriod(taskId, periodId, startDate, endDate) {
    const task = gantt.getTask(taskId);
    if (!task || !task.periods) return;
    
    const period = task.periods.find(p => p.id === periodId);
    if (!period) return;
    
    period.start_date = normalizeDate(startDate);
    period.end_date = normalizeDate(endDate);
    
    gantt.updateTask(taskId);
    gantt.refreshData();
    
    if (typeof gantt.saveData === 'function') {
        setTimeout(() => gantt.saveData(), 50);
    }
}

function deletePeriod(taskId, periodId) {
    const task = gantt.getTask(taskId);
    if (!task || !task.periods) return;
    
    task.periods = task.periods.filter(p => p.id !== periodId);
    gantt.updateTask(taskId);
    
    const periodElement = document.querySelector(`[data-period-id="${periodId}"]`);
    if (periodElement && periodElement.parentNode) {
        periodElement.parentNode.removeChild(periodElement);
    }
    
    gantt.refreshData();
    if (typeof gantt.saveData === 'function') {
        setTimeout(() => gantt.saveData(), 50);
    }
    
    renderAllExistingPeriods();
}

// ドラッグ・リサイズ機能
function addDragResizeHandlers(element, taskId, periodId) {
    let isDragging = false;
    let isResizing = false;
    let startX = 0;
    let startLeft = 0;
    let startWidth = 0;
    let resizeDirection = null;
    
    element.addEventListener('mousemove', function(e) {
        const rect = element.getBoundingClientRect();
        const mouseX = e.clientX;
        const handleWidth = 12;
        
        if (mouseX - rect.left <= handleWidth || rect.right - mouseX <= handleWidth) {
            element.style.cursor = 'ew-resize';
        } else {
            element.style.cursor = 'move';
        }
    });
    
    element.addEventListener('mousedown', function(e) {
        if (e.target.innerHTML === '✕') return;
        
        e.preventDefault();
        e.stopPropagation();
        
        isDragging = true;
        startX = e.clientX;
        startLeft = parseInt(element.style.left);
        startWidth = parseInt(element.style.width);
        
        const rect = element.getBoundingClientRect();
        const mouseX = e.clientX;
        const handleWidth = 12;
        
        if (mouseX - rect.left <= handleWidth) {
            isResizing = true;
            resizeDirection = 'left';
        } else if (rect.right - mouseX <= handleWidth) {
            isResizing = true;
            resizeDirection = 'right';
        } else {
            isResizing = false;
            resizeDirection = null;
        }
    });
    
    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        
        const deltaX = e.clientX - startX;
        
        if (isResizing) {
            if (resizeDirection === 'left') {
                const newLeft = Math.max(0, startLeft + deltaX);
                const newWidth = Math.max(20, startWidth - deltaX);
                element.style.left = newLeft + 'px';
                element.style.width = newWidth + 'px';
            } else if (resizeDirection === 'right') {
                const newWidth = Math.max(20, startWidth + deltaX);
                element.style.width = newWidth + 'px';
            }
        } else {
            const newLeft = Math.max(0, startLeft + deltaX);
            element.style.left = newLeft + 'px';
        }
    });
    
    document.addEventListener('mouseup', function(e) {
        if (!isDragging) return;
        
        isDragging = false;
        isResizing = false;
        element.style.cursor = 'move';
        
        const currentLeft = parseFloat(element.style.left) || 0;
        const currentWidth = parseFloat(element.style.width) || 0;
        const currentRight = currentLeft + currentWidth;
        
        element.style.left = currentLeft + 'px';
        element.style.width = currentWidth + 'px';
        
        const newStartDate = getDirectDate(currentLeft);
        const newEndDate = getDirectDate(currentRight);
        
        const adjusted = adjustTrialBarToAvoidCollision(taskId, newStartDate, newEndDate);
        
        if (adjusted.adjusted) {
            const adjustedLeft = getDirectPosition(adjusted.startDate);
            const adjustedRight = getDirectPosition(adjusted.endDate);
            const adjustedWidth = adjustedRight - adjustedLeft;
            
            element.style.left = adjustedLeft + 'px';
            element.style.width = adjustedWidth + 'px';
            
            updatePeriod(taskId, periodId, adjusted.startDate, adjusted.endDate);
            
            gantt.message({
                type: "info",
                text: "試運転バーがタスクバーと重複するため、調整されました。"
            });
        } else {
            updatePeriod(taskId, periodId, newStartDate, newEndDate);
        }
        
        setTimeout(() => {
            const existingBars = document.querySelectorAll(`[data-task-id="${taskId}"].gantt_additional_period`);
            existingBars.forEach(bar => {
                if (bar !== element && bar.parentNode) {
                    bar.parentNode.removeChild(bar);
                }
            });
            
            if (adjusted.adjusted) {
                const finalLeft = getDirectPosition(adjusted.startDate);
                const finalRight = getDirectPosition(adjusted.endDate);
                const finalWidth = finalRight - finalLeft;
                element.style.left = finalLeft + 'px';
                element.style.width = finalWidth + 'px';
            } else {
                element.style.left = currentLeft + 'px';
                element.style.width = currentWidth + 'px';
            }
        }, 10);
    });
}

// 期間描画関数
function renderAllExistingPeriods() {
    const existingBars = document.querySelectorAll('.gantt_additional_period');
    existingBars.forEach(bar => {
        if (bar.parentNode) {
            bar.parentNode.removeChild(bar);
        }
    });
    
    setTimeout(() => {
        const tasks = gantt.getTaskByTime();
        tasks.forEach(task => {
            if (task.periods && task.periods.length > 0) {
                renderCustomPeriods(task);
            }
        });
    }, 10);
}

function renderCustomPeriods(task) {
    if (!task.periods || task.periods.length === 0) return;
    
    task.periods.forEach(period => {
        const baseTop = getTaskTopPosition(task.id);
        if (baseTop === null) return;
        
        const leftPos = getDirectPosition(period.start_date);
        const rightPos = getDirectPosition(period.end_date);
        const width = rightPos - leftPos;
        
        const el = document.createElement('div');
        el.className = 'gantt_task_line gantt_additional_period';
        el.setAttribute('data-period-id', period.id);
        el.setAttribute('data-task-id', task.id);
        
        const barColor = (typeof colorSettings !== 'undefined' && colorSettings.trialBar) ? colorSettings.trialBar : '#FF69B4';
        const textColor = getTextColorForBackground(barColor);
        const borderColor = shadeColor(barColor, -20);
        const trialBarHeight = (typeof heightSettings !== 'undefined' && heightSettings.trialBar) ? heightSettings.trialBar : 19;
        
        el.style.cssText = `
            position: absolute;
            left: ${leftPos}px;
            top: ${baseTop}px;
            width: ${width}px;
            height: ${trialBarHeight}px;
            background-color: ${barColor};
            border: 1px solid ${borderColor};
            border-radius: 3px;
            z-index: 2;
            cursor: move;
        `;
        
        el.style.left = leftPos + 'px';
        el.style.width = width + 'px';
        
        const textDiv = document.createElement('div');
        textDiv.style.cssText = `
            color: ${textColor}; 
            padding: 0 8px; 
            font-size: 11px; 
            overflow: hidden; 
            text-overflow: ellipsis; 
            white-space: nowrap; 
            pointer-events: none;
        `;
        textDiv.textContent = period.name;
        el.appendChild(textDiv);
        
        const deleteBtn = document.createElement('div');
        deleteBtn.innerHTML = '✕';
        deleteBtn.style.cssText = `
            position: absolute;
            right: 2px;
            top: 50%;
            transform: translateY(-50%);
            width: 16px;
            height: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            cursor: pointer;
            color: #ff4444;
            font-weight: bold;
            z-index: 3;
        `;
        deleteBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            if (confirm('この期間を削除しますか？')) {
                const periodElement = document.querySelector(`[data-period-id="${period.id}"]`);
                if (periodElement && periodElement.parentNode) {
                    periodElement.parentNode.removeChild(periodElement);
                }
                deletePeriod(task.id, period.id);
            }
        });
        el.appendChild(deleteBtn);
        
        addDragResizeHandlers(el, task.id, period.id);
        
        const timelineElement = gantt.$task_data;
        if (timelineElement) {
            timelineElement.appendChild(el);
        }
    });
}

// 期間追加機能
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

function removeDragPreview() {
    if (dragPreviewElement && dragPreviewElement.parentNode) {
        dragPreviewElement.parentNode.removeChild(dragPreviewElement);
        dragPreviewElement = null;
    }
}

function addPeriodToTask(taskId, startDate, endDate) {
    const task = gantt.getTask(taskId);
    if (!task) return false;
    
    if (!task.periods) {
        task.periods = [];
    }
    
    if (checkPeriodOverlap(task, startDate, endDate)) {
        gantt.alert({
            type: "error",
            text: "既存の期間と重なっています。別の期間を選択してください。"
        });
        return false;
    }
    
    const adjusted = adjustTrialBarToAvoidCollision(taskId, startDate, endDate);
    
    if (adjusted.adjusted) {
        gantt.message({
            type: "info",
            text: "試運転バーがタスクバーと重複するため、調整されました。"
        });
    }
    
    const newPeriod = {
        id: generatePeriodId(),
        name: TRIAL_RUN_CONFIG.name,
        start_date: adjusted.startDate,
        end_date: adjusted.endDate,
        color: (typeof colorSettings !== 'undefined' && colorSettings.trialBar) ? colorSettings.trialBar : TRIAL_RUN_CONFIG.color
    };
    
    task.periods.push(newPeriod);
    gantt.updateTask(taskId);
    
    setTimeout(() => {
        gantt.refreshTask(taskId);
        gantt.render();
        
        const task = gantt.getTask(taskId);
        if (task && task.periods && task.periods.length > 0) {
            const existingBars = document.querySelectorAll(`[data-task-id="${taskId}"].gantt_additional_period`);
            existingBars.forEach(bar => {
                if (bar.parentNode) {
                    bar.parentNode.removeChild(bar);
                }
            });
            
            gantt.refreshTask(taskId);
            gantt.render();
            
            setTimeout(() => {
                gantt.refreshTask(taskId);
                gantt.render();
                renderCustomPeriods(task);
            }, 50);
        }
    }, 100);
    
    return true;
}

function checkPeriodOverlap(task, newStart, newEnd) {
    const newStartTime = new Date(newStart).getTime();
    const newEndTime = new Date(newEnd).getTime();
    
    if (task.start_date && task.end_date) {
        const mainStart = task.start_date.getTime();
        const mainEnd = task.end_date.getTime();
        if (!(newEndTime <= mainStart || newStartTime >= mainEnd)) return true;
    }
    
    if (task.periods && task.periods.length > 0) {
        for (let period of task.periods) {
            const periodStart = new Date(period.start_date).getTime();
            const periodEnd = new Date(period.end_date).getTime();
            if (!(newEndTime <= periodStart || newStartTime >= periodEnd)) return true;
        }
    }
    
    return false;
}

function generatePeriodId() {
    return 'period_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ドラッグプレビュー機能
function showDragPreview(taskId, startDate, endDate) {
    if (!startDate || !endDate) return;
    
    let start = normalizeDate(startDate);
    let end = normalizeDate(endDate);
    
    if (start.getTime() > end.getTime()) [start, end] = [end, start];
    
    removeDragPreview();
    
    const leftPos = getDirectPosition(start);
    const rightPos = getDirectPosition(end);
    const width = rightPos - leftPos;
    
    const trialBarHeight = (typeof heightSettings !== 'undefined' && heightSettings.trialBar) ? heightSettings.trialBar : 19;
    const correctTop = getTaskTopPosition(taskId);
    if (correctTop === null) return;
    
    const barColor = (typeof colorSettings !== 'undefined' && colorSettings.trialBar) ? colorSettings.trialBar : '#FF69B4';
    const borderColor = shadeColor(barColor, -30);
    
    dragPreviewElement = document.createElement('div');
    dragPreviewElement.className = 'gantt_drag_preview';
    dragPreviewElement.style.cssText = `
        position: absolute;
        left: ${leftPos}px;
        top: ${correctTop}px;
        width: ${width}px;
        height: ${trialBarHeight}px;
        background-color: ${barColor};
        opacity: 0.6;
        border: 2px dashed ${borderColor};
        border-radius: 3px;
        pointer-events: none;
        z-index: 10;
    `;
    gantt.$task_data.appendChild(dragPreviewElement);
}

function getDateFromMouseEvent(e, timelineElement) {
    const pos = gantt.getScrollState();
    const timelineRect = timelineElement.getBoundingClientRect();
    const relativeX = e.clientX - timelineRect.left;
    const absoluteX = relativeX + pos.x;
    
    const state = gantt.getState();
    const minDate = state.min_date;
    const maxDate = state.max_date;
    const fullWidth = timelineElement.scrollWidth;
    const dateRange = maxDate.getTime() - minDate.getTime();
    
    const ratio = absoluteX / fullWidth;
    const timestamp = minDate.getTime() + (dateRange * ratio);
    const date = new Date(timestamp);
    
    return date;
}

// カスタムレイヤー
gantt.addTaskLayer(function(task) {
    if (!task.periods || task.periods.length === 0) {
        return false;
    }
    
    const elements = [];
    
    task.periods.forEach(period => {
        try {
            const baseTop = getTaskTopPosition(task.id);
            if (baseTop === null) return;
            
            const leftPos = getDirectPosition(period.start_date);
            const rightPos = getDirectPosition(period.end_date);
            const width = rightPos - leftPos;
            
            const el = document.createElement('div');
            el.className = 'gantt_task_line gantt_additional_period';
            el.setAttribute('data-period-id', period.id);
            el.setAttribute('data-task-id', task.id);
            
            const barColor = (typeof colorSettings !== 'undefined' && colorSettings.trialBar) ? colorSettings.trialBar : '#FF69B4';
            const textColor = getTextColorForBackground(barColor);
            const borderColor = shadeColor(barColor, -20);
            const trialBarHeight = (typeof heightSettings !== 'undefined' && heightSettings.trialBar) ? heightSettings.trialBar : 19;
            
            el.style.cssText = `
                position: absolute;
                left: ${leftPos}px;
                top: ${baseTop}px;
                width: ${width}px;
                height: ${trialBarHeight}px;
                background-color: ${barColor};
                border: 1px solid ${borderColor};
                border-radius: 3px;
                z-index: 2;
                cursor: move;
            `;
            
            el.style.left = leftPos + 'px';
            el.style.width = width + 'px';
            
            const textDiv = document.createElement('div');
            textDiv.style.cssText = `
                color: ${textColor}; 
                padding: 0 8px; 
                font-size: 11px; 
                overflow: hidden; 
                text-overflow: ellipsis; 
                white-space: nowrap; 
                pointer-events: none;
            `;
            textDiv.textContent = period.name;
            el.appendChild(textDiv);
            
            const deleteBtn = document.createElement('div');
            deleteBtn.innerHTML = '✕';
            deleteBtn.style.cssText = `
                position: absolute;
                right: 2px;
                top: 50%;
                transform: translateY(-50%);
                width: 16px;
                height: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                cursor: pointer;
                color: #ff4444;
                font-weight: bold;
                z-index: 3;
            `;
            deleteBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                e.preventDefault();
                if (confirm('この期間を削除しますか？')) {
                    const periodElement = document.querySelector(`[data-period-id="${period.id}"]`);
                    if (periodElement && periodElement.parentNode) {
                        periodElement.parentNode.removeChild(periodElement);
                    }
                    deletePeriod(task.id, period.id);
                }
            });
            el.appendChild(deleteBtn);
            
            addDragResizeHandlers(el, task.id, period.id);
            
            elements.push(el);
        } catch (error) {
            console.error('Error rendering period:', error, period);
        }
    });
    
    if (elements.length === 0) {
        return false;
    }
    if (elements.length === 1) {
        return elements[0];
    }
    
    const container = document.createElement('div');
    container.style.cssText = 'position: absolute; width: 100%; height: 100%; pointer-events: none;';
    elements.forEach(el => {
        el.style.pointerEvents = 'auto';
        container.appendChild(el);
    });
    return container;
});

// イベント設定
gantt.attachEvent("onGanttReady", function() {
    const timelineElement = gantt.$task_data;
    
    setTimeout(() => {
        renderAllExistingPeriods();
    }, 500);
    
    gantt.attachEvent("onDataUpdate", function() {
        setTimeout(() => {
            renderAllExistingPeriods();
        }, 100);
    });
    
    gantt.attachEvent("onGanttRender", function() {
        setTimeout(() => {
            renderAllExistingPeriods();
        }, 50);
    });
    
    let isDrawing = false;
    
    timelineElement.addEventListener('mousedown', function(e) {
        if (!addPeriodMode || e.target.closest('.gantt_additional_period')) {
            return;
        }
        
        let taskElement = e.target.closest('.gantt_task_row');
        
        if (taskElement) {
            currentTaskId = taskElement.getAttribute('task_id');
        } else {
            const timelineRect = timelineElement.getBoundingClientRect();
            const pos = gantt.getScrollState();
            const relativeY = e.clientY - timelineRect.top;
            const absoluteY = relativeY + pos.y;
            const rowHeight = gantt.config.row_height || 23;
            const taskIndex = Math.floor(absoluteY / rowHeight);
            
            const tasks = gantt.getTaskByTime();
            
            if (tasks[taskIndex]) {
                currentTaskId = tasks[taskIndex].id;
            }
        }
        
        if (!currentTaskId || !gantt.isTaskExists(currentTaskId)) {
            return;
        }
        
        isDrawing = true;
        const date = getDateFromMouseEvent(e, timelineElement);
        dragStartDate = date;
        dragEndDate = new Date(date);
        
        e.preventDefault();
    });
    
    timelineElement.addEventListener('mousemove', function(e) {
        if (!isDrawing || !addPeriodMode || !currentTaskId) {
            return;
        }
        
        const date = getDateFromMouseEvent(e, timelineElement);
        dragEndDate = date;
        
        showDragPreview(currentTaskId, dragStartDate, dragEndDate);
        e.preventDefault();
    });
    
    document.addEventListener('mouseup', function(e) {
        if (isDrawing && addPeriodMode && currentTaskId) {
            isDrawing = false;
            removeDragPreview();
            
            if (!dragEndDate) {
                dragEndDate = new Date(dragStartDate);
            }
            
            if (dragStartDate && dragEndDate && currentTaskId) {
                let start = normalizeDate(dragStartDate);
                let end = normalizeDate(dragEndDate);
                
                if (start.getTime() > end.getTime()) {
                    [start, end] = [end, start];
                }
                
                if (end.getTime() === start.getTime()) {
                    end = new Date(start);
                    end.setDate(end.getDate() + 1);
                }
                
                if (addPeriodToTask(currentTaskId, start, end)) {
                    gantt.refreshData();
                }
            }
            
            dragStartDate = null;
            dragEndDate = null;
            currentTaskId = null;
        } else {
            isDrawing = false;
        }
    });
});

// フォールバック処理
setTimeout(() => {
    const timelineElement = gantt.$task_data;
    if (timelineElement && !timelineElement.hasAttribute('data-events-attached')) {
        timelineElement.setAttribute('data-events-attached', 'true');
        
        let isDrawing = false;
        
        timelineElement.addEventListener('mousedown', function(e) {
            if (!addPeriodMode || e.target.closest('.gantt_additional_period')) {
                return;
            }
            
            let taskElement = e.target.closest('.gantt_task_row');
            
            if (taskElement) {
                currentTaskId = taskElement.getAttribute('task_id');
            } else {
                const timelineRect = timelineElement.getBoundingClientRect();
                const pos = gantt.getScrollState();
                const relativeY = e.clientY - timelineRect.top;
                const absoluteY = relativeY + pos.y;
                const rowHeight = gantt.config.row_height || 23;
                const taskIndex = Math.floor(absoluteY / rowHeight);
                
                const tasks = gantt.getTaskByTime();
                
                if (tasks[taskIndex]) {
                    currentTaskId = tasks[taskIndex].id;
                }
            }
            
            if (!currentTaskId || !gantt.isTaskExists(currentTaskId)) {
                return;
            }
            
            isDrawing = true;
            const date = getDateFromMouseEvent(e, timelineElement);
            dragStartDate = date;
            dragEndDate = new Date(date);
            
            e.preventDefault();
        });
        
        timelineElement.addEventListener('mousemove', function(e) {
            if (!isDrawing || !addPeriodMode || !currentTaskId) {
                return;
            }
            
            const date = getDateFromMouseEvent(e, timelineElement);
            dragEndDate = date;
            
            showDragPreview(currentTaskId, dragStartDate, dragEndDate);
            e.preventDefault();
        });
        
        document.addEventListener('mouseup', function(e) {
            if (isDrawing && addPeriodMode && currentTaskId) {
                isDrawing = false;
                removeDragPreview();
                
                if (!dragEndDate) {
                    dragEndDate = new Date(dragStartDate);
                }
                
                if (dragStartDate && dragEndDate && currentTaskId) {
                    let start = normalizeDate(dragStartDate);
                    let end = normalizeDate(dragEndDate);
                    
                    if (start.getTime() > end.getTime()) {
                        [start, end] = [end, start];
                    }
                    
                    if (end.getTime() === start.getTime()) {
                        end = new Date(start);
                        end.setDate(end.getDate() + 1);
                    }
                    
                    if (addPeriodToTask(currentTaskId, start, end)) {
                        gantt.refreshData();
                        setTimeout(() => {
                            gantt.render();
                        }, 200);
                    }
                }
                
                dragStartDate = null;
                dragEndDate = null;
                currentTaskId = null;
            }
        });
    }
}, 1000);

// データベース用のシリアライズ関数
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