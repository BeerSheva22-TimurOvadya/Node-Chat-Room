import config from 'config';
import MongoConnection from '../domain/MongoConnection.mjs';
const MONGO_ENV_URI = 'mongodb.env_uri';
const MONGO_DB_NAME = 'mongodb.db';
export default class MessagesService {
    #collection;
    constructor() {
        const connection_string = process.env[config.get(MONGO_ENV_URI)];
        console.log(connection_string)
        const dbName = config.get(MONGO_DB_NAME);
        const connection = new MongoConnection(connection_string, dbName);
        this.#collection = connection.getCollection('messages');
    }
    async #getId() {
        let id;
        const minId = config.get('message.minId');
        const maxId = config.get('message.maxId');
        const delta = maxId - minId + 1;
        do {
            id = minId + Math.trunc(Math.random() * delta);
        } while (await this.getMessage(id));
        return id;
    }
    async getMessage(id) {
        const doc = await this.#collection.findOne({ _id: id });
        return doc ? toMessage(doc) : null;
    }
    async addMessage(message) {
        let emplRes;
        if (!message.id) {
            message.id = await this.#getId();
        }
        try {
            await this.#collection.insertOne(toDocument(message));
            emplRes = message;
        } catch (error) {
            if (error.code != 11000) {
                throw error;
            }
        }
        return emplRes;
    }

    async updateMessage(message) {
        const doc = await this.#collection.updateOne({
            _id: message.id
        }, {
            $set: {
                department: message.department,
                salary: message.salary
            }
        })
        return doc.matchedCount == 1 ? message : null;
    }

    async deleteMessage(id) {
        const doc = await this.#collection.deleteOne({ _id: id });
        return doc.deletedCount > 0;
    }
    async getAllMessages() {
        return (await this.#collection.find({}).toArray()).map(toMessage);
    }
}

function toDocument(message) {
    const document = { ...message, _id: message.id };
    delete document.id;
    return document;
}
function toMessage(document) {
    const message = { ...document, id: document._id };
    delete message._id;
    return message;
}
