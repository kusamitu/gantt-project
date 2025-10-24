document.addEventListener("DOMContentLoaded", function(event) {
    // タスクバーの色を動的に適用
    gantt.attachEvent("onGanttRender", function() {
        updateTask2000BarColor();
        updateTaskDBarColor();
        updateTaskOtherBarColor();
        updateTaskBusinessTripBarColor();
        updateElectricalBarColor();
        updateTrialBarColor();
        
        // ボタン位置を調整
        adjustButtonPosition();
    });

    // ボタンの位置をタイムライン開始位置に合わせる関数
    function adjustButtonPosition() {
        setTimeout(() => {
            const gridElement = document.querySelector('.gantt_grid');
            const controlsRightElement = document.querySelector('.gantt-controls-right');
            
            if (gridElement && controlsRightElement) {
                const gridWidth = gridElement.offsetWidth;
                controlsRightElement.style.left = (gridWidth + 10) + 'px';
                controlsRightElement.style.right = 'auto';
                controlsRightElement.style.visibility = 'visible';
            }
        }, 100);
    }

    // 初期化関数
    async function initializeGantt() {
        try {
            console.log('[DEBUG] Starting Gantt initialization...');
            
            // リソースと場所のデータを取得（エラーハンドリング付き）
            let resources, places;
            
            try {
                console.log('[DEBUG] Fetching resources...');
                const resourcesResponse = await fetchWithRetry(() => db.from('resources').select('*'));
                resources = resourcesResponse.data;
                console.log('[DEBUG] Resources fetched:', resources?.length || 0);
            } catch (error) {
                console.error('[ERROR] Failed to fetch resources:', error);
                resources = [];
            }
            
            try {
                console.log('[DEBUG] Fetching places...');
                const placesResponse = await fetchWithRetry(() => db.from('places').select('*'));
                places = placesResponse.data;
                console.log('[DEBUG] Places fetched:', places?.length || 0);
            } catch (error) {
                console.error('[ERROR] Failed to fetch places:', error);
                places = [];
            }

            // serverListを設定(部署情報も含める)
            const mappedResources = (resources || []).map(r => ({ 
                key: r.id, 
                label: r.name,
                department: r.department 
            }));
            gantt.serverList("resource_options", mappedResources);

            const mappedPlaces = (places || []).map(p => ({ key: p.id, label: p.name }));
            gantt.serverList("place_options", mappedPlaces);

            // ライトボックス設定(init前に実行)
            gantt.config.lightbox.sections = [
                { name: "description", label: "工事番号", height: 22, map_to: "text", type: "textarea", focus: true },
                { name: "time", type: "duration", map_to: "auto" }
            ];

            // 列幅設定を先に読み込む
            if (typeof loadColumnWidthSettings === 'function') {
                await loadColumnWidthSettings();
            }

            // 高さ設定を先に読み込む
            if (typeof loadHeightSettings === 'function') {
                await loadHeightSettings();
            }
            
            // 高さ設定適用とCSS生成
            if (typeof applyHeightSettings === 'function') {
                applyHeightSettings();
            }
            
            // 色設定を読み込み
            await loadColorSettings();
            
            // 場所負荷タイムラインのタスク色を読み込み
            if (typeof loadPlaceTaskColors === 'function') {
                await loadPlaceTaskColors();
            }

            // ガントチャートを初期化(列幅・高さ設定適用後)
            gantt.init("gantt_here");
            
            // デバッグ: 初期化後の列幅設定を確認
            
            // 初期化後に列幅設定を適用
            if (typeof applyColumnWidthSettings === 'function') {
                applyColumnWidthSettings();
            }

            // リソースデータストアにデータをパース(部署情報も含める)
            const resourceStore = gantt.getDatastore("resource");
            const formattedResources = (resources || []).map(r => ({
                id: r.id,
                text: r.name,
                parent: 0,
                department: r.department
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
            const formattedPlaces = (places || []).map(p => ({
                id: p.id,
                text: p.name,
                parent: 0,
                open: false
            }));
            gantt.getDatastore("place").parse(formattedPlaces);

            // Supabase連携の初期化
            initDataProcessor();
            
            // 全ての色を更新
            updateAllBarColors();
            
            // データ読み込み
            await loadAllData();
            
            // タスクロード後にリソースデータを再パース(clearAllで消えてしまうため)
            resourceStore.parse(formattedResources);
            gantt.getDatastore("place").parse(formattedPlaces);

            // データ読み込み完了後、再度高さ設定を適用
            setTimeout(() => {
                if (typeof applyHeightSettings === 'function') {
                    applyHeightSettings();
                }
            }, 200);

            // スクロール位置を左上に初期化
            gantt.scrollTo(0, 0);
            
            // 初期ボタン位置調整
            adjustButtonPosition();

            // リソースタイムラインの位置調整を無効化（罫線消失を防ぐため）
            // setTimeout(() => {
            //     if (typeof adjustResourceTimelinePosition === 'function') {
            //         adjustResourceTimelinePosition();
            //     }
            // }, 1000);

            // スクロールリスナーをアタッチ
            if (typeof attachScrollListener === 'function') {
                attachScrollListener();
            }

        } catch (error) {
            console.error('[ERROR] Gantt initialization failed:', error);
            
            // フォールバック: データが取得できない場合でもアプリケーションを起動
            console.log('[DEBUG] Attempting fallback initialization...');
            
            try {
                // ガントチャートを初期化（データなし）
                gantt.init("gantt_here");
                
                // 空のデータで初期化
                gantt.serverList("resource_options", []);
                gantt.serverList("place_options", []);
                
                // 空のタスクを追加（デモ用）
                const demoTask = {
                    id: 1,
                    text: "データ読み込み中...",
                    start_date: new Date(),
                    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    duration: 7
                };
                gantt.addTask(demoTask);
                
                console.log('[DEBUG] Fallback initialization completed');
                
                gantt.alert({
                    type: "warning", 
                    text: "データの読み込みに失敗しました。ネットワーク接続を確認してください。"
                });
            } catch (fallbackError) {
                console.error('[ERROR] Fallback initialization also failed:', fallbackError);
                gantt.alert({
                    type: "error", 
                    text: "初期化に失敗しました: " + error.message
                });
            }
        }
    }

    // 初期化実行
    initializeGantt();

    // ボタンのイベントリスナー
    const colorSettingsBtn = document.getElementById("color_settings_btn");
    if (colorSettingsBtn) {
        colorSettingsBtn.addEventListener("click", showColorSettings);
    }

    const heightSettingsBtn = document.getElementById("height_settings_btn");
    if (heightSettingsBtn) {
        heightSettingsBtn.addEventListener("click", showHeightSettings);
    }

    const columnWidthSettingsBtn = document.getElementById("column_width_settings_btn");
    if (columnWidthSettingsBtn) {
        columnWidthSettingsBtn.addEventListener("click", showColumnWidthSettings);
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
    console.log('[DEBUG] Add period button found:', addPeriodBtn);
    if (addPeriodBtn) {
        console.log('[DEBUG] Adding click event listener to add period button');
        addPeriodBtn.addEventListener("click", function(e) {
            console.log('[DEBUG] Add period button clicked');
            toggleAddPeriodMode();
        });
    } else {
        console.log('[DEBUG] Add period button NOT found!');
    }
    
    // ウィンドウリサイズ時にもボタン位置を調整
    window.addEventListener('resize', adjustButtonPosition);
});