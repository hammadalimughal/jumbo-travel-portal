const express = require('express');
const convertFlightCodes = require('../utils/convertFlightCodes');
const router = express.Router();

router.post('/process-raw-codes', async (req,res)=>{
    try {
        const {rawCodes} = req.body
        const data = convertFlightCodes(rawCodes)
        res.json({
            success: true,
            data
        })
    } catch (error) {
        console.log(error)
        res.json({
            success: false,
            error: error.message
        })
    }
})

module.exports = router;