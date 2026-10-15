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
      <el-table :data="listRes.list" v-loading="listRes.loading" border @selection-change="handleSelectionChange">
        <el-table-column type="selection" align="center" width="50"/>
        <el-table-column prop="id" label="ID" align="center" width="80"/>
        <el-table-column prop="name" label="Name" align="center"/>
        <el-table-column prop="target" label="Target" align="center"/>
        <el-table-column prop="job_id" label="Job ID" align="center"/>
        <el-table-column prop="status" label="Status" align="center">
          <template #default="{row}">
            <el-tag :type="statusType(row.status)">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Files" align="center">
          <template #default="{row}">
            <div v-for="f in row.files" :key="f" style="margin:2px">
              <el-button link type="primary" @click="download(row, f)">{{ f }}</el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="error" label="Error" align="center"/>
        <el-table-column prop="created_at" :label="T('CreatedAt')" align="center"/>
        <el-table-column :label="T('Actions')" align="center" width="220">
          <template #default="{row}">
            <el-button type="primary" size="small" @click="refreshRow(row)">{{ T('Refresh') }}</el-button>
            <el-button type="danger" size="small" @click="del(row)">{{ T('Delete') }}</el-button>
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
        <el-form-item label="Target">
          <el-select v-model="createForm.target" placeholder="Select target" style="width: 100%">
            <el-option v-for="t in targetOptions" :key="t.value" :label="t.label" :value="t.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="Version">
          <el-input v-model="createForm.version" placeholder="1.5.0"/>
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
  import { list, create, refreshStatus, remove, batchDelete, downloadFile } from '@/api/client_build'
  import { clientBuilder, clientBuilderSave } from '@/api/config'

  const listRes = reactive({ list: [], total: 0, loading: false })
  const listQuery = reactive({ page: 1, page_size: 10 })
  const multipleSelection = ref([])
  const showCreate = ref(false)
  const creating = ref(false)
  const createForm = reactive({ builder: 'dvforge', target: 'windows-x86_64-exe', version: '1.5.0', name: '' })
  const builderOptions = [
    { value: 'dvforge', label: 'DVForge' },
    { value: 'rdgen', label: 'rdgen' },
  ]
  const targetOptions = [
    { value: 'android-arm64', label: 'Android arm64' },
    { value: 'android-armeabi', label: 'Android armeabi' },
    { value: 'android-x86_64', label: 'Android x86_64' },
    { value: 'android-universal', label: 'Android universal' },
    { value: 'linux-x86_64-deb', label: 'Linux .deb' },
    { value: 'linux-x86_64-rpm', label: 'Linux .rpm' },
    { value: 'windows-x86_64-exe', label: 'Windows .exe' },
    { value: 'windows-x86_64-msi', label: 'Windows .msi' },
    { value: 'macos-arm64-dmg', label: 'macOS .dmg' },
    { value: 'macos-x86_64-dmg', label: 'macOS x86 .dmg' },
  ]
  let selectedFile = null

  const getList = async () => {
    listRes.loading = true
    const res = await list(listQuery).catch(() => false)
    listRes.loading = false
    if (res) {
      listRes.list = res.data.list || []
      listRes.total = res.data.total || 0
    }
  }

  const handleSelectionChange = (val) => { multipleSelection.value = val }

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

  const onFileChange = (e) => {
    selectedFile = e.target.files && e.target.files[0]
  }

  const submitCreate = async () => {
    if (!selectedFile) {
      ElMessage.warning('Please select a json file')
      return
    }
    if (!createForm.target) {
      ElMessage.warning('Target required')
      return
    }
    const fd = new FormData()
    fd.append('builder', createForm.builder || 'dvforge')
    fd.append('target', createForm.target)
    fd.append('version', createForm.version || '')
    fd.append('name', createForm.name || selectedFile.name)
    fd.append('file', selectedFile)
    creating.value = true
    const res = await create(fd).catch(() => false)
    creating.value = false
    if (res) {
      ElMessage.success(T('OperationSuccess'))
      showCreate.value = false
      selectedFile = null
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
  const settingsForm = reactive({ api_base: '', api_token: '', rdgen_api_base: '', rdgen_api_token: '' })

  const openSettings = async () => {
    showSettings.value = true
    const res = await clientBuilder().catch(() => false)
    if (res) {
      settingsForm.api_base = res.data.api_base || ''
      settingsForm.api_token = res.data.api_token || ''
      settingsForm.rdgen_api_base = res.data.rdgen_api_base || ''
      settingsForm.rdgen_api_token = res.data.rdgen_api_token || ''
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
</script>