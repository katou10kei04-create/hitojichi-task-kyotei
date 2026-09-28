import { collection } from 'firebase/firestore'
import { useCollection, useFirestore } from 'vuefire'
import type { Title } from '@hitojichi/shared'

/** 称号マスタ(titles)の一覧取得。書き込みはシードスクリプト／管理者のみ */
export function useTitles() {
  const db = useFirestore()
  const titles = useCollection<Title>(collection(db, 'titles'))
  return { titles }
}
