## Materia Multiplayer Server

#### A UCF Hack Day Project

This is an extremely basic websocket server to serve as a broker for the [Materia Multiplayer Widget](https://github.com/clpetersonucf/materia-multiplayer-hack-day-widget). It was created as part of UCF's Spring 2022 Hack Day.

The server provides no support for http/s traffic and responds to only a handful of specific websocket messages from the Multiplayer Widget.

To run the server:

```
$ yarn install
$ node server.js
```

Since the entire multiplayer widget project was created over the course of 8-10 hours, the server does not yet support the following:

- Preventing collisions from matching concurrent session IDs
- Scoring
- Fallbacks in case a client disconnects
- Players attempting to join a session mid-game
- Culling of individual games (games are only culled when the server is stopped)
- Support for environments outside of local development