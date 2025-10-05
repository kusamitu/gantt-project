document.addEventListener("DOMContentLoaded", function(event) {
    // 1. Supabaseのクライアントを初期化
    const SUPABASE_URL = 'https://lvxdyixnqaewatrclcmn.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2eGR5aXhucWFld2F0cmNsY21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MDAwMTMsImV4cCI6MjA3NTA3NjAxM30.k874leEBwG2hvQE2EmZqEunwYknHGv5iVjbTI5aLohw';
    const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // --- リソース設定 ---
    gantt.config.resource_store = "resource";
    gantt.config.resource_property = "resource_id";
    gantt.config.resource_render_empty_cells = true;
    gantt.config.order_branch = true;
    gantt.config.order_branch_free = true;

    // 2. 表示する列の定義
    gantt.config.columns = [
        { name: "text", label: "工事番号", tree: true, width: 70, resize: true, editor: { type: "text", map_to: "text" } },
        { name: "machine-unit", label: "機械", align: "center", width: 52, resize: true, editor: { type: "text", map_to: "machine-unit" } },
        { name: "overview", label: "概要", width: 150, resize: true, editor: { type: "text", map_to: "overview" } },
        { name: "customer", label: "客先名", width: 100, resize: true, editor: { type: "text", map_to: "customer" } },
        { name: "dispatch_date", label: "出荷日", align: "center", width: 47, editor: { type: "date", map_to: "dispatch_date" },
            template: (task) => task.dispatch_date ? gantt.templates.date_grid(task.dispatch_date) : ""
        },
        { name: "resource_id", label: "担当者", align: "center", width: 66, resize: true, editor: { type: "select", map_to: "resource_id", options: gantt.serverList("resource") },
            template: (task) => {
                const store = gantt.getDatastore("resource");
                if (store.exists(task.resource_id)) {
                    return store.getItem(task.resource_id).name;
                }
                return "";
            }
        },
        { name: "start_date", label: "開始日", align: "center", width: 47, editor: { type: "date", map_to: "start_date" } },
        { name: "end_date", label: "終了日", align: "center", width: 47, editor: { type: "date", map_to: "end_date" } },
        { name: "place", label: "場所", align: "center", width: 50, resize: true, editor: { type: "text", map_to: "place" } },
        { name: "delete", label: "", width: 25, template: (task) => "<div class='gantt_grid_delete_icon'></div>" },
        { name: "add", label: "", width: 25 }
    ];

    // メインガントチャートのグリッド幅を自動計算(全ての列を含む)
    const mainGridWidth = gantt.config.columns.reduce((total, col) => {
        return total + (typeof col.width === 'number' ? col.width : 0);
    }, 0);

    // 削除列と追加列の幅を自動取得
    const deleteColumn = gantt.config.columns.find(col => col.name === "delete");
    const addColumn = gantt.config.columns.find(col => col.name === "add");
    const deleteColumnWidth = deleteColumn ? (typeof deleteColumn.width === 'number' ? deleteColumn.width : 0) : 0;
    const addColumnWidth = addColumn ? (typeof addColumn.width === 'number' ? addColumn.width : 0) : 0;

    // 担当者列の幅
    const resourceColumnWidth = 100;
    
    // 空白スペースの幅(削除列と追加列の分を追加)
    const spacerWidth = mainGridWidth - resourceColumnWidth + deleteColumnWidth + addColumnWidth;

    // --- レイアウト設定 ---
    gantt.config.layout = {
        css: "gantt_container",
        rows: [
            {
                cols: [
                    { view: "grid", scrollX: "scrollHor", scrollY: "scrollVer" },
                    { view: "timeline", scrollX: "scrollHor", scrollY: "scrollVer" },
                    { view: "scrollbar", id: "scrollVer" }
                ],
                gravity: 2
            },
            { resizer: true, width: 1 },
            {
                gravity: 1,
                cols: [
                    {
                        width: spacerWidth,
                        rows: [
                            { view: "scrollbar", scroll: "y" }
                        ]
                    },
                    {
                        view: "resourceGrid",
                        scrollY: "resourceScrollVer",
                        width: resourceColumnWidth,
                        config: {
                            columns: [
                                { 
                                    name: "name", 
                                    label: "担当者", 
                                    tree: true, 
                                    width: "*", 
                                    template: function(resource) { 
                                        return resource.name; 
                                    },
                                    resize: true 
                                }
                            ]
                        }
                    },
                    { resizer: true, width: 1 },
                    { view: "resourceTimeline", scrollX: "scrollHor", scrollY: "resourceScrollVer" },
                    { view: "scrollbar", id: "resourceScrollVer" }
                ]
            },
            { view: "scrollbar", id: "scrollHor" }
        ]
    };

    gantt.templates.resource_cell_class = function (start_date, end_date, resource, tasks) {
        if (tasks.length === 0) return "gantt_resource_cell_empty";
        if (tasks.length > 1) return "gantt_resource_cell_overload";
        return "gantt_resource_cell_workday";
    };

    gantt.templates.resource_cell_value = function (start_date, end_date, resource, tasks) {
        return "<div>" + tasks.length + "</div>";
    };

    // --- 日付・スケール設定 ---
    gantt.config.date_format = "%Y-%m-%d";
    gantt.config.date_grid = "%n/%j";
    gantt.config.start_on_monday = true;
    gantt.config.min_column_width = 45;
    gantt.config.scale_height = 50;
    gantt.config.row_height = 25;
    gantt.config.scales = [
        { unit: "month", step: 1, format: "%n月" },
        { unit: "week", step: 1, format: "%n/%j" }
    ];
    var today = new Date();
    var start_date = new Date();
    start_date.setDate(today.getDate() - 7);
    gantt.config.start_date = start_date;

    // 3. ガントチャートの初期化
    gantt.init("gantt_here");

    // --- Supabase連携 ---
    gantt.createDataProcessor({
        task: {
            create: async (data) => {
                const payload = {
                    order_no: data.text || null,
                    overview: data.overview || null,
                    start_date: data.start_date || null,
                    end_date: data.end_date || null,
                    resource_id: data.resource_id || null,
                    'machine-unit': data['machine-unit'] || null,
                    dispatch_date: data.dispatch_date || null,
                    customer: data.customer || null,
                    place: data.place || null
                };
                const { data: [newTask], error } = await db.from('tasks').insert([payload]).select();
                if (error || !newTask) {
                    gantt.alert({ type: "error", text: "作成エラー: " + (error?.message || "不明なエラー") });
                    return { action: "error" };
                }
                return { action: "inserted", sid: data.id, tid: newTask.id };
            },
            update: async (data, id) => {
                const payload = {
                    order_no: data.text || null,
                    overview: data.overview || null,
                    start_date: data.start_date || null,
                    end_date: data.end_date || null,
                    resource_id: data.resource_id || null,
                    'machine-unit': data['machine-unit'] || null,
                    dispatch_date: data.dispatch_date || null,
                    customer: data.customer || null,
                    place: data.place || null
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
        gantt.clearAll();
        try {
            const [{ data: resources }, { data: tasks }] = await Promise.all([
                db.from('resources').select('*'),
                db.from('tasks').select('*')
            ]);

            gantt.getDatastore("resource").parse(resources);
            const mappedResources = resources.map(r => ({ key: r.id, label: r.name }));
            gantt.serverList("resource", mappedResources);

            const resourceColumn = gantt.config.columns.find(col => col.name === "resource_id");
            if (resourceColumn) {
                resourceColumn.editor.options = gantt.serverList("resource");
            }

            const dateParser = gantt.date.str_to_date(gantt.config.date_format);
            const formattedTasks = tasks.map(task => ({
                id: task.id,
                text: task.order_no,
                overview: task.overview,
                start_date: task.start_date ? dateParser(task.start_date) : null,
                end_date: task.end_date ? dateParser(task.end_date) : null,
                resource_id: task.resource_id,
                'machine-unit': task['machine-unit'],
                dispatch_date: task.dispatch_date ? dateParser(task.dispatch_date) : null,
                customer: task.customer,
                place: task.place
            }));

            gantt.parse({ data: formattedTasks });
            gantt.sort(customSort);

        } catch (error) {
            console.error('Error loading data:', error);
            gantt.alert({type: "error", text: "データの読み込みに失敗しました: " + error.message});
        }
    }

    loadAllData();

    // --- 担当者管理ウィンドウ ---
    let modalbox;
    async function showResourceManager() {
        const { data: resources } = await db.from('resources').select('*');

        const content = document.createElement("div");
        content.className = "resource-editor";
        content.innerHTML = `
            <h3>担当者一覧</h3>
            <ul class="resource-list">
                ${resources.map(r => `
                    <li class="resource-list-item" data-id="${r.id}">
                        <span>${r.name}</span>
                        <span class="resource-delete-btn">&times;</span>
                    </li>
                `).join("")}
            </ul>
            <div class="resource-form">
                <input type="text" placeholder="新しい担当者名">
                <button class="add-btn">追加</button>
            </div>
            <button class="close-btn" style="margin-top: 15px;">閉じる</button>
        `;

        modalbox = gantt.modalbox({ title: "担当者管理", content: content, width: '400px' });

        content.querySelector(".add-btn").addEventListener("click", async () => {
            const input = content.querySelector(".resource-form input");
            const name = input.value.trim();
            if (!name) return;

            const { error } = await db.from('resources').insert({ name: name });
            if (error) {
                gantt.alert({ type: "error", text: "追加に失敗しました: " + error.message });
            } else {
                gantt.modalbox.hide(modalbox);
                await loadAllData();
            }
        });

        content.querySelectorAll(".resource-delete-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const id = e.target.parentElement.dataset.id;
                gantt.confirm({ text: "この担当者を削除しますか?関連するタスクの割り当てが解除されます。", ok: "はい", cancel: "いいえ",
                    callback: async (result) => {
                        if (!result) return;
                        const { error } = await db.from('resources').delete().eq('id', id);
                        if (error) {
                            gantt.alert({ type: "error", text: "削除に失敗しました: " + error.message });
                        } else {
                            gantt.modalbox.hide(modalbox);
                            await loadAllData();
                        }
                    }
                });
            });
        });

        content.querySelector(".close-btn").addEventListener("click", () => {
            gantt.modalbox.hide(modalbox);
        });
    }

    document.getElementById("resource_manager_btn").addEventListener("click", showResourceManager);

    // --- その他イベント ---
    gantt.attachEvent("onTaskClick", (id, e) => {
        if (e.target.classList.contains("gantt_grid_delete_icon")) {
            gantt.confirm({ text: "このタスクを削除してもよろしいですか?", ok: "はい", cancel: "いいえ",
                callback: (result) => {
                    if (result) gantt.deleteTask(id);
                }
            });
        }
        return true;
    });
});