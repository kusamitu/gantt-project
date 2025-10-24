// カラー設定を保持する変数
let colorSettings = {
    task2000Bar: '#3db9d3',      // 2000番のバーの色
    taskDBar: '#FF8C42',         // D番のバーの色
    taskOtherBar: '#9C27B0',     // その他のバーの色
    taskBusinessTripBar: '#4CAF50', // 出張のバーの色
    electricalBar: '#FF8C42',    // 電装バーの色
    trialBar: '#FF69B4',
    resourceBar: '#3db9d3',
    placeBar: '#3db9d3',
    noResourceBar: '#999999'     // 担当者未設定のバーの色(グレー)
};

// CSSテンプレート定義
const CSS_TEMPLATES = {
    task2000Bar: (color, textColor, progressColor) => `
        .gantt_task_line.task-2000:not(.gantt_additional_period) {
            background-color: ${color} !important;
            border-color: ${color} !important;
        }
        .gantt_task_line.task-2000 .gantt_task_progress {
            background-color: ${progressColor} !important;
        }
        .gantt_task_line.task-2000 .gantt_task_content {
            color: ${textColor} !important;
        }
    `,
    taskDBar: (color, textColor, progressColor) => `
        .gantt_task_line.task-d:not(.gantt_additional_period) {
            background-color: ${color} !important;
            border-color: ${color} !important;
        }
        .gantt_task_line.task-d .gantt_task_progress {
            background-color: ${progressColor} !important;
        }
        .gantt_task_line.task-d .gantt_task_content {
            color: ${textColor} !important;
        }
    `,
    taskOtherBar: (color, textColor, progressColor) => `
        .gantt_task_line.task-other:not(.gantt_additional_period) {
            background-color: ${color} !important;
            border-color: ${color} !important;
        }
        .gantt_task_line.task-other .gantt_task_progress {
            background-color: ${progressColor} !important;
        }
        .gantt_task_line.task-other .gantt_task_content {
            color: ${textColor} !important;
        }
    `,
    taskBusinessTripBar: (color, textColor, progressColor) => `
        .gantt_task_line.task-business-trip:not(.gantt_additional_period) {
            background-color: ${color} !important;
            border-color: ${color} !important;
        }
        .gantt_task_line.task-business-trip .gantt_task_progress {
            background-color: ${progressColor} !important;
        }
        .gantt_task_line.task-business-trip .gantt_task_content {
            color: ${textColor} !important;
        }
    `,
    electricalBar: (color, textColor, progressColor) => `
        .gantt_task_line.task-electrical:not(.gantt_additional_period) {
            background-color: ${color} !important;
            border-color: ${color} !important;
        }
        .gantt_task_line.task-electrical .gantt_task_progress {
            background-color: ${progressColor} !important;
        }
        .gantt_task_line.task-electrical .gantt_task_content {
            color: ${textColor} !important;
        }
    `,
    noResourceBar: (color, textColor, progressColor) => `
        .gantt_task_line.task-no-resource:not(.gantt_additional_period) {
            background-color: ${color} !important;
            border-color: ${color} !important;
        }
        .gantt_task_line.task-no-resource .gantt_task_progress {
            background-color: ${progressColor} !important;
        }
        .gantt_task_line.task-no-resource .gantt_task_content {
            color: ${textColor} !important;
        }
    `,
    trialBar: (color, textColor, borderColor) => `
        .gantt_additional_period {
            background-color: ${color} !important;
            border-color: ${borderColor} !important;
            z-index: 2 !important;
        }
        .gantt_additional_period .gantt_task_content,
        .gantt_additional_period div {
            color: ${textColor} !important;
        }
        .gantt_additional_period .period_delete_icon {
            color: ${textColor} !important;
        }
    `,
    resourceBar: (color, textColor) => `
        .gantt_resource_cell_empty {
            background-color: transparent !important;
        }
        .gantt_resource_cell_single {
            background-color: ${color} !important;
        }
        .gantt_resource_cell_single .gantt_resource_marker {
            background-color: ${color} !important;
            color: ${textColor} !important;
            border-radius: 3px !important;
        }
        .gantt_resource_cell_overload {
            background-color: #ff0000 !important;
        }
        .gantt_resource_cell_overload .gantt_resource_marker {
            background-color: #ff0000 !important;
            color: #FFFFFF !important;
            border-radius: 3px !important;
        }
    `,
    placeBar: (color, textColor) => `
        .gantt_resource_cell_empty {
            background-color: transparent !important;
        }
        .gantt_resource_cell_single {
            background-color: ${color} !important;
        }
        .gantt_resource_cell_single .gantt_resource_marker {
            background-color: ${color} !important;
            color: ${textColor} !important;
            border-radius: 3px !important;
        }
        .gantt_resource_cell_overload {
            background-color: #ff0000 !important;
        }
        .gantt_resource_cell_overload .gantt_resource_marker {
            background-color: #ff0000 !important;
            color: #FFFFFF !important;
            border-radius: 3px !important;
        }
    `
};

