const { MongoClient } = require('mongodb');
const url = 'mongodb://admin:admin@mongodb:27017';

const client = new MongoClient(url);
const dbName = 'app';

module.exports = {
    client: client,
    getDb: async () => {
        await client.connect();
        return client.db(dbName);
    }
};