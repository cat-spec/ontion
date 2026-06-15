export interface ReplyTemplate {
  id: string
  title: string
  content: string
  imageUrl: string
}

export interface ReplyGroup {
  id: string
  name: string
  templates: ReplyTemplate[]
}

export interface QuickReplyImageSummary {
  hasImage: boolean
  label: string
  actionLabel: string
}

function includesQuery(values: Array<string | undefined>, normalizedQuery: string) {
  return values.some((value) => value?.toLowerCase().includes(normalizedQuery))
}

export function filterQuickReplyGroups(groups: ReplyGroup[], query: string) {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) {
    return groups
  }

  return groups.flatMap((group) => {
    const groupMatched = includesQuery([group.name], normalizedQuery)
    if (groupMatched) {
      return [group]
    }

    const templates = group.templates.filter((template) =>
      includesQuery([template.title, template.content], normalizedQuery),
    )

    if (templates.length === 0) {
      return []
    }

    return [{ ...group, templates }]
  })
}

export function buildQuickReplyImageSummary(template: ReplyTemplate): QuickReplyImageSummary {
  if (!template.imageUrl) {
    return {
      hasImage: false,
      label: '暂未添加图片',
      actionLabel: '上传图片',
    }
  }

  return {
    hasImage: true,
    label: '已添加图片，可在消息预览中查看发送效果',
    actionLabel: '替换图片',
  }
}
