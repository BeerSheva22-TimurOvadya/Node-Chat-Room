
import MongoConnection from '../domain/MongoConnection.mjs';
import config from 'config';

const MONGO_ENV_URI = 'mongodb.env_uri';
const MONGO_DB_NAME = 'mongodb.db';

export default class MessagesService {
    #collection;
    constructor() {
        const connection_string = process.env[config.get(MONGO_ENV_URI)];
        const dbName = config.get(MONGO_DB_NAME);
        const connection = new MongoConnection(connection_string, dbName);
        this.#collection = connection.getCollection('messages');
    }

    async saveMessage(from, to, text, read = false) {
        const now = new Date();
        const message = { from, to, text, timestamp: now, read };
        return this.#collection.insertOne(message);
    }
    async getUnreadMessages(username) {
        return this.#collection.find({ to: username, read: false }).toArray();
    }
    
    async markMessagesAsRead(username) {
        return this.#collection.updateMany({ to: username, read: false }, { $set: { read: true } });
    }
    async getAllMessages() {
        return this.#collection.find({}).toArray();
    }
    
    async getUserMessages(username) {
        return this.#collection.find({ $or: [{ from: username }, { to: username }] }).toArray();
    }
    
    async deleteMessage(messageId) {
        return this.#collection.deleteOne({ _id: messageId });
    }
    
}
