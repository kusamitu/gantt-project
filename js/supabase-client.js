// 1. Supabaseのクライアントを初期化
const SUPABASE_URL = 'https://lvxdyixnqaewatrclcmn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2eGR5aXhucWFld2F0cmNsY21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MDAwMTMsImV4cCI6MjA3NTA3NjAxM30.k874leEBwG2hvQE2EmZqEunwYknHGv5iVjbTI5aLohw';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);