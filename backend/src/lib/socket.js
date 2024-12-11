import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express()
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5050"],
    },
});

export function getReceiverSocketId(userId){
    return userScoketMap[userId];
}

const userScoketMap = {};

io.on("connection", (socket) => {
    console.log("A user Connected", socket.id);

    const userId = socket.handshake.query.userId;
    if(userId) userScoketMap[userId] = socket.id;

    io.emit("getOnlineUsers", Object.keys(userScoketMap));

    socket.on("disconnect", () => {
        console.log("A user Disconnected",socket.id);
        delete userScoketMap[userId];
        io.emit("getOnlineUsers", Object.keys(userScoketMap));
    });
});

export {io, app, server};