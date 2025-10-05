@echo off
cd /d "%~dp0"
echo  自動更新を開始します...
git add .
git commit -m "Site updated automatically"
git push origin master
echo  完了しました。
pause