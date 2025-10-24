// 1. Supabaseのクライアントを初期化
const SUPABASE_URL = 'https://lvxdyixnqaewatrclcmn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2eGR5aXhucWFld2F0cmNsY21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MDAwMTMsImV4cCI6MjA3NTA3NjAxM30.k874leEBwG2hvQE2EmZqEunwYknHGv5iVjbTI5aLohw';

// リトライ機能付きのSupabaseクライアント
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        persistSession: false
    },
    global: {
        headers: {
            'Connection': 'keep-alive'
        },
        fetch: (url, options = {}) => {
            // タイムアウト設定（30秒）
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);
            
            return fetch(url, {
                ...options,
                signal: controller.signal
            }).finally(() => {
                clearTimeout(timeoutId);
            });
        }
    }
});

// リトライ機能付きのデータ取得関数
async function fetchWithRetry(queryFn, maxRetries = 3, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const result = await queryFn();
            if (result.error) {
                throw new Error(result.error.message);
            }
            return result;
        } catch (error) {
            console.warn(`[RETRY ${i + 1}/${maxRetries}] Database query failed:`, error.message);
            if (i === maxRetries - 1) {
                throw error;
            }
            await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
    }
}