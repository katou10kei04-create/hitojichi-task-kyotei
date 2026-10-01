import { FieldValue, type Firestore } from 'firebase-admin/firestore'
import { titleSchema } from '@hitojichi/shared'

/**
 * 本人の完了タスク数を数え、必要件数に届いた実績の称号を付与する。
 * 一度獲得した実績は、タスクを未完了に戻しても外さない。
 */
export async function grantAchievementTitles(db: Firestore, uid: string) {
  const [doneCount, titles] = await Promise.all([
    db
      .collectionGroup('tasks')
      .where('ownerId', '==', uid)
      .where('status', '==', 'done')
      .count()
      .get(),
    db.collection('titles').where('kind', '==', 'achievement').get(),
  ])
  const count = doneCount.data().count
  const reachedIds = titles.docs
    .filter((entry) => {
      const required = titleSchema.parse(entry.data()).requiredDoneCount
      return required !== undefined && count >= required
    })
    .map((entry) => entry.id)
  if (reachedIds.length === 0) return
  // arrayUnionなので、再実行・同時実行でも同じ称号は重複しない。
  await db.doc(`users/${uid}`).update({ titleIds: FieldValue.arrayUnion(...reachedIds) })
}
