@echo off
cd /d "%~dp0"
echo  自動更新を開始します...

::  前回の未完了マージ作業があればリセットする
echo.
echo  未完了マージをクリーンアップ...
git merge --abort > NUL 2>&1
::  (NUL 2>&1 はエラーメッセージ非表示用)

:: GitHubから最新の変更を取り込む (マージコミットを自動で確定させる)
echo.
echo  GitHubから最新の変更を取得中...
git pull origin master --no-edit 

echo.
echo  変更をコミットし、プッシュします...
git add .
git commit -m "Site updated automatically"
git push origin master

echo.
echo  アップロード完了しました！GitHub Pagesに反映されるまでしばらくお待ちください。
pause