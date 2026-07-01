<template>
  <div class="app">
    <header class="app-header">
      <h1>混凝土配合比计算工具</h1>
      <div class="config-bar">
        <label>
          API 地址：
          <input v-model="apiBase" placeholder="mix-data-api URL化地址" class="input" style="width: 320px" @change="saveApiBase" />
          <button class="btn" @click="onResetApiBase" title="恢复默认 API 地址">重置</button>
        </label>
        <label>
          API Key：
          <input v-model="apiKey" placeholder="可选，或使用 token" class="input" style="width: 200px" @change="saveApiKey" />
        </label>
        <label>
          站点ID：
          <input v-model="plantId" placeholder="plant_id" class="input" style="width: 180px" />
        </label>
        <button class="btn btn-primary" @click="fetchData" :disabled="loading">
          {{ loading ? '加载中...' : '加载数据' }}
        </button>
      </div>
      <p class="config-tip">
        不配置接口也可以直接手动计算；只有“加载数据”和“从接口数据填充”依赖正式环境的 `mix-data-api`。
      </p>
    </header>

    <div v-if="error" class="error-bar">{{ error }}</div>

    <main v-if="dataLoaded" class="main">
      <!-- 基本信息 -->
      <section class="card">
        <h2>基本信息</h2>
        <div class="form-grid">
          <div class="form-item">
            <label>强度等级</label>
            <select v-model="form.strengthGrade">
              <option v-for="g in strengthGrades" :key="g" :value="g">{{ g }}</option>
            </select>
          </div>
          <div class="form-item">
            <label>标准差 σ</label>
            <input v-model.number="form.sigma" type="number" step="0.1" />
          </div>
          <div class="form-item">
            <label>坍落度 (mm)</label>
            <input v-model.number="form.slump" type="number" />
          </div>
          <div class="form-item">
            <label>最大粒径 (mm)</label>
            <select v-model="form.maxAggregateSize">
              <option value="20">20</option>
              <option value="25">25</option>
              <option value="31.5">31.5</option>
              <option value="40">40</option>
            </select>
          </div>
          <div class="form-item">
            <label>骨料类型</label>
            <select v-model="form.aggregateType">
              <option value="crushed">碎石</option>
              <option value="rounded">卵石</option>
            </select>
          </div>
        </div>
      </section>

      <!-- 胶凝材料配比 -->
      <section class="card">
        <h2>胶凝材料配比</h2>
        <div class="form-grid">
          <div class="form-item">
            <label>粉煤灰掺量 (%)</label>
            <input v-model.number="form.flyAshRatio" type="number" min="0" max="100" />
          </div>
          <div class="form-item">
            <label>矿粉掺量 (%)</label>
            <input v-model.number="form.slagRatio" type="number" min="0" max="100" />
          </div>
          <div class="form-item">
            <label>外加剂掺量 (%)</label>
            <input v-model.number="form.admixtureDosage" type="number" step="0.1" min="0" />
          </div>
        </div>
      </section>

      <!-- 材料参数 -->
      <section class="card">
        <h2>材料参数 <button class="btn btn-sm" @click="fillFromData">从接口数据填充</button></h2>
        <div class="form-grid cols-3">
          <div class="form-item">
            <label>水泥密度 (kg/m³)</label>
            <input v-model.number="form.cementDensity" type="number" />
          </div>

          <div class="form-item">
            <label>砂表观密度 (kg/m³)</label>
            <input v-model.number="form.sandDensity" type="number" />
          </div>
          <div class="form-item">
            <label>石表观密度 (kg/m³)</label>
            <input v-model.number="form.stoneApparentDensity" type="number" />
          </div>
          <div class="form-item">
            <label>砂堆积密度 (kg/m³)</label>
            <input v-model.number="form.sandCompactedDensity" type="number" />
          </div>
          <div class="form-item">
            <label>石堆积密度 (kg/m³)</label>
            <input v-model.number="form.stoneBulkDensity" type="number" />
          </div>
          <div class="form-item">
            <label>水泥28d强度 (MPa)</label>
            <input v-model.number="form.cementStrength" type="number" step="0.1" />
          </div>

        </div>
      </section>

      <button class="btn btn-primary btn-lg" @click="calculate">
        计算配合比
      </button>

      <!-- 计算结果 -->
      <section v-if="result" class="card result-card">
        <h2>计算结果</h2>
        <table class="result-table">
          <thead>
            <tr>
              <th>参数</th>
              <th>值</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>水胶比</td><td>{{ result.wcRatioLimited?.toFixed?.(3) ?? '-' }}</td></tr>
            <tr><td>用水量 (kg/m³)</td><td>{{ result.adjustedWater?.toFixed?.(1) ?? '-' }}</td></tr>
            <tr><td>总胶凝材料 (kg/m³)</td><td>{{ result.totalBinder?.toFixed?.(1) ?? '-' }}</td></tr>
            <tr><td>水泥 (kg/m³)</td><td>{{ result.binderDistribution?.cement?.toFixed?.(1) ?? '-' }}</td></tr>
            <tr><td>粉煤灰 (kg/m³)</td><td>{{ result.binderDistribution?.flyAsh?.toFixed?.(1) ?? '-' }}</td></tr>
            <tr><td>矿粉 (kg/m³)</td><td>{{ result.binderDistribution?.slag?.toFixed?.(1) ?? '-' }}</td></tr>
            <tr><td>砂用量 (kg/m³)</td><td>{{ result.sandWeight?.toFixed?.(1) ?? '-' }}</td></tr>
            <tr><td>石用量 (kg/m³)</td><td>{{ result.stoneWeight?.toFixed?.(1) ?? '-' }}</td></tr>
            <tr><td>外加剂 (kg/m³)</td><td>{{ result.admixtureWeight?.toFixed?.(2) ?? '-' }}</td></tr>
            <tr><td>砂率 (%)</td><td>{{ result.sandRatioAuto?.toFixed?.(1) ?? '-' }}</td></tr>
            <tr><td>总质量 (kg/m³)</td><td>{{ result.totalMass?.toFixed?.(1) ?? '-' }}</td></tr>
            <tr><td>25L试配 (kg)</td><td>{{ result.trialWeights?.sand?.toFixed?.(2) ?? '-' }}</td></tr>
          </tbody>
        </table>
        <div v-if="result.engineResult?.steps?.length" class="steps">
          <h3>计算步骤</h3>
          <ol>
            <li v-for="(step, i) in result.engineResult.steps" :key="i">{{ step.description || step }}</li>
          </ol>
        </div>
      </section>
    </main>

    <footer class="app-footer">
      混凝土配合比计算工具 Demo · 数据来源：concrete-quality-system
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import {
  getMaterialBindings,
  getLatestRecords,
  get30DayAvg,
  getApiBase,
  setApiKey,
  setApiBase,
  resetApiBase
} from './api'
import {
  calculateFullDesign,
  getDefaultSigma
} from './engine/mix-design'

