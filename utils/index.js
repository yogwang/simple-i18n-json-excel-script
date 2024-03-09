// flat形式的key值转换成 nested 对象形式
export const flat2nested = (obj) => {
  const result = {}
  for (const key in obj) {
    const keys = key.split('.')
    let temp = result
    for (let i = 0; i < keys.length - 1; i++) {
      if (!temp[keys[i]]) {
        temp[keys[i]] = {}
      }
      temp = temp[keys[i]]
    }
    temp[keys[keys.length - 1]] = obj[key]
  }
  return result
}

// nested形式的对象拉平为flat形式
export const nested2flat = (data, fatherKey='') => {
  let tempObj = {}
  for(let key in data){
    let prefix = `${fatherKey ? fatherKey + '.' : ''}${key}`
    if(typeof data[key] === 'object')  {
      Object.assign(tempObj, nested2flat(data[key], prefix))
    } else {
      tempObj[prefix] = data[key]
    }
  }
  return tempObj
}


