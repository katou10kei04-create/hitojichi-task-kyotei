import { Timestamp, type Firestore } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions'
import { teamSchema } from '@hitojichi/shared'

const DAY_MS = 24 * 60 * 60 * 1000
const JST_OFFSET_MS = 9 * 60 * 60 * 1000

/** 日付だけの期限を日本時間で比較する。期限なしの既存チームは残す。 */
export async function deleteExpiredTeams(db: Firestore, now: Timestamp) {
  const cutoff = new Date(now.toMillis() + JST_OFFSET_MS - 7 * DAY_MS).toISOString().slice(0, 10)
  const query = db
    .collection('teams')
    .where('goalDueDate', '<=', cutoff)
    .orderBy('goalDueDate')
    .limit(100)
  let page = await query.get()
  let deletedTeamCount = 0
  let failed = false
  while (!page.empty) {
    for (const candidate of page.docs) {
      try {
        // 取得後に期限が延長されていた場合は削除しない。
        const current = await candidate.ref.get()
        if (!current.exists) continue
        const dueDate = teamSchema.shape.goalDueDate.safeParse(current.get('goalDueDate'))
        if (!dueDate.success || !dueDate.data || dueDate.data > cutoff) continue
        // 親だけのdeleteではタスクが残るため、配下のドキュメントも削除する。
        // タスク削除に失敗しても親を残し、次回の定期処理で再試行できるようにする。
        await db.recursiveDelete(candidate.ref.collection('tasks'))
        await candidate.ref.delete()
        deletedTeamCount += 1
      } catch (error) {
        failed = true
        logger.error('期限から7日経過したチームの削除に失敗しました', {
          teamId: candidate.id,
          error,
        })
      }
    }
    page = await query.startAfter(page.docs[page.docs.length - 1]!).get()
  }
  if (failed) throw new Error('一部の期限切れチームを削除できませんでした')
  return { deletedTeamCount }
}