const strengthGrades = ['C20', 'C25', 'C30', 'C35', 'C40', 'C45', 'C50', 'C55']

const apiBase = ref(getApiBase())
// 注意：不要把 API Key 写进前端默认值（会随构建产物泄露）。用户需自行在界面输入。
const apiKey = ref(localStorage.getItem('mix_api_key') || '')
const plantId = ref(localStorage.getItem('mix_plant_id') || 'plant_ld1')
const loading = ref(false)
const dataLoaded = ref(true)
const error = ref('')
const result = ref<any>(null)

// 绑定数据
const bindings = ref<any>(null)
const latestRecords = ref<any>(null)
const avg30d = ref<any>(null)

const form = reactive({
  strengthGrade: 'C30',
  sigma: 5.0,
  slump: 180,
  maxAggregateSize: '25',
  aggregateType: 'crushed',
  flyAshRatio: 20,
  slagRatio: 10,
  admixtureDosage: 2.0,
  cementDensity: 3100,
  sandDensity: 2650,
	  stoneApparentDensity: 2700,
  sandCompactedDensity: 1620,
  stoneBulkDensity: 1550,
  cementStrength: 42.5,
})

function saveApiBase() {
  setApiBase(apiBase.value)
}
function onResetApiBase() {
  apiBase.value = resetApiBase()
}
function saveApiKey() {
  setApiKey(apiKey.value)
}

