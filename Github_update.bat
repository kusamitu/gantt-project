@echo off
cd /d "%~dp0"
echo  自動更新を開始します...

:: GitHubから最新の変更を取り込む（今回のエラー対策）
echo.
echo  GitHubから最新の変更を取得中...
git pull origin master --no-edit

echo.
echo  変更をコミットし、プッシュします...
git add .
git commit -m "Site updated automatically"
git push origin master

echo.
echo  完了しました。
pause