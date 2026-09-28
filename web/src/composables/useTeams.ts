import { addDoc, collection, query, where } from 'firebase/firestore'
import { computed } from 'vue'
import { useCollection, useCurrentUser, useFirestore } from 'vuefire'
import { teamSchema, type Team } from '@hitojichi/shared'

// 紛らわしい文字(0,O,1,I)を除いた招待コード用の文字セット
const INVITE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateInviteCode(length = 6) {
  return Array.from(
    { length },
    () => INVITE_CODE_CHARS[Math.floor(Math.random() * INVITE_CODE_CHARS.length)],
  ).join('')
}

/** 自分が所属するチームの一覧取得と、新規チーム作成をまとめたcomposable */
export function useTeams() {
  const db = useFirestore()
  const currentUser = useCurrentUser()

  const teamsQuery = computed(() => {
    const uid = currentUser.value?.uid
    if (!uid) return null
    return query(collection(db, 'teams'), where('memberIds', 'array-contains', uid))
  })
  const teams = useCollection<Team>(teamsQuery)

  async function createTeam(name: string) {
    const uid = currentUser.value?.uid
    if (!uid) throw new Error('ログインが必要です')

    const team = teamSchema.parse({
      name,
      memberIds: [uid],
      inviteCode: generateInviteCode(),
      createdBy: uid,
    })
    const ref = await addDoc(collection(db, 'teams'), team)
    return ref.id
  }

  return { teams, createTeam }
}
