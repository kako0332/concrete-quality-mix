export const FIELD_LABELS: Record<string, string> = {
  strengthGrade: '强度等级',
  sigma: '标准差',
  cementStrength: '水泥实际强度',
  cementGradeFactor: '水泥强度富余系数',
  cementDensity: '水泥表观密度',
  standardConsistencyWater: '标准稠度用水量',
  strength3d: '3天强度',
  strength28d: '28天强度',
  settingTime: '凝结时间',
  initialSettingTime: '初凝时间',
  finalSettingTime: '终凝时间',
  fineness: '细度',
  finenessModulus: '细度模数',
  activity7d: '7天活性指数/强度',
  sandDensity: '砂表观密度',
  aggregateDensity: '粗骨料表观密度',
  stoneApparentDensity: '石子表观密度',
  stoneBulkDensity: '石子堆积密度',
  sandCompactedDensity: '砂紧密堆积密度',
  sandFinenessModulus: '砂细度模数',
  fluidityRatio: '流动度比',
  activity3d: '3天活性指数/强度',
  activity28d: '28天活性指数/强度',
  waterDemandRatio: '需水量比',
  siltContent: '含泥量',
  clayLumpContent: '泥块含量',
  methyleneBlueValue: '亚甲蓝值',
  crushingValue: '压碎值',
  stoneContent: '含石率',
  sandContent: '含沙率',
  porosity: '孔隙率',
  compactedDensity: '紧密堆积密度',
  waterAbsorption: '吸水率',
  waterContent: '含水率',
  airContent: '含气量',
  aggregateType: '骨料类型',
  maxAggregateSize: '最大公称粒径',
  slump: '坍落度',
  exposureCondition: '暴露条件',
  concreteType: '混凝土类型',
  flyAshRatio: '粉煤灰掺量',
  slagRatio: '矿粉掺量',
  admixtureDosage: '外加剂掺量',
  waterReductionRate: '减水率',
  expansionRate: '膨胀率',
  fce: '水泥强度',
  density: '密度',
  apparentDensity: '表观密度',
  bulkDensity: '堆积密度',
  spec: '规格',
  grade: '等级',
  factory: '厂家',
  source: '来源',
  name: '名称',
  material_name: '材料名称',
  material_type: '材料类型',
  plant_id: '站点',
  operator_uid: '录入人',
  sample_no: '编号',
  sample_time: '取样时间',
  manufacturer: '厂家',
  spec_grade: '规格等级',
  sample_source: '样品来源',
  batch_no: '批号',
  role: '材料角色',
  material_types: '匹配材料类型',
  key_param_fields: '关键参数字段',
  density_param_fields: '密度参数字段',
  report_fields: '摘要字段',
  manual_confirm_required: '是否需要人工确认',
  show_home_banner: '首页 Banner',

  // 历史数据兼容标签
  strengthValue: '强度',
  avgStrength: '平均强度',
  strengthComp28d: '28天抗压强度',
  actualStrength: '实测强度',
}

export function getFieldLabel(key: string, fieldConfig?: { label?: string } | null): string {
  if (fieldConfig && fieldConfig.label) {
    return fieldConfig.label
  }
  return FIELD_LABELS[key] || key
}

export function formatObjectText(data: Record<string, unknown> = {}, fieldMap: Record<string, { label?: string } | null> = {}): string {
  const entries = Object.entries(data || {})
    .filter(([, value]) => value !== '' && value !== null && value !== undefined)
    .map(([key, value]) => {
      const fieldConfig = fieldMap[key] || null
      const text = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
      return `${getFieldLabel(key, fieldConfig)}：${text}`
    })

  return entries.length ? entries.join('\n') : '暂无详情'
}
