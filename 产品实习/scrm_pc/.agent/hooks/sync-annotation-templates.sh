#!/bin/bash
# .claude/hooks/sync-annotation-templates.sh
# 当 Annotation 组件文件被修改时，自动同步到另一边
# template → project，或 project → template

INPUT=$(cat)

# 从 tool_input.file_path 提取路径（Claude Code PostToolUse 格式）
FILE=$(echo "$INPUT" | grep -o '"file_path":"[^"]*"' | head -1 | sed 's/"file_path":"//;s/"//')

if [ -z "$FILE" ]; then
  exit 0
fi

PROJECT_DIR="/Users/mac/Desktop/web/axuremart-ai/project-admin-app-ant_v14.0.0"
TEMPLATE_DIR="$PROJECT_DIR/.claude/skills/annotation/templates/vue"
ADMIN_DIR="$PROJECT_DIR/admin/src/components/Annotation"

# 判断文件属于哪一边，同步到另一边
BASENAME=$(basename "$FILE")

# 只处理 Annotation 组件相关文件
case "$BASENAME" in
  AnnotationDot.vue|AnnotationEditor.vue|AnnotationOverlay.vue|AnnotationPanel.vue|types.ts|useAnnotation.ts)
    ;;
  *)
    exit 0
    ;;
esac

if echo "$FILE" | grep -q "skills/annotation/templates"; then
  # template 改了 → 同步到 admin 项目
  SRC="$TEMPLATE_DIR/$BASENAME"
  DST="$ADMIN_DIR/$BASENAME"
  DIRECTION="template → admin"
elif echo "$FILE" | grep -q "admin/src/components/Annotation"; then
  # admin 项目改了 → 同步到 template
  SRC="$ADMIN_DIR/$BASENAME"
  DST="$TEMPLATE_DIR/$BASENAME"
  DIRECTION="admin → template"
else
  exit 0
fi

if [ -f "$SRC" ] && [ -f "$DST" ]; then
  cp "$SRC" "$DST"
  echo "✓ Annotation 同步 ($DIRECTION): $BASENAME"
fi

exit 0
