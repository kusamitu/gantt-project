// ========================================
// 定数の一元管理
// ========================================

// デフォルト色設定
const DEFAULT_COLORS = {
    task2000Bar: '#3db9d3',
    taskDBar: '#FF8C42',
    taskOtherBar: '#9C27B0',
    taskBusinessTripBar: '#4CAF50',
    electricalBar: '#FF8C42',
    trialBar: '#FF69B4',
    resourceBar: '#3db9d3',
    placeBar: '#3db9d3',
    noResourceBar: '#999999'
};

// カラーパレット
const COLOR_PALETTE = [
    // 1行目: 各色の濃い色
    '#E65100', '#F9A825', '#1B5E20', '#689F38', '#0097A7', '#0D47A1', '#880E4F', '#4A148C',
    // 2行目: やや濃い色
    '#FF6F00', '#FBC02D', '#2E7D32', '#7CB342', '#00ACC1', '#1565C0', '#AD1457', '#6A1B9A',
    // 3行目: 中間の色
    '#FF8F00', '#FDD835', '#43A047', '#9CCC65', '#26C6DA', '#42A5F5', '#EC407A', '#AB47BC',
    // 4行目: 明るい色
    '#FFB74D', '#FFEB3B', '#66BB6A', '#C5E1A5', '#80DEEA', '#90CAF9', '#F48FB1', '#CE93D8'
];

// デフォルト高さ設定
const DEFAULT_HEIGHTS = {
    mainGridRow: 23,
    mainTaskBar: 19,
    mainTaskBarOffset: 0,
    resourceGridRow: 17,
    resourceTaskBar: 15,
    resourceTaskBarOffset: 0,
    trialBar: 19,
    trialBarOffset: 0
};

// デフォルト列幅設定
const DEFAULT_COLUMN_WIDTHS = {
    text: 70,
    machineUnit: 52,
    overview: 150,
    customer: 100,
    dispatchDate: 47,
    resourceId: 60,
    startDate: 47,
    endDate: 47,
    placeId: 60,
    deleteColumn: 25,
    addColumn: 25,
    resourceColumn: 100,
    timelineColumn: 45,
    resourceTimelineColumn: 100,
    placeTimelineColumn: 100
};

// 試運転設定
const TRIAL_RUN_CONFIG = {
    name: '試運転',
    color: '#FF69B4'
};

// バー設定名のマッピング
const BAR_TARGET_NAMES = {
    'task2000Bar': '2000番のバー',
    'taskDBar': 'D番のバー',
    'taskOtherBar': 'その他のバー',
    'taskBusinessTripBar': '出張のバー',
    'electricalBar': '電装のバー',
    'trialBar': '試運転バー',
    'resourceBar': '担当者負荷のバー',
    'placeBar': '場所負荷のバー'
};

// グローバルに公開（互換性のため）
if (typeof window !== 'undefined') {
    window.COLOR_PALETTE = COLOR_PALETTE;
}