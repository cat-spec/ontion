export interface KeywordRule {
  id: string
  enabled: boolean
  keywords: string[]
  matchRule: string
  replyContent: string
  replyMode: string
}

export interface AutomationGroup {
  name: string
  desc: string
  items: KeywordRule[]
}

export interface WelcomeAutomationGroup {
  id: string
  name: string
  desc: string
  enabled: boolean
  content: string
  delay: string
  repeat: string
  takeover: string
  imageLabel: string
  imageUrl: string
}

export interface KeywordSimulationResult {
  matched: boolean
  reply: string
  reason: string
  rule?: KeywordRule & { matchedKeyword: string }
}

export interface WelcomeSimulationResult {
  matched: true
  reply: string
  meta: {
    delay: string
    repeat: string
    takeover: string
    hasImage: boolean
  }
}

function includesQuery(values: Array<string | undefined>, normalizedQuery: string) {
  return values.some((value) => value?.toLowerCase().includes(normalizedQuery))
}

export function filterAutomationGroups(groups: AutomationGroup[], query: string) {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) {
    return groups
  }

  return groups.flatMap((group) => {
    const groupMatched = includesQuery([group.name, group.desc], normalizedQuery)
    if (groupMatched) {
      return [group]
    }

    const matchedItems = group.items.filter((item) =>
      includesQuery(
        [item.replyContent, item.replyMode, item.matchRule, ...item.keywords],
        normalizedQuery,
      ),
    )

    if (matchedItems.length === 0) {
      return []
    }

    return [{ ...group, items: matchedItems }]
  })
}

export function filterWelcomeGroups(groups: WelcomeAutomationGroup[], query: string) {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) {
    return groups
  }

  return groups.filter((group) =>
    includesQuery(
      [group.name, group.desc, group.content, group.delay, group.repeat, group.takeover, group.imageLabel],
      normalizedQuery,
    ),
  )
}

export function simulateKeywordReply(items: KeywordRule[], message: string): KeywordSimulationResult {
  const normalizedMessage = message.trim().toLowerCase()
  if (!normalizedMessage) {
    return {
      matched: false,
      reply: '',
      reason: '请输入一条客户消息后再开始测试。',
    }
  }

  for (const item of items) {
    if (!item.enabled) {
      continue
    }

    for (const keyword of item.keywords) {
      const normalizedKeyword = keyword.trim().toLowerCase()
      const matched = item.matchRule === '全匹配'
        ? normalizedMessage === normalizedKeyword
        : normalizedMessage.includes(normalizedKeyword)

      if (matched) {
        return {
          matched: true,
          reply: item.replyContent,
          reason: `命中规则「${item.id}」`,
          rule: {
            ...item,
            matchedKeyword: keyword,
          },
        }
      }
    }
  }

  return {
    matched: false,
    reply: '',
    reason: '未命中任何启用中的关键词规则。',
  }
}

export function simulateWelcomeReply(group: WelcomeAutomationGroup): WelcomeSimulationResult {
  return {
    matched: true,
    reply: group.content,
    meta: {
      delay: group.delay,
      repeat: group.repeat,
      takeover: group.takeover,
      hasImage: Boolean(group.imageUrl),
    },
  }
}
