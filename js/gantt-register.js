// --- 共通管理ウィンドウ ---

// config: { dbTable, title, listTitle, placeholder, deleteConfirm, loadError, cssPrefix, buttonElement?, hasDepartment? }
async function showManager(config) {
    const content = document.createElement("div");
    content.className = `${config.cssPrefix}-editor`;

    const modalbox = gantt.modalbox({
        title: config.title,
        content: content,
        width: config.hasDepartment ? '350px' : '300px'
    });

    // ボタンの近くにモーダルを配置する
    if (config.buttonElement) {
        const rect = config.buttonElement.getBoundingClientRect();
        // ドキュメントからモーダルボックスのコンテナを直接検索する
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

    await renderContent(content, config, modalbox);
}

async function renderContent(contentElement, config, modalbox) {
    // データを取得
    const { data, error } = await db.from(config.dbTable).select('*');
    if (error) {
        gantt.alert({ type: "error", text: config.loadError });
        return;
    }

    // 担当者の場合は部署ごとに分類
    let assemblyItems = [];
    let electricalItems = [];
    
    if (config.hasDepartment) {
        assemblyItems = data.filter(item => item.department === '組立');
        electricalItems = data.filter(item => item.department === '電装');
    }

    // HTMLコンテンツを生成
    if (config.hasDepartment) {
        contentElement.innerHTML = `
            <style>
                .department-container {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                .department-section {
                    background: #f8f9fa;
                    border: 1px solid #e9ecef;
                    border-radius: 8px;
                    padding: 15px;
                }
                .department-section h3 {
                    margin: 0 0 12px 0;
                    color: #495057;
                    font-size: 16px;
                    font-weight: 600;
                    border-bottom: 2px solid #007bff;
                    padding-bottom: 8px;
                }
                .${config.cssPrefix}-list {
                    list-style: none;
                    padding: 0;
                    margin: 0 0 12px 0;
                    max-height: 250px;
                    overflow-y: auto;
                }
                .${config.cssPrefix}-list-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 2px 6px;
                    margin: 1px 0;
                    background: white;
                    border: 1px solid #dee2e6;
                    border-radius: 3px;
                    transition: all 0.2s ease;
                    min-height: 22px;
                }
                .${config.cssPrefix}-list-item:hover {
                    background: #f8f9fa;
                    border-color: #007bff;
                    box-shadow: 0 2px 4px rgba(0,123,255,0.1);
                }
                .${config.cssPrefix}-delete-btn {
                    color: #dc3545;
                    font-size: 14px;
                    font-weight: bold;
                    cursor: pointer;
                    padding: 1px 4px;
                    border-radius: 2px;
                    transition: all 0.2s ease;
                    user-select: none;
                }
                .${config.cssPrefix}-delete-btn:hover {
                    background: #dc3545;
                    color: white;
                    transform: scale(1.1);
                }
                .${config.cssPrefix}-form {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }
                .${config.cssPrefix}-form input {
                    flex: 1;
                    padding: 8px 12px;
                    border: 1px solid #ced4da;
                    border-radius: 6px;
                    font-size: 14px;
                    transition: border-color 0.2s ease;
                }
                .${config.cssPrefix}-form input:focus {
                    outline: none;
                    border-color: #007bff;
                    box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
                }
                .add-btn {
                    padding: 8px 16px;
                    background: #28a745;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: background-color 0.2s ease;
                }
                .add-btn:hover {
                    background: #218838;
                }
                .close-btn {
                    width: 100%;
                    padding: 10px;
                    background: #6c757d;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: background-color 0.2s ease;
                }
                .close-btn:hover {
                    background: #5a6268;
                }
            </style>
            <div class="department-container">
                <div class="department-section">
                    <h3>組立</h3>
                    <ul class="${config.cssPrefix}-list" data-department="組立">
                        ${assemblyItems.map(item => `
                            <li class="${config.cssPrefix}-list-item" data-id="${item.id}">
                                <span>${item.name}</span>
                                <span class="${config.cssPrefix}-delete-btn">&times;</span>
                            </li>
                        `).join("")}
                    </ul>
                    <div class="${config.cssPrefix}-form" data-department="組立">
                        <input type="text" placeholder="${config.placeholder}">
                        <button class="add-btn">追加</button>
                    </div>
                </div>
                
                <div class="department-section">
                    <h3>電装</h3>
                    <ul class="${config.cssPrefix}-list" data-department="電装">
                        ${electricalItems.map(item => `
                            <li class="${config.cssPrefix}-list-item" data-id="${item.id}">
                                <span>${item.name}</span>
                                <span class="${config.cssPrefix}-delete-btn">&times;</span>
                            </li>
                        `).join("")}
                    </ul>
                    <div class="${config.cssPrefix}-form" data-department="電装">
                        <input type="text" placeholder="${config.placeholder}">
                        <button class="add-btn">追加</button>
                    </div>
                </div>
            </div>
            <button class="close-btn" style="margin-top: 15px;">閉じる</button>
        `;
    } else {
        contentElement.innerHTML = `
            <style>
                .${config.cssPrefix}-list {
                    list-style: none;
                    padding: 0;
                    margin: 0 0 12px 0;
                    max-height: 350px;
                    overflow-y: auto;
                }
                .${config.cssPrefix}-list-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 2px 6px;
                    margin: 1px 0;
                    background: white;
                    border: 1px solid #dee2e6;
                    border-radius: 3px;
                    transition: all 0.2s ease;
                    min-height: 22px;
                }
                .${config.cssPrefix}-list-item:hover {
                    background: #f8f9fa;
                    border-color: #007bff;
                    box-shadow: 0 2px 4px rgba(0,123,255,0.1);
                }
                .${config.cssPrefix}-delete-btn {
                    color: #dc3545;
                    font-size: 14px;
                    font-weight: bold;
                    cursor: pointer;
                    padding: 1px 4px;
                    border-radius: 2px;
                    transition: all 0.2s ease;
                    user-select: none;
                }
                .${config.cssPrefix}-delete-btn:hover {
                    background: #dc3545;
                    color: white;
                    transform: scale(1.1);
                }
                .${config.cssPrefix}-form {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                    margin-bottom: 15px;
                }
                .${config.cssPrefix}-form input {
                    flex: 1;
                    padding: 8px 12px;
                    border: 1px solid #ced4da;
                    border-radius: 6px;
                    font-size: 14px;
                    transition: border-color 0.2s ease;
                }
                .${config.cssPrefix}-form input:focus {
                    outline: none;
                    border-color: #007bff;
                    box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
                }
                .add-btn {
                    padding: 8px 16px;
                    background: #28a745;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: background-color 0.2s ease;
                }
                .add-btn:hover {
                    background: #218838;
                }
                .close-btn {
                    width: 100%;
                    padding: 10px;
                    background: #6c757d;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: background-color 0.2s ease;
                }
                .close-btn:hover {
                    background: #5a6268;
                }
            </style>
            <h3 style="color: #495057; font-size: 16px; font-weight: 600; margin-bottom: 15px; border-bottom: 2px solid #007bff; padding-bottom: 8px;">${config.listTitle}</h3>
            <ul class="${config.cssPrefix}-list">
                ${data.map(item => `
                    <li class="${config.cssPrefix}-list-item" data-id="${item.id}">
                        <span>${item.name}</span>
                        <span class="${config.cssPrefix}-delete-btn">&times;</span>
                    </li>
                `).join("")}
            </ul>
            <div class="${config.cssPrefix}-form">
                <input type="text" placeholder="${config.placeholder}">
                <button class="add-btn">追加</button>
            </div>
            <button class="close-btn">閉じる</button>
        `;
    }

    // 「追加」ボタンのイベントリスナー
    contentElement.querySelectorAll(".add-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const form = e.target.closest(`.${config.cssPrefix}-form`);
            const input = form.querySelector('input');
            const name = input.value.trim();
            if (!name) return;

            let insertData = { name: name };
            
            // 部署情報を追加
            if (config.hasDepartment) {
                const department = form.dataset.department;
                insertData.department = department;
            }

            const { error } = await db.from(config.dbTable).insert([insertData]);
            if (error) {
                gantt.alert({ type: "error", text: "追加に失敗しました: " + error.message });
            } else {
                // データストアとserverListを更新
                await updateDataStoresAndServerLists();
                await renderContent(contentElement, config, modalbox); // コンテンツを再レンダリング
                gantt.render(); // ガントチャートを再描画
            }
        });
    });

    // 「削除」ボタンのイベントリスナー
    contentElement.querySelectorAll(`.${config.cssPrefix}-delete-btn`).forEach(btn => {
        btn.addEventListener("click", (e) => {
            const id = e.target.parentElement.dataset.id;
            gantt.confirm({
                text: config.deleteConfirm,
                ok: "はい",
                cancel: "いいえ",
                callback: async (result) => {
                    if (!result) return;
                    const { error } = await db.from(config.dbTable).delete().eq('id', id);
                    if (error) {
                        gantt.alert({ type: "error", text: "削除に失敗しました: " + error.message });
                    } else {
                        // データストアとserverListを更新
                        await updateDataStoresAndServerLists();
                        await renderContent(contentElement, config, modalbox); // コンテンツを再レンダリ
                        gantt.render(); // ガントチャートを再描画
                    }
                }
            });
        });
    });

    // 「閉じる」ボタンのイベントリスナー
    contentElement.querySelector(".close-btn").addEventListener("click", () => {
        gantt.modalbox.hide(modalbox);
    });
}

