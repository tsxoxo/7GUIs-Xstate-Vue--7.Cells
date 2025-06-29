// ===============================================================
// --- GRAMMAR -------------------------------------------------
//
// The fundamental rules and patterns used in the parser.
// ===============================================================
//
// * expression ::= term (('+' | '-') term)*
// * term ::= factor (('*' | '/') factor)*
// * factor ::= number | cell | '(' expression ')' | function
// * function ::= ('MULT' | 'SUM') '(' range ')'
// * range ::=  cell ':' cell
// * number ::= [0-9]+ (( ',' | '.' ) [0-9]+)?
// * cell ::= [a-zA-Z][0-9][0-9]?
//
// TODO: move matchers here, export one big matcher object.

import { FunctionKeyword } from "../func"

//============================================================
// --- PATTERNS ----------------------------------------------
//============================================================
// Atoms
export const P_OPERATORS_BIN = ["+", "-", "*", "/"] as const
export type Operator = (typeof P_OPERATORS_BIN)[number]

export const P_OPERATORS_RANGE = [":"] as const
export type OperatorRange = (typeof P_OPERATORS_RANGE)[number]

export const P_OPERATORS_LIST = [":"] as const
export type Operatorlist = (typeof P_OPERATORS_LIST)[number]

export const P_CHARS_NUM = /[0-9,.]/

// Molecules
type Molecule = {
    readonly pattern: Pick<Token, "type">[]
    readonly extract: (tokens: Token[]) => Token[]
}

const FunctionRange: Molecule = {
    pattern: [
        { type: "func" },
        { type: "parens_open" },
        { type: "cell" },
        { type: "op_range" },
        { type: "cell" },
        { type: "parens_close" },
    ],
    extract: ([_, __, cell1, ___, cell2, ____]) => {
        return [cell1, cell2]
    },
}

export const PATTERNS = {
    FunctionRange,
}

//============================================================
// --- TOKENS ------------------------------------------------
//============================================================
export type TokenType =
    | "number"
    | "cell"
    | "op" // TODO: call this "op_bin"
    | "op_range"
    | "parens_open"
    | "parens_close"
    | "func_range"
    | "func"
    | undefined // Used for INVALID_CHAR error and as initial value in factory function.
    | "eof" // Used for end-of-file error

export type Token = {
    value: string
    type: TokenType
    start: number
}

// ============================================================
// --- AST ----------------------------------------------------
// ============================================================
export type Node = Node_Binary | Node_Number | Node_Cell | Node_Func

interface Node_Base {
    type: string
    value: string
    start: number // Position of corresponding token within the formula string. Currently used only in failure cases.
}

// For binary operations: ['+', '-', '*', '/'],
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

export interface Node_Func_Range extends Node_Base {
    type: "func_range"
    value: FunctionKeyword
    from: Node_Cell
    to: Node_Cell
}

export interface Node_Func extends Node_Base {
    type: "func"
    value: FunctionKeyword
    from: Node_Cell
    to: Node_Cell
}
