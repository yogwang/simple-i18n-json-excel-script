import xlsx from 'node-xlsx'
import { readFileSync, writeFileSync } from 'fs'
import { flat2nested } from './utils/index.js'

// 目标JSON格式，默认为 flat
const JSON_TYPE = 'flat' // flat | nested

// 读取 excel 文件，获取语言数据
const workSheetsFromBuffer = xlsx.parse(readFileSync('./source/i18n_demo copy.xlsx')) // 修改为你的excel文件路径
const localeData = workSheetsFromBuffer[0].data
// 获取 excel 语言列
const [_, ...langList] = localeData.shift()

// 遍历excel数据，生成语言数据
let tempLocalData = localeData.reduce((locale, rowData) => {
  const [key, ...values] = rowData
  langList.forEach((lang, index) => {
    const langData = locale[lang] || {}
    langData[key] = values[index]
    locale[lang] = langData
  })
  return locale
}, {} /* 初始值 */)

// 循环生成对应语言的json文件
Object.entries(tempLocalData).forEach(([lang, data]) => {
  console.log(`generate ${lang}.json`);
  try {
    const isNested = JSON_TYPE === 'nested'
    const localeData = isNested ? flat2nested(data) : data
    writeFileSync(`./dist/${lang}.${JSON_TYPE}.json`, JSON.stringify(localeData, null, 2))
    console.log(`----ok`);
  } catch (error) {
    console.log(`----fail: ${error}`)
  }
})
