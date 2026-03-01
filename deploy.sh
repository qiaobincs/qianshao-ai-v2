#!/bin/bash
# =============================================================
# 前哨AI智能体体验舱 - 宝塔服务器一键部署脚本
# 使用方式：
#   首次部署：bash deploy.sh
#   更新代码：bash deploy.sh update
# =============================================================

set -e  # 任何命令失败则立即退出

# ───────────────────────────────────────────────
# 配置区（按需修改）
# ───────────────────────────────────────────────
APP_NAME="qianshao-ai"
APP_DIR="/www/wwwroot/qianshao-ai"
APP_PORT=3000
NODE_MIN_VERSION=18

# ───────────────────────────────────────────────
# 颜色输出
# ───────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC}   $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERR]${NC}  $1"; exit 1; }

# ───────────────────────────────────────────────
# 工具函数
# ───────────────────────────────────────────────

check_node() {
  if ! command -v node &>/dev/null; then
    error "未找到 Node.js，请先在宝塔软件商店安装 Node.js v20"
  fi
  local version
  version=$(node -e "process.exit(parseInt(process.versions.node.split('.')[0]))" 2>/dev/null; node -e "console.log(parseInt(process.versions.node.split('.')[0]))")
  if [ "$version" -lt "$NODE_MIN_VERSION" ]; then
    error "Node.js 版本过低 (当前: $(node -v)，需要 >= v${NODE_MIN_VERSION})，请升级"
  fi
  success "Node.js $(node -v) 检测通过"
}

check_pm2() {
  if ! command -v pm2 &>/dev/null; then
    info "PM2 未安装，正在安装..."
    npm install -g pm2 || error "PM2 安装失败"
  fi
  success "PM2 $(pm2 -v) 检测通过"
}

build_app() {
  info "安装依赖..."
  npm install --production=false || error "npm install 失败"

  info "执行生产构建..."
  npm run build || error "npm run build 失败"
  success "构建完成"
}

fix_permissions() {
  local store="$APP_DIR/data/store.json"
  if [ -f "$store" ]; then
    chmod 666 "$store"
    success "data/store.json 写权限已设置"
  else
    warn "data/store.json 不存在，跳过权限设置"
  fi
}

start_pm2() {
  if pm2 describe "$APP_NAME" &>/dev/null; then
    info "检测到已有 PM2 进程，执行重启..."
    pm2 restart "$APP_NAME" || error "PM2 重启失败"
  else
    info "首次启动 PM2 进程..."
    pm2 start npm --name "$APP_NAME" -- start -- --port "$APP_PORT" || error "PM2 启动失败"
  fi
  pm2 save
  success "PM2 进程已启动"
}

print_nginx_config() {
  echo ""
  echo -e "${YELLOW}──────────────────────────────────────────────────────${NC}"
  echo -e "${YELLOW}  Nginx 反向代理配置（粘贴到宝塔站点配置文件中）${NC}"
  echo -e "${YELLOW}──────────────────────────────────────────────────────${NC}"
  cat <<NGINX
location / {
    proxy_pass http://127.0.0.1:${APP_PORT};
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_cache_bypass \$http_upgrade;

    # SSE 流式响应必须关闭缓冲，否则聊天消息会卡住
    proxy_buffering off;
    proxy_read_timeout 300s;
}
NGINX
  echo -e "${YELLOW}──────────────────────────────────────────────────────${NC}"
  echo ""
}

# ───────────────────────────────────────────────
# 首次部署
# ───────────────────────────────────────────────
do_install() {
  info "===== 开始首次部署 ====="

  # 1. 环境检查
  check_node
  check_pm2

  # 2. 进入项目目录
  if [ ! -d "$APP_DIR" ]; then
    error "项目目录 $APP_DIR 不存在，请先上传项目代码到该目录"
  fi
  cd "$APP_DIR" || error "无法进入 $APP_DIR"

  # 3. 检查关键文件
  [ -f "package.json" ] || error "未找到 package.json，请确认代码已正确上传到 $APP_DIR"

  # 4. 初始化 data/store.json（如果不存在）
  if [ ! -f "data/store.json" ]; then
    warn "data/store.json 不存在，创建初始数据文件..."
    mkdir -p data
    cat > data/store.json <<'JSON'
{
  "users": [],
  "agents": [],
  "config": {
    "global_api_key": "",
    "global_bot_id": ""
  }
}
JSON
    success "data/store.json 已创建"
  fi

  # 5. 构建
  build_app

  # 6. 权限
  fix_permissions

  # 7. 设置 PM2 开机自启
  info "配置 PM2 开机自启..."
  pm2 startup | tail -n 1 | bash 2>/dev/null || warn "自启配置需手动执行，请查看上方 pm2 startup 输出的命令"

  # 8. 启动服务
  start_pm2

  # 9. 验证
  sleep 2
  if curl -sf "http://127.0.0.1:${APP_PORT}" &>/dev/null; then
    success "服务已正常响应 http://127.0.0.1:${APP_PORT}"
  else
    warn "服务可能还在启动中，请稍后用 pm2 logs ${APP_NAME} 查看日志"
  fi

  print_nginx_config

  echo -e "${GREEN}===== 首次部署完成 =====${NC}"
  echo ""
  echo "  常用命令："
  echo "    pm2 logs ${APP_NAME}       # 查看实时日志"
  echo "    pm2 restart ${APP_NAME}    # 重启服务"
  echo "    pm2 status                  # 查看运行状态"
  echo "    bash deploy.sh update       # 拉取新代码并重新部署"
  echo ""
}

# ───────────────────────────────────────────────
# 更新部署
# ───────────────────────────────────────────────
do_update() {
  info "===== 开始更新部署 ====="

  check_node
  check_pm2

  cd "$APP_DIR" || error "无法进入 $APP_DIR"

  # 拉取最新代码（如果是 git 仓库）
  if [ -d ".git" ]; then
    info "拉取最新代码..."
    git pull || error "git pull 失败，请手动处理冲突后重试"
    success "代码已更新"
  else
    warn "当前目录不是 git 仓库，跳过 git pull，请手动上传最新代码"
  fi

  # 重新构建
  build_app

  # 修复权限
  fix_permissions

  # 重启服务
  start_pm2

  echo -e "${GREEN}===== 更新部署完成 =====${NC}"
}

# ───────────────────────────────────────────────
# 入口
# ───────────────────────────────────────────────
case "${1:-install}" in
  install) do_install ;;
  update)  do_update  ;;
  *)
    echo "用法: bash deploy.sh [install|update]"
    echo "  install  首次部署（默认）"
    echo "  update   更新代码并重启"
    exit 1
    ;;
esac
