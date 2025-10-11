// カスタムライトボックスを表示する関数
function showCustomLightbox(taskId, focusField, clickEvent) {
    const task = gantt.getTask(taskId);
    
    // focusFieldが指定されている場合はシンプルモード（独自のドロップダウンを作成）
    if (focusField === 'resource_id' || focusField === 'place_id') {
        // リソースと場所のオプションを取得
        const resourceOptions = gantt.serverList("resource_options");
        const placeOptions = gantt.serverList("place_options");
        
        // 現在選択されている値を配列に変換
        let selectedResources = [];
        let selectedPlaces = [];
        
        if (focusField === 'resource_id') {
            if (Array.isArray(task.resource_id)) {
                selectedResources = task.resource_id.map(id => String(id));
            } else if (task.resource_id) {
                selectedResources = task.resource_id.toString().split(',');
            }
        }
        
        if (focusField === 'place_id') {
            if (Array.isArray(task.place_id)) {
                selectedPlaces = task.place_id.map(id => String(id));
            } else if (task.place_id) {
                selectedPlaces = task.place_id.toString().split(',');
            }
        }
        
        const options = focusField === 'resource_id' ? resourceOptions : placeOptions;
        const selectedIds = focusField === 'resource_id' ? selectedResources : selectedPlaces;
        
        // 独自のドロップダウンを作成
        const dropdown = document.createElement('div');
        dropdown.className = 'custom-dropdown-menu';
        dropdown.innerHTML = `
            <style>
                .custom-dropdown-menu {
                    position: fixed;
                    background-color: white;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                    z-index: 10000;
                    display: flex;
                    flex-direction: column;
                    max-height: 350px;
                    width: 180px;
                }
                .custom-dropdown-list {
                    max-height: 250px;
                    overflow-y: auto;
                    overflow-x: hidden;
                    padding: 0;
                    margin: 0;
                }
                .custom-dropdown-item {
                    padding: 4px 10px;
                    cursor: pointer;
                    user-select: none;
                    border-bottom: 1px solid #f0f0f0;
                    white-space: nowrap;
                    list-style: none;
                    display: block;
                    width: 100%;
                }
                .custom-dropdown-item:last-child {
                    border-bottom: none;
                }
                .custom-dropdown-item:hover {
                    background-color: #e3f2fd;
                }
                .custom-dropdown-item input[type="checkbox"] {
                    margin-right: 6px;
                    vertical-align: middle;
                    cursor: pointer;
                }
                .custom-dropdown-item span {
                    cursor: pointer;
                    vertical-align: middle;
                }
                .custom-dropdown-buttons {
                    display: flex;
                    justify-content: flex-end;
                    gap: 6px;
                    padding: 6px 8px;
                    border-top: 1px solid #ddd;
                    background-color: #f9f9f9;
                    flex-shrink: 0;
                }
                .custom-dropdown-buttons button {
                    padding: 5px 10px;
                    border: none;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 12px;
                }
                .custom-dropdown-buttons .save-btn {
                    background-color: #4CAF50;
                    color: white;
                }
                .custom-dropdown-buttons .save-btn:hover {
                    background-color: #45a049;
                }
                .custom-dropdown-buttons .cancel-btn {
                    background-color: #999;
                    color: white;
                }
                .custom-dropdown-buttons .cancel-btn:hover {
                    background-color: #888;
                }
                .custom-dropdown-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: 9999;
                }
            </style>
            <div class="custom-dropdown-list">
                ${options.map(option => `
                    <label class="custom-dropdown-item">
                        <input type="checkbox" 
                               value="${option.key}" 
                               ${selectedIds.includes(String(option.key)) ? 'checked' : ''}>
                        <span>${option.label}</span>
                    </label>
                `).join('')}
            </div>
            <div class="custom-dropdown-buttons">
                <button class="cancel-btn">キャンセル</button>
                <button class="save-btn">OK</button>
            </div>
        `;
        
        // オーバーレイを作成（クリックで閉じる）
        const overlay = document.createElement('div');
        overlay.className = 'custom-dropdown-overlay';
        
        // クリック位置の近くに配置
        let x = 100; // デフォルト位置
        let y = 100;
        
        if (clickEvent) {
            x = clickEvent.clientX + 5;
            y = clickEvent.clientY + 5;
        }
        
        // 画面外にはみ出さないように調整
        const maxX = window.innerWidth - 180 - 10;
        const maxY = window.innerHeight - 350 - 10;
        
        dropdown.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
        dropdown.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
        
        // ドキュメントに追加
        document.body.appendChild(overlay);
        document.body.appendChild(dropdown);
        
        // 閉じる関数
        const closeDropdown = () => {
            if (dropdown.parentNode) {
                document.body.removeChild(dropdown);
            }
            if (overlay.parentNode) {
                document.body.removeChild(overlay);
            }
        };
        
        // オーバーレイクリックで閉じる
        overlay.addEventListener('click', closeDropdown);
        
        // 保存ボタン
        dropdown.querySelector('.save-btn').addEventListener('click', () => {
            const selectedCheckboxes = dropdown.querySelectorAll('.custom-dropdown-item input[type="checkbox"]:checked');
            const selectedIdValues = Array.from(selectedCheckboxes).map(cb => parseInt(cb.value, 10));
            
            if (focusField === 'resource_id') {
                task.resource_id = selectedIdValues;
            } else {
                task.place_id = selectedIdValues; // 配列形式で保存
            }
            
            // タスクを更新してガントチャートを再描画
            gantt.updateTask(taskId);
            gantt.refreshData();
            
            closeDropdown();
        });
        
        // キャンセルボタン
        dropdown.querySelector('.cancel-btn').addEventListener('click', closeDropdown);
        
        return;
    }
}