import { doc, setDoc } from 'firebase/firestore'
import { toValue, type MaybeRefOrGetter } from 'vue'
import { useFirestore } from 'vuefire'
import {
  createDisAssignmentInput,
  disAssignmentSchema,
} from '@hitojichi/shared'

/** チーム内の個人DIS称号設定を扱う */
export function useDisAssignments(teamId: MaybeRefOrGetter<string>) {
  const db = useFirestore()

  async function createDisAssignment(
    targetUserId: string,
    input: {
      assignedBy: string
      titleId: string
    },
  ) {
    const validatedInput = createDisAssignmentInput.parse(input)

    const assignment = disAssignmentSchema.parse({
      ...validatedInput,
      calledCount: 0,
    })

    await setDoc(
      doc(
        db,
        'teams',
        toValue(teamId),
        'disAssignments',
        targetUserId,
      ),
      assignment,
    )
  }

  return {
    createDisAssignment,
  }
}
