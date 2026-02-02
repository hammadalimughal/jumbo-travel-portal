const { Schema, model } = require('mongoose');

const hotelSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    // New Field Added Here
    hotelType: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
        // Optional: rounds 4.5 to 5
        set: v => Math.round(v) 
    },
    city: {
        type: String,
        required: true,
        trim: true,
    },
    country: {
        type: String,
        required: true,
        trim: true,
    },
    location: {
        type: String,
        trim: true,
    },
    phone: {
        type: String,
        trim: true,
    },
    email: {
        type: String,
        lowercase: true,
        trim: true,
    },
}, { timestamps: true });

const Hotel = model('hotel', hotelSchema);
module.exports = Hotel;