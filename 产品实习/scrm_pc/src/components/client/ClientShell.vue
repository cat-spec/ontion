<template>
  <div class="flex h-screen flex-col overflow-hidden bg-slate-100 text-slate-900">
    <TopStatusBar />
    <div class="flex min-h-0 flex-1">
      <PlatformRail />
      <SettingsView v-if="isSettingsActive" />
      <QuickReplyView v-else-if="isQuickReplyActive" />
      <FeatureAppsView v-else-if="isFeatureAppsActive" />
      <template v-else-if="isHomeActive">
        <WorkspaceHome />
      </template>
      <template v-else>
        <ConversationPanel />
        <ContainerWorkspace />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useClientStore } from '@/stores/client'
import ContainerWorkspace from './ContainerWorkspace.vue'
import ConversationPanel from './ConversationPanel.vue'
import FeatureAppsView from './FeatureAppsView.vue'
import PlatformRail from './PlatformRail.vue'
import QuickReplyView from './QuickReplyView.vue'
import SettingsView from './SettingsView.vue'
import TopStatusBar from './TopStatusBar.vue'
import WorkspaceHome from './WorkspaceHome.vue'

const clientStore = useClientStore()
const isHomeActive = computed(() => clientStore.activePlatformId === clientStore.homeItem.id)
const isSettingsActive = computed(() => clientStore.activeUtilityId === 'settings')
const isQuickReplyActive = computed(() => clientStore.activeUtilityId === 'quick-reply')
const isFeatureAppsActive = computed(() => clientStore.activeUtilityId === 'apps')
</script>
