@echo off
cd /d "%~dp0"
echo  �����X�V���J�n���܂�...

:: GitHub����ŐV�̕ύX����荞�ށi����̃G���[�΍�j
echo.
echo  GitHub����ŐV�̕ύX���擾��...
git pull origin master --no-edit

echo.
echo  �ύX���R�~�b�g���A�v�b�V�����܂�...
git add .
git commit -m "Site updated automatically"
git push origin master

echo.
echo  �������܂����B
pause