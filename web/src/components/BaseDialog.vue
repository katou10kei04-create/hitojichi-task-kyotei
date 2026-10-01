<script setup lang="ts">
import { onMounted, ref, useId, watch } from 'vue'
import { X } from 'lucide-vue-next'

// 縁取り＋ベタ影のポップアップ。v-model:open で開閉し、背景クリック・Esc・×ボタンで閉じる
defineProps<{
  title: string
  eyebrow?: string // 見出しの上に出す小さな英字ラベル（例：EQUIP TITLE）
}>()
const open = defineModel<boolean>('open', { default: false })

const dialog = ref<HTMLDialogElement | null>(null)
const headingId = useId()

function sync(value: boolean) {
  const el = dialog.value
  if (!el) return
  if (value && !el.open) el.showModal()
  if (!value && el.open) el.close()
}
watch(open, sync)
onMounted(() => sync(open.value))
</script>

<template>
  <Teleport to="body">
    <!-- Escキーで閉じたときも close イベントが来るので、そこで open を false に戻す -->
    <dialog
      ref="dialog"
      :aria-labelledby="headingId"
      class="m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-3xl border-[3px] border-ink bg-canvas p-0 text-ink shadow backdrop:bg-ink/60"
      @close="open = false"
      @click.self="open = false"
    >
      <div class="p-5 sm:p-6">
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p v-if="eyebrow" class="font-dot text-xs tracking-widest text-primary">
              {{ eyebrow }}
            </p>
            <h2 :id="headingId" class="mt-2 font-display text-xl break-all">{{ title }}</h2>
          </div>
          <button
            type="button"
            :aria-label="`${title}を閉じる`"
            class="grid size-10 shrink-0 place-items-center rounded-full border-[3px] border-ink bg-white transition hover:bg-muted/30 focus-visible:outline-2 focus-visible:outline-primary"
            @click="open = false"
          >
            <X :size="20" aria-hidden="true" />
          </button>
        </div>
        <slot />
      </div>
    </dialog>
  </Teleport>
</template>
