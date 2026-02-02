const mongoose = require('mongoose')
const { mongodbUri2 } = require('./env.json')

const connectMongoDB = async () => {
    try {
        console.log(mongodbUri2)
        await mongoose.connect(mongodbUri2)
        console.log(`Database Connected`)
    } catch (error) {
        console.log(error)
    }
}

connectMongoDB()