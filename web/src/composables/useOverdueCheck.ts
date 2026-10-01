import { httpsCallable } from 'firebase/functions'
import { ref } from 'vue'
import { functions } from '@/lib/firebase'

/**
 * 期限切れ判定（本番では毎分の定期実行）をエミュレータで手動実行する。開発・デモ用。
 * isAvailable が false（本番）のときはボタンを出さない。
 */
export function useOverdueCheck() {
  const isAvailable = import.meta.env.VITE_USE_EMULATOR === 'true'
  const isRunning = ref(false)
  const error = ref('')

  async function runOverdueCheck() {
    if (!isAvailable || isRunning.value) return
    error.value = ''
    isRunning.value = true
    try {
      await httpsCallable(functions, 'runOverdueCheck')()
    } catch (e) {
      console.error(e)
      error.value =
        '期限切れの判定に失敗しました。Functions のエミュレータが起動しているか確認してください。'
    } finally {
      isRunning.value = false
    }
  }

  return { isAvailable, isRunning, error, runOverdueCheck }
}
