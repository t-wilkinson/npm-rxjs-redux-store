import produce from "immer"
import React from "react"
import * as rxjs from "rxjs"
import * as ops from "rxjs/operators"

export const async$ = new rxjs.Subject()
export const action$ = new rxjs.Subject()
export const dispatch = (action) => action$.next(action)

// const mergeReducers = (reducerEntries) => (oldState, action) => {
//   let state = {...oldState}
//     let entries = Object.entries(reducerEntries)
//     if (action.filter) {
//       try { // too many potential errors to check. Move on if error
//         reducerEntries[action.filter][action.type](state[action.filter], action)
//       } catch(error) { }
//     }
//     else {
//       for (let [, reducers] of entries)
//         if (typeof reducers[action.type] === "function")
//           reducers[action.type](state, action)
//     }
//   // let javascript reflow before triggering async epics
//   setTimeout(() => async$.next([state, action]), 0)
//   return state
// }

const mergeReducers = (reducerEntries) => (oldState, action) => {
  let newState = produce(oldState, (state) => {
    let entries = Object.entries(reducerEntries)
    if (action.filter) {
      try { // too many potential errors to check. Move on if error
        reducerEntries[action.filter][action.type](state[action.filter], action)
      } catch(error) { }
    }
    else {
      for (let [, reducers] of entries)
        if (typeof reducers[action.type] === "function")
          reducers[action.type](state, action)
    }
  })
  // let javascript reflow before triggering async epics
  setTimeout(() => async$.next([newState, action]), 0)
  return newState
}

export const createStore = (slice) => {
  let slices = { reducers: {}, states: {}, actions: {} }
  for (let [name, {initialState, reducers}] of Object.entries(slice)) {
    // init state
    if (typeof initialState === "function")
      slices.states[name] = initialState()
    else slices.states[name] = initialState

    // add reducer
    slices.reducers[name] = reducers

    // create action function
    slices.actions[name] = {}
    for (let [rname] of Object.entries(reducers)) {
      slices.actions[name][rname] = (action={}) => dispatch(({filter: name, type: rname, ...action}))
    }
  }
  slices.reducers = mergeReducers(slices.reducers)

  const Context = React.createContext(slices.states)
  const Provider = Context.Provider
  const useStore = (f) => f(React.useContext(Context))

  const subscribe = (f) => action$.pipe(
    ops.startWith(slices.states),
    ops.scan(slices.reducers),
  ).subscribe((state) => f(state, Context))

  return [Provider, useStore, subscribe, slices.actions]
}

// Listen to '$action.next()' and pipe stream to function
export const epic = (...fs) => rxjs.pipe(...fs)(async$).subscribe(v => v && action$.next(v))
export const mergeEpics = (...epics) => async$.pipe(ops.merge(...epics))

export const ofMap = (filters, types, f) =>
  epic(
    ops.map(([state, action]) => {
      if ((types.length === 0 || types.includes(action.type) || !action.type) &&
        (filters.length === 0 || filters.includes(action.filter) || !action.filter))
        return f(state, action) || null
      return null
    })
  )
