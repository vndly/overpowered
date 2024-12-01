export const merge = (obj1: any, obj2: any): any => {
  const merged: any = {
    ...obj1,
  }
  Object.keys(obj2).forEach((key) => merged[key] = obj2[key] ? obj2[key] : merged[key])

  return merged
}
