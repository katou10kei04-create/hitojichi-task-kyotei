/**
 * フロントエンドとCloud Functionsで共通の型・入力検証。
 * ⚠ 叩き台です。1日目の全員ミーティングで確定させてください。
 */
import { z } from 'zod'

/** users/{uid} */
export const userSchema = z.object({
  displayName: z.string().min(1).max(30),
  photoURL: z.string().url().nullable(),
  titleIds: z.array(z.string()), // 獲得した称号（Functionsのみ書き込み可）
})
export type User = z.infer<typeof userSchema>

/** teams/{teamId} */
export const teamSchema = z.object({
  name: z.string().min(1).max(40),
  memberIds: z.array(z.string()).min(1),
  inviteCode: z.string(),
  createdBy: z.string(),
})
export type Team = z.infer<typeof teamSchema>

/** teams/{teamId}/tasks/{taskId} */
export const taskStatusSchema = z.enum(['todo', 'done', 'overdue'])
export const taskSchema = z.object({
  title: z.string().min(1).max(100),
  assigneeId: z.string().min(1),
  hostageId: z.string().min(1), // 人質になる仲間
  dueAt: z.date(),
  status: taskStatusSchema,
})
export type Task = z.infer<typeof taskSchema>

/** teams/{teamId}/disAssignments/{targetUserId}
 *  targetUserId = このDIS称号を付けられるユーザー
 */
export const disAssignmentSchema = z.object({
  assignedBy: z.string().min(1), // このDIS称号を決めた相手
  titleId: z.string().min(1), // 選ばれたDIS称号
  calledCount: z.number().int().min(0), // 呼ばれた累計回数
})
export type DisAssignment = z.infer<typeof disAssignmentSchema>

/** titles/{titleId}（称号マスタ） */
export const titleSchema = z.object({
  name: z.string(),
  description: z.string(),
  shameLevel: z.number().int().min(0).max(5), // 不名誉度
})
export type Title = z.infer<typeof titleSchema>

/** フォーム入力用 */
export const updateUserProfileInput = userSchema.pick({ displayName: true })
export const createTeamInput = teamSchema.pick({ name: true })
export const createTaskInput = taskSchema.pick({
  title: true,
  assigneeId: true,
  hostageId: true,
  dueAt: true,
})
/** DIS称号設定の作成入力 */
export const createDisAssignmentInput = disAssignmentSchema.pick({
  assignedBy: true,
  titleId: true,
})
