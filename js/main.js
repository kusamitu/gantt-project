document.addEventListener("DOMContentLoaded", function(event) {
    // タスクバーの色を動的に適用
    gantt.attachEvent("onGanttRender", function() {
        const style = document.getElementById('gantt-custom-style') || document.createElement('style');
        style.id = 'gantt-custom-style';
        style.innerHTML = `
            .gantt_task_line {
                background-color: ${colorSettings.taskBar} !important;
                border-color: ${colorSettings.taskBar} !important;
            }
            .gantt_task_progress {
                background-color: ${shadeColor(colorSettings.taskBar, -20)} !important;
            }
        `;
        if (!document.getElementById('gantt-custom-style')) {
            document.head.appendChild(style);
        }
    });

    // 初期化関数
    async function initializeGantt() {
        try {
            // リソースと場所のデータを取得
            const [{ data: resources }, { data: places }] = await Promise.all([
                db.from('resources').select('*'),
                db.from('places').select('*')
            ]);

            // serverListを設定
            const mappedResources = resources.map(r => ({ key: r.id, label: r.name }));
            gantt.serverList("resource_options", mappedResources);

            const mappedPlaces = places.map(p => ({ key: p.id, label: p.name }));
            gantt.serverList("place_options", mappedPlaces);

            // ライトボックス設定（init前に実行）
            gantt.config.lightbox.sections = [
                { name: "description", label: "工事番号", height: 22, map_to: "text", type: "textarea", focus: true },
                { name: "time", type: "duration", map_to: "auto" }
            ];

            // ガントチャートを初期化
            gantt.init("gantt_here");

            // リソースデータストアにデータをパース
            const resourceStore = gantt.getDatastore("resource");
            const formattedResources = resources.map(r => ({
                id: r.id,
                text: r.name,
                parent: 0
            }));
            
            if (resourceStore) {
                resourceStore.parse(formattedResources);
            }

            // 場所データストアを作成してパース
            if (!gantt.getDatastore("place")) {
                gantt.createDatastore({ 
                    name: "place",
                    type: "treeDataStore",
                    initItem: function(item) {
                        item.parent = item.parent || 0;
                        item.open = item.open || false;
                        return item;
                    }
                });
            }
            const formattedPlaces = places.map(p => ({
                id: p.id,
                text: p.name,
                parent: 0,
                open: false
            }));
            gantt.getDatastore("place").parse(formattedPlaces);

            // Supabase連携の初期化
            initDataProcessor();

            // 色設定を読み込んでからデータ読み込みと描画
            await loadColorSettings();
            updateResourceTimelineColor();
            await loadAllData();
            
            // タスクロード後にリソースデータを再パース（clearAllで消えてしまうため）
            resourceStore.parse(formattedResources);
            gantt.getDatastore("place").parse(formattedPlaces);

            // スクロール位置を左上に初期化
            gantt.scrollTo(0, 0);

        } catch (error) {
            gantt.alert({
                type: "error", 
                text: "初期化に失敗しました: " + error.message
            });
        }
    }

    // 初期化実行
    initializeGantt();

    // ボタンのイベントリスナー
    const colorSettingsBtn = document.getElementById("color_settings_btn");
    if (colorSettingsBtn) {
        colorSettingsBtn.addEventListener("click", showColorSettings);
    }

    const resourceManagerBtn = document.getElementById("resource_manager_btn");
    if (resourceManagerBtn) {
        resourceManagerBtn.addEventListener("click", (e) => showResourceManager(e.currentTarget));
    }

    const placeManagerBtn = document.getElementById("place_manager_btn");
    if (placeManagerBtn) {
        placeManagerBtn.addEventListener("click", (e) => showPlaceManager(e.currentTarget));
    }
    
    const toggleTimelineBtn = document.getElementById("toggle_timeline_btn");
    if (toggleTimelineBtn) {
        toggleTimelineBtn.addEventListener("click", toggleTimeline);
    }
    
    // 試運転期間追加ボタン
    const addPeriodBtn = document.getElementById("add_period_btn");
    if (addPeriodBtn) {
        addPeriodBtn.addEventListener("click", toggleAddPeriodMode);
    }
});