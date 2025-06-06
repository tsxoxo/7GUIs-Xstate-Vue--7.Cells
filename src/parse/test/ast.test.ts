import { describe, expect, it } from "vitest"
import { Parser } from "../ast"
import { Token, TokenType } from "../types/grammar"
import { assertBinaryOp, assertIsFail, assertIsSuccess } from "../types/errors"

// =================================================
// # UTILS
// =================================================
function makeTokens(
  simplifiedTokens: {
    type: TokenType
    value: string
    position?: { start: number; end: number }
  }[],
): Token[] {
  const tokens = simplifiedTokens.map(
    ({ type, value, position }): Token => ({
      type,
      value,
      position: position ?? {
        start: 0,
        end: 0,
      },
    }),
  )

  return tokens
}

// =================================================
// # TEST DATA
// =================================================

// "2+3"
const validExpressionTokens = makeTokens([
  { type: "number", value: "2", position: { start: 0, end: 1 } },
  { type: "op", value: "+", position: { start: 1, end: 2 } },
  { type: "number", value: "3", position: { start: 2, end: 3 } },
])

const validExpressionTree = {
  type: "binary_op",
  value: "+",
  position: { start: 0, end: 3 }, // Entire expression
  left: {
    type: "number",
    value: "2",
    position: { start: 0, end: 1 },
  },
  right: {
    type: "number",
    value: "3",
    position: { start: 2, end: 3 },
  },
}

// "2*3"
const validTermTokens = makeTokens([
  { type: "number", value: "2", position: { start: 0, end: 1 } },
  { type: "op", value: "*", position: { start: 1, end: 2 } },
  { type: "number", value: "3", position: { start: 2, end: 3 } },
])
const validTermTree = {
  type: "binary_op",
  value: "*",
  position: { start: 0, end: 3 }, // Entire expression
  left: {
    type: "number",
    value: "2",
    position: { start: 0, end: 1 },
  },
  right: {
    type: "number",
    value: "3",
    position: { start: 2, end: 3 },
  },
}

// "1+2*3"
const validExpressionWithTermTokens = makeTokens([
  { type: "number", value: "1" },
  { type: "op", value: "+" },
  { type: "number", value: "2" },
  { type: "op", value: "*" },
  { type: "number", value: "3" },
])

// Edge: chained multiplication
const validChainedMultTokens = makeTokens([
  { type: "number", value: "2" },
  { type: "op", value: "*" },
  { type: "number", value: "3" },
  { type: "op", value: "*" },
  { type: "number", value: "4" },
])
// const validChainedMultTree
//   type: "binary_op",
//   value: "*",
//   left: { type: "number", value: "2" },
//   right: { type: "number", value: "3" },
// }

// cell refs
// "A00*a1"
const validCells = makeTokens([
  { type: "cell", value: "A00", position: { start: 0, end: 3 } },
  { type: "op", value: "*", position: { start: 3, end: 4 } },
  { type: "cell", value: "a1", position: { start: 4, end: 6 } },
])
const validCellsTree = {
  type: "binary_op",
  value: "*",
  position: { start: 0, end: 6 }, // Entire expression
  left: {
    type: "cell",
    value: "A00",
    position: { start: 0, end: 3 },
  },
  right: {
    type: "cell",
    value: "a1",
    position: { start: 4, end: 6 },
  },
}

// Brackets
// "(1+2)*3"
const validParens = makeTokens([
  { type: "parens", value: "(" },
  { type: "number", value: "1" },
  { type: "op", value: "+" },
  { type: "number", value: "2" },
  { type: "parens", value: ")" },
  { type: "op", value: "*" },
  { type: "number", value: "3" },
])

// Functions
// "SUM(A1:A2)*3"
const validFunc = makeTokens([
  { type: "func", value: "SUM", position: { start: 0, end: 3 } },
  { type: "parens", value: "(", position: { start: 3, end: 4 } },
  { type: "cell", value: "A1", position: { start: 4, end: 6 } },
  { type: "op", value: ":", position: { start: 6, end: 7 } },
  { type: "cell", value: "A2", position: { start: 7, end: 9 } },
  { type: "parens", value: ")", position: { start: 9, end: 10 } },
  { type: "op", value: "*", position: { start: 10, end: 11 } },
  { type: "number", value: "3", position: { start: 11, end: 12 } },
])
const validFuncTree = {
  type: "binary_op",
  value: "*",
  position: { start: 0, end: 12 }, // Entire expression
  left: {
    type: "func",
    value: "SUM",
    position: { start: 0, end: 10 }, // "SUM(A1:A2)"
    from: {
      type: "cell",
      value: "A1",
      position: { start: 4, end: 6 },
    },
    to: {
      type: "cell",
      value: "A2",
      position: { start: 7, end: 9 },
    },
  },
  right: {
    type: "number",
    value: "3",
    position: { start: 11, end: 12 },
  },
}
// INVALID
// Functions
// Invalid token
// "SUM(A1*A2)*3"
const invFunc_token = makeTokens([
  { type: "func", value: "SUM" },
  { type: "parens", value: "(" },
  { type: "cell", value: "A1" },
  { type: "op", value: "*" },
  { type: "cell", value: "A2" },
  { type: "parens", value: ")" },
  { type: "op", value: "*" },
  { type: "number", value: "3" },
])

