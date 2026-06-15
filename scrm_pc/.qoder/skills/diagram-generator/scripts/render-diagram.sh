#!/bin/bash
# render-diagram.sh - 渲染图表（带进度条，跨平台兼容）
# 用法: ./render-diagram.sh <源文件> <输出文件>

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "用法: $0 <源文件> <输出文件>"
  echo "示例: $0 images/src/diagram.puml images/diagram.png"
  exit 1
fi

SOURCE_FILE=$1
OUTPUT_FILE=$2

# 检查源文件是否存在
if [ ! -f "$SOURCE_FILE" ]; then
  echo "❌ 错误: 文件不存在: $SOURCE_FILE"
  exit 1
fi

# 读取配置文件获取 API 地址（纯 grep + sed，无需 Python）
CONFIG_FILE=".claude/skills/config.json"
if [ -f "$CONFIG_FILE" ]; then
  API_URL=$(grep -o '"apiBaseUrl"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG_FILE" | sed 's/.*"apiBaseUrl"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
fi
if [ -z "$API_URL" ]; then
  echo "❌ 错误: 无法从 $CONFIG_FILE 读取 apiBaseUrl"
  exit 1
fi

# 根据文件扩展名判断图表类型
EXT="${SOURCE_FILE##*.}"
case "$EXT" in
  puml|plantuml)
    DIAGRAM_TYPE="plantuml"
    ;;
  d2)
    DIAGRAM_TYPE="d2"
    ;;
  mmd|mermaid)
    DIAGRAM_TYPE="mermaid"
    ;;
  dot|gv)
    DIAGRAM_TYPE="graphviz"
    ;;
  diag)
    DIAGRAM_TYPE="blockdiag"
    ;;
  *)
    echo "❌ 错误: 不支持的文件类型: $EXT"
    exit 1
    ;;
esac

# 获取文件名
FILENAME=$(basename "$OUTPUT_FILE")

# 指定固定路径避免 Windows Git Bash 下 mktemp 路径异常
TEMP_PAYLOAD="/tmp/diagram-payload-$$.json"

# 用 awk 转义 JSON 特殊字符（直接 cat 管道，避免 printf 在 Windows 下换行符不一致）
# \r 直接删除（Windows CRLF 文件兼容），不转义为字面量
ESCAPED_CONTENT=$(cat "$SOURCE_FILE" | awk '{
  gsub(/\r/, "")
  gsub(/\\/, "\\\\")
  gsub(/"/, "\\\"")
  gsub(/\t/, "\\t")
  if (NR > 1) printf "\\n"
  printf "%s", $0
}')

printf '{"type":"%s","content":"%s","format":"png","filename":"%s"}' \
  "$DIAGRAM_TYPE" "$ESCAPED_CONTENT" "$FILENAME" > "$TEMP_PAYLOAD"

# 渲染图表（带进度条）
echo "🎨 正在渲染图表: $FILENAME"
curl -X POST "${API_URL}/api/diagram/render" \
  -H "Content-Type: application/json" \
  -d @"$TEMP_PAYLOAD" \
  --output "$OUTPUT_FILE" \
  --progress-bar

# 检查结果
if [ -f "$OUTPUT_FILE" ] && [ -s "$OUTPUT_FILE" ]; then
  if command -v du &> /dev/null; then
    FILE_SIZE=$(du -h "$OUTPUT_FILE" 2>/dev/null | cut -f1)
  else
    FILE_SIZE=$(ls -lh "$OUTPUT_FILE" 2>/dev/null | awk '{print $5}')
  fi
  echo "✅ 渲染成功: $OUTPUT_FILE ($FILE_SIZE)"
else
  echo "❌ 渲染失败"
  rm -f "$TEMP_PAYLOAD"
  exit 1
fi

# 清理临时文件
rm -f "$TEMP_PAYLOAD"
