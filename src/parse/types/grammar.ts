// =================================================
// # GRAMMAR
// =================================================
//
// * expression ::= term (('+' | '-') term)*
// * term ::= factor (('*' | '/') factor)*
// * factor ::= number | cell | '(' expression ')' | function
// * function ::= ('MULT' | 'SUM') '(' range ')'
// * range ::=  cell ':' cell
// * number ::= [0-9]+ (( ',' | '.' ) [0-9]+)?
// * cell ::= [a-zA-Z][0-9][0-9]?
//
// ## RegEx
// * Bracket: /[()]/
// * Operator: /[+-\/*]{1}/
// * Number: /[0-9]+((,|\.)[0-9]+)?/
// * Cell_ref: /[a-zA-Z]{1}[0-9]{1,2}

export type TokenType = "number" | "cell" | "op" | "parens" | "func" | undefined

export type Token = {
  value: string
  type: TokenType
  position: {
    start: number
    end: number
  }
}

export type Node = Node_Binary | Node_Number | Node_Cell | Node_Func

interface Node_Base {
  type: string
  value: string
  position: {
    start: number
    end: number
  }
}

// Binary operators: ['+', '-', '*', '/'],
export interface Node_Binary extends Node_Base {
  type: "binary_op"
  left: Node
  right: Node
}

export interface Node_Number extends Node_Base {
  type: "number"
}

export interface Node_Cell extends Node_Base {
  type: "cell"
}

export interface Node_Func extends Node_Base {
  type: "func"
  from: Node_Cell
  to: Node_Cell
}
