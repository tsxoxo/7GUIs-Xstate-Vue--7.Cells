import { setup, assign } from "xstate"
import type { Cell } from "../types/types"
import { INITIAL_CELLS } from "../test/INITIAL_DATA"
import { handleCellContentChange } from "./state"
import { isSuccess } from "../parse/types/errors"
import { AppError } from "../errors/errors"

export interface Context {
    cells: Cell[]
    errors: AppError[]
}

export type changeCellContent = {
    type: "changeCellContent"
    indexOfCell: number
    value: string
}

export const cellsMachine = setup({
    types: {
        context: {} as Context,
        events: {} as changeCellContent,
    },
    actions: {
        updateCellContent: assign(({ context, event }) => {
            const result = handleCellContentChange(context, event)

            return isSuccess(result)
                ? { cells: result.value }
                : { errors: [result.error] }
        }),
    },
}).createMachine({
    /** @xstate-layout N4IgpgJg5mDOIC5QGEwBs2wHQCcwEMIBPAYgGMALfAOxlQwG0AGAXUVAAcB7WASwBdeXauxAAPRABYATABoQRRAA4AjFgCsAX23zqXCHFH1Mo7n0HDREhAFoAbPMW27OkMex5CTzjwFCRSOKIdgDMWEoAnEqSIQDs6o6IKkrSGrGq0lramkA */
    context: {
        cells: INITIAL_CELLS,
        errors: [],
    },
    id: "Cells",
    initial: "ready",
    states: {
        ready: {
            on: {
                changeCellContent: {
                    target: "ready",
                    actions: {
                        type: "updateCellContent",
                    },
                },
            },
        },
    },
})
