/**
 * Cloud Functions（v2）のエントリーポイント。
 * AIにコードを書かせるときは「firebase-functions v2（firebase-functions/v2/...）」と指定すること。
 */
import { initializeApp } from 'firebase-admin/app'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { setGlobalOptions } from 'firebase-functions/v2'
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore'
import { joinTeamInput, type JoinTeamResult } from '@hitojichi/shared'
import { processOverdueTask, processOverdueTasks } from './overdueTasks'
import { grantAchievementTitles } from './achievementTitles'

initializeApp()
setGlobalOptions({ region: 'asia-northeast1' })

/** 疎通確認用。フロントから呼べることを確認したら消してOK */
export const ping = onCall(() => ({ message: 'pong' }))

export const joinTeamByInviteCode = onCall(async (request): Promise<JoinTeamResult> => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'ログインが必要です')
  const parsed = joinTeamInput.safeParse(request.data)
  if (!parsed.success) throw new HttpsError('invalid-argument', '招待コードを入力してください')
  const uid = request.auth.uid
  const db = getFirestore()
  return db.runTransaction(async (transaction) => {
    const matches = await transaction.get(
      db.collection('teams').where('inviteCode', '==', parsed.data.inviteCode).limit(2),
    )
    const team = matches.docs[0]
    if (!team) throw new HttpsError('not-found', '招待コードに一致するチームがありません')
    // コードが衝突した場合、意図しないチームへ参加させない。
    if (matches.size !== 1)
      throw new HttpsError(
        'failed-precondition',
        '招待コードが重複しています。作成者に確認してください',
      )
    transaction.update(team.ref, { memberIds: FieldValue.arrayUnion(uid) })
    return { teamId: team.id, teamName: team.get('name') }
  })
})

export const checkOverdueTasks = onSchedule('every 1 minutes', async () => {
  await processOverdueTasks(getFirestore(), Timestamp.now())
})

// エミュレータでは onSchedule が自動で動かないため、動作確認用に同じ処理を手動で呼ぶ。本番では使えない
export const runOverdueCheck = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'ログインが必要です')
  if (process.env.FUNCTIONS_EMULATOR !== 'true')
    throw new HttpsError('permission-denied', 'エミュレータでのみ実行できます')
  await processOverdueTasks(getFirestore(), Timestamp.now())
})

// 過去の期限で作成されたタスクは、次の定期チェックを待たずに判定する。
export const checkOverdueTaskOnCreate = onDocumentCreated(
  'teams/{teamId}/tasks/{taskId}',
  async (event) => {
    if (!event.data) return
    await processOverdueTask(getFirestore(), event.data.ref, Timestamp.now())
  },
)

// タスクが完了になったら、完了数に応じた実績の称号を付与する。
export const grantAchievementTitlesOnTaskDone = onDocumentUpdated(
  'teams/{teamId}/tasks/{taskId}',
  async (event) => {
    const before = event.data?.before.data()
    const after = event.data?.after.data()
    if (!after || after.status !== 'done' || before?.status === 'done') return
    await grantAchievementTitles(getFirestore(), after.ownerId)
  },
)
