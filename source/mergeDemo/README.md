# mergeI18nData 测试数据

用于验证 `mergeI18nData.js` 的两种目录模式。

## 模式 A：moduleName/lang.json

文件名为语言码，父路径为模块路径。支持嵌套。

- `patternA/button/en.json` → `button`
- `patternA/form/en.json` → `form`
- `patternA/common/base/en.json` → `common/base`（嵌套）

## 模式 B：lang/moduleName.json

父目录名为语言码，文件名为模块名。当前实现要求 JSON 直接位于语言目录下。

- `patternB/en/header.json` → `header`
- `patternB/en/footer.json` → `footer`

## 运行合并

```bash
npm run merge-json -- --dir ./source/test --outDir ./dist/merged-test
```
