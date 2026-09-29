/**
 * Cloud Functions（v2）のエントリーポイント。
 * AIにコードを書かせるときは「firebase-functions v2（firebase-functions/v2/...）」と指定すること。
 */
import { initializeApp } from 'firebase-admin/app'
import { onCall } from 'firebase-functions/v2/https'
import { setGlobalOptions } from 'firebase-functions/v2'

initializeApp()
setGlobalOptions({ region: 'asia-northeast1' })

/** 疎通確認用。フロントから呼べることを確認したら消してOK */
export const ping = onCall(() => ({ message: 'pong' }))

// TODO(メンバー2): 称号判定
// 例: onSchedule（firebase-functions/v2/scheduler）で期限切れタスクを探し、本人に dis称号・チームの他メンバーに team dis称号を付与
