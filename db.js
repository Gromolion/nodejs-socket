const { MongoClient } = require('mongodb');
const url = 'mongodb://mongodb:27017';

const client = new MongoClient(url);
const dbName = 'app';

module.exports = {
    client: client,
    connect: async () => {
        await client.connect();
        return client.db(dbName);
    }
};