# 混凝土配合比计算工具 Demo

独立 Web 应用，调用 `concrete-quality-system` 的 `mix-data-api` 云函数获取材料检测数据，本地执行配合比计算。

## 快速开始

```bash
npm install
npm run dev
```

浏览器打开 `http://localhost:5173`

## 配置

1. 复制 `.env` 为 `.env.local`，填写 `VITE_API_BASE`（mix-data-api 云函数 URL化地址）
2. 或在页面上方直接填写 API 地址、API Key、站点ID

## 项目结构

```
src/
├── engine/                  # 计算引擎（从主项目迁移，纯TS无框架依赖）
│   ├── calc-engine/         # 核心计算引擎
│   │   ├── types.ts         # 类型定义
│   │   ├── referenceTables.ts # 参考数据表
│   │   ├── tableQuery.ts    # 查表函数
│   │   ├── calculationEngine.ts # 通用计算引擎
│   │   └── dependencyGraph.ts   # 拓扑排序
│   ├── mix-design.ts        # 配合比设计主函数
│   ├── mix-material-defaults.ts # 材料默认值处理
│   └── field-labels.ts      # 字段标签映射
├── api.ts                   # mix-data-api HTTP 调用封装
├── App.vue                  # 主界面
└── main.ts                  # 入口
```

## 依赖的主程序接口

| 接口 | 说明 |
|------|------|
| getMaterialBindings | 获取站点当前材料绑定 |
| getLatestRecords | 获取最新检测记录 |
| get30DayAvg | 获取30天平均值 |
| uploadFile | 上传报告图片 |
| generateMixReportPdf | 生成PDF报告 |

## 构建

```bash
npm run build
# 产物在 dist/ 目录
```
