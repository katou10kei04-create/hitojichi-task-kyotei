import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore'
import { taskSchema, teamSchema } from '@hitojichi/shared'
import { logger } from 'firebase-functions'

/**
 * 状態変更と称号付与を同時に確定し、再実行・同時実行でも一度だけ処理する。
 * TODO(key): サボりを重ねたら、より不名誉な称号に格上げする（格上げの決め方・回数・前の称号を残すかを決める）
 */
export async function processOverdueTasks(db: Firestore, now: Timestamp) {
  const query = db
    .collectionGroup('tasks')
    .where('status', '==', 'todo')
    .where('dueAt', '<=', now)
    .orderBy('dueAt')
    .limit(100)
  let page = await query.get()
  let failed = false
  while (!page.empty) {
    for (const candidate of page.docs) {
      const teamRef = candidate.ref.parent.parent
      if (!teamRef || teamRef.parent.path !== 'teams') continue
      try {
        await db.runTransaction(async (transaction) => {
          const snapshot = await transaction.get(candidate.ref)
          const data = snapshot.data()
          // 完了・削除・期限延長が先に確定した場合は付与しない。
          if (!data || data.status !== 'todo') return
          const task = taskSchema.parse({
            ...data,
            dueAt: data.dueAt instanceof Timestamp ? data.dueAt.toDate() : data.dueAt,
          })
          if (task.dueAt.getTime() > now.toMillis()) return
          const team = teamSchema.parse((await transaction.get(teamRef)).data())
          transaction.update(db.doc(`users/${task.ownerId}`), {
            titleIds: FieldValue.arrayUnion(team.selfDisTitleId),
          })
          for (const uid of new Set(team.memberIds)) {
            if (uid === task.ownerId) continue
            transaction.update(db.doc(`users/${uid}`), {
              titleIds: FieldValue.arrayUnion(team.teamDisTitleId),
            })
          }
          transaction.update(candidate.ref, { status: 'overdue' })
        })
      } catch (error) {
        // 不整合のある1件で他のタスクの判定を止めない。失敗分は次回再判定。
        failed = true
        logger.error('期限切れタスクの称号付与に失敗しました', {
          taskPath: candidate.ref.path,
          error,
        })
      }
    }
    page = await query.startAfter(page.docs[page.docs.length - 1]!).get()
  }
  if (failed) throw new Error('一部の期限切れタスクを処理できませんでした')
}
