## redux-replay

A [Redux](https://redux.js.org/) middleware that records and replays actions in a timely manner. Works with the local storage of the browser or with a remote server.

  [![NPM Version][npm-image]][npm-url] [![NPM Downloads][downloads-image]][downloads-url]


```js
import { createStore, applyMiddleware } from 'redux';
import { replayMiddleware } from 'redux-replay';

import { LOCAL } from "redux-replay";
import { REMOTE } from "redux-replay";

const store = createStore(
  rootReducer,
	initialState, 
	applyMiddleware(replayMiddleware(REMOTE,"http://www.replay-server.com",pollingInterval))
)
```

## Installation

You can install this middleware through the [npm registry](https://www.npmjs.com/).

Installation is done using the [`npm install` command](https://docs.npmjs.com/getting-started/installing-npm-packages-locally):

```bash
$ npm install redux-replay
```

## Usage

The module exports action creators that you can use to toggle the record and replay:

```js
import { beginRecord , endRecord } from 'redux-replay';
import { beginReplay , endReplay } from 'redux-replay';

//Begin and end of record
dispatch( beginRecord( 'example-token' ) )
		//dispatch some recorded actions
dispatch( endRecord() )

//Begin and end of replay
dispatch( beginReplay( 'example-token' ) )
dispatch( endReplay() )
```
All the dispatched actions between the begin and end of record will be stored under `example-token` label.

After `beginReplay` is dispatched, the actions log will be loaded for that token and the replay will start. Every recorded action will be sequentially repeated following the same time intervals as the record.

In order to work properly, `replayMiddleware` should be the last middleware in the chain. By doing this, you allow the middleware to record all the actions as they arrive to the reducers, after all the other middlewares have done their work. That way, that you can replay also state sequences of the application that were the result of external events, like asynchronous calls.

The module exports two constants, `LOCAL` and `REMOTE` that you will use to determine the locality of the storage. Setting up the store will be like this:
```js
import { createStore, applyMiddleware } from 'redux';
import { replayMiddleware } from 'redux-replay';

import { LOCAL } from "redux-replay";
import { REMOTE } from "redux-replay";

//Remote storage
const store = createStore(
  rootReducer,
  initialState, 
  applyMiddleware(otherMiddleware,replayMiddleware(REMOTE,"http://www.replay-server.com",pollingInterval))
)

//Local storage
const store = createStore(
  rootReducer,
  initialState, 
  applyMiddleware(otherMiddleware,replayMiddleware(LOCAL))
)
```
In both cases `LOCAL` and `REMOTE`, redux-replay uses the local storage from the browser as temporal storage. To work properly, the middleware assumes that the store in empty, or at least that the keys `actionsLog`, `replayState` and `recordToken` are undefined.

The `pollingInterval` argument defines in ms the period between fetch retries to reach the replay server. When recording, the posting of the data to the remote server is done asynchronously as each action is passed on to the reducers, the order of the actions is guaranteed to be preserved.

## Replay server
In the case of remote storage, the replay server should implement POST and GET of .json data to the url passed as argument with the token included in the route:
```
POST 'http://www.replay-server.com/example-token'
GET 'http://www.replay-server.com/example-token'
```

## License

[MIT](LICENSE)

[npm-image]: https://img.shields.io/npm/v/redux-replay.svg
[npm-url]: https://npmjs.org/package/redux-replay
[downloads-image]: https://img.shields.io/npm/dm/redux-replay.svg
[downloads-url]: https://npmjs.org/package/redux-replay
