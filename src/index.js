//REPLAY MIDDLEWARE ACTIONS
export const BEGIN_REPLAY = 'BEGIN_REPLAY';
export const END_REPLAY = 'END_REPLAY';
export const BEGIN_RECORD = 'BEGIN_RECORD';
export const END_RECORD = 'END_RECORD';

//REPLAY MIDDLEWARE STATES
export const REPLAY = 'REPLAY';
export const IDLE = 'IDLE';
export const RECORD = 'RECORD';

//REPLAY MIDDLEWARE LOCALITY
export const LOCAL = 'LOCAL';
export const REMOTE = 'REMOTE';

//LOCAL STORAGE KEYS
export const ACTIONS_LOG = 'actionsLog';
export const REPLAY_STATE = 'replayState';
export const RECORD_TOKEN = 'recordToken';

export const beginReplay = function beginReplay(token){
	if(token){
	        return {type:BEGIN_REPLAY,token};
	}
	else{
	        return {type:BEGIN_REPLAY};
	}
}

export const endReplay = function endReplay(){
        return {type:END_REPLAY};
}

export const beginRecord = function beginRecord(token){
	if(token){
	        return {type:BEGIN_RECORD,token};
	}
	else{
	        return {type:BEGIN_RECORD};
	}
}

export const endRecord = function endRecord(){
        return {type:END_RECORD};
}

//the replay function takes the store and the actions log to be replayed as arguments
const replayActionsLog = function replayActionsLog(store,processedActionsLog){

	if(processedActionsLog.length > 0){

			const nextActionReplay = processedActionsLog[0];

			store.dispatch(nextActionReplay.action);

			if(processedActionsLog.length > 1){

				const next2ActionReplay = processedActionsLog[1];

				const timeUntilNextActionMillSec = next2ActionReplay.timeAction - nextActionReplay.timeAction;

				setTimeout(
					replayActionsLog.bind(
								undefined,
								store,
								processedActionsLog.slice(1,processedActionsLog.length)
							),
					timeUntilNextActionMillSec
				);
			}

	}
	else{
		store.dispatch(endReplay());
	}

}

// the get log function makes a fetch to the url with the given token of a remotely stored actions log
//if the url is not reachable, it keeps trying by default.
const getActionsLog = function getActionsLog(actionsLogToken,pollingInterval,callback,url){

	const getRecordFetchOptions =
		{
			method:'GET',
			headers:{'Content-Type':'application/json'}
		};

	fetch(`${url}/${actionsLogToken}`, getRecordFetchOptions)
        	.then(resp => resp.json())
                .then(json => {
			callback(json);
		})
	        .catch(function(error){

        	        console.log(`Redux Replay get actions log error: ${error}`);

			//retries the get after polling interval if the get fails
			setTimeout(
                                getActionsLog.bind(
						undefined,
						actionsLogToken,
						pollingInterval,
						callback,
						url
						),
				pollingInterval
			);
	        })

}

//the post log function
//the function makes sequencial asynchronous calls to itself.
//each new call is only fired once the former action was succesfully logged
//the purpose of this is to preserve the order of the actions in the remote log
//this execution cascade is interrupted whenever the token
//of the actions log changes because a new record is fired.
//in this case, a new cascade is summoned by the middleware with starting index 0
const postActionsLog = function postActionsLog(postedIndex,cascadeToken,pollingInterval,url){

	const localStore = window.localStorage;
	const actionsLog = JSON.parse(localStore.getItem(ACTIONS_LOG));
	const recordToken = localStore.getItem(RECORD_TOKEN);

	if(postedIndex < actionsLog.length){

		const postRecordFetchOptions =
			{
				method:'POST',
				headers:{'Content-Type':'application/json'},
				body:JSON.stringify(actionsLog[postedIndex])
			};

		fetch(`${url}/${cascadeToken}`, postRecordFetchOptions)
                	.then(resp => resp.json())
	                .then(json => {
				//call next post inmediately after the success of the former post
				//with the next log index
				//interrupts if token changes
				if(cascadeToken===recordToken){
					postActionsLog(postedIndex + 1,cascadeToken,pollingInterval,url);
				}
			})
        	        .catch(function(error){
                	        console.log(`Redux Replay post record error: ${error}`);
				//retries the post after polling interval if the post fails
				//interrupts if token changes
				if(cascadeToken===recordToken){
					setTimeout(
	                                        postActionsLog.bind(
								undefined,
								postedIndex,
								cascadeToken,
								pollingInterval,
								url
						),
						pollingInterval
					);
				}
        	        })
	}
	else{
		//wait until next cycle and retries if the index has reached the end of the log
		//interrupts if token changes
		if(cascadeToken===recordToken){
			setTimeout(
				postActionsLog.bind(
						undefined,
						postedIndex,
						cascadeToken,
						pollingInterval,
						url
				),
				pollingInterval
			);
		}

	}

}