async function fetchData() {
  if (!apiBase.value) {
    error.value = '请先填写正式环境可用的 API 地址'
    return
  }
  if (!plantId.value && !apiKey.value) {
    error.value = '请填写站点ID或API Key'
    return
  }

  localStorage.setItem('mix_plant_id', plantId.value)
  saveApiBase()
  saveApiKey()

  loading.value = true
  error.value = ''
  try {
    const [b, l, a] = await Promise.all([
      getMaterialBindings(plantId.value).catch(e => ({ error: e.message })),
      getLatestRecords().catch(e => ({ error: e.message })),
      get30DayAvg().catch(e => ({ error: e.message }))
    ])

    const loadErrors: string[] = []
    if (b?.error) loadErrors.push(`材料绑定：${b.error}`)
    if (l?.error) loadErrors.push(`最新检测：${l.error}`)
    if (a?.error) loadErrors.push(`30天均值：${a.error}`)

    bindings.value = b?.error ? null : b
    latestRecords.value = l?.error ? null : l
    avg30d.value = a?.error ? null : a
    dataLoaded.value = true

    if (loadErrors.length > 0) {
      error.value = `接口数据加载失败：${loadErrors.join('；')}`
    }
  } catch (e: any) {
    error.value = e.message || '数据加载失败'
  } finally {
    loading.value = false
  }
}

function fillFromData() {
  // 从30天均值数据填充材料参数。
  // 服务端 data_content 的值为 { value, photo, ... } 结构（normalizeFieldEntry），
  // 字段名为 camelCase（如 strength28d / apparentDensity / compactedDensity）。
  const avg = avg30d.value || {}
  const extractNum = (record: any, ...keys: string[]) => {
    for (const key of keys) {
      const entry = record?.data_content?.[key]
      const raw = entry && entry.value !== undefined ? entry.value : entry
      const n = raw !== null && raw !== undefined ? parseFloat(raw) : NaN
      if (Number.isFinite(n) && n > 0) return n
    }
    return null
  }

  // 水泥（30天均值仅暴露 strength28d 与 apparentDensity）
  const cement = avg['水泥']
  if (cement) {
    const d = extractNum(cement, 'apparentDensity', 'density')
    if (d) form.cementDensity = d
    const s = extractNum(cement, 'strength28d', 'fce', 'actualStrength')
    if (s) form.cementStrength = s
  }
  // 砂
  const sand = avg['砂'] || avg['机制砂']
  if (sand) {
    const d = extractNum(sand, 'apparentDensity', 'density')
    if (d) form.sandDensity = d
    const b = extractNum(sand, 'compactedDensity', 'bulkDensity')
    if (b) form.sandCompactedDensity = b
  }
  // 石
  const stone = avg['石子'] || avg['石']
  if (stone) {
    const d = extractNum(stone, 'apparentDensity', 'density')
    if (d) form.stoneApparentDensity = d
    const b = extractNum(stone, 'compactedDensity', 'bulkDensity')
    if (b) form.stoneBulkDensity = b
  }
}

