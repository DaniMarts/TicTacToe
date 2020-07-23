const express = require("express");
const socket = require("socket.io");
const path = require('path');

const app = express();

// serve static assets if in production
if (process.env.NODE_ENV === 'production') {
    // serving static files when in production. These files will be located in the build folder once build happens
    app.use(express.static("front/build"));

    // sending the html with any request that doesn't match the previous ones
    app.get("*", (req, res) => res.sendFile(path.resolve(__dirname, 'front', 'build', 'index.html')));
}

const port = process.env.PORT;

const server = app.listen(port, ()=>console.log(`connected to port ${port}`));

// Setting up a socket on the server
const io = socket(server);

// var userMap = {}; // This will contain mappings between socket.id and userName for every user

//#region Handling websocket interactions
io.on("connection", (socket)=>{
    // console.log(`${socket.id} has joined the game`);

    // when a user acceses the game for the first time, the user can either join an existing player or start a new game and invite someone else
    socket.on('ready', socketID => {
        // the room name will be the concatenation of the fisrst socket id and the one that joined 
        let roomName = socketID + socket.id;
        // if the socket id is valid
        if (io.sockets.sockets[socketID])
            // if that socket is in just one other room apart from its own
            if (Object.keys(io.sockets.sockets[socketID].rooms).length <= 2) {
                // join this socket to the room roomName
                socket.join(roomName);

                // finding the other socket
                let otherSocket = io.sockets.sockets[socketID];
                // adding it to the room
                otherSocket.join(roomName);
                // console.log(`${socket.id} and ${otherSocket.id} are in the same room`);

                // since another player has joined, the game should be ready to start
                io.to(roomName).emit("start game");
            }
            else
                // tell the player that the room is full
                socket.emit('room full');
    });
    
    // When this particular socket emits a 'play' event
    socket.on('play', data=>{
        // console.log(socket.id, 'just played on square', data);

        // finiding the room that's not the default one
        let roomName = Object.keys(socket.rooms).find(roomName => roomName !== socket.id);
        
        // send the message to the room
        socket.to(roomName).emit('play', data);
    });

    socket.on("new game", () => {
        // finiding the room that's not the default one
        let roomName = Object.keys(socket.rooms).find(roomName => roomName !== socket.id);
        socket.to(roomName).emit("new game");
        // console.log(socket.id, "requested new game");
    });

    // telling the other players in the room when a user has left the game
    socket.on('disconnecting', ()=>{
        // console.log(socket.id, "has left the game and all its rooms");
        let roomName = Object.keys(socket.rooms).find(roomName => roomName !== socket.id);
        socket.to(roomName).emit("player left");
    });
});
//#endregion Handling websocket interactions