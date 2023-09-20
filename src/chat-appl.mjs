import express from 'express';
import crypto from 'node:crypto';
import expressWs from 'express-ws';
import ChatRoom from './service/ChatRoom.mjs';
const app = express();
const expressWsInstant = expressWs(app);
const chatRoom = new ChatRoom();
app.get('/contacts', (req, res) => {
    res.send(chatRoom.getClients());
});
app.ws('/contacts/websocket', (ws, req) => {
    if (!ws.protocol) {
        ws.send('Must be nickname');
        ws.close;
    } else {
        const connectionId = crypto.randomUUID();
        chatRoom.addConnection(ws.protocol, connectionId, ws);
        ws.on('close', () => {
            chatRoom.removeConnection(connectionId);
        });
    }
});