// 色設定をSupabaseから読み込む関数
async function loadColorSettings() {
    try {
        const { data, error } = await db.from('color_settings').select('*').limit(1).single();
        
        if (error) {
            if (error.code === 'PGRST116') await saveColorSettings();
            return;
        }
        
        if (data) {
            colorSettings.task2000Bar = data.task_2000_bar_color || '#3db9d3';
            colorSettings.taskDBar = data.task_d_bar_color || '#FF8C42';
            colorSettings.taskOtherBar = data.task_other_bar_color || '#9C27B0';
            colorSettings.taskBusinessTripBar = data.task_business_trip_bar_color || '#4CAF50';
            colorSettings.electricalBar = data.electrical_bar_color || '#FF8C42';
            colorSettings.trialBar = data.trial_bar_color || '#FF69B4';
            colorSettings.resourceBar = data.resource_bar_color || '#3db9d3';
            colorSettings.placeBar = data.place_bar_color || '#3db9d3';
            updateAllBarColors();
        }
    } catch (error) {
    }
}

// 色設定をSupabaseに保存する関数
async function saveColorSettings() {
    try {
        const payload = {
            id: 1,
            task_2000_bar_color: colorSettings.task2000Bar,
            task_d_bar_color: colorSettings.taskDBar,
            task_other_bar_color: colorSettings.taskOtherBar,
            task_business_trip_bar_color: colorSettings.taskBusinessTripBar,
            electrical_bar_color: colorSettings.electricalBar,
            trial_bar_color: colorSettings.trialBar,
            resource_bar_color: colorSettings.resourceBar,
            place_bar_color: colorSettings.placeBar
        };
        
        const { data, error } = await db.from('color_settings').upsert(payload, { onConflict: 'id' }).select();
        if (error) {
            gantt.alert({ type: "error", text: "色設定の保存に失敗しました: " + error.message });
        }
    } catch (error) {
    }
}

// 汎用的な色更新関数
function updateBarColor(styleId, colorKey, template, condition) {
    const style = document.getElementById(styleId) || document.createElement('style');
    style.id = styleId;
    
    if (condition === undefined || condition) {
        const color = colorSettings[colorKey];
        const textColor = getTextColorForBackground(color);
        const progressColor = shadeColor(color, -20);
        const borderColor = shadeColor(color, -20);
        
        // テンプレートに応じて引数を調整
        if (styleId === 'task-2000-bar-style' || styleId === 'task-d-bar-style' || 
            styleId === 'task-other-bar-style' || styleId === 'task-business-trip-bar-style' ||
            styleId === 'electrical-bar-style' || styleId === 'no-resource-bar-style') {
            style.innerHTML = template(color, textColor, progressColor);
        } else if (styleId === 'trial-bar-style') {
            style.innerHTML = template(color, textColor, borderColor);
        } else {
            style.innerHTML = template(color, textColor);
        }
    } else {
        style.innerHTML = '';
    }
    
    if (!document.getElementById(styleId)) {
        document.head.appendChild(style);
    }
}

