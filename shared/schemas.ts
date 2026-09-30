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
  equippedTitleId: z.string().min(1).nullable().optional(), // 装備中の称号マスタID。既存ユーザーは未設定
})
export type User = z.infer<typeof userSchema>

/** teams/{teamId} */
export const teamSchema = z.object({
  name: z.string().min(1).max(40),
  description: z.string().max(120).optional(), // 説明なしの既存チームも有効
  memberIds: z.array(z.string()).min(1),
  inviteCode: z.string(),
  createdBy: z.string(),
  // 人質：チーム作成時に作成者が選ぶ称号の組（変更も作成者のみ）
  selfDisTitleId: z.string().min(1), // サボった本人に付与するdis称号
  teamDisTitleId: z.string().min(1), // サボった人の仲間に付与するteam dis称号
})
export type Team = z.infer<typeof teamSchema>

/** teams/{teamId}/tasks/{taskId}（各メンバーが自分で追加・管理する個人タスク） */
export const taskStatusSchema = z.enum(['todo', 'done', 'overdue'])
export const taskSchema = z.object({
  title: z.string().min(1).max(100),
  ownerId: z.string().min(1), // タスクを追加した本人
  dueAt: z.date(),
  status: taskStatusSchema,
})
export type Task = z.infer<typeof taskSchema>

/** titles/{titleId}（称号マスタ） */
export const titleSchema = z.object({
  name: z.string(),
  description: z.string(),
  shameLevel: z.number().int().min(0).max(5), // 不名誉度
})
export type Title = z.infer<typeof titleSchema>

/** フォーム入力用 */
export const updateUserProfileInput = userSchema.pick({ displayName: true })
export const createTeamInput = teamSchema.pick({
  name: true,
  description: true,
  selfDisTitleId: true,
  teamDisTitleId: true,
})
export type CreateTeamInput = z.infer<typeof createTeamInput>
export const updateTeamHostageInput = teamSchema.pick({
  selfDisTitleId: true,
  teamDisTitleId: true,
})
export type UpdateTeamHostageInput = z.infer<typeof updateTeamHostageInput>
export const createTaskInput = taskSchema.pick({ title: true, dueAt: true })
export type CreateTaskInput = z.infer<typeof createTaskInput>
export const updateTaskInput = taskSchema.pick({ title: true, dueAt: true })
export type UpdateTaskInput = z.infer<typeof updateTaskInput>
export const joinTeamInput = z.object({ inviteCode: z.string().trim().min(1).max(128) })
export type JoinTeamInput = z.infer<typeof joinTeamInput>
export type JoinTeamResult = { teamId: string; teamName: string } // 参加後の画面でチーム名を表示する
