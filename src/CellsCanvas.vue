<script setup lang="ts">
import { useMachine } from "@xstate/vue"
import { cellsMachine } from "./state/cellsMachine"
import { createBrowserInspector } from "@statelyai/inspect"
import { computed, watch } from "vue"
import { ALPHABET_WITH_FILLER, NUM_OF_ROWS } from "./config/constants"
import { handleErrors } from "./errors/errors"
import { getCellIndexfromXY } from "./parse/cellUtils"

const { inspect } = createBrowserInspector({
    // Comment out the line below to start the inspector
    autoStart: false,
})

const { snapshot, send } = useMachine(cellsMachine, {
    inspect,
})
const cells = computed(() => snapshot.value.context.cells)
function onFocus(event: Event, ind: number) {
    const input = event.target as HTMLInputElement
    const cell = cells.value[ind]
    input.value = cell?.content ?? ""
}

function onBlur(event: Event, ind: number) {
    const input = event.target as HTMLInputElement
    const cell = cells.value[ind]
    input.value =
        typeof cell?.value === "number"
            ? String(cell.value)
            : (cell?.content ?? "")
}
function getDisplayValue(cellIndex: number) {
    const cell = cells.value[cellIndex]
    if (!cell) {
        console.error(
            `getDisplayValue: accessing index '${cellIndex} while cell has maximum of ${cells.value.length}'`,
        )
        return "err"
    }
    return cell.value === undefined ? cell.content : String(cell.value)
}
watch(
    () => snapshot.value.context.errors,
    () => handleErrors(snapshot.value.context.errors),
)
</script>

<template>
    <main>
        <template v-for="(number, y) in NUM_OF_ROWS + 1">
            <template v-for="(letter, x) in ALPHABET_WITH_FILLER">
                <template v-if="number === 1">
                    <div
                        v-if="x > 0"
                        :key="`header-${y}-${x}-${letter}`"
                        class="track-names"
                    >
                        {{ letter }}
                    </div>
                    <div
                        v-else
                        :key="`header-empty-${y}-${x}-${letter}`"
                        class="track-names"
                    ></div>
                </template>
                <template v-else>
                    <template v-if="letter === '-'">
                        <div
                            :key="`rowname-${y}-${x}-${letter}`"
                            class="track-names"
                        >
                            {{ number - 2 }}
                        </div>
                    </template>
                    <template v-else>
                        <div
                            :key="`cell-div-${letter} + ${number}`"
                            class="cell"
                        >
                            <Transition name="update-value">
                                <input
                                    :key="`cell-input-${letter} + ${number}`"
                                    :value="
                                        getDisplayValue(
                                            getCellIndexfromXY(x, y),
                                        )
                                    "
                                    @change="
                                        (event) =>
                                            send({
                                                type: 'changeCellContent',
                                                indexOfCell: getCellIndexfromXY(
                                                    x,
                                                    y,
                                                ),
                                                value: (
                                                    event.target as HTMLInputElement
                                                ).value,
                                            })
                                    "
                                    @focus="
                                        (e) =>
                                            onFocus(e, getCellIndexfromXY(x, y))
                                    "
                                    @blur="
                                        (e) =>
                                            onBlur(e, getCellIndexfromXY(x, y))
                                    "
                                    @click="
                                        () =>
                                            console.log(
                                                cells[getCellIndexfromXY(x, y)],
                                            )
                                    "
                                />
                            </Transition>
                        </div>
                    </template>
                </template>
            </template>
        </template>
    </main>
</template>

<style>
.update-value-enter-active,
.update-value-leave-active {
    transition:
        opacity 0.2s ease,
        background-color 0.4s ease-out;
}

.update-value-enter-from,
.update-value-leave-to {
    opacity: 0;
    background-color: #f8fbc5;
}
</style>
