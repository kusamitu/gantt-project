// カラー設定を保持する変数
let colorSettings = {
    taskBar: '#3db9d3',
    resourceBar: '#3db9d3'
};

// 色設定をSupabaseから読み込む関数
async function loadColorSettings() {
    try {
        const { data, error } = await db.from('color_settings').select('*').limit(1).single();
        
        if (error) {
            if (error.code === 'PGRST116') {
                await saveColorSettings();
            }
            return;
        }
        
        if (data) {
            colorSettings.taskBar = data.task_bar_color || '#3db9d3';
            colorSettings.resourceBar = data.resource_bar_color || '#3db9d3';
            updateResourceTimelineColor();
        }
    } catch (error) {
    }
}

// 色設定をSupabaseに保存する関数
async function saveColorSettings() {
    try {
        const payload = {
            id: 1, // 固定IDで1つのレコードのみ使用
            task_bar_color: colorSettings.taskBar,
            resource_bar_color: colorSettings.resourceBar
        };
        
        const { data, error } = await db.from('color_settings').upsert(payload, { onConflict: 'id' }).select();
        if (error) {
            gantt.alert({ type: "error", text: "色設定の保存に失敗しました: " + error.message });
        } else {
        }
    } catch (error) {
    }
}

// リソースタイムラインの色を動的に適用
function updateResourceTimelineColor() {
    const style = document.getElementById('resource-custom-style') || document.createElement('style');
    style.id = 'resource-custom-style';
    style.innerHTML = `
        .gantt_resource_cell_empty {
            background-color: transparent !important;
        }
        .gantt_resource_cell_single {
            background-color: ${colorSettings.resourceBar} !important;
        }
        .gantt_resource_cell_single .gantt_resource_marker {
            background-color: ${colorSettings.resourceBar} !important;
        }
        .gantt_resource_cell_overload {
            background-color: #ff0000 !important;
        }
        .gantt_resource_cell_overload .gantt_resource_marker {
            background-color: #ff0000 !important;
        }
    `;
    if (!document.getElementById('resource-custom-style')) {
        document.head.appendChild(style);
    }
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

// --- バーの色設定ウィンドウ ---
let colorModalbox;
function showColorSettings() {
    const colorPalette = [
        '#3db9d3', '#4285f4', '#34a853', '#fbbc05', '#ea4335',
        '#9c27b0', '#ff6f00', '#00bcd4', '#8bc34a', '#e91e63',
        '#607d8b', '#795548', '#ff5722', '#009688', '#673ab7'
    ];

    const content = document.createElement("div");
    content.className = "color-settings-editor";
    content.innerHTML = `
        <style>
            .color-section {
                margin-bottom: 25px;
            }
            .color-section h4 {
                margin: 0 0 10px 0;
                font-size: 14px;
                color: #333;
            }
            .color-palette {
                display: grid;
                grid-template-columns: repeat(5, 1fr);
                gap: 8px;
                margin-bottom: 10px;
            }
            .color-option {
                width: 40px;
                height: 40px;
                border-radius: 4px;
                cursor: pointer;
                border: 2px solid transparent;
                transition: all 0.2s;
            }
            .color-option:hover {
                transform: scale(1.1);
                border-color: #666;
            }
            .color-option.selected {
                border-color: #000;
                box-shadow: 0 0 0 2px #fff, 0 0 0 4px #000;
            }
            .current-color {
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 12px;
                color: #666;
            }
            .current-color-box {
                width: 30px;
                height: 30px;
                border-radius: 4px;
                border: 1px solid #ddd;
            }
        </style>
        <div class="color-section">
            <h4>ガントチャートのバーの色</h4>
            <div class="color-palette" id="taskColorPalette">
                ${colorPalette.map(color => `
                    <div class="color-option ${color === colorSettings.taskBar ? 'selected' : ''}" 
                         style="background-color: ${color};" 
                         data-color="${color}"
                         data-target="taskBar"></div>
                `).join('')}
            </div>
            <div class="current-color">
                <span>現在の色:</span>
                <div class="current-color-box" id="currentTaskColor" style="background-color: ${colorSettings.taskBar};"></div>
                <span>${colorSettings.taskBar}</span>
            </div>
        </div>
        <div class="color-section">
            <h4>担当者負荷タイムラインのバーの色</h4>
            <div class="color-palette" id="resourceColorPalette">
                ${colorPalette.map(color => `
                    <div class="color-option ${color === colorSettings.resourceBar ? 'selected' : ''}" 
                         style="background-color: ${color};" 
                         data-color="${color}"
                         data-target="resourceBar"></div>
                `).join('')}
            </div>
            <div class="current-color">
                <span>現在の色:</span>
                <div class="current-color-box" id="currentResourceColor" style="background-color: ${colorSettings.resourceBar};"></div>
                <span>${colorSettings.resourceBar}</span>
            </div>
        </div>
        <button class="close-btn" style="margin-top: 15px;">閉じる</button>
    `;

    colorModalbox = gantt.modalbox({ 
        title: "バーの色設定", 
        content: content, 
        width: '400px' 
    });

    // カラー選択イベント
    content.querySelectorAll(".color-option").forEach(option => {
        option.addEventListener("click", (e) => {
            const color = e.target.dataset.color;
            const target = e.target.dataset.target;
            
            // 選択状態を更新
            const palette = e.target.parentElement;
            palette.querySelectorAll('.color-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            e.target.classList.add('selected');

            // 色を更新
            colorSettings[target] = color;

            // Supabaseに保存
            saveColorSettings();

            // プレビューを更新
            if (target === 'taskBar') {
                content.querySelector('#currentTaskColor').style.backgroundColor = color;
                content.querySelector('#currentTaskColor').nextElementSibling.textContent = color;
                gantt.render();
            } else if (target === 'resourceBar') {
                content.querySelector('#currentResourceColor').style.backgroundColor = color;
                content.querySelector('#currentResourceColor').nextElementSibling.textContent = color;
                updateResourceTimelineColor();
                gantt.render();
            }
        });
    });

    content.querySelector(".close-btn").addEventListener("click", () => {
        gantt.modalbox.hide(colorModalbox);
    });
}
