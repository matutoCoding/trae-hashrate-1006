@echo off
chcp 65001 >nul
title 古典园林叠石假山稳定性分析系统 - 桌面版
echo.
echo     ╔══════════════════════════════════════════════════╗
echo     ║     古典园林叠石假山稳定性分析系统                ║
echo     ║     叠山营造 · Desktop Edition                   ║
echo     ╚══════════════════════════════════════════════════╝
echo.
echo [1/3] 正在启动 Vite 前端服务...
echo [2/3] 等待前端就绪...
echo [3/3] 启动 Electron 桌面窗口...
echo.

cd /d "%~dp0"
npm run dev
pause