function calculate() {
  try {
    const calcInput = {
      strengthGrade: form.strengthGrade,
      sigma: form.sigma || getDefaultSigma(form.strengthGrade),
      slump: form.slump,
      maxAggregateSize: parseFloat(form.maxAggregateSize),
      aggregateType: form.aggregateType as 'crushed' | 'rounded',
      cementStrength: form.cementStrength,
      flyAshRatio: form.flyAshRatio,
      slagRatio: form.slagRatio,
      admixtureDosage: form.admixtureDosage,
      cementDensity: form.cementDensity,
      sandDensity: form.sandDensity,
      // 引擎 mix-design.ts 中 aggregateDensity(line309 骨料质量换算) 与 stoneApparentDensity(line312
      // 石子空隙比) 实为同一物理量「石表观密度」的两个变量；UI 只有一个「石表观密度」输入，
      // 绑定在 stoneApparentDensity 上，故此处把同一值喂给 aggregateDensity，避免它冻在默认值。
      aggregateDensity: form.stoneApparentDensity,
      stoneApparentDensity: form.stoneApparentDensity,
      stoneBulkDensity: form.stoneBulkDensity,
      sandCompactedDensity: form.sandCompactedDensity,
    }
    result.value = calculateFullDesign(calcInput)
    error.value = ''
  } catch (e: any) {
    error.value = e.message || '计算失败'
    result.value = null
  }
}
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f7fa; color: #333; }

.app { max-width: 960px; margin: 0 auto; padding: 20px; }

.app-header {
  background: linear-gradient(135deg, #1989fa, #0570db);
  color: #fff;
  padding: 24px;
  border-radius: 12px;
  margin-bottom: 20px;
}
.app-header h1 { font-size: 22px; margin-bottom: 16px; }
.config-bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.config-bar label { display: flex; align-items: center; gap: 6px; font-size: 13px; }
.config-tip { margin-top: 10px; font-size: 12px; line-height: 1.5; color: rgba(255,255,255,0.88); }

.input, select {
  height: 32px; padding: 0 8px; border: 1px solid #dcdfe6; border-radius: 4px;
  background: #fff; font-size: 13px; min-width: 100px;
}

.btn {
  height: 32px; padding: 0 16px; border: 1px solid #dcdfe6; border-radius: 4px;
  background: #fff; cursor: pointer; font-size: 13px; transition: all .2s;
}
.btn:hover { border-color: #1989fa; color: #1989fa; }
.btn-primary { background: #1989fa; color: #fff; border-color: #1989fa; }
.btn-primary:hover { background: #0570db; }
.btn-primary:disabled { background: #a0cfff; cursor: not-allowed; }
.btn-sm { height: 24px; padding: 0 10px; font-size: 12px; margin-left: 10px; }
.btn-lg { width: 100%; height: 44px; font-size: 16px; margin: 20px 0; }

.error-bar {
  background: #fef0f0; color: #f56c6c; padding: 10px 16px; border-radius: 8px;
  margin-bottom: 16px; font-size: 14px;
}

.card {
  background: #fff; border-radius: 12px; padding: 20px; margin-bottom: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04); border: 1px solid #ebeef5;
}
.card h2 { font-size: 16px; margin-bottom: 16px; color: #303133; display: flex; align-items: center; }
.card h3 { font-size: 14px; margin: 12px 0 8px; color: #606266; }

.form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.form-grid.cols-3 { grid-template-columns: repeat(3, 1fr); }
.form-item { display: flex; flex-direction: column; gap: 4px; }
.form-item label { font-size: 12px; color: #909399; }
.form-item input, .form-item select { width: 100%; }

.result-card { border-color: #1989fa; }
.result-table { width: 100%; border-collapse: collapse; }
.result-table th, .result-table td {
  padding: 8px 12px; text-align: left; border-bottom: 1px solid #ebeef5; font-size: 14px;
}
.result-table th { background: #f5f7fa; color: #909399; font-weight: 500; }
.result-table td:last-child { font-weight: 600; color: #1989fa; }

.steps { margin-top: 16px; padding-top: 12px; border-top: 1px solid #ebeef5; }
.steps ol { padding-left: 20px; }
.steps li { font-size: 13px; color: #606266; margin-bottom: 4px; line-height: 1.6; }

.app-footer {
  text-align: center; color: #c0c4cc; font-size: 12px; padding: 20px 0;
}
</style>
