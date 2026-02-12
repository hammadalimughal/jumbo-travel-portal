const express = require('express');
const convertFlightCodes = require('../utils/convertFlightCodes');
const { generateHtmlToPdf, createPdfHtml } = require('../utils/generatePdf');
const router = express.Router();
const path = require('path');
const Quotation = require('../models/Quotation');
const Hotel = require('../models/Hotel');

router.post('/process-raw-codes', async (req, res) => {
    try {
        const { rawCodes } = req.body
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

router.get('/fetch', async (req, res) => {
    try {
        const quotations = await Quotation.find().lean()
        res.json({
            success: true,
            data: quotations
        })
    } catch (error) {
        res.json({
            success: false,
            error: error.message
        })
    }
})

router.get('/detail/:id', async (req, res) => {
    try {
        const { id } = req.params
        const quotation = await Quotation.findById(id).lean()
        res.json({
            success: true,
            data: quotation
        })
    } catch (error) {
        res.json({
            success: false,
            error: error.message
        })
    }
})

router.post('/generate-invoice', async (req, res) => {
    try {
        const data = req.body

        const quotation = await Quotation.create({
            ...data,
            passenger_counts: {
                adults: data.adults,
                children: data.children,
                infants: data.infants
            },
            pricing: {
                priceAdult: data.priceAdult,
                priceChild: data.priceChild,
                priceInfant: data.priceInfant,
                totalPrice: data.totalPrice
            }
        })
        const hotels = await Hotel.find()
        const pdfHtml = createPdfHtml({
            ...data, hotels: data.hotels.map((item) => ({
                ...item,
                ...hotels.find(hotel => hotel._id == item.hotel_id),
            })),
            quotation_no: quotation.quotation_no
        })
        var url
        try {
            url = await generateHtmlToPdf(pdfHtml, quotation.quotation_no)
        } catch (error) {
            console.log(error.message)
        }
        quotation.invoice = url.url
        await quotation.save()
        return res.json({ success: true, data, url, message: 'Quoation Saved Successfully' })
    } catch (error) {
        console.log(error)
        res.json({
            status: false,
            error: error.message
        })
    }
})

module.exports = router;