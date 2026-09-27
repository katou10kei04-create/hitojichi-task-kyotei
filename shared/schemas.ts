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
  assigneeId: z.string(),
  hostageId: z.string(), // 人質になる仲間
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
export const createTeamInput = teamSchema.pick({ name: true })
export const createTaskInput = taskSchema.pick({
  title: true,
  assigneeId: true,
  hostageId: true,
  dueAt: true,
})
