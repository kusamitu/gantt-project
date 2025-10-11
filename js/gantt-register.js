// --- 共通管理ウィンドウ ---

// config: { dbTable, title, listTitle, placeholder, deleteConfirm, loadError, cssPrefix, buttonElement? }
async function showManager(config) {
    const content = document.createElement("div");
    content.className = `${config.cssPrefix}-editor`;

    const modalbox = gantt.modalbox({
        title: config.title,
        content: content,
        width: '400px'
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

    // HTMLコンテンツを生成
    contentElement.innerHTML = `
        <h3>${config.listTitle}</h3>
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
        <button class="close-btn" style="margin-top: 15px;">閉じる</button>
    `;

    // 「追加」ボタンのイベントリスナー
    contentElement.querySelector(".add-btn").addEventListener("click", async () => {
        const input = contentElement.querySelector(`.${config.cssPrefix}-form input`);
        const name = input.value.trim();
        if (!name) return;

        const { error } = await db.from(config.dbTable).insert({ name: name });
        if (error) {
            gantt.alert({ type: "error", text: "追加に失敗しました: " + error.message });
        } else {
            // データストアとserverListを更新
            await updateDataStoresAndServerLists();
            await renderContent(contentElement, config, modalbox); // コンテンツを再レンダリング
            gantt.render(); // ガントチャートを再描画
        }
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
            parent: 0
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

        // serverListを更新
        const mappedResources = resources.map(r => ({ key: r.id, label: r.name }));
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
        buttonElement: buttonElement
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
        buttonElement: buttonElement
    });
}