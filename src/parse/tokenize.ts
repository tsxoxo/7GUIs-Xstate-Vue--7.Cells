// =================================================
// TOKENIZER
// =================================================
//
// Takes string.
// Outputs a list of objects that
// is easier to work with.
//
// Example
// In: "11*(2+3)"
// Out (simplified): [{ value: "11"}, {value: "*"}, ...]
//
// NB: Fails fast -- Throws on the first error

import {
  isCellRef,
  isFunc,
  isNumber,
  isOp,
  isParens,
  isWhitespace,
} from "./match"
import { ParseError, Result, fail, success } from "./types/errors"
import { Token } from "./types/grammar"

export function tokenize(str: string): Result<Token[], ParseError> {
  const tokens = [] as Token[]

  let ind = 0

  while (ind < str.length) {
    // Ignore whitespace
    if (isWhitespace(str[ind])) {
      ind++
      continue
    }

    const result = getNextToken(ind)

    if (result.ok === true) {
      const token = result.value
      token.position.end = token.position.start + ind

      tokens.push(token)
      ind += token.value.length
    } else {
      // error state
      return result
    }
  }

  return success(tokens)

  function getNextToken(start: number): Result<Token, ParseError> {
    const token = createEmptyToken(ind)
    const char = str[start]

    if (isOp(char)) {
      token.type = "op"
      token.value = char
      return success(token)
    }

    if (isParens(char)) {
      token.type = "parens"
      token.value = char
      return success(token)
    }

    // Lump all other valid symbols together for simplicity. We differentiate below.
    if (/[a-zA-Z0-9,.]/.test(char)) {
      let _ind = ind
      while (_ind < str.length) {
        if (/[a-zA-Z0-9,.]/.test(str[_ind])) {
          token.value += str[_ind]
          _ind++
        } else {
          break
        }
      }

      // Potential token has been collected and can be evaluated.
      if (isNumber(token.value)) {
        token.type = "number"
        return success(token)
      }
      if (isCellRef(token.value)) {
        token.type = "cell"
        return success(token)
      }
      if (isFunc(token.value)) {
        token.type = "func"
        return success(token)
      }

      // Invalid char or valid chars in wrong order.
      return fail({
        type: "TOKEN",
        token,
        msg: `getNextToken: unknown token with value "${token.value}"`,
      })
    }

    // Neither an op, a parens, a number, a cell, or a function keyword.
    return fail({
      type: "TOKEN",
      token,
      msg: `getNextToken: invalid char "${char}"`,
    })
  }
}

// =================================================
// UTILS
// =================================================
// Factory
function createEmptyToken(start: number): Token {
  // Initialize with start pos and dummy values.
  return {
    position: {
      start: start,
      end: -1,
    },
    value: "",
    type: undefined,
  }
}
