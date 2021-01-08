# rxjs redux store
a simple rxjs-based redux and redux-observable implementation

## Usage

``` javascript
/* slice.js */
export default {
    root: {
        initialState: () => { return {} }
        reducers: {
            someReducer: (s,a) => { },
            /* ... */
        },
    },
    header: {
        initialState: { active: true },
        reducers: {
            anotherReducer: (s,a) => { },
        }
    },
}


/* store.js */
import {ofMap, dispatch, mergeEpics, createStore} from "@winston-wilkinson/rxjs-redux-store"

const [Provider, useStore, subscribe, actions] = createStore(myslices)
export {Provider, useStore, subscribe, actions, dispatch}

// ofMap([<filters>, <types>, (s,a) => {}])
// reducers defined in `slice.js` automatically pass the correct filter and type.
// however `dispatch` can be used to give the user full control of epics receive the action.
mergeEpics(
ofMap(["root"], ["someReducer"], (s,a) => { }),
ofMap(["header"], ["anotherAction"], (s,a) => { }),
)


/* header.jsx */
import {dispatch, useStore, actions} from "store"
const {header: {anotherReducer}} = actions

export default (props) => {
    const headerState = useState(s=>s.header)

    return <div>
        <button
            onClick={() => {
                anotherReducer({active: false})
            }}
        >
            Hide
        </button>
        <span>
            { headerState.active
                ? 'Active'
                : 'Not active'
            }
        </span>
        <button
            onClick={() => {
                /* This passes through to the 'epics' defined in `mergeEpics`
                */
                dispatch({filter: "header", type: "anotherAction"})
            }}
        >
            Another Action
        </button>
    </div>
}


```