//just a naive implementation of an id maker for the token codes
const makeId = function makeId() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  const p = 1299709;
  const a = Math.floor(Math.random() * p);
  let indexRandom = a;
  function nextRandom(){
        indexRandom = (a * indexRandom + Math.floor(Math.random() * p)) % p;
        return indexRandom;
  }

  for (var i = 0; i < 30; i++){
    text += possible.charAt(Math.floor( (nextRandom() / p) * possible.length));
  }
  return text;
}


//the locality argument to the middleware creator defines whether the middleware will
//use an external server to POST and GET the logging data used for the replay
//or if it will only use the local store of the browser

//the url argument is the url of the log server
//this url is assumed to have a POST and GET implementation
//so that GET's to url/token will get the whole log of the token
//and POST's to url/token will append new rows of log data to the
//possibly already existing logs for this token
//the upload of log data to a remote server is done
//as soon as new actions arrive to the middleware

//the pollingInterval parameter is the aproximated amount of time in ms
//that the middleware waits between retries of fetch for a given data
//and the time it waits to look for new data to post in the local actions log
export const replayMiddleware = (locality=LOCAL,url="http://127.0.0.1:80",pollingInterval=1000) => store => next => action => {

	const localStore = window.localStorage;
	let actionsLog = JSON.parse(localStore.getItem(ACTIONS_LOG));

	//the initial default state for actionsLog is an empty list
	if(!actionsLog){
		localStore.setItem(ACTIONS_LOG,'[]');
		actionsLog = [];
	}

	//the initial default state for replayState is IDLE
	let replayState = localStore.getItem(REPLAY_STATE);
	if(!replayState){
		localStore.setItem(REPLAY_STATE,IDLE);
		replayState = IDLE;
	}

	//none of the "redux replay actions" never arrives to the reducers

	if(action.type === BEGIN_REPLAY){

		//assumes state idle to begin replay
		if(replayState === IDLE){
			if(locality === REMOTE){

				//try first with the token passed with the action
				let token = action.token;

				//if no token was passed, try to load the last record token
				if(!token){
					token = localStore.getItem(RECORD_TOKEN);
				}

				//if the last two fail, then log the error
				if(!token){
					console.log('Redux Replay error: no token received to replay');
				}
				else{
					//gets the actions log from the remote location
					//pass replayActionsLog as a callback
					getActionsLog(token,pollingInterval,replayActionsLog.bind(undefined,store),url);
				}

			}
			else{
				replayActionsLog(store,actionsLog);
			}
		}
		return 0;
        }

	if(action.type === BEGIN_RECORD){

		//assumes state idle to begin record
		if(replayState === IDLE || !replayState){

			//begin record always flush the local store previous data
			//calls to the local store are all synchronous
			localStore.removeItem(ACTIONS_LOG);
			localStore.setItem(ACTIONS_LOG,'[]');
			localStore.setItem(REPLAY_STATE,RECORD);

			//try first with the token passed as argument of the action
			//if no token was passed, generates one
			if(action.token){
				localStore.setItem(RECORD_TOKEN,action.token);
			}
			else{
				localStore.setItem(RECORD_TOKEN,makeId());
			}

			if(locality === REMOTE){
				postActionsLog(0,localStore.getItem(RECORD_TOKEN),pollingInterval,url);
			}
		}
		return 0;
        }

	if(action.type === END_REPLAY){
		//assumes state replay to end replay
		if(replayState === REPLAY){
			localStore.setItem(REPLAY_STATE,IDLE);
		}
		return 0;
        }


	if(action.type === END_RECORD){
		//assumes state record to end record
		if(replayState === RECORD){
			localStore.setItem(REPLAY_STATE,IDLE);
		}
		return 0;
        }

	//all the application actions arrive to the reducers unchanged

	if(replayState === REPLAY || replayState === IDLE || !replayState){
		next(action);
		return 0;
	}

	if(replayState === RECORD){

		//during record phase, all application actions are logged to the local store
	        actionsLog.push({timeAction:Date.now(),action:action});
	        localStore.setItem(ACTIONS_LOG,JSON.stringify(actionsLog));
		next(action);
		return 0;
	}

}

