@echo off
cd /d "%~dp0"
echo  �����X�V���J�n���܂�...

::  �O��̖������}�[�W��Ƃ�����΃��Z�b�g����
echo.
echo  �������}�[�W���N���[���A�b�v...
git merge --abort > NUL 2>&1
::  (NUL 2>&1 �̓G���[���b�Z�[�W��\���p)

:: GitHub����ŐV�̕ύX����荞�� (�}�[�W�R�~�b�g�������Ŋm�肳����)
echo.
echo  GitHub����ŐV�̕ύX���擾��...
git pull origin master --no-edit 

echo.
echo  �ύX���R�~�b�g���A�v�b�V�����܂�...
git add .
git commit -m "Site updated automatically"
git push origin master

echo.
echo  �A�b�v���[�h�������܂����IGitHub Pages�ɔ��f�����܂ł��΂炭���҂����������B
pause