export const isDate = (object: object): boolean => {
  return object && (Object.getPrototypeOf(object).constructor.name === 'Date')
}

export const isTimestamp = (object: object): boolean => {
  return object && (Object.getPrototypeOf(object).constructor.name === 'Timestamp')
}
