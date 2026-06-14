@echo off
chcp 65001 >nul
title 叠山营造 - 打包安装程序
echo.
echo ========================================
echo   正在构建安装包，请稍候...
echo   1. 编译前端代码
echo   2. 打包 Electron 安装程序
echo   3. 输出到 release/ 目录
echo ========================================
echo.

cd /d "%~dp0"
npm run build
echo.
echo 构建完成！安装包已输出到 release 目录
pause
