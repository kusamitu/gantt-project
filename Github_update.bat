@echo off
cd /d "%~dp0"
echo  �����X�V���J�n���܂�...
git add .
git commit -m "Site updated automatically"
git push origin master
echo  �������܂����B
pause