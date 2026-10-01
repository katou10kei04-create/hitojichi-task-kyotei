import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useCurrentUser } from 'vuefire'
import type { Team, Title } from '@hitojichi/shared'
import { useOverdueTasks } from '@/composables/useOverdueTasks'

/** 発動中のdis称号1件分（どのチームで・どちらの称号が付いているか） */
export type ActiveDisTitle = {
  key: string
  label: 'dis称号' | 'Team dis称号'
  name: string
  description: string
  teamName: string
  release: string // 解除条件
}

/**
 * 参加チームに期限切れタスクがあれば、そのチームの人質（dis称号／team dis称号）が発動中。
 * teams・titles は画面側で取得済みのものを渡す（同じデータを二重に購読しないため）。
 */
export function useActiveDisTitles(
  teams: MaybeRefOrGetter<(Team & { id: string })[]>,
  titles: MaybeRefOrGetter<(Title & { id: string })[]>,
) {
  const currentUser = useCurrentUser()
  const { ownerIdsByTeam, pending, failed } = useOverdueTasks(() =>
    toValue(teams).map((team) => team.id),
  )

  const disTitles = computed<ActiveDisTitle[]>(() => {
    const uid = currentUser.value?.uid
    if (!uid) return []
    const findTitle = (id: string) => toValue(titles).find((title) => title.id === id)
    const toCard = (team: Team & { id: string }, kind: 'self' | 'team'): ActiveDisTitle => {
      const title = findTitle(kind === 'self' ? team.selfDisTitleId : team.teamDisTitleId)
      return {
        key: `${team.id}-${kind}`,
        label: kind === 'self' ? 'dis称号' : 'Team dis称号',
        name: title?.name ?? '称号が見つかりません',
        description: title?.description ?? '',
        teamName: team.name,
        release:
          kind === 'self' ? '自分の未達成が解消されると解除' : '相棒の未達成が解消されると解除',
      }
    }
    return toValue(teams).flatMap((team) => {
      const ownerIds = ownerIdsByTeam.value[team.id] ?? []
      const cards: ActiveDisTitle[] = []
      // 自分のタスクが期限切れ → 自分に dis称号
      if (ownerIds.includes(uid)) cards.push(toCard(team, 'self'))
      // 相棒のタスクが期限切れ → 人質の自分に team dis称号
      if (ownerIds.some((id) => id !== uid)) cards.push(toCard(team, 'team'))
      return cards
    })
  })

  return { disTitles, pending, failed }
}
