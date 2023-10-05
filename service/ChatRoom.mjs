export default class ChatRoom {
    #clients; 
    #connections; 
    #onlineStatus;  
    
    constructor() {
        this.#clients = {};
        this.#connections = {};
        this.#onlineStatus = {}; 
    }
    
    
    setUserStatus(username, onlineStatus) {
        this.#onlineStatus[username] = onlineStatus;
        this.notifyAllClients({ type: 'updateOnlineStatus', data: username });
        
    }
    
    
    getUserStatus(username) {
        return this.#onlineStatus[username] || 'OFFLINE';
    }

    addConnection(clientName, connectionId, ws) {
        this.#connections[connectionId] = { client: clientName, socket: ws };
        if (this.#clients[clientName]) {            
            this.#clients[clientName].push(connectionId);
        } else {
            this.#clients[clientName] = [connectionId];            
        }
    }

    removeConnection(connectionId) {
        const client = this.#connections[connectionId].client;
        const clientConnections = this.#clients[client];       
        const index = clientConnections.findIndex((id) => id == connectionId);
        if (index < 0) {
            throw `illegal state with connection ${connectionId}`;
        }
        clientConnections.splice(index, 1);
        if (clientConnections.length == 0) {
            delete this.#clients[client];
        }
        delete this.#connections[connectionId];
    }

    getClientWebSockets(clientName) {
        let res = [];
        if (this.#clients[clientName]) {
            res = this.#clients[clientName].map(
                (connectionId) => this.#connections[connectionId].socket,
            );
        }
        return res;
    }

    getClients() {
        return Object.keys(this.#clients);
    }

    getAllWebSockets(){
        return Object.values(this.#connections).map(c => c.socket)
    }

    notifyAllClients(message) {
        const allSockets = this.getAllWebSockets();        
        allSockets.forEach(socket => socket.send(JSON.stringify(message)));        
    }

    
}