// 各バーの色を更新
function updateTask2000BarColor() {
    updateBarColor('task-2000-bar-style', 'task2000Bar', CSS_TEMPLATES.task2000Bar);
}

function updateTaskDBarColor() {
    updateBarColor('task-d-bar-style', 'taskDBar', CSS_TEMPLATES.taskDBar);
}

function updateTaskOtherBarColor() {
    updateBarColor('task-other-bar-style', 'taskOtherBar', CSS_TEMPLATES.taskOtherBar);
}

function updateTaskBusinessTripBarColor() {
    updateBarColor('task-business-trip-bar-style', 'taskBusinessTripBar', CSS_TEMPLATES.taskBusinessTripBar);
}

function updateElectricalBarColor() {
    updateBarColor('electrical-bar-style', 'electricalBar', CSS_TEMPLATES.electricalBar);
}

function updateNoResourceBarColor() {
    updateBarColor('no-resource-bar-style', 'noResourceBar', CSS_TEMPLATES.noResourceBar);
}

function updateTrialBarColor() {
    updateBarColor('trial-bar-style', 'trialBar', CSS_TEMPLATES.trialBar);
}

function updateResourceTimelineColor() {
    const isResourceMode = gantt.config.resource_property === 'resource_id';
    
    // リソースモードの時のみスタイルを適用、場所モードの時はクリア
    if (isResourceMode) {
        updateBarColor('resource-timeline-style', 'resourceBar', CSS_TEMPLATES.resourceBar, true);
        // 場所のスタイルをクリア
        const placeStyle = document.getElementById('place-timeline-style');
        if (placeStyle) placeStyle.innerHTML = '';
    } else {
        // リソースモードでない時はスタイルをクリア
        const resourceStyle = document.getElementById('resource-timeline-style');
        if (resourceStyle) resourceStyle.innerHTML = '';
    }
    
    // ラベルの色も更新
    if (isResourceMode && typeof renderResourceTimelineLabels === 'function') {
        renderResourceTimelineLabels();
    }
}

function updatePlaceTimelineColor() {
    const isPlaceMode = gantt.config.resource_property === 'place_id';
    
    // 場所モードの時のみスタイルを適用、リソースモードの時はクリア
    if (isPlaceMode) {
        updateBarColor('place-timeline-style', 'placeBar', CSS_TEMPLATES.placeBar, true);
        // リソースのスタイルをクリア
        const resourceStyle = document.getElementById('resource-timeline-style');
        if (resourceStyle) resourceStyle.innerHTML = '';
    } else {
        // 場所モードでない時はスタイルをクリア
        const placeStyle = document.getElementById('place-timeline-style');
        if (placeStyle) placeStyle.innerHTML = '';
    }
    
    // ラベルの色も更新
    if (isPlaceMode && typeof renderResourceTimelineLabels === 'function') {
        renderResourceTimelineLabels();
    }
}

// すべてのバーの色を更新
function updateAllBarColors() {
    [updateTask2000BarColor, updateTaskDBarColor, updateTaskOtherBarColor, 
     updateTaskBusinessTripBarColor, updateElectricalBarColor, updateNoResourceBarColor, 
     updateTrialBarColor, updateResourceTimelineColor, updatePlaceTimelineColor].forEach(fn => fn());
}

// 色を明るく/暗くするヘルパー関数
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

