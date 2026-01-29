const { Schema, model } = require('mongoose');

const userSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    role: {
        type: String,
        enum: ['Admin', 'Project Manager', 'Accountant', 'Supervisor'],
        default: 'Supervisor',
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive', 'Terminated'],
        default: 'Active',
    },
    phone: {
        type: String,
        trim: true
    },
    hireDate: {
        type: Date
    },
    address: {
        type: String,
        trim: true
    },
    salary: {
        type: Number,
        default: 0,
        min: 0,
    }
}, { timestamps: true });

const User = model('User', userSchema);
module.exports = User;