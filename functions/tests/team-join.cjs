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
      goal: 'チームでデモを完成させる',
      goalDueDate: '2026-10-01',
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

    // 5人目は参加でき、6人目はFunctionsで拒否される。満員でも参加済みの人は再入力できる。
    const c = await client('C')
    const d = await client('D')
    const e = await client('E')
    const f = await client('F')
    for (const member of [c, d, e]) {
      const response = await join(member.user, { inviteCode: 'JOINQA' })
      assert.equal(response.result.teamId, teamRef.id)
    }
    const fullTeam = (await getDoc(teamRef)).data()
    assert.deepEqual(
      fullTeam.memberIds,
      [a, b, c, d, e].map((member) => member.user.uid),
    )
    const sixth = await join(f.user, { inviteCode: 'JOINQA' })
    assert.equal(sixth.error.status, 'FAILED_PRECONDITION')
    assert.match(sixth.error.message, /定員（5人）/)
    await denied(getDoc(doc(f.db, teamRef.path)))
    assert.equal((await join(b.user, { inviteCode: 'JOINQA' })).result.teamId, teamRef.id)
    assert.deepEqual((await getDoc(teamRef)).data(), fullTeam)

    // 残り1枠に2人が同時参加しても、既存メンバーを保ったまま5人に収まる。
    const raceRef = doc(collection(a.db, 'teams'))
    await setDoc(raceRef, { ...team, inviteCode: 'RACEQA' })
    for (const member of [b, c, d]) {
      assert.equal((await join(member.user, { inviteCode: 'RACEQA' })).result.teamId, raceRef.id)
    }
    const concurrent = await Promise.all([
      join(e.user, { inviteCode: 'RACEQA' }),
      join(f.user, { inviteCode: 'RACEQA' }),
    ])
    assert.equal(concurrent.filter((response) => response.result?.teamId === raceRef.id).length, 1)
    assert.equal(
      concurrent.filter((response) => response.error?.status === 'FAILED_PRECONDITION').length,
      1,
    )
    const racedMembers = (await getDoc(raceRef)).data().memberIds
    assert.equal(racedMembers.length, 5)
    assert.equal(new Set(racedMembers).size, 5)
    for (const member of [a, b, c, d]) assert.ok(racedMembers.includes(member.user.uid))
    const winner = concurrent[0].result ? e : f
    assert.ok(racedMembers.includes(winner.user.uid))
    console.log('PASS: 5人目の参加、6人目の拒否、満員での再入力、残り1枠への同時参加')

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
