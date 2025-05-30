import { assertEvent } from "xstate"
import type { Cell } from "./types"
import { Context, changeCellContent } from "./cellsMachine"
import { parseToAST } from "./parse/main"
import {
  AppError,
  InterpretError,
  ParseError,
  Result,
  UnknownError,
  fail,
  isSuccess,
  success,
} from "./parse/types/errors"
import { interpret } from "./parse/interpret"
import { isNumber } from "./parse/match"

// CONTROL FLOW
export function handleCellContentChange(
  context: Context,
  event: changeCellContent,
): Result<Cell[], AppError> {
  assertEvent(event, "changeCellContent")
  //console.log(`event.value: ${event.value}`)
  //console.log(`event.indexOfCell: ${event.indexOfCell}`)

  const updatedCells = structuredClone(context.cells)
  const oldCell = structuredClone(updatedCells[event.indexOfCell])

  // Evaluate content. Parse if formula.
  const maybeNewCell = updateCellContent(oldCell, event.value, context.cells)

  // Enrich ParseError with index of cell
  if (!isSuccess(maybeNewCell)) {
    return fail({
      indexOfCell: event.indexOfCell,
      cause: maybeNewCell.error,
    })
  }

  // Happy path: not formula or successfully parsed.
  //
  // Update dependencies.
  const { dependencies: oldDeps } = oldCell
  const { dependencies: newDeps } = maybeNewCell.value
  const { stale, fresh } = makeDiff(oldDeps, newDeps)
  const cellsWithUpdatedDeps = updateDeps(
    updatedCells,
    event.indexOfCell,
    stale,
    fresh,
  )

  // TODO: propagation
  // cells = propagateChanges(cells, event.indexOfCell)

  return success(
    cellsWithUpdatedDeps.toSpliced(event.indexOfCell, 1, maybeNewCell.value),
  )
}

// UTILS

// Update a single cell
// cells are needed for resolution when interpreting a formula like "1+A0"
function updateCellContent(
  cell: Cell,
  newContent: string,
  cells: Cell[],
): Result<Cell, ParseError | InterpretError | UnknownError> {
  const updatedCell = structuredClone(cell)
  updatedCell.content = newContent

  // If it looks like a formula, try parsing it.
  if (newContent[0] === "=") {
    // Could this be cleaner alternative for the following block?
    //const result = isSuccess(astResult)
    //  ? interpret(astResult.value, cells)
    //  : astResult // early fail

    const maybeEvalResult = safeEval(newContent.slice(1), cells)
    if (!isSuccess(maybeEvalResult)) {
      return maybeEvalResult
    }

    // Happy path: formula has been successfully parsed.
    // Update cell with result of calculation and new dependencies
    updatedCell.value = maybeEvalResult.value.res
    updatedCell.dependencies = maybeEvalResult.value.deps
  } else {
    // Not a formula. Clear dependencies.
    updatedCell.dependencies = []
    // but numeric value would still be usable
    updatedCell.value = isNumber(newContent)
      ? parseFloat(newContent)
      : undefined
  }

  // It's not a formula or parsing was success.
  return success(updatedCell)
}

// Wraps parsing in try catch
function safeEval(
  formula: string,
  cells: Cell[],
): Result<
  { res: number; deps: number[] },
  ParseError | InterpretError | UnknownError
> {
  try {
    const maybeAST = parseToAST(formula)
    //console.log(`AFTER PARSE: ${JSON.stringify(parseResult)}`)
    if (!isSuccess(maybeAST)) {
      return maybeAST
    }

    const maybeFormula = interpret(maybeAST.value, cells)

    // Pass along either error or result
    return maybeFormula
  } catch (e: unknown) {
    // This shouldn't happen
    if (typeof e === "string") {
      console.error("Oops! Unexpected error: ", e)
    } else if (e instanceof Error) {
      console.error("Oops! Unexpected error: ", e.message)
    } else {
      console.error("Double oops! Something very unexpected: ", e)
    }

    // Not sure what the state here is.
    // So I'm not sure how to handle this.
    // Crash app?
    //
    // Clear cell, for now.
    return fail({
      type: "UNKNOWN_ERROR",
      err: e,
    })
  }
}

// Make diff of to numeric arrays
// used to make a list of stale/fresh dependencies to update.
function makeDiff(
  oldDeps: number[],
  newDeps: number[],
): { stale: number[]; fresh: number[] } {
  const stale: number[] = oldDeps.filter((index) => !newDeps.includes(index))
  const fresh: number[] = newDeps.filter((index) => !oldDeps.includes(index))

  return { stale, fresh }
}

// Update cell array with changed dependencies.
// stale = cells that lost `changed` cell as a dependent
// fresh = cells that gained `changed` cell as a dependent
function updateDeps(
  cells: Cell[],
  changed: number,
  stale: number[],
  fresh: number[],
) {
  const updatedCells = structuredClone(cells)

  stale.forEach((index) => {
    const cellThatLostDep = updatedCells[index]
    const indexOfElementToRemove = cellThatLostDep.dependents.indexOf(changed)

    if (indexOfElementToRemove === -1) {
      return
    }

    cellThatLostDep.dependents.splice(indexOfElementToRemove, 1)
  })

  fresh.forEach((index) => {
    const cellThatGainedDep = updatedCells[index]
    const indexOfElementToAdd = cellThatGainedDep.dependents.indexOf(changed)

    if (indexOfElementToAdd !== -1) {
      return
    }

    cellThatGainedDep.dependents.push(changed)
  })

  return updatedCells
}

//export function withPropagatedChanges(
//  cells: Cell[],
//  indexOfChangedCell: number,
//): { errors: AppError[] | []; cellsAfterPropagation: Cell[] } {
//  const cellsAfterPropagation = structuredClone(cells)
//  let errors: AppError[] | [] = []
//
//  function propagate(fromThisIndex: number) {
//    cellsAfterPropagation[fromThisIndex].dependents.forEach(
//      (indexOfCellToRecalculate) => {
//        const cellToUpdate = cellsAfterPropagation[indexOfCellToRecalculate]
//        const { errorMessage, cleanTokens, value } = parseInput(
//          cellToUpdate.content,
//          cellsAfterPropagation,
//        )
//        cellToUpdate.value = value
//        cellToUpdate.dependencies = cleanTokens
//        if (errorMessage !== "") {
//          console.log(`errorMessage: ${errorMessage}`)
//
//          errors = [
//            ...errors,
//            {
//              indexOfCell: indexOfCellToRecalculate,
//              message: errorMessage,
//            },
//          ]
//        }
//        propagate(indexOfCellToRecalculate)
//      },
//    )
//  }
//
//  propagate(indexOfChangedCell)
//
//  return { errors, cellsAfterPropagation }
//}