// Bad parens
const invFunc_missingClose = makeTokens([
  { type: "func", value: "SUM" },
  { type: "parens", value: "(" },
  { type: "cell", value: "A1" },
  { type: "op", value: ":" },
  { type: "cell", value: "A2" },
  { type: "op", value: "*" },
  { type: "number", value: "3" },
])
const invFunc_doubleOpen = makeTokens([
  { type: "func", value: "SUM" },
  { type: "parens", value: "(" },
  { type: "parens", value: "(" },
  { type: "cell", value: "A1" },
  { type: "op", value: ":" },
  { type: "cell", value: "A2" },
  { type: "parens", value: ")" },
  { type: "op", value: "*" },
  { type: "number", value: "3" },
])
const invFunc_missingSecondCell = makeTokens([
  { type: "func", value: "SUM" },
  { type: "parens", value: "(" },
  { type: "cell", value: "A1" },
  { type: "op", value: ":" },
  { type: "parens", value: ")" },
])

describe("Parser", () => {
  it("parses expression", () => {
    const parser = new Parser(validExpressionTokens)
    const parseResult = parser.makeAST()

    assertIsSuccess(parseResult)

    expect(parseResult.value).toEqual(validExpressionTree)
  })

  it("parses term", () => {
    const parser = new Parser(validTermTokens)
    const parseResult = parser.makeAST()

    assertIsSuccess(parseResult)

    expect(parseResult.value).toEqual(validTermTree)
  })

  it("parses expression with term", () => {
    const parser = new Parser(validExpressionWithTermTokens)
    const parseResult = parser.makeAST()

    assertIsSuccess(parseResult)

    const tree = parseResult.value

    assertBinaryOp(tree)

    expect(tree.value).toEqual("+")
    expect(tree.left.value).toEqual("1")
    expect(tree.right.type).toEqual("binary_op")
    expect(tree.right.value).toEqual("*")
  })

  it("parses chained multiplication", () => {
    const parser = new Parser(validChainedMultTokens)
    const parseResult = parser.makeAST()

    assertIsSuccess(parseResult)

    const tree = parseResult.value

    assertBinaryOp(tree)

    expect(tree.value).toEqual("*")
    expect(tree.left.type).toEqual("binary_op")
    expect(tree.left.value).toEqual("*")
    expect(tree.right.value).toEqual("4")
  })

  it("parses cells", () => {
    const parser = new Parser(validCells)
    const parseResult = parser.makeAST()

    assertIsSuccess(parseResult)

    expect(parseResult.value).toEqual(validCellsTree)
  })

  it("parses parens", () => {
    // "(1+2)*3"
    const parser = new Parser(validParens)
    const parseResult = parser.makeAST()

    assertIsSuccess(parseResult)

    const tree = parseResult.value

    assertBinaryOp(tree)

    expect(tree.value).toEqual("*")

    assertBinaryOp(tree.left)
    expect(tree.left.value).toEqual("+")
    expect(tree.left.left.value).toEqual("1")
    expect(tree.left.right.value).toEqual("2")

    expect(tree.right.type).toEqual("number")
    expect(tree.right.value).toEqual("3")
  })

  it("parses functions", () => {
    // "SUM(A1:A2)*3"
    const parser = new Parser(validFunc)
    const parseResult = parser.makeAST()

    assertIsSuccess(parseResult)

    const tree = parseResult.value
    expect(tree).toEqual(validFuncTree)
  })

  it("catches invalid token inside function", () => {
    // "SUM(A1*A2)*3"
    const parser = new Parser(invFunc_token)
    const parseResult = parser.makeAST()

    assertIsFail(parseResult)
    expect(parseResult.error.type).toEqual("UNEXPECTED_TOKEN")
    expect(parseResult.error.payload!.value).toEqual("*")
  })

  it("catches invalid parens around function", () => {
    // "SUM(A1:A2*3"
    const missingClose = new Parser(invFunc_missingClose).makeAST()
    // "SUM((A1:A2)*3"
    const doubleOpen = new Parser(invFunc_doubleOpen).makeAST()

    //
    const missingSecondCell = new Parser(invFunc_missingSecondCell).makeAST()

    assertIsFail(missingSecondCell)
    expect(missingSecondCell.error.type).toBe("UNEXPECTED_TOKEN")
    expect(missingSecondCell.error.msg).toContain("range")
    expect(missingSecondCell.error.payload!.value).toBe(")")

    assertIsFail(missingClose)
    expect(missingClose.error.type).toEqual("PARENS")
    expect(missingClose.error.payload!.value).toEqual("*")

    assertIsFail(doubleOpen)
    expect(doubleOpen.error.type).toEqual("UNEXPECTED_TOKEN")
    expect(doubleOpen.error.payload!.value).toEqual("(")
  })
})
