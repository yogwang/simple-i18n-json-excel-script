# splitJsonByDepth 测试数据

用于验证 `splitJsonByDepth.js` 的嵌套 JSON 按层级切片功能。

## 文件说明

- `zh-CN.nested.json` - 中文嵌套数据
- `en.nested.json` - 英文嵌套数据

## 结构

顶层为 `common`、`pages`，各含子模块。depth=2 时按第二层切片，生成：

- `common/base/{lang}.json`
- `common/button/{lang}.json`
- `common/form/{lang}.json`
- `pages/home/{lang}.json`
- `pages/about/{lang}.json`

## 运行

修改 `splitJsonByDepth.js` 中的路径后执行：

```bash
npm run split-json
```

或直接调用（需先修改脚本中的输入路径为 `./source/genDemo/zh-CN.nested.json` 等）。
