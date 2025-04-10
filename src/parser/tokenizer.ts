// =================================================
// TOKENIZER
// =================================================
//
// Takes raw string.
// Outputs a list of objects that
// is easier to work with.
//
// Example
// In: "11*(2+3)"
//

import { isValidValue } from "./matchers"
import { AppError } from "./types/errors"
import { ALLOWED_SYMBOLS, Token } from "./types/grammar"

// Out(approximation): {tokens: [{value: 11, position: {...}, ...}, ...], errors: []}
export function tokenize(rawInput: string): {tokens: Token[], errors: AppError[]} {
  const tokens = [] as Token[]
  const errors = [] as AppError[]

  for(let ind = 0; ind < rawInput.length; ind++) {
    // if it's anything else (ideally, numbers, points for floats and cell references)
    // keep going until an op and add that whole chunk as an atom
    if(isValidValue(rawInput[ind])) {
      const token = createEmptyToken(ind)

      while(isValidValue(rawInput[ind])) {
        if( ind < rawInput.length ) {
          ind++
        } else {
          break
        }
      }
      // Outside of the while loop so it's not a valid *value* char.
      // We take the hunk we have accumulated so far.
      token.position.end = ind
      token.type = 'value'
      token.value = rawInput.substring(token.position.start, token.position.end)
      //atom.value = parseFloat(atom.value)

      tokens.push(token)

      // After that, we are on a new index so we 
      // continue with the iteration
      // instead of using continue ;)
    }

    // if it's a bracket, add char to atoms
    if(ALLOWED_SYMBOLS.brackets.includes(rawInput[ind])) {
      const token = createEmptyToken(ind)

      token.position.end = ind + 1
      token.type = 'brack'
      token.value = rawInput[ind]

      tokens.push(token)

      continue
    }

    // if it's an op, add char to atoms
    if(ALLOWED_SYMBOLS.ops.includes(rawInput[ind])) {
      const atom = createEmptyToken(ind)

      atom.position.end = ind + 1
      atom.type = 'op'
      atom.value = rawInput[ind]

      tokens.push(atom)

      continue
    }

    if( ind < rawInput.length ) {
      // Must be an invalid character.
      errors.push({
        type: 'char',
        position: ind,
      })
    }
  }

  //console.log(errors)
  //console.log(tokens)
  return {
    tokens,
    errors
  }
}

// =================================================
// UTILS
// =================================================
// Factory
function createEmptyToken(start: number): Token {
  return {
    position: {
      start: start,
      end: -1 // Will be filled in later
    },
    value: "",
    type: ""
  };
}

