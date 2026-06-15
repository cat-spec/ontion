import { describe, expect, it } from 'vitest'
import {
  filterAutomationGroups,
  simulateKeywordReply,
  simulateWelcomeReply,
  type AutomationGroup,
  type WelcomeAutomationGroup,
} from '@/components/client/feature-apps-logic'

const keywordGroups: AutomationGroup[] = [
  {
    name: '售前咨询',
    desc: '价格、库存',
    items: [
      {
        id: 'price',
        enabled: true,
        keywords: ['价格', '多少钱', '报价'],
        matchRule: '半匹配',
        replyContent: '您好，请说明采购数量，我可以确认报价。',
        replyMode: '文本回复',
      },
      {
        id: 'stock',
        enabled: true,
        keywords: ['库存', '现货'],
        matchRule: '半匹配',
        replyContent: '您好，可以先发型号，我帮您确认库存。',
        replyMode: '文本回复',
      },
    ],
  },
  {
    name: '物流售后',
    desc: '物流、售后',
    items: [
      {
        id: 'after-sale',
        enabled: false,
        keywords: ['售后'],
        matchRule: '全匹配',
        replyContent: '您好，请提供订单号和问题图片。',
        replyMode: '文本 + 图片',
      },
    ],
  },
]

const welcomeGroups: WelcomeAutomationGroup[] = [
  {
    id: 'welcome-new',
    name: '新客户欢迎',
    desc: '首次进入会话时发送',
    enabled: true,
    content: '您好，欢迎咨询 NexBridge 客服。',
    delay: '延迟 3 秒',
    repeat: '仅首次会话',
    takeover: '人工接管后暂停',
    imageLabel: '暂未配置图片',
    imageUrl: '',
  },
  {
    id: 'welcome-return',
    name: '老客户回访',
    desc: '长时间未联系后再次进入',
    enabled: true,
    content: '您好，欢迎回来。',
    delay: '立即发送',
    repeat: '超过 30 天未联系后再次发送',
    takeover: '人工接管后暂停',
    imageLabel: '已配置欢迎海报',
    imageUrl: 'poster.png',
  },
]

describe('feature apps logic', () => {
  it('filters keyword groups by group name, keyword, and reply content', () => {
    expect(filterAutomationGroups(keywordGroups, '售前').map((group) => group.name)).toEqual(['售前咨询'])
    expect(filterAutomationGroups(keywordGroups, '现货')[0]?.items.map((item) => item.id)).toEqual(['stock'])
    expect(filterAutomationGroups(keywordGroups, '订单号')[0]?.items.map((item) => item.id)).toEqual(['after-sale'])
  })

  it('simulates a keyword reply hit with matched rule detail', () => {
    const result = simulateKeywordReply(keywordGroups[0].items, '请问现在多少钱一件？')

    expect(result.matched).toBe(true)
    expect(result.rule?.id).toBe('price')
    expect(result.rule?.matchedKeyword).toBe('多少钱')
    expect(result.reply).toContain('确认报价')
  })

  it('returns miss state when no keyword rule is hit', () => {
    const result = simulateKeywordReply(keywordGroups[0].items, '你好，先打个招呼')

    expect(result.matched).toBe(false)
    expect(result.reply).toBe('')
    expect(result.reason).toContain('未命中')
  })

  it('simulates welcome reply with delay and image state', () => {
    const result = simulateWelcomeReply(welcomeGroups[1])

    expect(result.matched).toBe(true)
    expect(result.reply).toBe('您好，欢迎回来。')
    expect(result.meta.delay).toBe('立即发送')
    expect(result.meta.hasImage).toBe(true)
  })
})
