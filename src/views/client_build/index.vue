<template>
  <div>
    <el-card class="list-query" shadow="hover">
      <el-form inline>
        <el-form-item>
          <el-button type="primary" @click="showCreate = true">{{ T('Create') }}</el-button>
        </el-form-item>
        <el-form-item>
          <el-button type="danger" @click="toBatchDelete">{{ T('BatchDelete') }}</el-button>
        </el-form-item>
        <el-form-item>
          <el-button @click="getList">{{ T('Refresh') }}</el-button>
        </el-form-item>
        <el-form-item>
          <el-button @click="openSettings">{{ T('Settings') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="list-body" shadow="hover">
      <el-table class="client-build-table"
                :data="listRes.list"
                v-loading="listRes.loading"
                border
                @selection-change="handleSelectionChange"
                @row-click="onRowClick">
        <el-table-column type="selection" align="center" width="50"/>
        <el-table-column prop="id" label="ID" align="center" width="64"/>
        <el-table-column prop="name" label="Name" align="left" min-width="160" show-overflow-tooltip/>
        <el-table-column prop="target" label="Target" align="center" width="160" show-overflow-tooltip/>
        <el-table-column prop="version" label="Version" align="center" width="80"/>
        <el-table-column label="Auto Update" align="center" width="120">
          <template #default="{row}">
            <el-tooltip :disabled="row.status === 'done'" content="Only completed builds can be offered as updates" placement="top">
              <span class="auto-update-cell" @click.stop>
                <el-switch :model-value="!row.exclude_from_update"
                           :disabled="row.status !== 'done'"
                           :loading="autoUpdateLoadingId === row.id"
                           @change="(val) => toggleAutoUpdate(row, val)"/>
                <span class="auto-update-label">{{ row.exclude_from_update ? 'No' : 'Yes' }}</span>
              </span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="builder" label="Builder" align="center" width="110"/>
        <el-table-column prop="status" label="Status" align="center" width="100">
          <template #default="{row}">
            <el-tag :type="statusType(row.status)">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Files" align="left" min-width="400" class-name="files-cell">
          <template #default="{row}">
            <div v-if="row.files && row.files.length" class="file-list">
              <el-button v-for="f in row.files"
                         :key="f"
                         link
                         type="primary"
                         class="file-link"
                         @click.stop="download(row, f)">{{ f }}</el-button>
            </div>
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>
        <el-table-column :label="T('Actions')" align="center" width="170" fixed="right">
          <template #default="{row}">
            <el-button type="primary" size="small" @click.stop="refreshRow(row)">{{ T('Refresh') }}</el-button>
            <el-button type="danger" size="small" @click.stop="del(row)">{{ T('Delete') }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card class="list-page" shadow="hover">
      <el-pagination background
                     layout="prev, pager, next, sizes, jumper"
                     :page-sizes="[10,20,50,100]"
                     v-model:page-size="listQuery.page_size"
                     v-model:current-page="listQuery.page"
                     :total="listRes.total">
      </el-pagination>
    </el-card>

    <el-dialog v-model="showCreate" :title="T('Create')" width="520px">
      <el-form :model="createForm" label-width="100px">
        <el-form-item label="Builder">
          <el-select v-model="createForm.builder" style="width: 100%">
            <el-option v-for="b in builderOptions" :key="b.value" :label="b.label" :value="b.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="Targets">
          <el-tag v-for="t in createForm.targets" :key="t.value" :closable="true" @close="handleTargetClose(t)" style="margin-right: 10px">{{ t.label }}</el-tag>
          <el-select v-model="tempTarget" placeholder="Select targets" style="width: 100%" :clearable="false" @change="handleTargetSelect">
            <el-option v-for="t in targetOptions" :key="t.value" :label="t.label" :value="t.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="Version">
          <el-select v-model="createForm.version" :loading="versionsLoading" placeholder="Select version" style="width: 100%">
            <el-option v-for="v in versionOptions" :key="v" :label="v" :value="v" />
          </el-select>
        </el-form-item>
        <el-form-item label="Auto Update">
          <el-checkbox v-model="createForm.exclude_from_update">Exclude from automatic updates</el-checkbox>
          <div style="color: var(--el-text-color-secondary); font-size: 12px; line-height: 1.4;">
            Excluded builds are not offered to clients checking for updates.
          </div>
        </el-form-item>
        <el-form-item label="Name">
          <el-input v-model="createForm.name"/>
        </el-form-item>
        <el-form-item label="JSON File">
          <input type="file" accept=".json,application/json" @change="onFileChange"/>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreate=false">{{ T('Cancel') }}</el-button>
        <el-button type="primary" @click="submitCreate" :loading="creating">{{ T('Confirm') }}</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showDetails" title="Build Details" width="760px">
      <el-descriptions v-if="detailRow" :column="2" border>
        <el-descriptions-item label="ID">{{ detailRow.id }}</el-descriptions-item>
        <el-descriptions-item label="Status">
          <el-tag :type="statusType(detailRow.status)">{{ detailRow.status }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="Name" :span="2">{{ detailRow.name }}</el-descriptions-item>
        <el-descriptions-item label="Target">{{ detailRow.target }}</el-descriptions-item>
        <el-descriptions-item label="Version">{{ detailRow.version }}</el-descriptions-item>
        <el-descriptions-item label="Builder">{{ detailRow.builder }}</el-descriptions-item>
        <el-descriptions-item label="Auto Update">
          <span class="auto-update-cell">
            <el-switch :model-value="!detailRow.exclude_from_update"
                       :disabled="detailRow.status !== 'done'"
                       :loading="autoUpdateLoadingId === detailRow.id"
                       @change="(val) => toggleAutoUpdate(detailRow, val)"/>
            <span class="auto-update-label">{{ detailRow.exclude_from_update ? 'No' : 'Yes' }}</span>
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="Job ID" :span="2">
          <span class="mono">{{ detailRow.job_id || '—' }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="JSON File">{{ detailRow.json_file || '—' }}</el-descriptions-item>
        <el-descriptions-item label="User ID">{{ detailRow.user_id }}</el-descriptions-item>
        <el-descriptions-item label="Created At">{{ detailRow.created_at }}</el-descriptions-item>
        <el-descriptions-item label="Updated At">{{ detailRow.updated_at }}</el-descriptions-item>
        <el-descriptions-item label="Build Logs" :span="2">
          <a v-if="detailRow.log_url" :href="detailRow.log_url" target="_blank" rel="noopener" class="detail-link">{{ detailRow.log_url }}</a>
          <span v-else class="muted">—</span>
        </el-descriptions-item>
        <el-descriptions-item label="Status Endpoint" :span="2">
          <span class="mono">{{ detailRow.status_url || '—' }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="Files" :span="2">
          <div v-if="detailRow.files && detailRow.files.length" class="file-list">
            <el-button v-for="f in detailRow.files"
                       :key="f"
                       link
                       type="primary"
                       class="file-link"
                       @click="download(detailRow, f)">{{ f }}</el-button>
          </div>
          <span v-else class="muted">—</span>
        </el-descriptions-item>
        <el-descriptions-item v-if="detailRow.error" label="Error" :span="2">
          <span class="error-text">{{ detailRow.error }}</span>
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="showDetails=false">{{ T('Cancel') }}</el-button>
        <el-button type="primary" @click="refreshDetail" :loading="detailRefreshing">{{ T('Refresh') }}</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showSettings" title="Client Builder Settings" width="520px">
      <el-form :model="settingsForm" label-width="140px">
        <el-form-item label="API Base">
          <el-input v-model="settingsForm.api_base" placeholder="https://..." />
        </el-form-item>
        <el-form-item label="API Token">
          <el-input v-model="settingsForm.api_token" />
        </el-form-item>
        <el-form-item label="rdgen API Base">
          <el-input v-model="settingsForm.rdgen_api_base" />
        </el-form-item>
        <el-form-item label="rdgen API Token">
          <el-input v-model="settingsForm.rdgen_api_token" />
        </el-form-item>
        <el-form-item label="Update Public Key">
          <el-input v-model="settingsForm.update_public_key" readonly />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showSettings=false">{{ T('Cancel') }}</el-button>
        <el-button type="primary" @click="saveSettings" :loading="savingSettings">{{ T('Confirm') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
  import { onActivated, onMounted, onBeforeUnmount, onDeactivated, ref, reactive, watch } from 'vue'
  import { T } from '@/utils/i18n'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { list, create, update as updateBuild, refreshStatus, remove, batchDelete, downloadFile, targetOptions as fetchTargetOptions, versions as fetchVersions } from '@/api/client_build'
  import { clientBuilder, clientBuilderSave } from '@/api/config'

  const listRes = reactive({ list: [], total: 0, loading: false })
  const listQuery = reactive({ page: 1, page_size: 10 })
  const multipleSelection = ref([])
  const showCreate = ref(false)
  const creating = ref(false)
  const showDetails = ref(false)
  const detailRow = ref(null)
  const detailRefreshing = ref(false)
  const autoUpdateLoadingId = ref(0)
  const createForm = reactive({ builder: 'dvforge', targets: [], version: '', name: '', exclude_from_update: false })
  const versionOptions = ref([])
  const versionsLoading = ref(false)
  const tempTarget = ref('')
  const builderOptions = [
    { value: 'dvforge', label: 'DVForge' },
    { value: 'rdgen', label: 'rdgen' },
  ]
  const targetOptions = ref([])
  let selectedFile = null

  const getList = async () => {
    listRes.loading = true
    const res = await list(listQuery).catch(() => false)
    listRes.loading = false
    if (res) {
      listRes.list = res.data.list || []
      listRes.total = res.data.total || 0
      if (detailRow.value) {
        detailRow.value = listRes.list.find(r => r.id === detailRow.value.id) || detailRow.value
      }
    }
  }

  const handleSelectionChange = (val) => { multipleSelection.value = val }

  const onRowClick = (row, column) => {
    if (column && column.type === 'selection') return
    detailRow.value = row
    showDetails.value = true
  }

  const toggleAutoUpdate = async (row, enabled) => {
    const exclude = !enabled
    const message = exclude
      ? 'Exclude this build from automatic updates? Clients checking for updates will fall back to the previous eligible build.'
      : 'Include this build in automatic updates? It only becomes the latest update if there is no newer included build for its target.'
    const cf = await ElMessageBox.confirm(message, 'Auto Update', {
      confirmButtonText: T('Confirm'), cancelButtonText: T('Cancel'), type: 'warning',
    }).catch(() => false)
    if (!cf) return
    autoUpdateLoadingId.value = row.id
    const res = await updateBuild({ id: row.id, exclude_from_update: exclude }).catch(() => false)
    autoUpdateLoadingId.value = 0
    if (res) {
      row.exclude_from_update = res.data.exclude_from_update
      ElMessage.success(T('OperationSuccess'))
    }
  }

  const statusType = (s) => {
    if (s === 'done') return 'success'
    if (s === 'error') return 'danger'
    if (s === 'running') return 'warning'
    return 'info'
  }

  const del = async (row) => {
    const cf = await ElMessageBox.confirm(T('Confirm?', { param: T('Delete') }), {
      confirmButtonText: T('Confirm'), cancelButtonText: T('Cancel'), type: 'warning',
    }).catch(() => false)
    if (!cf) return
    const res = await remove({ id: row.id }).catch(() => false)
    if (res) {
      ElMessage.success(T('OperationSuccess'))
      getList()
    }
  }

  const toBatchDelete = async () => {
    if (!multipleSelection.value.length) {
      ElMessage.warning(T('PleaseSelectData'))
      return
    }
    const ids = multipleSelection.value.map(r => r.id)
    const cf = await ElMessageBox.confirm(T('Confirm?', { param: T('BatchDelete') }), {
      confirmButtonText: T('Confirm'), cancelButtonText: T('Cancel'), type: 'warning',
    }).catch(() => false)
    if (!cf) return
    const res = await batchDelete({ ids }).catch(() => false)
    if (res) {
      ElMessage.success(T('OperationSuccess'))
      getList()
    }
  }

  const refreshRow = async (row) => {
    const res = await refreshStatus({ id: row.id }).catch(() => false)
    if (res) {
      ElMessage.success(T('OperationSuccess'))
      getList()
    }
  }

  const refreshDetail = async () => {
    if (!detailRow.value) return
    detailRefreshing.value = true
    const res = await refreshStatus({ id: detailRow.value.id }).catch(() => false)
    detailRefreshing.value = false
    if (res) {
      ElMessage.success(T('OperationSuccess'))
      getList()
    }
  }

  const onFileChange = (e) => {
    selectedFile = e.target.files && e.target.files[0]
  }

  const fetchTargets = async () => {
    const res = await fetchTargetOptions({ builder: createForm.builder }).catch(() => false)
    if (res) {
      targetOptions.value = (res.data.targets || []).map(t => ({ value: t, label: t }))
    } else {
      targetOptions.value = []
    }
    tempTarget.value = ''
    createForm.targets = []
  }

  const loadVersions = async () => {
    versionsLoading.value = true
    const res = await fetchVersions().catch(() => false)
    versionsLoading.value = false
    if (res) {
      versionOptions.value = res.data.versions || []
      createForm.version = versionOptions.value[0] || ''
    } else {
      versionOptions.value = []
    }
  }

  const handleTargetClose = (tag) => {
    createForm.targets = createForm.targets.filter(t => t.value !== tag.value)
  }

  const handleTargetSelect = (value) => {
    if (!value) return
    const exists = createForm.targets.find(t => t.value === value)
    if (!exists) {
      const label = targetOptions.value.find(t => t.value === value)?.label || value
      createForm.targets.push({ value, label })
    }
    tempTarget.value = ''
  }

  const submitCreate = async () => {
    if (!selectedFile) {
      ElMessage.warning('Please select a json file')
      return
    }
    if (!createForm.targets || createForm.targets.length === 0) {
      ElMessage.warning('Please select at least one target')
      return
    }
    if (!createForm.version) {
      ElMessage.warning('Please select a version')
      return
    }
    const fd = new FormData()
    createForm.targets.forEach(t => fd.append('targets', t.value))
    fd.append('builder', createForm.builder || 'dvforge')
    fd.append('version', createForm.version || '')
    fd.append('exclude_from_update', createForm.exclude_from_update ? 'true' : 'false')
    fd.append('name', createForm.name || selectedFile.name)
    fd.append('file', selectedFile)
    creating.value = true
    const res = await create(fd).catch(() => false)
    creating.value = false
    if (res) {
      ElMessage.success(T('OperationSuccess'))
      showCreate.value = false
      selectedFile = null
      createForm.exclude_from_update = false
      getList()
    }
  }

  const download = async (row, file) => {
    const res = await downloadFile(row.id, file).catch(() => false)
    if (!res) return
    const blob = res.data instanceof Blob ? res.data : new Blob([res.data])
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  }

  const showSettings = ref(false)
  const savingSettings = ref(false)
  const settingsForm = reactive({ api_base: '', api_token: '', rdgen_api_base: '', rdgen_api_token: '', update_public_key: '' })

  const openSettings = async () => {
    showSettings.value = true
    const res = await clientBuilder().catch(() => false)
    if (res) {
      settingsForm.api_base = res.data.api_base || ''
      settingsForm.api_token = res.data.api_token || ''
      settingsForm.rdgen_api_base = res.data.rdgen_api_base || ''
      settingsForm.rdgen_api_token = res.data.rdgen_api_token || ''
      settingsForm.update_public_key = res.data.update_public_key || ''
    }
  }

  const saveSettings = async () => {
    savingSettings.value = true
    const res = await clientBuilderSave(settingsForm).catch(() => false)
    savingSettings.value = false
    if (res) {
      ElMessage.success(T('OperationSuccess'))
      showSettings.value = false
    }
  }

  let refreshTimer = null
  const startAutoRefresh = () => {
    if (refreshTimer) return
    refreshTimer = setInterval(() => { getList() }, 15000)
  }
  const stopAutoRefresh = () => {
    if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null }
  }

  onMounted(() => { getList(); startAutoRefresh() })
  onActivated(() => { getList(); startAutoRefresh() })
  onDeactivated(() => { stopAutoRefresh() })
  onBeforeUnmount(() => { stopAutoRefresh() })
  watch(() => listQuery.page, getList)
  watch(() => listQuery.page_size, () => { if (listQuery.page === 1) getList(); else listQuery.page = 1 })
  watch(() => createForm.builder, fetchTargets)
  watch(showCreate, (val) => { if (val) { fetchTargets(); loadVersions() } })
</script>

<style scoped>
  .client-build-table :deep(.el-table__row) {
    cursor: pointer;
  }
  .client-build-table :deep(.files-cell .cell) {
    white-space: nowrap;
    word-break: normal;
  }
  .file-list {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }
  .file-link {
    font-size: 12px;
  }
  .auto-update-cell {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .auto-update-label {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
  .mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 12px;
    word-break: break-all;
  }
  .muted {
    color: var(--el-text-color-secondary);
  }
  .detail-link {
    color: var(--el-color-primary);
    word-break: break-all;
  }
  .error-text {
    color: var(--el-color-danger);
    white-space: pre-wrap;
    word-break: break-word;
  }
</style>
