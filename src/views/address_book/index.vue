<template>
  <div>
    <el-card class="list-query" shadow="hover">
      <el-form inline label-width="120px">
        <el-form-item :label="T('Owner')">
          <el-select v-model="listQuery.user_id" clearable @change="changeQueryUser">
            <el-option
                v-for="item in allUsers"
                :key="item.id"
                :label="item.username"
                :value="item.id"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item :label="T('AddressBookName')">
          <el-select v-model="listQuery.collection_id" clearable>
            <el-option :value="0" :label="T('MyAddressBook')"></el-option>
            <el-option v-for="c in collectionListRes.list" :key="c.id" :label="c.name" :value="c.id"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item :label="T('Id')">
          <el-input v-model="listQuery.id" clearable></el-input>
        </el-form-item>
        <el-form-item :label="T('Username')">
          <el-input v-model="listQuery.username" clearable></el-input>
        </el-form-item>
        <el-form-item :label="T('Hostname')">
          <el-input v-model="listQuery.hostname" clearable></el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handlerQuery">{{ T('Filter') }}</el-button>
          <el-button type="danger" @click="toAdd">{{ T('Add') }}</el-button>
          <el-button type="success" @click="showImportDialog = true">{{ T('Import') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    <el-card class="list-body" shadow="hover">
      <!--      <el-tag type="danger" style="margin-bottom: 10px">不建议在此操作地址簿，可能会造成数据不同步</el-tag>-->
      <el-table :data="listRes.list" v-loading="listRes.loading" border>
        <el-table-column prop="id" label="ID" align="center" width="200">
          <template #default="{row}">
            <div>
              <PlatformIcons :name="platformList.find(p=>p.label===row.platform)?.icon" style="width: 20px;height: 20px;display: inline-block" color="var(--basicBlack)"/>
              {{ row.id }}
              <el-icon @click="handleClipboard(row.id, $event)">
                <CopyDocument/>
              </el-icon>
            </div>
          </template>
        </el-table-column>
        <el-table-column :label="T('Owner')" align="center" width="200">
          <template #default="{row}">
            <span v-if="row.user_id"> <el-tag>{{ allUsers?.find(u => u.id === row.user_id)?.username }}</el-tag> </span>
          </template>
        </el-table-column>
        <el-table-column prop="collection_id" :label="T('AddressBookName')" align="center" width="150">
          <template #default="{row}">
            <span v-if="row.collection_id === 0">{{ T('MyAddressBook') }}</span>
            <span v-else>{{ row.collection?.name }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="username" :label="T('Username')" align="center" width="150"/>
        <el-table-column prop="hostname" :label="T('Hostname')" align="center" width="150"/>
        <el-table-column prop="tags" :label="T('Tags')" align="center"/>
        <!--        <el-table-column prop="created_at" label="创建时间" align="center"/>-->
        <!--        <el-table-column prop="updated_at" label="更新时间" align="center"/>-->
        <el-table-column prop="alias" :label="T('Alias')" align="center" width="150"/>
        <el-table-column prop="peer.version" :label="T('Version')" align="center" width="100"/>
        <el-table-column prop="hash" :label="T('Hash')" align="center" width="150" show-overflow-tooltip/>
        <el-table-column :label="T('Actions')" align="center" class-name="table-actions" width="500" fixed="right">
          <template #default="{row}">
            <el-button type="success" @click="connectByClient(row.id)">{{ T('Link') }}</el-button>
            <el-button v-if="appStore.setting.appConfig.web_client" type="success" @click="toWebClientLink(row)">Web Client</el-button>
            <!--            <el-button type="primary" @click="toShowShare(row)">{{ T('ShareByWebClient') }}</el-button>-->
            <el-button @click="toEdit(row)">{{ T('Edit') }}</el-button>
            <el-button type="danger" @click="del(row)">{{ T('Delete') }}</el-button>
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
    <el-dialog v-model="formVisible" width="800" :title="!formData.row_id?T('Create') :T('Update') ">
      <el-form class="dialog-form" ref="form" :model="formData" label-width="120px">
        <el-form-item :label="T('Owner')" prop="user_id" required>
          <el-select v-model="formData.user_id" @change="changeUserForUpdate">
            <el-option
                v-for="item in allUsers"
                :key="item.id"
                :label="item.username"
                :value="item.id"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item :label="T('AddressBookName')">
          <el-select v-model="formData.collection_id" clearable @change="changeCollectionForUpdate">
            <el-option :value="0" :label="T('MyAddressBook')"></el-option>
            <el-option v-for="c in collectionListResForUpdate.list" :key="c.id" :label="c.name" :value="c.id"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="ID" prop="id" required>
          <el-input v-model="formData.id"></el-input>
        </el-form-item>
        <el-form-item :label="T('Username')" prop="username">
          <el-input v-model="formData.username"></el-input>
        </el-form-item>
        <el-form-item :label="T('Alias')" prop="alias">
          <el-input v-model="formData.alias"></el-input>
        </el-form-item>
        <el-form-item :label="T('Hash')" prop="hash">
          <el-input v-model="formData.hash"></el-input>
        </el-form-item>
        <el-form-item :label="T('Hostname')" prop="hostname">
          <el-input v-model="formData.hostname"></el-input>
        </el-form-item>
        <!--        <el-form-item :label="T('LoginName')" prop="loginName">
                  <el-input v-model="formData.loginName"></el-input>
                </el-form-item>
                <el-form-item :label="T('Password')" prop="password">
                  <el-input v-model="formData.password"></el-input>
                </el-form-item>-->
        <el-form-item :label="T('Platform')" prop="platform">
          <el-select v-model="formData.platform">
            <el-option
                v-for="item in platformList"
                :key="item.value"
                :label="item.label"
                :value="item.value"
            ></el-option>
          </el-select>
        </el-form-item>

        <el-form-item :label="T('Tags')" prop="tags">
          <el-select v-model="formData.tags" multiple>
            <el-option
                v-for="item in tagListRes.list"
                :key="item.name"
                :label="item.name"
                :value="item.name"
            ></el-option>
          </el-select>
        </el-form-item>
        <!-- <el-form-item label="强制中继" prop="forceAlwaysRelay" required>
                <el-switch v-model="formData.forceAlwaysRelay"></el-switch>
              </el-form-item>
         <el-form-item label="在线" prop="online">
                <el-switch v-model="formData.online"></el-switch>
              </el-form-item>
              <el-form-item label="rdp端口" prop="rdpPort">
                <el-input v-model="formData.rdpPort"></el-input>
              </el-form-item>
              <el-form-item label="rdp用户名" prop="rdpUsername">
                <el-input v-model="formData.rdpUsername"></el-input>
              </el-form-item>
              <el-form-item label="同一服务器" prop="sameServer">
                <el-switch v-model="formData.sameServer"></el-switch>
              </el-form-item>-->

        <el-form-item>
          <el-button @click="formVisible = false">{{ T('Cancel') }}</el-button>
          <el-button @click="submit" type="primary">{{ T('Submit') }}</el-button>
        </el-form-item>
      </el-form>
    </el-dialog>
    <!-- Import Dialog -->
    <el-dialog v-model="showImportDialog" width="650" :title="T('Import')">
      <el-form :model="importForm" label-width="120px">
        <el-form-item :label="T('ImportFormat')">
          <el-select v-model="importForm.format" @change="onImportFormatChange">
            <el-option value="standard" :label="T('StandardFormat')"></el-option>
            <el-option value="kingmo" :label="T('KingmoFormat')"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item :label="T('ImportFile')">
          <input type="file" accept=".json" @change="onImportFileChange" style="width: 100%"/>
        </el-form-item>
        <el-form-item :label="T('OrPasteJSON')">
          <el-input v-model="importForm.jsonData" type="textarea" :rows="6" :placeholder="importFormatPlaceholder"/>
        </el-form-item>
        <el-form-item v-if="isAdmin" :label="T('ImportToUser')">
          <el-select v-model="importForm.target_user_id" placeholder="Select user">
            <el-option
                v-for="item in allUsers"
                :key="item.id"
                :label="item.username"
                :value="item.id"
            ></el-option>
          </el-select>
        </el-form-item>
        <template #footer>
          <el-button @click="showImportDialog = false">{{ T('Cancel') }}</el-button>
          <el-button type="primary" @click="submitImport" :loading="importing">{{ T('Confirm') }}</el-button>
        </template>
      </el-form>
    </el-dialog>
    <!-- Import Result -->
    <el-dialog v-model="showImportResult" width="500" :title="T('ImportResult')">
      <el-divider>{{ T('ImportSummary') }}</el-divider>
      <el-descriptions :column="1" border>
        <el-descriptions-item :label="T('Total')">{{ importResult.total }}</el-descriptions-item>
        <el-descriptions-item :label="T('Imported')">{{ importResult.imported }}</el-descriptions-item>
        <el-descriptions-item :label="T('Skipped')">{{ importResult.skipped }}</el-descriptions-item>
        <el-descriptions-item :label="T('TargetUser')">{{ importResult.user_id }}</el-descriptions-item>
        <el-descriptions-item :label="T('Format')">{{ importResult.format }}</el-descriptions-item>
      </el-descriptions>
      <el-divider v-if="importResult.errors && importResult.errors.length">{{ T('Errors') }}</el-divider>
      <el-collapse v-if="importResult.errors && importResult.errors.length">
        <el-collapse-item v-for="(err, idx) in importResult.errors" :key="idx" :title="`Error ${idx + 1}`">
          {{ err }}
        </el-collapse-item>
      </el-collapse>
      <template #footer>
        <el-button @click="showImportResult = false">{{ T('Close') }}</el-button>
      </template>
    </el-dialog>
    <!--    <el-dialog v-model="shareToWebClientVisible" width="900" :close-on-click-modal="false">
          <shareByWebClient :id="shareToWebClientForm.id"
                            :hash="shareToWebClientForm.hash"
                            @cancel="shareToWebClientVisible=false"
                            @success=""/>
        </el-dialog>-->
  </div>
</template>

<script setup>
  import { onActivated, onMounted, watch, ref, reactive } from 'vue'
  import { useRepositories } from '@/views/address_book/index'
  import { toWebClientLink } from '@/utils/webclient'
  import { T } from '@/utils/i18n'
  import { useRoute } from 'vue-router'
  import { connectByClient } from '@/utils/peer'
  import { useAppStore } from '@/store/app'
  import { handleClipboard } from '@/utils/clipboard'
  import { CopyDocument } from '@element-plus/icons'
  import PlatformIcons from '@/components/icons/platform.vue'
  import { loadAllUsers } from '@/global'
  import { importAddressBook, importKingmo } from '@/api/address_book'

  const appStore = useAppStore()
  const route = useRoute()
  const { allUsers, getAllUsers } = loadAllUsers()

  const {
    listRes,
    listQuery,
    getList,
    handlerQuery,
    collectionListRes,

    del,
    formVisible,
    platformList,
    formData,
    toEdit,
    toAdd,
    submit,
    changeUserForUpdate,
    changeCollectionForUpdate,
    collectionListResForUpdate,
    tagListRes,

    changeQueryUser,
  } = useRepositories('admin')

  if (route.query?.user_id) {
    listQuery.user_id = parseInt(route.query.user_id)
  }
  onMounted(getAllUsers)
  onMounted(getList)
  onActivated(getList)

  // Import state
  const showImportDialog = ref(false)
  const showImportResult = ref(false)
  const importing = ref(false)
  const importForm = reactive({
    format: 'standard',
    jsonData: '',
    target_user_id: null,
  })
  const importResult = reactive({
    total: 0,
    imported: 0,
    skipped: 0,
    user_id: 0,
    errors: [],
  })
  const isAdmin = ref(appStore.setting?.isAdmin || false)
  const importFormatPlaceholder = ref('Paste JSON array here')

  const onImportFormatChange = (val) => {
    if (val === 'kingmo') {
      importFormatPlaceholder.value = 'Paste Kingmo JSON (with users array) here'
    } else {
      importFormatPlaceholder.value = 'Paste JSON array here'
    }
  }

  const onImportFileChange = (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result)
        importForm.jsonData = JSON.stringify(data, null, 2)
      } catch (err) {
        importForm.jsonData = event.target.result
      }
    }
    reader.readAsText(file)
  }

  const submitImport = async () => {
    if (!importForm.jsonData || !importForm.jsonData.trim()) {
      return
    }
    const fd = new FormData()
    fd.append('data', importForm.jsonData)
    if (isAdmin.value && importForm.target_user_id) {
      fd.append('user_id', importForm.target_user_id)
    }
    importing.value = true
    try {
      const res = importForm.format === 'kingmo'
        ? await importKingmo(fd, isAdmin.value).catch(() => false)
        : await importAddressBook(fd, isAdmin.value).catch(() => false)
      if (res) {
        importing.value = false
        showImportDialog.value = false
        importResult.total = res.data.total || 0
        importResult.imported = res.data.imported || 0
        importResult.skipped = res.data.skipped || 0
        importResult.user_id = res.data.user_id || 0
        importResult.errors = res.data.errors || []
        importResult.format = res.data.format || importForm.format
        showImportResult.value = true
        importForm.jsonData = ''
        importForm.target_user_id = null
        getList()
      }
    } catch (e) {
      importing.value = false
    }
  }

  watch(() => listQuery.page, getList)

  watch(() => listQuery.page_size, handlerQuery)


</script>

<style scoped lang="scss">
.list-query .el-select {
  --el-select-width: 160px;
}

.colors {
  display: flex;
  justify-content: center;
  align-items: center;

  .colorbox {
    width: 50px;
    height: 30px;
    display: flex;
    justify-content: center;
    align-items: center;

    .dot {
      width: 10px;
      height: 10px;
      display: block;
      border-radius: 50%;
    }
  }

}

</style>
