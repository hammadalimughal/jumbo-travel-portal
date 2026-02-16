const fs = require('fs');
const pdf = require('html-pdf');
const path = require('path')
const createPdfHtml = (data) => {
    // console.log(JSON.stringify(data))

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
        th { background-color: #f9fafb; border: 1px solid #d1d5db; padding: 8px; font-size: 10px; text-align: left; text-transform: uppercase; }
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
                <p><strong>Mail:</strong> ${data.customer_email}</p>
                <p><strong>Contact No:</strong> ${data.customer_phone}</p>
                <p>${data.adults} Adult(s), ${data.children} Child(ren), ${data.infants} Infant(s)</p>
            </div>
            <div class="col text-right" style="font-size: 12px; line-height: 1.6;">
                <p><strong>Quotation No:</strong> ${data.quotation_no}</p>
                <p><strong>Date:</strong> ${data.travel_date}</p>
                <p>Total Package Price: <span class="text-blue">£${data.totalPrice.toFixed(2)}</span></p>
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
            ${data.flights.map((item)=>(
                `<tr>
                    <td>${item.airline}</td>
                    <td>${item.flightNumber}</td>
                    <td>${item.departureISO.split('T')[0]}</td>
                    <td>${item.from}</td>
                    <td>${item.to}</td>
                    <td>${item.departureISO.split('T')[1].split(':').slice(0,2).join(':')}</td>
                    <td>${item.arrivalISO.split('T')[1].split(':').slice(0,2).join(':')}</td>
                </tr>`
            )).join('')}
            </tbody>
        </table>

        
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
                ${data.hotels.map((item) => `<tr>
                    <td>${item.name}</td>
                    <td>${item.noOfRooms}</td>
                    <td>${item.room_type}</td>
                    <td>${item.check_in.split('T')[1].split(':').slice(0, 2).join(':')}<br>${new Date(item.check_in.split('T')[0]).toDateString()}</td>
                    <td>${item.check_out.split('T')[1].split(':').slice(0, 2).join(':')}<br>${new Date(item.check_out.split('T')[0]).toDateString()}</td>
                    <td>${item.meal_plan}</td>
                    <td>${item.nights}</td>
                </tr>`).join('')}
            </tbody>
        </table>

        <div style="margin-top: 30px;">
            <table class="price-table">
                <tr style="font-weight: bold; font-size: 10px;">
                    <td>Passengers</td>
                    <td>Price</td>
                    <td>Sub-Total</td>
                </tr>
                ${data.adults ? `<tr>
                    <td>Adults</td>
                    <td>${data.adults} x £${data.priceAdult.toFixed(2)}</td>
                    <td>£${(data.adults * data.priceAdult).toFixed(2)}</td>
                </tr>`: ``}
                ${data.children ? `<tr>
                    <td>Children</td>
                     <td>${data.children} x £${data.priceChild.toFixed(2)}</td>
                     <td>£${(data.children * data.priceChild).toFixed(2)}</td>
                </tr>`: ``}
                ${data.infants ? `<tr>
                    <td>Infants</td>
                    <td>${data.infants} x £${data.priceInfant.toFixed(2)}</td>
                    <td>£${(data.infants * data.priceInfant).toFixed(2)}</td>
                </tr>`: ``}
                <tr class="total-row">
                    <td colspan="2">Total Price:</td>
                    <td>£${data.totalPrice.toFixed(2)}</td>
                </tr>
            </table>
        </div>
        <div class="page-break"></div>
        <p><strong>Passengers:</strong> ${data.passengers_names}</p>
        ${data.notes ? `<div class="header-section">Notes</div>
        <div class="disclaimer-section">
            ${data.notes.split('\n').map((item)=>`
                <p>${item}</p>
            `).join('')}
        </div>` : ''}
        ${data.special_conditions ? `<div class="header-section" style="margin-top: 30px">Special Conditions</div>
        <div class="disclaimer-section">
            ${data.special_conditions.split('\n').map((item)=>`
                <p>${item}</p>
            `).join('')}
        </div>` : ''}
        ${data.cancellation_policy ? `<div class="header-section" style="margin-top: 30px">Cancellation Policy</div>
        <div class="disclaimer-section">
            ${data.cancellation_policy.split('\n').map((item)=>`
                <p>${item}</p>
            `).join('')}
        </div>` : ''}
    </div>
</body>
</html>`
}


const generateHtmlToPdf = (htmlContent, fileName) => {
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

module.exports = { generateHtmlToPdf, createPdfHtml }