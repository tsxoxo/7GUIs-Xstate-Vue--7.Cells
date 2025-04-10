import type { AppError, Cell, CleanToken } from './types'
import { ALPHABET_WITH_FILLER, NUM_OF_ROWS } from "./constants"

function isCellName(s: string) {
    return /^\w{1}\d\d?$/.test(s.toLocaleLowerCase())
}
function getIndexFromCellName(cellName: string) {
    // cellName examples: 'A1', 'B99'
    // We call the letter x and the number y such as 'A0' === (1, 1)
    const x = ALPHABET_WITH_FILLER.indexOf(cellName[0])
    const y = Number(cellName.slice(1)) + 1

    return NUM_OF_ROWS * (x - 1) + y - 1
}
function isFormula(input: string): boolean {
    return input[0] === '='
}
function tokenize(input: string): string[] {
    // remove whitespaces
    const sanitizedInput = (s: string) => {
        // ...from edges
        const trimmedString = s.trim()
        const sanitizedString = trimmedString
        return sanitizedString
    }
    const tokens = sanitizedInput(input).split('+')

    return tokens.map(token => token.trim())
}
function parseToken(token: string, cells: Cell[]): { cleanToken: CleanToken, errorMessage: string } {
    let errorMessage = '';
    let indexOfOriginCell = -1
    let value: number = 0

    if (!isNaN(Number(token))) {
        // token evaluates to a number
        value = Number(token)
    } else {
        // token is a string
        if (isCellName(token)) {
            const index = getIndexFromCellName(token)
            if (cells[index] === undefined) {
                errorMessage = `Sorry, something went wrong! Please try something else ¯\_(ツ)_/¯`
            } else {
                if (isNaN(Number(cells[index].value))) {
                    errorMessage = `Sorry, the referenced cell ${token} doesn't contain a valid number ¯\_(ツ)_/¯`
                } else {
                    // referenced cell contains a number
                    indexOfOriginCell = index
                    value = Number(cells[index].value)
                }
            }
        } else {
            //token is string but not a cell name
            errorMessage = `Sorry, I can't work with '${token}' ¯\_(ツ)_/¯`
        }
    }

    return {
        errorMessage,
        cleanToken: {
            value,
            indexOfOriginCell
        }
    }
}
function parseTokens(tokens: string[], cells: Cell[]): { errorMessage: string, cleanTokens: CleanToken[] } {
    let errorMessage = ''
    const cleanTokens: CleanToken[] = []

    for (const token of tokens) {
        const { errorMessage: tokenErrorMessage, cleanToken } = parseToken(token, cells)

        if (tokenErrorMessage !== '') {
            errorMessage = tokenErrorMessage
            break
        } else {
            cleanTokens.push(cleanToken)
        }
    }

    return { errorMessage, cleanTokens }
}
function calculateResult(tokens: CleanToken[]): number {
    return tokens.reduce((sum, cleanToken) => sum += cleanToken.value, 0)
}

export const parseInput = (input: string, cells: Cell[]): { errorMessage: string, cleanTokens: CleanToken[] | [], value: string | number } => {
    let errorMessage: string = ''
    let cleanTokens: CleanToken[] | [] = []
    let value: string | number = input

    if (isFormula(input)) {
        // Skip the starting '=' of the formula
        const tokens: string[] = tokenize(input.slice(1));
        ({ errorMessage, cleanTokens } = parseTokens(tokens, cells))

        if (errorMessage === '') {
            value = calculateResult(cleanTokens)
        }
    }

    return { errorMessage, cleanTokens, value }
}

export function withPropagatedChanges(cells: Cell[], indexOfChangedCell: number): { errors: AppError[] | [], cellsAfterPropagation: Cell[] } {
    let cellsAfterPropagation = structuredClone(cells)
    let errors: AppError[] | [] = [];

    function propagate(fromThisIndex: number) {
        cellsAfterPropagation[fromThisIndex].dependents.forEach((indexOfCellToRecalculate) => {
            const cellToUpdate = cellsAfterPropagation[indexOfCellToRecalculate]
            const { errorMessage, cleanTokens, value } = parseInput(cellToUpdate.content, cellsAfterPropagation)
            cellToUpdate.value = value
            cellToUpdate.dependencies = cleanTokens
            if (errorMessage !== '') {
                console.log(`errorMessage: ${errorMessage}`);

                errors = [...errors, {
                    indexOfCell: indexOfCellToRecalculate,
                    message: errorMessage
                }]
            }
            propagate(indexOfCellToRecalculate)
        })
    }

    propagate(indexOfChangedCell)

    return { errors, cellsAfterPropagation }
}

export function withUpdatedCellDependencies(cells: Cell[], oldTokens: CleanToken[] | [], indexOfChangedCell: number): Cell[] {
    const newTokens = cells[indexOfChangedCell].dependencies
    const updatedCells = structuredClone(cells)
    const newCellsReferences: number[] | [] = newTokens.filter((token: CleanToken) => token.indexOfOriginCell > -1).map(token => token.indexOfOriginCell)
    const oldCellsReferences: number[] | [] = oldTokens.filter((token: CleanToken) => token.indexOfOriginCell > -1).map(token => token.indexOfOriginCell)
    const cellsThatLostDep: number[] | [] = oldCellsReferences.filter(index => !newCellsReferences.includes(index))
    const cellsThatGainedDep: number[] | [] = newCellsReferences.filter(index => !oldCellsReferences.includes(index))

    cellsThatLostDep.forEach((index) => {
        const cellToUpdate = updatedCells[index]
        const indexOfElementToRemove = cellToUpdate.dependents.indexOf(indexOfChangedCell)

        if (indexOfElementToRemove === -1) {
            return
        }

        cellToUpdate.dependents.splice(indexOfElementToRemove, 1)
    })

    cellsThatGainedDep.forEach((index) => {
        const cellToUpdate = updatedCells[index]

        // Check for duplicates. TODO: mb make this a Set
        const indexOfElementToAdd = cellToUpdate.dependents.indexOf(indexOfChangedCell)
        if (indexOfElementToAdd !== -1) {
            return
        }

        cellToUpdate.dependents.push(indexOfChangedCell)
    })

    return updatedCells
}

export function handleErrors(errors: AppError[] | []) {
    errors.length > 0 && errors.forEach(error => {
        console.log(`We've got an error in cell ${error.indexOfCell} -- keep calm and carry on!\nHere's the error message: ${error.message}`)
    }
    )
}
