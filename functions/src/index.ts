/**
 * Cloud Functions（v2）のエントリーポイント。
 * AIにコードを書かせるときは「firebase-functions v2（firebase-functions/v2/...）」と指定すること。
 */
import { initializeApp } from 'firebase-admin/app'
import {
	FieldValue,
	getFirestore,
	Timestamp,
} from 'firebase-admin/firestore'
import { onCall } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { setGlobalOptions } from 'firebase-functions/v2'

initializeApp()
setGlobalOptions({ region: 'asia-northeast1' })

const db = getFirestore()

/** 疎通確認用。フロントから呼べることを確認したら消してOK */
export const ping = onCall(() => ({ message: 'pong' }))

function getDisAssignmentRef(teamId: string, userId: string) {
	return db.doc(`teams/${teamId}/disAssignments/${userId}`)
}

async function getDisAssignment(teamId: string, userId: string) {
	const ref = getDisAssignmentRef(teamId, userId)
	const snap = await ref.get()

	if (!snap.exists) {
		return null
	}

	return snap.data()
}

async function processOverdueTasks() {
	const now = Timestamp.now()

	const teamsSnapshot = await db.collection('teams').get()

	for (const teamDoc of teamsSnapshot.docs) {
		const tasksSnapshot = await db
			.collection('teams')
			.doc(teamDoc.id)
			.collection('tasks')
			.where('status', '==', 'todo')
			.get()

		for (const taskDoc of tasksSnapshot.docs) {
			const task = taskDoc.data()

			if (!task.dueAt || typeof task.dueAt.toMillis !== 'function') {
				continue
			}

			if (task.dueAt.toMillis() > now.toMillis()) {
				continue
			}

			await db.runTransaction(async (transaction) => {
				const taskRef = taskDoc.ref
				const latestTaskSnapshot = await transaction.get(taskRef)

				if (!latestTaskSnapshot.exists) {
					return
				}

				const latestTask = latestTaskSnapshot.data()
				if (!latestTask) {
					return
				}

				if (latestTask.status !== 'todo') {
					return
				}

				if (
					!latestTask.dueAt ||
					typeof latestTask.dueAt.toMillis !== 'function' ||
					latestTask.dueAt.toMillis() > Timestamp.now().toMillis()
				) {
					return
				}

				const assigneeId = latestTask.assigneeId

				if (typeof assigneeId !== 'string' || assigneeId.length === 0) {
					return
				}

				const assignmentRef = getDisAssignmentRef(teamDoc.id, assigneeId)
				const assignmentSnapshot = await transaction.get(assignmentRef)

				let titleId: string | null = null
				let userRef = null
				let userExists = false

				if (assignmentSnapshot.exists) {
					const assignment = assignmentSnapshot.data()

					if (
						assignment &&
						typeof assignment.titleId === 'string' &&
						assignment.titleId.length > 0
					) {
						titleId = assignment.titleId
						userRef = db.doc(`users/${assigneeId}`)

						const userSnapshot = await transaction.get(userRef)
						userExists = userSnapshot.exists
					}
				}

				// 期限切れを確定
				transaction.update(taskRef, {
					status: 'overdue',
				})

				// DIS設定が存在するときだけ発動回数を増やす
				if (assignmentSnapshot.exists) {
					transaction.update(assignmentRef, {
						calledCount: FieldValue.increment(1),
					})
				}

				// 実際にDIS称号をユーザーへ付与
				if (userRef && userExists && titleId) {
					transaction.update(userRef, {
						titleIds: FieldValue.arrayUnion(titleId),
					})
				}
			})
		}
	}
}

export const checkOverdueTasks = onSchedule(
	{
		schedule: 'every 5 minutes',
		timeZone: 'Asia/Tokyo',
	},
	async () => {
		await processOverdueTasks()
	},
)

// TODO(メンバー2): 称号判定
// 例: onSchedule（firebase-functions/v2/scheduler）で期限切れタスクを探し、担当者と人質に称号を付与
