import { describe, expect, it } from "vitest"
import { isCellRef } from "../match"
import { getCellsInRange, getIndexFromCellName } from "../cellUtils"
import { ALPHABET_WITH_FILLER } from "../../constants"

// =================================================
// # TEST DATA
// =================================================

describe("cell utils", () => {
  it("extracts range", () => {
    const numOfCols = ALPHABET_WITH_FILLER.length - 1
    const rangeSimple: [number, number] = [0, 10]
    const rangeSingle: [number, number] = [0, 0]
    const rangeOverY: [number, number] = [1, 28]

    expect(getCellsInRange(...rangeSimple, numOfCols)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ])
    expect(getCellsInRange(...rangeSingle, numOfCols)).toEqual([0])
    expect(getCellsInRange(...rangeOverY, numOfCols)).toEqual([1, 2, 27, 28])
  })

  it("converts cell names to indices", () => {
    expect(getIndexFromCellName("A1")).toEqual(26)
    expect(getIndexFromCellName("B0")).toEqual(1)
  })

  it("matches cells", () => {
    expect(isCellRef("A1")).toEqual(true)
    expect(isCellRef("a01")).toEqual(true)
    expect(isCellRef("A001")).toEqual(false)
    expect(isCellRef("A999")).toEqual(false)
    expect(isCellRef("fA9")).toEqual(false)
  })
})