// 背景色に応じたテキスト色を取得
function getTextColorForBackground(hexColor) {
    const r = parseInt(hexColor.substring(1, 3), 16);
    const g = parseInt(hexColor.substring(3, 5), 16);
    const b = parseInt(hexColor.substring(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
    return luminance > 128 ? '#000000' : '#FFFFFF';
}

// --- バーの色設定ウィンドウ ---
let colorModalbox;
let currentColorTarget = 'task2000Bar';

// カラーパレット(グローバル変数として定義し、他のファイルからも参照可能にする)
window.COLOR_PALETTE = [
    // 1行目: 各色の濃い色
    '#E65100', '#F9A825', '#1B5E20', '#689F38', '#0097A7', '#0D47A1', '#880E4F', '#4A148C',
    // 2行目: やや濃い色
    '#FF6F00', '#FBC02D', '#2E7D32', '#7CB342', '#00ACC1', '#1565C0', '#AD1457', '#6A1B9A',
    // 3行目: 中間の色
    '#FF8F00', '#FDD835', '#43A047', '#9CCC65', '#26C6DA', '#42A5F5', '#EC407A', '#AB47BC',
    // 4行目: 明るい色
    '#FFB74D', '#FFEB3B', '#66BB6A', '#C5E1A5', '#80DEEA', '#90CAF9', '#F48FB1', '#CE93D8'
];
const COLOR_PALETTE = window.COLOR_PALETTE;

const TARGET_NAMES = {
    'task2000Bar': '2000番のバー',
    'taskDBar': 'D番のバー',
    'taskOtherBar': 'その他のバー',
    'taskBusinessTripBar': '出張のバー',
    'electricalBar': '電装のバー',
    'trialBar': '試運転バー',
    'resourceBar': '担当者負荷のバー',
    'placeBar': '場所負荷のバー'
};

const UPDATE_FUNCTIONS = {
    'task2000Bar': updateTask2000BarColor,
    'taskDBar': updateTaskDBarColor,
    'taskOtherBar': updateTaskOtherBarColor,
    'taskBusinessTripBar': updateTaskBusinessTripBarColor,
    'electricalBar': updateElectricalBarColor,
    'trialBar': updateTrialBarColor,
    'resourceBar': updateResourceTimelineColor,
    'placeBar': updatePlaceTimelineColor
};

function showColorSettings() {
    const content = document.createElement("div");
    content.className = "color-settings-editor";
    content.innerHTML = `
        <style>
            .color-target-buttons {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 6px;
                margin-bottom: 12px;
            }
            .color-target-btn {
                padding: 6px;
                border: 2px solid #ddd;
                border-radius: 3px;
                background-color: #fff;
                cursor: pointer;
                transition: all 0.2s;
                text-align: left;
                font-size: 11px;
                display: flex;
                align-items: center;
                justify-content: flex-start;
                gap: 6px;
            }
            .color-target-btn:hover {
                border-color: #999;
            }
            .color-target-btn.selected {
                border-color: #4285f4;
                background-color: #e3f2fd;
                font-weight: bold;
            }
            .color-target-btn-preview {
                width: 18px;
                height: 18px;
                border-radius: 2px;
                border: 1px solid #ddd;
                flex-shrink: 0;
            }
            .color-palette {
                display: grid;
                grid-template-columns: repeat(8, 1fr);
                gap: 4px;
                margin-bottom: 10px;
            }
            .color-option {
                width: 34px;
                height: 28px;
                border-radius: 3px;
                cursor: pointer;
                border: 2px solid transparent;
                transition: all 0.2s;
            }
            .color-option:hover {
                transform: scale(1.1);
                border-color: #666;
            }
            .current-selection {
                margin-top: 10px;
                padding: 8px;
                background-color: #f9f9f9;
                border-radius: 3px;
                text-align: center;
            }
            .current-selection > div:first-child {
                font-size: 11px;
                margin-bottom: 6px;
            }
            .current-color-display {
                display: inline-flex;
                align-items: center;
                gap: 8px;
            }
            .current-color-box {
                width: 28px;
                height: 28px;
                border-radius: 3px;
                border: 1px solid #ddd;
            }
            .current-color-display span {
                font-size: 10px;
            }
        </style>
        <div class="color-target-buttons">
            ${Object.entries(TARGET_NAMES).map(([key, name]) => `
                <button class="color-target-btn ${key === 'task2000Bar' ? 'selected' : ''}" data-target="${key}">
                    <div class="color-target-btn-preview" style="background-color: ${colorSettings[key]};"></div>
                    <span>${name}</span>
                </button>
            `).join('')}
        </div>
        <div class="color-palette">
            ${COLOR_PALETTE.map(color => `
                <div class="color-option" style="background-color: ${color};" data-color="${color}"></div>
            `).join('')}
        </div>
        <div class="current-selection">
            <div><strong>現在の設定: </strong><span id="current-target-name">${TARGET_NAMES.task2000Bar}</span></div>
            <div class="current-color-display">
                <div class="current-color-box" id="currentColorBox" style="background-color: ${colorSettings.task2000Bar};"></div>
                <span id="currentColorCode">${colorSettings.task2000Bar}</span>
            </div>
        </div>
        <button class="close-btn" style="margin-top: 10px; width: 100%; padding: 6px; font-size: 11px;">閉じる</button>
    `;

    colorModalbox = gantt.modalbox({ 
        title: "バーの色設定", 
        content: content, 
        width: '350px'
    });

    // ボタンの近くにモーダルを配置
    const colorSettingsBtn = document.getElementById('color_settings_btn');
    if (colorSettingsBtn) {
        const rect = colorSettingsBtn.getBoundingClientRect();
        const modalContainer = document.querySelector('.gantt_modal_box');

        if (modalContainer) {
            modalContainer.style.position = 'fixed';
            modalContainer.style.top = (rect.bottom + 5) + 'px';
            modalContainer.style.left = rect.left + 'px';
            // 中央揃えスタイルをリセット
            modalContainer.style.transform = 'none';
            modalContainer.style.marginLeft = '0';
            modalContainer.style.marginTop = '0';
        }
    }

    // イベント委譲で処理
    content.addEventListener('click', (e) => {
        if (e.target.classList.contains('color-target-btn') || e.target.closest('.color-target-btn')) {
            const btn = e.target.classList.contains('color-target-btn') ? e.target : e.target.closest('.color-target-btn');
            
            content.querySelectorAll('.color-target-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            currentColorTarget = btn.dataset.target;
            
            content.querySelector('#current-target-name').textContent = TARGET_NAMES[currentColorTarget];
            content.querySelector('#currentColorBox').style.backgroundColor = colorSettings[currentColorTarget];
            content.querySelector('#currentColorCode').textContent = colorSettings[currentColorTarget];
        } 
        else if (e.target.classList.contains('color-option')) {
            const color = e.target.dataset.color;
            colorSettings[currentColorTarget] = color;
            saveColorSettings();
            
            content.querySelector('#currentColorBox').style.backgroundColor = color;
            content.querySelector('#currentColorCode').textContent = color;
            
            // ボタンのプレビュー色も更新
            const targetBtn = content.querySelector(`.color-target-btn[data-target="${currentColorTarget}"]`);
            if (targetBtn) {
                const preview = targetBtn.querySelector('.color-target-btn-preview');
                if (preview) {
                    preview.style.backgroundColor = color;
                }
            }
            
            UPDATE_FUNCTIONS[currentColorTarget]();
            
            // 試運転バーの場合のみ、タスクレイヤーを再描画
            if (currentColorTarget === 'trialBar') {
                gantt.eachTask(function(task) {
                    if (task.periods && task.periods.length > 0) {
                        gantt.refreshTask(task.id);
                    }
                });
            } else {
                gantt.render();
            }
        }
        else if (e.target.classList.contains('close-btn')) {
            gantt.modalbox.hide(colorModalbox);
        }
    });
}