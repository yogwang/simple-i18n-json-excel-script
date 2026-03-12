import fs from 'fs';
import path from 'path';

// 生成当前时间目录名：temp{YYMMDD-时间戳}（全局一次，三次调用共用）
const __now = new Date();
const __year = __now.getFullYear().toString().slice(-2);
const __month = String(__now.getMonth() + 1).padStart(2, '0');
const __day = String(__now.getDate()).padStart(2, '0');
const __dateStr = `${__year}${__month}${__day}`;
const __timestamp = __now.getTime();
const __tempDirName = `temp${__dateStr}-${__timestamp}`;

// 示例调用，传入层级参数（默认层级为1，表示按第一层属性切片）
splitJsonByTopLevelProperties('./source/genDemo/zh-CN.nested.json', 'zh-CN', 2, __tempDirName);
splitJsonByTopLevelProperties('./source/genDemo/en.nested.json', 'en', 2, __tempDirName);

/**
 * 读取一个 JSON 文件，并按照指定的层级深度生成切片后的 JSON 文件。
 * 生成的文件存储在以属性路径命名的目录中，
 * 这些目录位于 `dist/temp{YYMMDD-时间戳}` 子目录下（如 dist/temp251103-1730615025123）。
 * 到达指定层级时，为每个属性创建以属性名命名的目录，并在该目录下生成使用 fixedKey 作为文件名的 JSON 文件。
 * @param {string} inputFilePath - 输入 JSON 文件的路径。
 * @param {string} fixedKey - 用作生成 JSON 文件名的固定 key。
 * @param {number} depth - 转换层级深度（从1开始，1表示第一层，2表示第二层，以此类推）。
 * @param {string} [customTempDirName] - 可选，外部传入的临时目录名（例如 tempYYMMDD-时间戳），传入则复用，不传则内部生成。
 *                         例如：depth=2 时，会将 common 下的 base、button、form 等属性分别生成
 *                         dist/temp251103-1730615025123/common/base/{fixedKey}.json、dist/temp251103-1730615025123/common/button/{fixedKey}.json 等文件。
 */
function splitJsonByTopLevelProperties(inputFilePath, fixedKey, depth = 1, customTempDirName) {
  if (!fs.existsSync(inputFilePath)) {
    console.error('输入文件不存在:', inputFilePath);
    return;
  }

  const inputData = fs.readFileSync(inputFilePath, 'utf-8');
  let jsonObject;

  try {
    jsonObject = JSON.parse(inputData);
  } catch (error) {
    console.error('解析 JSON 失败:', error.message);
    return;
  }

  if (typeof jsonObject !== 'object' || jsonObject === null) {
    console.error('无效的 JSON 结构。顶层应为对象。');
    return;
  }

  if (typeof depth !== 'number' || depth < 1) {
    console.error('层级参数必须是大于等于1的数字');
    return;
  }

  // 复用外部传入的目录名，否则内部生成
  const tempDirName = customTempDirName || (() => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    const timestamp = now.getTime();
    return `temp${dateStr}-${timestamp}`;
  })();
  const outputDir = path.resolve('dist', tempDirName);

  /**
   * 递归函数：按照指定层级深度遍历JSON对象并生成文件
   * @param {object} obj - 当前层级的对象
   * @param {number} currentDepth - 当前深度（从1开始）
   * @param {string} dirPath - 当前目录路径
   */
  function splitByDepth(obj, currentDepth, dirPath) {
    if (currentDepth === depth) {
      // 到达指定层级，遍历该层级的每个属性，用属性名创建目录，并在目录下生成fixedKey命名的JSON文件
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      Object.keys(obj).forEach((key) => {
        const value = obj[key];
        // 为每个属性创建以属性名命名的目录
        const propertyDir = path.join(dirPath, key);
        if (!fs.existsSync(propertyDir)) {
          fs.mkdirSync(propertyDir, { recursive: true });
        }
        // 在该目录下生成使用fixedKey作为文件名的JSON文件
        const outputFilePath = path.join(propertyDir, `${fixedKey}.json`);
        fs.writeFileSync(outputFilePath, JSON.stringify(value, null, 2), 'utf-8');
        console.log(`生成文件: ${outputFilePath}`);
      });
    } else {
      // 未到达指定层级，继续递归
      const hasNestedObjects = Object.values(obj).some(
        value => typeof value === 'object' && value !== null && !Array.isArray(value)
      );
      
      if (!hasNestedObjects) {
        // 如果当前对象的所有值都不是对象（已经是叶子节点），但还未到达指定层级
        // 说明指定的深度超出了实际嵌套深度，在当前层级按照属性名创建目录，并在目录下生成fixedKey命名的JSON文件
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
        
        Object.keys(obj).forEach((key) => {
          const value = obj[key];
          // 为每个属性创建以属性名命名的目录
          const propertyDir = path.join(dirPath, key);
          if (!fs.existsSync(propertyDir)) {
            fs.mkdirSync(propertyDir, { recursive: true });
          }
          // 在该目录下生成使用fixedKey作为文件名的JSON文件
          const outputFilePath = path.join(propertyDir, `${fixedKey}.json`);
          fs.writeFileSync(outputFilePath, JSON.stringify(value, null, 2), 'utf-8');
          console.log(`生成文件: ${outputFilePath} (实际深度不足，当前深度: ${currentDepth})`);
        });
        return;
      }

      // 继续遍历下一层级
      Object.keys(obj).forEach((key) => {
        const value = obj[key];
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // 如果是对象，继续递归到下一层级
          const nextDirPath = path.join(dirPath, key);
          splitByDepth(value, currentDepth + 1, nextDirPath);
        }
      });
    }
  }

  // 开始递归处理
  splitByDepth(jsonObject, 1, outputDir);
}

// 示例用法
// splitJsonByTopLevelProperties('path/to/your/input.json', 'fixedKey');
