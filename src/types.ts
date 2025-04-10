export interface CleanToken {
    value: number,
    indexOfOriginCell: number
}
export interface Cell {
  // raw user input
  content: string,
  // what is displayed: raw input or result of formula 
  value: string | number,
  // indices of cells used in formula
  dependencies: CleanToken[],
  // cells that reference this cell
  dependents: number[]
}

export interface AppError {
    indexOfCell: number,
    message: string
}
