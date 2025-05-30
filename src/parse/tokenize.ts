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
import {
  ErrorType,
  Failure,
  ParseError,
  Result,
  fail,
  success,
} from "./types/errors"
import { Token } from "./types/grammar"

const ALPHANUM = /[a-zA-Z0-9]/

export function tokenize(str: string): Result<Token[], ParseError> {
  const tokens = [] as Token[]
  let ind = 0

  while (ind < str.length) {
    // Ignore whitespace
    if (isWhitespace(str[ind])) {
      ind++
      continue
    }

    const result = getNextToken(ind, str)

    if (result.ok === true) {
      const token = result.value
      token.position.end = token.position.start + token.value.length

      tokens.push(token)
      ind += token.value.length

      // after that, loop continues
    } else {
      // error state
      const token = result.error.token

      if (token == null) {
        return result
      }

      token.position.end = token.position.start + token.value.length

      return result
    }
  }

  // loop over with no errors
  return success(tokens)
}

// =================================================
// UTILS
// =================================================
// Factories
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

function createError({
  type,
  token,
  expected,
}: {
  type: ErrorType
  // Not sure how much sense it make to expect 'null'
  token: Token | null
  expected: string
}): Failure<ParseError> {
  const tokenDisplayString = token === null ? "null" : token.value
  return fail({
    type,
    token,
    msg: `${type} in Tokenizer: expected [${expected}], got [${tokenDisplayString}]`,
  })
}

// The meat and potatoes
function getNextToken(start: number, str: string): Result<Token, ParseError> {
  const token = createEmptyToken(start)
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

  // Is it a number?
  const CHARS_NUM = /[0-9,.]/
  if (CHARS_NUM.test(char)) {
    // Build up the token.
    let _ind = start
    while (_ind < str.length) {
      const char = str[_ind]
      if (CHARS_NUM.test(char)) {
        token.value += char
        _ind++
      } else {
        if (isOp(char)) {
          break
        }
        if (isParens(char)) {
          break
        }
        if (isWhitespace(char)) {
          _ind++
          continue
        }

        // Unexpected char.
        // Lump together invalid chars and letters, for now.
        // Exampes: "3a", "5$"
        //
        // Add faulty char for error handling.
        token.value += char
        return createError({
          type: "INVALID_NUMBER",
          token,
          expected: "number-symbol [0-9,.]",
        })
      }
    }

    // Potential token has been collected and can be evaluated.
    if (isNumber(token.value)) {
      token.type = "number"
      return success(token)
    }

    // Number-like chars but an invalid pattern.
    // Examples: "12,3.", "."
    // We throw the same error as above
    //
    // Add faulty char for error handling.
    token.value += char
    return createError({
      type: "INVALID_NUMBER",
      token,
      expected: "correctly formed number",
    })
  }

  if (ALPHANUM.test(char)) {
    return parseAlphaNumeric(start, token, str)
  }

  // Neither an op, a parens, a number, a cell, or a function keyword.
  // Add faulty char for error handling.
  token.value += char
  return createError({
    type: "INVALID_CHAR",
    token,
    expected: "valid char",
  })
}
// Specialized tokenizers (cells, funcs)
//
// Parses potential cell refs and function names.
// Merrily accrues all valid chars.
// Validation happens separately.
function parseAlphaNumeric(
  start: number,
  token: Token,
  str: string,
): Result<Token, ParseError> {
  let _ind = start
  // We already know the first char is alphanumeric
  token.value += str[_ind]
  _ind++

  while (_ind < str.length) {
    const char = str[_ind]
    if (ALPHANUM.test(char)) {
      token.value += char
      _ind++
    } else {
      if (isOp(char)) {
        break
      }
      if (isParens(char)) {
        break
      }
      if (isWhitespace(char)) {
        _ind++
        continue
      }

      // Unexpected char.
      // Catch  "A_", etc.
      // Add to token for error handling
      token.value += char
      return createError({
        type: "INVALID_CELL",
        token,
        expected: "cell reference",
      })
    }
  }

  // Potential token has been collected and can be evaluated.
  return validateToken(token)
}

function validateToken(token: Token): Result<Token, ParseError> {
  // HAPPY STATES
  if (isCellRef(token.value)) {
    token.type = "cell"
    return success(token)
  }
  if (isFunc(token.value)) {
    token.type = "func"
    return success(token)
  }

  // ERRORS
  // Differentiate between malformed cell refs and unknown func names
  // Example: "a999" vs "foo"
  if (/^[a-zA-Z]{1}[0-9]+/.test(token.value)) {
    return createError({
      type: "INVALID_CELL",
      token,
      expected: "valid cell reference",
    })
  }
  if (/^[a-zA-Z]+/.test(token.value)) {
    return fail({
      type: "UNKNOWN_FUNCTION",
      token,
      expected: "valid function reference",
    })
  }

  // Safety net. Not sure if we ever hit this.
  //
  // TODO: START_HERE
  // Add more granular errors for rest of parsing pipeline,
  return createError({
    type: "UNKNOWN_ERROR",
    token,
    expected: "valid token (this is an unknown error)",
  })
}