// データストアとserverListを更新する関数
async function updateDataStoresAndServerLists() {
    try {
        // リソースと場所のデータを取得
        const [{ data: resources }, { data: places }] = await Promise.all([
            db.from('resources').select('*'),
            db.from('places').select('*')
        ]);

        // リソースデータストアを更新
        const resourceStore = gantt.getDatastore("resource");
        const formattedResources = resources.map(r => ({
            id: r.id,
            text: r.name,
            parent: 0,
            department: r.department  // 部署情報を追加
        }));
        
        if (resourceStore) {
            resourceStore.clearAll();
            resourceStore.parse(formattedResources);
        }

        // 場所データストアを更新
        const placeStore = gantt.getDatastore("place");
        const formattedPlaces = places.map(p => ({
            id: p.id,
            text: p.name,
            parent: 0,
            open: false
        }));
        
        if (placeStore) {
            placeStore.clearAll();
            placeStore.parse(formattedPlaces);
        }

        // serverListを更新（部署情報も含める）
        const mappedResources = resources.map(r => ({ 
            key: r.id, 
            label: r.name,
            department: r.department 
        }));
        gantt.serverList("resource_options", mappedResources);

        const mappedPlaces = places.map(p => ({ key: p.id, label: p.name }));
        gantt.serverList("place_options", mappedPlaces);

    } catch (error) {
        console.error("データストアの更新に失敗しました:", error);
    }
}

// --- 担当者管理 ---
function showResourceManager(buttonElement) {
    showManager({
        dbTable: 'resources',
        title: '担当者管理',
        listTitle: '担当者一覧',
        placeholder: '新しい担当者名',
        deleteConfirm: 'この担当者を削除しますか?関連するタスクの割り当てが解除されます。',
        loadError: '担当者の読み込みに失敗しました。',
        cssPrefix: 'resource',
        buttonElement: buttonElement,
        hasDepartment: true  // 部署機能を有効化
    });
}

// --- 場所管理 ---
function showPlaceManager(buttonElement) {
    showManager({
        dbTable: 'places',
        title: '場所管理',
        listTitle: '場所一覧',
        placeholder: '新しい場所名',
        deleteConfirm: 'この場所を削除しますか?関連するタスクの割り当てが解除されます。',
        loadError: '場所の読み込みに失敗しました。',
        cssPrefix: 'place',
        buttonElement: buttonElement,
        hasDepartment: false  // 部署機能は無効
    });
}