const mongoose = require('mongoose')
const { mongodbUri } = require('./env.json')

const connectMongoDB = async () => {
    try {
        console.log(mongodbUri)
        await mongoose.connect(mongodbUri)
        console.log(`Database Connected`)
    } catch (error) {
        console.log(error)
    }
}

connectMongoDB()