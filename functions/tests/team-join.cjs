// build後、Auth / Firestore / Functions Emulator上で実行する。
const assert = require('node:assert/strict')
const { initializeApp, deleteApp } = require('firebase/app')
const { getAuth, connectAuthEmulator, signInAnonymously } = require('firebase/auth')
const {
  getFirestore,
  connectFirestoreEmulator,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  arrayUnion,
} = require('firebase/firestore')

async function main() {
  const projectId = 'demo-task-crud-tests'
  assert.equal(process.env.GCLOUD_PROJECT, projectId)
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST)
  assert.ok(process.env.FIREBASE_AUTH_EMULATOR_HOST)
  const apps = []
  async function client(name) {
    const app = initializeApp({ projectId, apiKey: 'demo-key' }, name)
    apps.push(app)
    const auth = getAuth(app)
    connectAuthEmulator(auth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, {
      disableWarnings: true,
    })
    const { user } = await signInAnonymously(auth)
    const db = getFirestore(app)
    const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':')
    connectFirestoreEmulator(db, host, Number(port))
    await setDoc(doc(db, 'users', user.uid), { displayName: name, photoURL: null, titleIds: [] })
    return { db, user }
  }
  async function join(user, data) {
    const response = await fetch(
      `http://127.0.0.1:15001/${projectId}/asia-northeast1/joinTeamByInviteCode`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user ? { Authorization: `Bearer ${await user.getIdToken()}` } : {}),
        },
        body: JSON.stringify({ data }),
      },
    )
    return response.json()
  }
  const denied = (promise) => assert.rejects(promise, (error) => error.code === 'permission-denied')
  try {
    const a = await client('A')
    const b = await client('B')
    const teamRef = doc(collection(a.db, 'teams'))
    const team = {
      name: '招待検証',
      memberIds: [a.user.uid],
      inviteCode: 'JOINQA',
      createdBy: a.user.uid,
      selfDisTitleId: 'self',
      teamDisTitleId: 'team',
    }
    await setDoc(teamRef, team)
    const bRef = doc(b.db, teamRef.path)
    await denied(getDoc(bRef))
    await denied(updateDoc(bRef, { memberIds: arrayUnion(b.user.uid) }))
    await denied(updateDoc(teamRef, { memberIds: arrayUnion(b.user.uid) }))
    await denied(
      setDoc(doc(collection(a.db, 'teams')), { ...team, memberIds: [a.user.uid, b.user.uid] }),
    )
    assert.equal((await join(null, { inviteCode: 'JOINQA' })).error.status, 'UNAUTHENTICATED')
    assert.equal((await join(b.user, { inviteCode: '' })).error.status, 'INVALID_ARGUMENT')
    assert.equal((await join(b.user, { inviteCode: 'INVALID' })).error.status, 'NOT_FOUND')
    assert.equal((await join(b.user, { inviteCode: 'JOINQA' })).result.teamId, teamRef.id)
    const repeats = await Promise.all([
      join(b.user, { inviteCode: 'JOINQA' }),
      join(b.user, { inviteCode: 'JOINQA' }),
    ])
    repeats.forEach((result) => assert.equal(result.result.teamId, teamRef.id))
    const joined = (await getDoc(bRef)).data()
    assert.deepEqual(joined, { ...team, memberIds: [a.user.uid, b.user.uid] })
    const list = await getDocs(
      query(collection(b.db, 'teams'), where('memberIds', 'array-contains', b.user.uid)),
    )
    assert.ok(list.docs.some((entry) => entry.id === teamRef.id))
    const members = await Promise.all(
      joined.memberIds.map(
        async (uid) => (await getDoc(doc(b.db, 'users', uid))).data().displayName,
      ),
    )
    assert.deepEqual(members, ['A', 'B'])
    await denied(updateDoc(bRef, { memberIds: [b.user.uid] }))
    await denied(updateDoc(bRef, { selfDisTitleId: 'changed' }))
    await updateDoc(teamRef, { selfDisTitleId: 'creator-change' })
    await setDoc(doc(collection(a.db, 'teams')), team)
    assert.equal((await join(b.user, { inviteCode: 'JOINQA' })).error.status, 'FAILED_PRECONDITION')
    console.log(
      'PASS: A作成・B参加・一覧取得・A/B表示名取得・再参加/同時参加・無効コード・未認証・直接改変拒否・人質設定保護・コード衝突',
    )
  } finally {
    await Promise.all(apps.map(deleteApp))
  }
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
