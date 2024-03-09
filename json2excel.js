import xlsx from 'node-xlsx'
import { readFileSync, writeFileSync } from 'fs'
import { nested2flat } from './utils/index.js'

// 读取本地语言文件
const loadLocalJSONFile = (localeName, filePath, encoding = 'utf-8') => {
  const opt = {
    localeName: localeName,
    localeData: {},
    filePath: filePath,
  }
  if(filePath) {
    console.log('load file:', filePath);
    try {
      opt.localeData = JSON.parse(readFileSync(filePath, encoding))
      console.log(`----ok`);
    } catch (error) {
      console.log(`----fail: ${error}, set data to empty object`);
    }
  }
  return opt
}

// 源语言,将按照此语言的key值导出
const sourceLocale = loadLocalJSONFile('ja', './source/ja.json') // 修改为你的源语言文件路径
// 目标语言, 用于维护新语言, 如果已经有目标语言文件, 也可以设置并输出在目标列
const targetLocale = loadLocalJSONFile('zh-cn', './source/zh-cn.json') // 修改为你的目标语言文件路径(如果有)

// 处理导出数据
const exportData = [
  // 表头，用于标识源语言和目标语言，也用于导入的使用和校验
  ['key', sourceLocale.localeName, targetLocale.localeName],
  ...Object.entries(nested2flat(sourceLocale.localeData)).map(([key, value]) => {
    return [key, value, targetLocale.localeData[key] || '']
  })
]

// 导出为Excel文件
const fileName = `i18n_export_${new Date().valueOf()}.xlsx`
console.log(`generate ${fileName}`);
try {
  writeFileSync(`./dist/${fileName}`, xlsx.build([{data:exportData}]))
  console.log(`----ok`);
} catch (error) {
  console.log(`----fail: ${error}`)
}
