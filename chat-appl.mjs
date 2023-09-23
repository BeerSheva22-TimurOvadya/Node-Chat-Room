import bodyParser from 'body-parser';
import express from 'express';
import crypto from 'node:crypto';
import morgan from 'morgan';
import expressWs from 'express-ws';
import errorHandler from './middleware/errorHandler.mjs';
import ChatRoom from './service/ChatRoom.mjs';
import { messages } from './routes/messages.mjs';
import { users } from './routes/users.mjs';
import config from 'config';
import cors from 'cors';
import auth from './middleware/auth.mjs';
import MessagesService from './service/MessagessService.mjs';
const app = express();
const expressWsInstant = expressWs(app);
const chatRoom = new ChatRoom();
const messagesService = new MessagesService();

app.use(cors());
app.use(bodyParser.json());
app.use(morgan('tiny'));
app.use(auth);

app.use('/messages', messages);
app.use('/users', users);
app.use(errorHandler);

app.get('/contacts', (req, res) => {
    res.send(chatRoom.getClients());
});

app.ws('/contacts/websocket', (ws, req) => {
    const clientName = ws.protocol || req.query.clientName;
    if (!clientName) {
        ws.send('Must be client name');
        ws.close();
    } else {
        processConnection(clientName, ws);
    }
});

app.ws('/contacts/websocket/:clientName', (ws, req) => {
    const clientName = req.params.clientName;
    processConnection(clientName, ws);
});

const port = process.env.PORT || config.get('server.port');
const server = app.listen(port);
server.on('listening', () => console.log(`server is listening on port ${server.address().port}`));

function processConnection(clientName, ws) {
    const connectionId = crypto.randomUUID();
    chatRoom.addConnection(clientName, connectionId, ws);
    ws.on('close', () => chatRoom.removeConnection(connectionId));
    ws.on('message', processMessage.bind(undefined, clientName, ws));
}
async function processMessage(clientName, ws, message) {
    try {
        const messageObj = JSON.parse(message.toString());
        const to = messageObj.to;
        const text = messageObj.text;

        if (!text) {
            ws.send("Your message doesn't contain text");
            return;
        }

        const objSent = JSON.stringify({ from: clientName, text });

        if (!to || to === 'all') {
            sendAll(objSent);
            await messagesService.saveMessage(clientName, 'all', text);
        } else {
            const clientSockets = chatRoom.getClientWebSockets(to);
            if (clientSockets.length == 0) {
                ws.send(to + " contact doesn't exist");
                return;
            } else {
                sendClient(objSent, to, ws);
                await messagesService.saveMessage(clientName, to, text);
            }
        }
    } catch (error) {
        ws.send('wrong message structure');
    }
}

function sendAll(message) {
    chatRoom.getAllWebSockets().forEach((ws) => ws.send(message));
}
function sendClient(message, client, socketFrom) {
    const clientSockets = chatRoom.getClientWebSockets(client);
    if (clientSockets.length == 0) {
        socketFrom.send(client + " contact doest't exist");
    } else {
        clientSockets.forEach((s) => s.send(message));
    }
}
