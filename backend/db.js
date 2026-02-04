const mongoose = require('mongoose')
const { mongodbUri2, mongodbUri } = require('./env.json')

const connectMongoDB = async () => {
    try {
        if (process.env.NODE_ENV !== 'production') {
            await mongoose.connect(mongodbUri)
        } else {
            await mongoose.connect(mongodbUri2)
        }
        console.log(`Database Connected`)
    } catch (error) {
        console.log(error)
    }
}

connectMongoDB()