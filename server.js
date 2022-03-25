const WebSocket = require('ws')

const server = new WebSocket.Server({
	port: 8228
})

let sockets = []

let games = []

server.on('connection', (socket) => {

	sockets.push(socket)
	
	socket.on('message', (message) => {

		var received = JSON.parse(message)

		switch (received.action) {
			case 'session-connect':
				handleNewGame(received.session, socket, received.payload)
				break;
			case 'player-question-answered':
				handleQuestionResponse(received, socket)
				break;
			case 'ready-check-report':
				socket.send(JSON.stringify(games))
				handlePlayerQueueStatus(received, socket)
				break;
			default:
				socket.send(JSON.stringify({notice: 'No action handler for this message type: ' + received.action}))
		}
	})

	socket.on('close', () => {
		sockets = sockets.filter(s => s !== socket)
		// games = games.filter(game => game.clients.filter(client => client == socket).length == 0)
		// games = [] // TODO games should be culled after a certain period of time
	})
})

const handleNewGame = (session, client, payload) => {
	// another game with session ID?
	// TODO only handles 1 existing game
	let game = games.find( instance => instance.sessionId == session)

	

	if (game) {
		
		// let client know this game is in-progress
		client.send(JSON.stringify({
			message: 'game-status',
			payload: {
				clients: game.clients.length + 1,
				status: 'existing-game'
			}
		}))

		// let other clients know a new player joined
		game.clients.forEach((client) => {
			client.socket.send(JSON.stringify({
				message: 'client-status',
				payload: {
					status: 'client-count',
					data: game.clients.length + 1
				}
			}))
		})

		// add new client to the list of clients of this game
		game.clients.push({ playerId: payload.playerId, socket: client, status: '' })

	} else {
		game = {
			sessionId: session,
			clients: [{
				playerId: payload.playerId,
				socket: client,
				status: ''
			}],
			currentQuestionIndex: -1
		}

		client.send(JSON.stringify({
			message: 'game-status',
			payload: {
				clients: 1,
				status: 'new-game'
			}
		}))

		games.push(game)
	}

}

handlePlayerQueueStatus = (received, socket) => {
	let game = games.find( instance => instance.sessionId == received.session)
	game.clients.find(client => client.playerId == received.playerId).status = received.payload.status

	let numReady = 0
	game.clients.forEach((client) => {
		socket.send(JSON.stringify({notice: `player ${client.playerId} is ${client.status}`}))
		if (client.status == 'ready') numReady++
	})

	if (received.payload.context == 'pre-start') {

		if (numReady < game.clients.length) {
			game.clients.forEach((client) => {
				client.socket.send(JSON.stringify({ message: 'game-status', payload: { status: 'waiting', numReady: numReady }}))
			})
			
		}
		else {
			game.currentQuestionIndex++
			game.questionTimeline = []
			game.clients.forEach((client) => {
				client.socket.send(JSON.stringify({ message: 'game-status', payload: { status: 'ready' }}))
				client.status = 'waiting-for-next-question'
			})
		}
	}
	else if (received.payload.context == 'next-question') {
		if (numReady < game.clients.length) {
			game.clients.forEach((client) => {
				client.socket.send(JSON.stringify({ message: 'game-status', payload: { status: 'waiting-for-remaining-players', numReady: numReady }}))
			})
			
		}
		else {
			game.currentQuestionIndex++
			game.clients.forEach((client) => {
				client.socket.send(JSON.stringify({ message: 'game-status', payload: { status: 'ready-for-next-question', timeline: game.questionTimeline }}))
				client.status = 'waiting-for-next-question'
			})
			game.questionTimeline = []
		}
	}

}

handleQuestionResponse = (received, socket) => {
	let game = games.find( instance => instance.sessionId == received.session)
	let player = game.clients.find(client => client.playerId == received.playerId)

	player.status = 'ready'
	game.questionTimeline.push({
		player: received.playerId,
		value: received.payload.answerId
	})

	handlePlayerQueueStatus(received, socket)
}

/*
	NOTES

	Each player will need an identitier in addition to session ID

	game object needs to track player status

	when all players respond OR timeout, increment 

	server tells widget to increment to next question

*/