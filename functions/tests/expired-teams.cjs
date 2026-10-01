// 専用Firestore Emulatorで実行。共有seedや本番データは使わない。
const assert = require('node:assert/strict')
const path = require('node:path')
const { buildSync } = require('esbuild')
const { initializeApp, deleteApp } = require('firebase-admin/app')
const { getFirestore, Timestamp } = require('firebase-admin/firestore')

async function main() {
  const projectId = 'demo-expired-team-tests'
  assert.equal(process.env.GCLOUD_PROJECT, projectId)
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST)
  const output = path.resolve(__dirname, '../lib/expired-teams-test.cjs')
  buildSync({
    entryPoints: [path.resolve(__dirname, '../src/expiredTeams.ts')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: output,
    external: ['firebase-admin', 'firebase-functions'],
  })
  const { deleteExpiredTeams } = require(output)
  const app = initializeApp()
  const db = getFirestore(app)
  try {
    const teams = db.collection('teams')
    const writer = db.bulkWriter()
    const writes = []
    // 100件のページ境界を越えても削除できる。
    for (let i = 0; i < 101; i++) {
      writes.push(writer.set(teams.doc(`expired-${i}`), { goalDueDate: '2026-09-23' }))
    }
    for (const [id, data] of [
      ['boundary', { goalDueDate: '2026-09-24' }],
      ['recent', { goalDueDate: '2026-09-25' }],
      ['future', { goalDueDate: '2027-01-01' }],
      ['legacy', { name: '期限なし' }],
      ['invalid', { goalDueDate: '2026-02-30' }],
    ]) {
      writes.push(writer.set(teams.doc(id), data))
      writes.push(writer.set(teams.doc(id).collection('tasks').doc('task'), { status: 'todo' }))
    }
    // 500件を超えるタスクと、タスク配下のドキュメントも削除する。
    for (let i = 0; i < 501; i++) {
      writes.push(
        writer.set(teams.doc('expired-0').collection('tasks').doc(`task-${i}`), { status: 'done' }),
      )
    }
    const nested = teams
      .doc('expired-0')
      .collection('tasks')
      .doc('task-0')
      .collection('notes')
      .doc('note')
    writes.push(writer.set(nested, { text: 'nested' }))
    await writer.close()
    await Promise.all(writes)

    const before = Timestamp.fromDate(new Date('2026-09-30T14:59:59.999Z'))
    assert.deepEqual(await deleteExpiredTeams(db, before), { deletedTeamCount: 101 })
    assert.equal((await teams.doc('expired-0').get()).exists, false)
    assert.equal((await teams.doc('expired-0').collection('tasks').get()).empty, true)
    assert.equal((await nested.get()).exists, false)
    assert.equal((await teams.doc('boundary').get()).exists, true)

    const atBoundary = Timestamp.fromDate(new Date('2026-09-30T15:00:00.000Z'))
    assert.deepEqual(await deleteExpiredTeams(db, atBoundary), { deletedTeamCount: 1 })
    assert.equal((await teams.doc('boundary').get()).exists, false)
    assert.equal((await teams.doc('boundary').collection('tasks').get()).empty, true)
    for (const id of ['recent', 'future', 'legacy', 'invalid']) {
      assert.equal((await teams.doc(id).get()).exists, true)
      assert.equal((await teams.doc(id).collection('tasks').doc('task').get()).exists, true)
    }
    assert.deepEqual(await deleteExpiredTeams(db, atBoundary), { deletedTeamCount: 0 })

    const { runExpiredTeamCleanup } = require('../lib/index.js')
    await assert.rejects(runExpiredTeamCleanup.run({ data: {} }), { code: 'unauthenticated' })
    const request = { auth: { uid: 'test-user' }, data: {} }
    const original = process.env.FUNCTIONS_EMULATOR
    try {
      delete process.env.FUNCTIONS_EMULATOR
      await assert.rejects(runExpiredTeamCleanup.run(request), { code: 'permission-denied' })
      process.env.FUNCTIONS_EMULATOR = 'true'
      await teams.doc('manual').set({ goalDueDate: '2000-01-01' })
      assert.ok((await runExpiredTeamCleanup.run(request)).deletedTeamCount >= 1)
      assert.equal((await teams.doc('manual').get()).exists, false)
    } finally {
      if (original === undefined) delete process.env.FUNCTIONS_EMULATOR
      else process.env.FUNCTIONS_EMULATOR = original
    }
    console.log(
      'PASS: JSTの7日境界、ページング、501タスク・子孫の削除、対象外の保持、再実行、onCallの制限',
    )
  } finally {
    await Promise.all(require('firebase-admin/app').getApps().map(deleteApp))
  }
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
