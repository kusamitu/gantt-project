// 1. Supabaseのクライアントを初期化
const SUPABASE_URL = 'https://lvxdyixnqaewatrclcmn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2eGR5aXhucWFld2F0cmNsY21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MDAwMTMsImV4cCI6MjA3NTA3NjAxM30.k874leEBwG2hvQE2EmZqEunwYknHGv5iVjbTI5aLohw';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. 表示する列の定義
gantt.config.columns = [
    // "text"はGanttの必須項目。tree:trueで階層表示が可能になる
    {name: "text", label: "工事番号", tree: true, width: 67, resize: true, editor: {type: "text", map_to: "text"}},
    {name: "machine-unit", label: "機械", align: "center", width: 52, resize: true, editor: {type: "text", map_to: "machine-unit"}},
    {name: "overview", label: "概要", width: 150, resize: true, editor: {type: "text", map_to: "overview"}},
    {name: "customer", label: "客先名", width: 100, resize: true, editor: {type: "text", map_to: "customer"}},
    {name: "dispatch_date", label: "出荷日", align: "center", width: 47, editor: {type: "date", map_to: "dispatch_date"},
        template: function(task){
            if(task.dispatch_date){
                return gantt.templates.date_grid(task.dispatch_date);
            }
            return "";
        }},
    {name: "resouce", label: "担当者", align: "center", width: 66, resize: true, editor: {type: "text", map_to: "resouce"}},
    {name: "start_date", label: "開始日", align: "center", width: 47, editor: {type: "date", map_to: "start_date"}},
    {name: "end_date", label: "終了日", align: "center", width: 47, editor: {type: "date", map_to: "end_date"}},
    {name: "place", label: "場所", align: "center", width: 50, resize: true, editor: {type: "text", map_to: "place"}},
    {name: "delete", label: "", width: 44, template: function(task) {
        return "<div class='gantt_grid_delete_icon'></div>"
    }},
    {name: "add", label: "", width: 44}
];

// 日付のフォーマット設定
gantt.config.date_format = "%Y-%m-%d";
gantt.config.date_grid = "%n/%j";


// 週表示に設定
gantt.config.start_on_monday = true;
gantt.config.min_column_width = 45;
gantt.config.scale_height = 50;
gantt.config.scales = [
    {unit: "month", step: 1, format: "%n月"},
    {unit: "week", step: 1, format: "%n/%j"}
];

// 表示開始日を本日の一週間前に設定
var today = new Date();
var start_date = new Date();
start_date.setDate(today.getDate() - 7);
gantt.config.start_date = start_date;

// 3. ガントチャートの初期化
gantt.init("gantt_here");

// 4. データの読み込み
// カスタムソート機能
function customSort(a, b) {
    // 最初に工事番号でソート
    const textA = a.text || '';
    const textB = b.text || '';
    const compareA = textA.localeCompare(textB);
    if (compareA !== 0) {
        return compareA;
    }

    // 工事番号が同じ場合は機械でソート
    const machineA = a['machine-unit'] || '';
    const machineB = b['machine-unit'] || '';
    return machineA.localeCompare(machineB);
}

// Supabaseからデータを非同期で取得してGanttに表示
async function loadTasks() {
    const { data, error } = await db.from('tasks').select('*');
    if (error) {
        console.error('Error loading tasks:', error);
    } else {
        // SupabaseのデータをGanttの形式にマッピング
        const formattedData = data.map(task => {
            const dateParser = gantt.date.str_to_date(gantt.config.date_format);
            // ハイフンを含む列名は ['...'] でアクセスする
            return {
                id: task.id,
                text: task.order_no, // "order_no" を "text" にマッピング
                overview: task.overview, // "overview" もデータとして保持
                start_date: task.start_date ? dateParser(task.start_date) : null,
                end_date: task.end_date ? dateParser(task.end_date) : null,
                resouce: task.resouce,
                order_no: task.order_no,
                'machine-unit': task['machine-unit'],
                dispatch_date: task.dispatch_date ? dateParser(task.dispatch_date) : null,
                customer: task.customer,
                place: task.place
            };
        });
        gantt.parse({ data: formattedData });
        gantt.sort(customSort);
    }
}
loadTasks(); // 最初にデータを読み込む

// 5. データの変更をSupabaseに保存する設定
gantt.createDataProcessor({
    task: {
        // タスクが追加された時の処理
        create: async (data) => {
            console.log("Attempting to create task:", data); // Debug log
            const payload = {
                order_no: data.text,
                overview: data.overview,
                start_date: data.start_date, // Pass directly
                end_date: data.end_date,     // Pass directly
                resouce: data.resouce,
                'machine-unit': data['machine-unit'],
                dispatch_date: data.dispatch_date, // Pass directly
                customer: data.customer,
                place: data.place
            };
            console.log("Payload for create:", payload);

            const { data: [newTask], error } = await db.from('tasks').insert([payload]).select();
            
            if (error) {
                console.error('Error creating task:', error);
                return {action: "error"};
            }
            console.log("Create successful:", newTask);
            return { tid: newTask.id, ...newTask };
        },
        // タスクが更新された時の処理
        update: async (data, id) => {
            console.log("Attempting to update task:", id, data);
            
            const payload = {
                order_no: data.text,
                overview: data.overview,
                start_date: data.start_date, // Pass directly
                end_date: data.end_date,     // Pass directly
                resouce: data.resouce,
                'machine-unit': data['machine-unit'],
                dispatch_date: data.dispatch_date, // Pass directly
                customer: data.customer,
                place: data.place
            };
            console.log("Payload being sent to Supabase:", payload);

            const { data: updateData, error } = await db
                .from('tasks')
                .update(payload)
                .eq('id', id)
                .select();

            if (error) {
                console.error('Supabase update error:', error);
                return {action: "error"};
            }

            if (!updateData || updateData.length === 0) {
                console.error('Supabase update failed: No rows were updated. This might be due to Row Level Security (RLS) policies.');
                return {action: "error"};
            }

            console.log("Update successful. Response from Supabase:", updateData);
            return {action: "updated"};
        },
        // タスクが削除された時の処理
        delete: async (id) => {
            console.log("Attempting to delete task:", id);
            const { error } = await db.from('tasks').delete().eq('id', id);
            if (error) {
                console.error('Error deleting task:', error);
                return {action: "error"};
            }
            console.log("Delete successful for task:", id);
            return {action: "deleted"};
        }
    }
});

gantt.attachEvent("onTaskClick", function(id, e){
    if(e.target.classList.contains("gantt_grid_delete_icon")){
        gantt.confirm({
            text: "このタスクを削除してもよろしいですか？",
            ok: "はい",
            cancel: "いいえ",
            callback: function(result){
                if(result){
                    gantt.deleteTask(id);
                }
            }
        });
    }
    return true;
});