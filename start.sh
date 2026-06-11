#!/bin/bash

# Setup colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================================${NC}"
echo -e "${GREEN}    🐾  宠爱时光 (Pet Memory Workbench) 快速启动器  🐾${NC}"
echo -e "${BLUE}====================================================${NC}"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}[提示] 检测到 node_modules 目录不存在，正在为您自动安装依赖...${NC}"
    npm install
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}[成功] 依赖安装成功！${NC}"
    else
        echo -e "${RED}[错误] 依赖安装失败，请手动运行 npm install 检查错误。${NC}"
        exit 1
    fi
fi

echo -e "请选择运行模式（倒计时 3 秒后默认选择 [1] 启动开发服务器）："
echo -e "  ${GREEN}[1] 🚀 启动本地开发环境 (Vite Dev Server)${NC}"
echo -e "  ${BLUE}[2] 📦 进行生产环境打包 (Build Production)${NC}"
echo -e "  ${YELLOW}[3] 🔍 预览本地打包版本 (Preview Production)${NC}"
echo -e "  ${RED}[4] 🔄 清理并重新安装依赖 (Reinstall deps)${NC}"
echo -e "  [5] ❌ 退出"
echo -ne "请输入选项数字 [1-5]: "

# Wait 3 seconds for user input, default to 1 if timeout
read -t 3 choice
if [ -z "$choice" ]; then
    choice="1"
    echo -e "\n${YELLOW}[提示] 未输入选项，默认选择 [1] 启动本地开发环境...${NC}"
fi

case $choice in
    1)
        echo -e "${GREEN}[启动] 正在开启本地服务并自动在浏览器中打开页面...${NC}"
        npm run dev -- --open
        ;;
    2)
        echo -e "${BLUE}[构建] 正在编译打包生产环境静态文件...${NC}"
        npm run build
        ;;
    3)
        echo -e "${YELLOW}[预览] 正在开启本地生产环境预览服务并打开浏览器...${NC}"
        npm run preview -- --open
        ;;
    4)
        echo -e "${RED}[清理] 正在删除 node_modules 并重新安装依赖...${NC}"
        rm -rf node_modules package-lock.json
        npm install
        echo -e "${GREEN}[成功] 依赖重新安装完成！${NC}"
        ;;
    5)
        echo -e "${BLUE}再见！🐾${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}[提示] 输入无效，默认启动本地开发服务器...${NC}"
        npm run dev -- --open
        ;;
esac
