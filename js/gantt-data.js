// --- Supabase連携 ---
function initDataProcessor() {
    gantt.createDataProcessor({
        task: {
            create: async (data) => {
                // 配列または文字列を配列に変換
                let resourceIds = [];
                if (Array.isArray(data.resource_id)) {
                    resourceIds = data.resource_id;
                } else if (data.resource_id) {
                    resourceIds = data.resource_id.toString().split(',').map(id => parseInt(id.trim(), 10));
                }
                
                let placeIds = [];
                if (Array.isArray(data.place_id)) {
                    placeIds = data.place_id;
                } else if (data.place_id) {
                    placeIds = data.place_id.toString().split(',').map(id => parseInt(id.trim(), 10));
                }

                const payload = {
                    order_no: data.text || null,
                    overview: data.overview || null,
                    start_date: data.start_date || null,
                    end_date: data.end_date || null,
                    resource_id: resourceIds.length > 0 ? resourceIds : null,
                    'machine-unit': data['machine-unit'] || null,
                    dispatch_date: data.dispatch_date || null,
                    customer: data.customer || null,
                    place_id: placeIds.length > 0 ? placeIds : null,
                    periods: serializePeriodsForDB(data.periods) // periodsを追加
                };
                const { data: [newTask], error } = await db.from('tasks').insert([payload]).select();
                if (error || !newTask) {
                    gantt.alert({ type: "error", text: "作成エラー: " + (error?.message || "不明なエラー") });
                    return { action: "error" };
                }
                return { action: "inserted", sid: data.id, tid: newTask.id };
            },
            update: async (data, id) => {
                // 配列または文字列を配列に変換
                let resourceIds = [];
                if (Array.isArray(data.resource_id)) {
                    resourceIds = data.resource_id;
                } else if (data.resource_id) {
                    resourceIds = data.resource_id.toString().split(',').map(id => parseInt(id.trim(), 10));
                }
                
                let placeIds = [];
                if (Array.isArray(data.place_id)) {
                    placeIds = data.place_id;
                } else if (data.place_id) {
                    placeIds = data.place_id.toString().split(',').map(id => parseInt(id.trim(), 10));
                }

                const payload = {
                    order_no: data.text || null,
                    overview: data.overview || null,
                    start_date: data.start_date || null,
                    end_date: data.end_date || null,
                    resource_id: resourceIds.length > 0 ? resourceIds : null,
                    'machine-unit': data['machine-unit'] || null,
                    dispatch_date: data.dispatch_date || null,
                    customer: data.customer || null,
                    place_id: placeIds.length > 0 ? placeIds : null,
                    periods: serializePeriodsForDB(data.periods) // periodsを追加
                };
                
                const { data: updatedTask, error } = await db.from('tasks').update(payload).eq('id', id).select();
                if (error) {
                    gantt.alert({ type: "error", text: "更新エラー: " + error.message });
                    return { action: "error" };
                }
                if (!updatedTask || updatedTask.length === 0) {
                    gantt.alert({ type: "error", text: "更新エラー: 対象のタスクが見つかりませんでした。(ID: " + id + ")" });
                    return { action: "error" };
                }
                return { action: "updated" };
            },
            delete: async (id) => {
                const { error } = await db.from('tasks').delete().eq('id', id);
                if (error) {
                    gantt.alert({ type: "error", text: "削除エラー: " + error.message });
                    return { action: "error" };
                }
                return { action: "deleted" };
            }
        }
    });
}

// --- データ処理 ---
function customSort(a, b) {
    const textA = a.text || '';
    const textB = b.text || '';
    if (textA.localeCompare(textB) !== 0) return textA.localeCompare(textB);
    const machineA = a['machine-unit'] || '';
    const machineB = b['machine-unit'] || '';
    return machineA.localeCompare(machineB);
}

async function loadAllData() {
    try {
        console.log('[DEBUG] Loading all data...');
        
        // リソースと場所のデータを取得（エラーハンドリング付き）
        let resources, places, tasks;
        
        try {
            console.log('[DEBUG] Fetching resources for loadAllData...');
            const resourcesResponse = await fetchWithRetry(() => db.from('resources').select('*'));
            resources = resourcesResponse.data;
            console.log('[DEBUG] Resources loaded:', resources?.length || 0);
        } catch (error) {
            console.error('[ERROR] Failed to fetch resources in loadAllData:', error);
            resources = [];
        }
        
        try {
            console.log('[DEBUG] Fetching places for loadAllData...');
            const placesResponse = await fetchWithRetry(() => db.from('places').select('*'));
            places = placesResponse.data;
            console.log('[DEBUG] Places loaded:', places?.length || 0);
        } catch (error) {
            console.error('[ERROR] Failed to fetch places in loadAllData:', error);
            places = [];
        }
        
        try {
            console.log('[DEBUG] Fetching tasks for loadAllData...');
            const tasksResponse = await fetchWithRetry(() => db.from('tasks').select('*'));
            tasks = tasksResponse.data;
            console.log('[DEBUG] Tasks loaded:', tasks?.length || 0);
        } catch (error) {
            console.error('[ERROR] Failed to fetch tasks in loadAllData:', error);
            tasks = [];
        }

        // タスクデータのみをクリア
        gantt.clearAll();

        // リソースデータストアを更新（部署情報も含める）
        const resourceStore = gantt.getDatastore("resource");
        const formattedResources = (resources || []).map(r => ({
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
        const formattedPlaces = (places || []).map(p => ({
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
        const mappedResources = (resources || []).map(r => ({ 
            key: r.id, 
            label: r.name,
            department: r.department  // 部署情報を追加
        }));
        gantt.serverList("resource_options", mappedResources);

        const mappedPlaces = (places || []).map(p => ({ key: p.id, label: p.name }));
        gantt.serverList("place_options", mappedPlaces);

        // タスクデータをフォーマット
        const formattedTasks = (tasks || []).filter(task => task && task.id).map(task => ({
            id: task.id,
            text: task.order_no,
            parent: task.parent || 0,
            overview: task.overview,
            start_date: task.start_date ? new Date(task.start_date) : null,
            end_date: task.end_date ? new Date(task.end_date) : null,
            resource_id: task.resource_id ? (Array.isArray(task.resource_id) ? task.resource_id : task.resource_id.toString().split(',').map(id => parseInt(id.trim(), 10))) : [],
            'machine-unit': task['machine-unit'],
            dispatch_date: task.dispatch_date ? new Date(task.dispatch_date) : null,
            customer: task.customer,
            place_id: task.place_id ? (Array.isArray(task.place_id) ? task.place_id : task.place_id.toString().split(',').map(id => parseInt(id.trim(), 10))) : [],
            periods: deserializePeriodsFromDB(task.periods) // periodsを追加
        }));

        // フォーマットされたタスクをGanttにパース
        gantt.parse({ data: formattedTasks });
        gantt.sort(customSort);

    } catch (error) {
        gantt.alert({
            type: "error", 
            text: "データの読み込みに失敗しました: " + error.message
        });
    }
}