import produce, {enableES5, enableMapSet} from "immer"
import React from "react"
import * as rxjs from "rxjs"
import * as ops from "rxjs/operators"

enableES5()
enableMapSet()

/*
   action$ serves as the main handler for events.
   after these are run, the updated state are then sent to async$ handlers.
*/
export const action$ = new rxjs.Subject()
export const async$ = new rxjs.Subject()
export const dispatch = (action) => action$.next(action)

export const createStore = (slice) => {
  let slices = makeSlices(slice)
  slices.reducers = mergeReducers(slices.reducers)

  const Context = React.createContext(slices.states)
  const Provider = Context.Provider
  const useStore = (f) => f(React.useContext(Context))

  const subscribe = (f) => action$.pipe(
    ops.startWith(slices.states), // init state
    ops.scan(slices.reducers), // reducer
  ).subscribe((state) => f(state, Context))

  return [Provider, useStore, subscribe, slices.actions]
}

const makeSlices = (slice) => {
  let slices = { reducers: {}, states: {}, actions: {} }
  for (let [name, {initialState, reducers}] of Object.entries(slice)) {
    // init state
    if (typeof initialState === "function")
      slices.states[name] = initialState()
    else slices.states[name] = initialState
    slices.reducers[name] = reducers
    slices.actions[name] = {}

    // Create action functions based on given slices
    for (let [reducer_name] of Object.entries(reducers)) {
      slices.actions[name][reducer_name] = (action={}) => dispatch(({filter: name, type: reducer_name, ...action}))
    }
  }
  return slices
}

const mergeReducers = (reducerEntries) =>  {
  let entries = Object.entries(reducerEntries)
  return (oldState, action) => {
    let newState = updateState(reducerEntries, entries, action, oldState)
    // let javascript reflow before triggering async$
    setTimeout(() => async$.next([newState, action]), 0)
    return newState
  }
}

const updateState = (reducerEntries, entries, action, oldState) => produce(oldState, (state) => {
  if (action.filter) {
    try { // too many potential errors to check. Move on if error
      reducerEntries[action.filter][action.type](state[action.filter], action)
    } catch(error) {}
  }
  else {
    for (let [, reducers] of entries)
      if (typeof reducers[action.type] === "function")
        reducers[action.type](state, action)
  }
})

// Listen to '$action.next()' and pipe stream to function
export const mergeEpics = (...epics) => async$.pipe(ops.merge(...epics))

export const ofMap = (filters, types, f) =>
  async$.pipe(
    ops.map(([state, action]) => {
      if ((types.length === 0 || types.includes(action.type) || !action.type)
       && (filters.length === 0 || filters.includes(action.filter) || !action.filter)) {
        action.onSuccess = action.onSuccess || (()=>{})
        return f(state, action) || null
      } else {
        return null
      }
    })
  ).subscribe(v=>v && action$.next(v))

// // Listen to '$action.next()' and pipe stream to function
// export const epic = (...fs) => async$.pipe(...fs).subscribe(v => v && action$.next(v))
// export const mergeEpics = (...epics) => async$.pipe(ops.merge(...epics))
// export const ofMap = (filters, types, f) =>
//   epic(
//     ops.map(([state, action]) => {
//       if ((types.length === 0 || types.includes(action.type) || !action.type) &&
//         (filters.length === 0 || filters.includes(action.filter) || !action.filter))
//         return f(state, action) || null
//       return null
//     })
//   )
