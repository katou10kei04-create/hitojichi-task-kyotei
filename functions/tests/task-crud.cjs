// npx firebase emulators:exec --config firebase.task-tests.json --only firestore,auth --project demo-task-crud-tests "node functions/tests/task-crud.cjs"
const assert = require('node:assert/strict')
const path = require('node:path')
const { buildSync } = require('esbuild')
const { initializeApp: initializeAdmin, deleteApp: deleteAdmin } = require('firebase-admin/app')
const { getFirestore: getAdminFirestore, Timestamp } = require('firebase-admin/firestore')
const { initializeApp, deleteApp } = require('firebase/app')
const { getAuth, connectAuthEmulator, signInAnonymously } = require('firebase/auth')
const {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
} = require('firebase/firestore')

async function main() {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Firestore Emulatorが必要です')
  assert.ok(process.env.FIREBASE_AUTH_EMULATOR_HOST, 'Auth Emulatorが必要です')
  const projectId = 'demo-task-crud-tests'
  assert.equal(process.env.GCLOUD_PROJECT, projectId, '専用のデモプロジェクトで実行してください')
  const output = path.resolve(__dirname, '../lib/overdue-test.cjs')
  buildSync({
    entryPoints: [path.resolve(__dirname, '../src/overdueTasks.ts')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: output,
    external: ['firebase-admin', 'firebase-functions'],
  })
  const { processOverdueTasks } = require(output)
  const admin = initializeAdmin({ projectId })
  const db = getAdminFirestore(admin)
  const apps = []
  async function client(name) {
    const app = initializeApp({ projectId, apiKey: 'demo-key' }, name)
    apps.push(app)
    const auth = getAuth(app)
    connectAuthEmulator(auth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, {
      disableWarnings: true,
    })
    const { user } = await signInAnonymously(auth)
    const firestore = getFirestore(app)
    const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':')
    connectFirestoreEmulator(firestore, host, Number(port))
    await db
      .doc(`users/${user.uid}`)
      .set({ displayName: name, photoURL: null, titleIds: ['existing'] })
    return { uid: user.uid, db: firestore }
  }
  try {
    const owner = await client('owner')
    const member = await client('member')
    const other = await client('other')
    const team = db.collection('teams').doc()
    await team.set({
      name: 'test',
      memberIds: [owner.uid, member.uid, other.uid],
      createdBy: owner.uid,
      inviteCode: 'test',
      selfDisTitleId: 'self-title',
      teamDisTitleId: 'team-title',
    })
    const now = Timestamp.now()
    const future = Timestamp.fromMillis(now.toMillis() + 60000)
    const task = (status = 'todo', dueAt = now) => ({
      title: 'test',
      ownerId: owner.uid,
      status,
      dueAt,
    })
    const editable = team.collection('tasks').doc('editable')
    await editable.set(task('todo', future))
    const ownerRef = doc(owner.db, editable.path)
    const memberRef = doc(member.db, editable.path)
    const denied = (promise) =>
      assert.rejects(promise, (error) => error.code === 'permission-denied')
    await updateDoc(ownerRef, { title: 'edited', dueAt: future.toDate() })
    assert.equal((await editable.get()).data().ownerId, owner.uid)
    assert.equal((await editable.get()).data().status, 'todo')
    await denied(updateDoc(memberRef, { title: 'forbidden' }))
    await denied(deleteDoc(memberRef))
    await denied(updateDoc(ownerRef, { ownerId: member.uid }))
    await denied(updateDoc(ownerRef, { status: 'overdue' }))
    await updateDoc(ownerRef, { status: 'done' })
    await denied(updateDoc(ownerRef, { status: 'todo' }))
    await updateDoc(ownerRef, { title: 'done edited' })
    await deleteDoc(ownerRef)
    assert.equal((await editable.get()).exists, false)
    await setDoc(ownerRef, { ...task('todo', future), dueAt: future.toDate() })
    console.log('PASS: 本人の作成・編集・完了・削除、他人の操作拒否、ownerId・statusの保護')

    await team.collection('tasks').doc('done').set(task('done'))
    // 100件のページ境界と dueAt == now を含めて検証。
    const batch = db.batch()
    for (let i = 0; i < 101; i++) batch.set(team.collection('tasks').doc(`expired-${i}`), task())
    await batch.commit()
    await Promise.all([processOverdueTasks(db, now), processOverdueTasks(db, now)])
    assert.equal((await team.collection('tasks').where('status', '==', 'overdue').get()).size, 101)
    assert.equal((await team.collection('tasks').doc('done').get()).data().status, 'done')
    assert.equal((await editable.get()).data().status, 'todo')
    for (const user of [owner, member, other]) {
      assert.deepEqual((await db.doc(`users/${user.uid}`).get()).data().titleIds, [
        'existing',
        user === owner ? 'self-title' : 'team-title',
      ])
    }
    await team.update({ selfDisTitleId: 'new-self', teamDisTitleId: 'new-team' })
    await processOverdueTasks(db, now)
    assert.deepEqual((await db.doc(`users/${owner.uid}`).get()).data().titleIds, [
      'existing',
      'self-title',
    ])
    await denied(updateDoc(doc(owner.db, `${team.path}/tasks/expired-0`), { status: 'done' }))
    console.log(
      'PASS: 期限境界・ページング・全員への付与・同時実行・再実行・人質変更後の再付与防止',
    )

    const race = team.collection('tasks').doc('race')
    await race.set(task())
    const [completion, processing] = await Promise.allSettled([
      updateDoc(doc(owner.db, race.path), { status: 'done' }),
      processOverdueTasks(db, now),
    ])
    assert.equal(processing.status, 'fulfilled')
    const state = (await race.get()).data().status
    const awarded = (await db.doc(`users/${owner.uid}`).get()).data().titleIds.includes('new-self')
    assert.equal(awarded, state === 'overdue')
    assert.equal(completion.status === 'fulfilled', state === 'done')
    console.log(`PASS: 完了との競合（確定状態: ${state}）`)
  } finally {
    await Promise.all(apps.map(deleteApp))
    await deleteAdmin(admin)
  }
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
