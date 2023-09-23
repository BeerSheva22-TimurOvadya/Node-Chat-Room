// service\MessagesService.mjs
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

    async saveMessage(from, to, text) {
        const now = new Date();
        const message = { from, to, text, timestamp: now };
        return this.#collection.insertOne(message);
    }
}
