const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

let mongodbUri = process.env.MONGODB_URI;
let mongodbUri2 = process.env.MONGODB_URI_PROD || process.env.MONGODB_URI;

const envPath = path.join(__dirname, './env.json');
if (fs.existsSync(envPath)) {
    try {
        const env = require('./env.json');
        mongodbUri = mongodbUri || env.mongodbUri;
        mongodbUri2 = mongodbUri2 || env.mongodbUri2;
    } catch (e) {
        console.error("Failed to parse env.json:", e.message);
    }
}

const connectMongoDB = async () => {
    try {
        const connUri = process.env.VERCEL || process.env.NODE_ENV === 'production' ? mongodbUri2 : mongodbUri;
        if (!connUri) {
            throw new Error("No MongoDB connection URI provided (checked env.json and process.env)");
        }
        await mongoose.connect(connUri);
        console.log(`Database Connected`);
    } catch (error) {
        console.error("MongoDB connection error:", error.message);
    }
};

connectMongoDB();