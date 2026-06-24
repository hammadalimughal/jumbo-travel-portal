// const fs = require('fs');
// const pdf = require('html-pdf');
// const path = require('path')
const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const pdf = require('html-pdf');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);
const createPdfHtml = (data) => {
    // console.log(JSON.stringify(data))
    const rawDate = data.travel_date;
    const formattedDate = rawDate ? dayjs.utc(rawDate).format('DD-MM-YYYY') : '';
    const refactorDate = (dateVal) => {
        if (!dateVal) return "N/A";
        return dayjs.utc(dateVal).format('DD-MM-YYYY');
    };
    const currencySymbols = { USD: '$', EUR: '€', GBP: '£', AED: 'AED', SAR: 'SAR' };
    const symbol = currencySymbols[data.currency] || data.currency || '£';

    // Compute consolidated hotel summary for Group bookings
    const hotelSummaryMap = {};
    if (data.bookingType === 'Group' && data.groups) {
        data.groups.forEach(group => {
            const extraServices = group.extra_services || [];
            if (!extraServices.includes('Hotels')) return;
            (group.hotels || []).forEach(h => {
                if (!h.name) return;
                const hotelName = h.name;
                const checkInStr = h.check_in ? dayjs.utc(h.check_in).format('YYYY-MM-DD') : 'N/A';
                const checkOutStr = h.check_out ? dayjs.utc(h.check_out).format('YYYY-MM-DD') : 'N/A';
                const nights = Number(h.nights) || 0;
                const key = `${hotelName}_${checkInStr}_${checkOutStr}_${nights}`;
                
                if (!hotelSummaryMap[key]) {
                    hotelSummaryMap[key] = {
                        key,
                        hotelName,
                        checkIn: h.check_in,
                        checkOut: h.check_out,
                        nights,
                        Single: 0,
                        Double: 0,
                        Triple: 0,
                        Quad: 0,
                        Suites: 0,
                        "Family Room": 0,
                        totalRooms: 0
                    };
                }
                
                if (h.rooms && h.rooms.length > 0) {
                    h.rooms.forEach(r => {
                        const rType = r.room_type || 'Single';
                        const count = Number(r.noOfRooms) || 0;
                        if (hotelSummaryMap[key][rType] !== undefined) {
                            hotelSummaryMap[key][rType] += count;
                        }
                        hotelSummaryMap[key].totalRooms += count;
                    });
                } else {
                    const rType = h.room_type || 'Single';
                    const count = Number(h.noOfRooms) || 1;
                    if (hotelSummaryMap[key][rType] !== undefined) {
                        hotelSummaryMap[key][rType] += count;
                    }
                    hotelSummaryMap[key].totalRooms += count;
                }
            });
        });
    }
    const hotelSummaryList = Object.values(hotelSummaryMap);

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>

        /* Base Styles - Using Work Sans to match your brand */
        body { font-family: "Montserrat", font-weight: 500; sans-serif; margin: 0;font-style: normal; padding: 0; color: #333; }
        .container { width: 100%; }
        p{
            margin: 0;
            padding: 0;
        }
        .flex { display: table; width: 100%; }
        .col { display: table-cell; vertical-align: top; }
        .text-right { text-align: right; }
        
        /* Zaarvel Specific Colors */
        .brand-color { color: #E02D0D; }
        .bg-gray { background-color: #f3f4f6; }
        .header-section { background-color: #e5e7eb; padding: 8px; margin: 20px 0 10px 0; font-weight: bold; text-transform: uppercase; }
        
        /* Table Styling */
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background-color: #f9fafb; border: 1px solid #d1d5db; padding: 3px 5px; font-size: 10px; text-align: left; text-transform: uppercase; }
        td { border: 1px solid #d1d5db; padding: 8px; font-size: 11px; }
        
        /* Pricing Box */
        .price-table { width: 50%; 
            margin-left: auto;
        }
        .total-row { background-color: #f9fafb; font-weight: bold; }
        .text-blue { color: #2563eb; }
        .text-green { color: #16a34a; }
        .page-break { page-break-before: always; }
        .disclaimer-section { font-size: 10px; color: #666; margin-top: 20px; }
    </style>
    <link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
</head>
<body>
    <div class="container">
        <div class="flex">
            <div class="col">
                <img style="width: 150px;" src="http://localhost:6947/logo.png" />
            </div>
        </div>

        <!-- <div class="header-section">Umrah Quotation</div> -->

        <div class="flex" style="margin-bottom: 20px;">
            <div class="col" style="font-size: 12px; line-height: 1.6;">
                <p><strong>Customer Name:</strong> ${data.customer_name}</p>
                ${data.customer_email ? `<p><strong>Mail:</strong> ${data.customer_email}</p>` : ''}
                ${data.customer_phone ? `<p><strong>Contact No:</strong> ${data.customer_phone}</p>` : ''}
                <p>${data.adults} Adult(s), ${data.children} Child(ren), ${data.infants} Infant(s)</p>
            </div>
            <div class="col text-right" style="font-size: 12px; line-height: 1.6;">
                <p><strong>Quotation No:</strong> ${data.quotation_no}</p>
                <p><strong>Date:</strong> ${refactorDate(data.travel_date)}</p>
                <p>Total Package Price: <span class="text-blue">${symbol}${data.totalPrice.toFixed(2)}</span></p>
                <p>Email: <span>sales@jumbotraveluk.com</span></p>
                <p>Phone: <span>02073878264</span></p>
            </div>
        </div>

        <div class="header-section">Flight Details</div>
        <table>
            <thead>
                <tr>
                    <th>Airline</th>
                    <th>Flight No</th>
                    <th>Date</th>
                    <th>Origin</th>
                    <th>Destination</th>
                    <th>Departure</th>
                    <th>Arrival</th>
                </tr>
            </thead>
            <tbody>
            ${data.flights.map((item) => {
                const depTime = item.departureDateTime || item.departureISO ? dayjs.utc(item.departureDateTime || item.departureISO).format('HH:mm') : 'N/A';
                const arrTime = item.arrivalDateTime || item.arrivalISO ? dayjs.utc(item.arrivalDateTime || item.arrivalISO).format('HH:mm') : 'N/A';
                const flDate = item.departureDateTime || item.departureISO ? dayjs.utc(item.departureDateTime || item.departureISO).format('DD-MM-YYYY') : 'N/A';
                return `<tr>
                    <td>${item.airline || ''}</td>
                    <td>${item.flightNumber || ''}</td>
                    <td>${flDate}</td>
                    <td>${item.from || ''}</td>
                    <td>${item.to || ''}</td>
                    <td>${depTime}</td>
                    <td>${arrTime}</td>
                </tr>`;
            }).join('')}
            </tbody>
        </table>

        
        ${data.bookingType === 'Group' && data.groups && data.groups.length > 0 ? `
            <div class="header-section" style="margin-top: 30px;">Hotel Summary</div>
            <table>
                <thead>
                    <tr>
                        <th>Hotel</th>
                        <th style="text-align: center;">Nights</th>
                        <th>Check In</th>
                        <th>Check Out</th>
                        <th style="text-align: center;">Single</th>
                        <th style="text-align: center;">Double</th>
                        <th style="text-align: center;">Triple</th>
                        <th style="text-align: center;">Quad</th>
                        <th style="text-align: center;">Suites</th>
                        <th style="text-align: center;">Family Room</th>
                        <th style="text-align: center;">Total Rooms</th>
                    </tr>
                </thead>
                <tbody>
                    ${hotelSummaryList.map(h => `
                        <tr>
                            <td>${h.hotelName}</td>
                            <td style="text-align: center;">${h.nights}</td>
                            <td>${h.checkIn ? refactorDate(h.checkIn) : 'N/A'}</td>
                            <td>${h.checkOut ? refactorDate(h.checkOut) : 'N/A'}</td>
                            <td style="text-align: center;">${h.Single || '-'}</td>
                            <td style="text-align: center;">${h.Double || '-'}</td>
                            <td style="text-align: center;">${h.Triple || '-'}</td>
                            <td style="text-align: center;">${h.Quad || '-'}</td>
                            <td style="text-align: center;">${h.Suites || '-'}</td>
                            <td style="text-align: center;">${h["Family Room"] || '-'}</td>
                            <td style="text-align: center; font-weight: bold; color: #2563eb;">${h.totalRooms}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="header-section" style="margin-top: 30px;">Group Breakdown Details</div>
            ${data.groups.map((grp, gIdx) => {
                return `
                <div style="margin-top: 15px; margin-bottom: 25px; padding: 12px; border: 1px dashed #d1d5db; border-radius: 4px; background-color: #fafafa; page-break-inside: avoid;">
                    <div style="font-size: 12px; line-height: 1.6; margin-bottom: 10px; border-bottom: 1px dashed #d1d5db; padding-bottom: 5px;">
                        <p><strong>Group #${gIdx + 1} Leader:</strong> ${grp.customer_name}</p>
                        ${grp.customer_email ? `<p><strong>Email:</strong> ${grp.customer_email}</p>` : ''}
                        ${grp.customer_phone ? `<p><strong>Phone:</strong> ${grp.customer_phone}</p>` : ''}
                        <p><strong>Passengers:</strong> ${grp.passengers_names || 'N/A'}</p>
                        <p><strong>Count:</strong> ${grp.adults || 0} Adult(s), ${grp.children || 0} Child(ren), ${grp.infants || 0} Infant(s)</p>
                        ${grp.extra_services && grp.extra_services.length > 0 ? `
                        <p><strong>Services Included:</strong> ${grp.extra_services.join(', ')}</p>
                        ` : ''}
                    </div>
                    ${grp.extra_services && grp.extra_services.includes('Hotels') ? `
                    <div style="font-size: 11px; font-weight: bold; margin-bottom: 5px;">Accommodation Details:</div>
                    <table>
                        <thead>
                            <tr>
                                <th>Hotel</th>
                                <th>No. of Rooms</th>
                                <th>Room Type</th>
                                <th>Check In</th>
                                <th>Check Out</th>
                                <th>Meal Plan</th>
                                <th>Nights</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(grp.hotels || []).map((h) => {
                                const noOfRoomsCol = h.rooms && h.rooms.length > 0
                                    ? h.rooms.map(r => r.noOfRooms).join('<br>')
                                    : h.noOfRooms || '';
                                const roomTypeCol = h.rooms && h.rooms.length > 0
                                    ? h.rooms.map(r => r.room_type).join('<br>')
                                    : h.room_type || '';
                                const mealPlanCol = h.rooms && h.rooms.length > 0
                                    ? h.rooms.map(r => r.meal_plan).join('<br>')
                                    : h.meal_plan || '';
                                return `<tr>
                                    <td>${h.name || 'Manual Entry'}</td>
                                    <td>${noOfRoomsCol}</td>
                                    <td>${roomTypeCol}</td>
                                    <td>${refactorDate(h.check_in)}</td>
                                    <td>${refactorDate(h.check_out)}</td>
                                    <td>${mealPlanCol}</td>
                                    <td>${h.nights}</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                    ` : ''}
                </div>
                `;
            }).join('')}
        ` : `
            <div class="header-section" style="margin-top: 30px;">Hotel Details</div>
            <table>
                <tbody>
                    <tr>
                        <th>Hotel</th>
                        <th>No. of Rooms</th>
                        <th>Room Type</th>
                        <th>Check In</th>
                        <th>Check Out</th>
                        <th>Meal Plan</th>
                        <th>Total Nights</th>
                    </tr>
                    ${data.hotels.map((item) => {
                        const noOfRoomsCol = item.rooms && item.rooms.length > 0
                            ? item.rooms.map(r => r.noOfRooms).join('<br>')
                            : item.noOfRooms || '';
                        const roomTypeCol = item.rooms && item.rooms.length > 0
                            ? item.rooms.map(r => r.room_type).join('<br>')
                            : item.room_type || '';
                        const mealPlanCol = item.rooms && item.rooms.length > 0
                            ? item.rooms.map(r => r.meal_plan).join('<br>')
                            : item.meal_plan || '';
                        return `<tr>
                            <td>${item.name || ''}</td>
                            <td>${noOfRoomsCol}</td>
                            <td>${roomTypeCol}</td>
                            <td>${refactorDate(item.check_in)}</td>
                            <td>${refactorDate(item.check_out)}</td>
                            <td>${mealPlanCol}</td>
                            <td>${item.nights}</td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        `}

        <div style="margin-top: 30px;">
            <table class="price-table">
                <tr style="font-weight: bold; font-size: 10px;">
                    <td>Passengers</td>
                    <td>Price</td>
                    <td>Sub-Total</td>
                </tr>
                ${data.adults ? `<tr>
                    <td>Adults</td>
                    <td>${data.adults} x ${symbol}${data.priceAdult.toFixed(2)}</td>
                    <td>${symbol}${(data.adults * data.priceAdult).toFixed(2)}</td>
                </tr>`: ``}
                ${data.children ? `<tr>
                    <td>Children</td>
                     <td>${data.children} x ${symbol}${data.priceChild.toFixed(2)}</td>
                     <td>${symbol}${(data.children * data.priceChild).toFixed(2)}</td>
                </tr>`: ``}
                ${data.infants ? `<tr>
                    <td>Infants</td>
                    <td>${data.infants} x ${symbol}${data.priceInfant.toFixed(2)}</td>
                    <td>${symbol}${(data.infants * data.priceInfant).toFixed(2)}</td>
                </tr>`: ``}
                <tr class="total-row">
                    <td colspan="2">Total Price:</td>
                    <td>${symbol}${data.totalPrice.toFixed(2)}</td>
                </tr>
            </table>
        </div>
        <div class="page-break"></div>
        <p><strong>Passengers:</strong> ${data.passengers_names}</p>
        ${data.notes ? `<div class="header-section">Notes</div>
        <div class="disclaimer-section">
            ${data.notes.split('\n').map((item) => `
                <p>${item}</p>
            `).join('')}
        </div>` : ''}
        ${data.special_conditions ? `<div class="header-section" style="margin-top: 30px">Special Conditions</div>
        <div class="disclaimer-section">
            ${data.special_conditions.split('\n').map((item) => `
                <p>${item}</p>
            `).join('')}
        </div>` : ''}
        ${data.cancellation_policy ? `<div class="header-section" style="margin-top: 30px">Terms & Condition</div>
        <div class="disclaimer-section">
            ${data.cancellation_policy.split('\n').map((item) => `
                <p>${item}</p>
            `).join('')}
        </div>` : ''}
    </div>
</body>
</html>`
}


// const generateHtmlToPdf = (htmlContent, fileName) => {
//     return new Promise((resolve, reject) => {
//         // Define the path where the PDF will be stored
//         const filePath = path.join(__dirname, '../public/pdfs', `${fileName}.pdf`);
//         const publicUrl = `/pdfs/${fileName}.pdf`;

//         const options = {
//             format: 'A4',
//             orientation: 'portrait',
//             border: '10mm',
//             zoomFactor: "1",
//             type: "pdf",
//             quality: "100",
//             phantomPath: "/usr/bin/phantomjs"
//         };

//         pdf.create(htmlContent, options).toFile(filePath, (err, res) => {
//             if (err) {
//                 return reject(err);
//             }
//             // res.filename contains the absolute path on the server
//             resolve({
//                 filePath: res.filename,
//                 url: publicUrl
//             });
//         });
//     });
// };

const generateHtmlToPdf = async (htmlContent, fileName) => {
    try {
        const pdfDir = path.join(__dirname, "../public/pdfs");

        // Create folder if not exists
        if (!fs.existsSync(pdfDir)) {
            fs.mkdirSync(pdfDir, { recursive: true });
        }

        const filePath = path.join(pdfDir, `${fileName}.pdf`);
        const publicUrl = `/pdfs/${fileName}.pdf`;
        let executablePath = "/snap/bin/chromium";
        if (process.platform === "win32") {
            const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
            const chromePathX86 = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
            const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

            if (fs.existsSync(chromePath)) {
                executablePath = chromePath;
            } else if (fs.existsSync(chromePathX86)) {
                executablePath = chromePathX86;
            } else if (fs.existsSync(edgePath)) {
                executablePath = edgePath;
            } else {
                executablePath = undefined;
            }
        } else {
            if (!fs.existsSync(executablePath)) {
                executablePath = undefined;
            }
        }

        const browser = await puppeteer.launch({
            ...(executablePath ? { executablePath } : {}),
            headless: "new",
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu"
            ]
        });

        const page = await browser.newPage();

        await page.setContent(htmlContent, {
            waitUntil: "networkidle0"
        });

        await page.pdf({
            path: filePath,
            format: "A4",
            printBackground: true,
            margin: {
                top: "10mm",
                right: "10mm",
                bottom: "10mm",
                left: "10mm"
            }
        });

        await browser.close();

        return {
            filePath: filePath,
            url: publicUrl
        };

    } catch (error) {
        throw error;
    }
};

const generateHtmlToPdfWindows = (htmlContent, fileName) => {
    return new Promise((resolve, reject) => {
        // Define the path where the PDF will be stored
        const filePath = path.join(__dirname, '../public/pdfs', `${fileName}.pdf`);
        const publicUrl = `/pdfs/${fileName}.pdf`;

        const options = {
            format: 'A4',
            orientation: 'portrait',
            border: '10mm',
            zoomFactor: "1",
            type: "pdf",
            quality: "100"
        };

        pdf.create(htmlContent, options).toFile(filePath, (err, res) => {
            if (err) {
                return reject(err);
            }
            // res.filename contains the absolute path on the server
            resolve({
                filePath: res.filename,
                url: publicUrl
            });
        });
    });
};

module.exports = { generateHtmlToPdf, createPdfHtml, generateHtmlToPdfWindows }