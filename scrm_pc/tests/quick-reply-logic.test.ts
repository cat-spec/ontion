import { describe, expect, it } from 'vitest'
import {
  buildQuickReplyImageSummary,
  filterQuickReplyGroups,
  type ReplyGroup,
} from '@/components/client/quick-reply-logic'

const groups: ReplyGroup[] = [
  {
    id: 'group-1',
    name: '售前说明',
    templates: [
      {
        id: 'tpl-1',
        title: '价格回复',
        content: '您好，请提供数量，我帮您确认报价。',
        imageUrl: '',
      },
      {
        id: 'tpl-2',
        title: '现货回复',
        content: '您好，可以先发型号。',
        imageUrl: 'stock.png',
      },
    ],
  },
  {
    id: 'group-2',
    name: '售后处理',
    templates: [
      {
        id: 'tpl-3',
        title: '售后登记',
        content: '请提供订单号和问题图片。',
        imageUrl: '',
      },
    ],
  },
]

describe('quick reply logic', () => {
  it('filters groups and templates by name, title, and content', () => {
    expect(filterQuickReplyGroups(groups, '售前').map((group) => group.name)).toEqual(['售前说明'])
    expect(filterQuickReplyGroups(groups, '现货')[0]?.templates.map((template) => template.id)).toEqual(['tpl-2'])
    expect(filterQuickReplyGroups(groups, '订单号')[0]?.templates.map((template) => template.id)).toEqual(['tpl-3'])
  })

  it('summarizes image preview state for uploaded and empty templates', () => {
    expect(buildQuickReplyImageSummary(groups[0].templates[0])).toEqual({
      hasImage: false,
      label: '暂未添加图片',
      actionLabel: '上传图片',
    })

    expect(buildQuickReplyImageSummary(groups[0].templates[1])).toEqual({
      hasImage: true,
      label: '已添加图片，可在消息预览中查看发送效果',
      actionLabel: '替换图片',
    })
  })
})
