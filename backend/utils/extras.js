// const airlineCodes = require('../airline-codes.json');
// const airportsData = require("aircodes");
// const passengerCodes = [
//     "MR",
//     "MRS",
//     "MS",
//     "MISS",
//     "CHD",
//     "INF",
//     "MSTR"
// ];

// const passengerFormat = {
//     MR: "Adult Male",
//     MRS: "Married Female",
//     MS: "Adult Female",
//     MISS: "Female (usually under 18)",
//     CHD: "Child",
//     INF: "Infant",
//     MSTR: "Male Child"
// };

// const isPassenger = (line) => passengerCodes.find((item)=> line.includes(item))


// const getAirlineName = (iata) => {
//     const airline = airlineCodes.find(a => a.iata === iata);
//     return airline ? airline.name : "Unknown Airline";
// };

// function parsePassengerLine(line) {
//     const indexMatch = line.match(/^(\d+)[\.\s]?/);
//     const passengerNumber = indexMatch ? Number(indexMatch[1]) : null;

//     const titleMatch = line.match(
//         new RegExp(`\\b(${passengerCodes.join('|')})\\b`)
//     );
//     if (!titleMatch) return null;

//     const title = titleMatch[1];

//     const cleaned = line
//         .replace(/^(\d+)[\.\s]?/, '')
//         .replace(new RegExp(`\\s+${title}$`), '');

//     const [lastName, firstPart] = cleaned.split('/');
//     if (!lastName || !firstPart) return null;

//     const nameParts = firstPart.trim().split(/\s+/);

//     return {
//         passengerNumber,
//         lastName,
//         firstName: nameParts[0],
//         middleName: nameParts.slice(1).join(' ') || null,
//         title,
//         type: passengerFormat[title]
//     };
// }


// const convertFlightCodes = (rawData) => {
//     // 1. IMPROVED SPLIT: 
//     // Splits by newline OR a space followed by a digit + dot/space ONLY IF followed by a name (indicated by /)
//     // This prevents splitting flight segments like "SV 120"
//     const segments = rawData
//         .split(/\n|(?=\s\d+[\.\s]+[A-Z]+\/)/)
//         .map(l => l.trim())
//         .filter(Boolean);
    
//     const result = {
//         passengers: [],
//         flights: []
//     };

//     segments.forEach((segment) => {
//         // Log to debug if needed: console.log("Processing segment:", segment);
//         if (isPassenger(segment)) {
//             const passenger = parsePassengerLine(segment);
//             if (passenger) result.passengers.push(passenger);
//         } else if (isFlight(segment)) {
//             const flight = parseFlightLine(segment);
//             if (flight) result.flights.push(flight);
//         }
//     });

//     return result;
// };

// // Updated to be case-insensitive and handle leading spaces/dots
// const isFlight = (line) => {
//     const flightPattern = /^\s*\d+[\.\s]+[A-Z0-9]{2}\s+\d{1,4}/i;
//     return flightPattern.test(line);
// };

// function parseFlightLine(line) {
//     // Updated regex to handle flexible spacing \s+ between GDS columns
//     const flightRegex = /^(\d+)[\.\s]+([A-Z0-9]{2})\s+(\d+)\s+([A-Z])\s+(\d{2}[A-Z]{3})\s+(\d)\s+([A-Z]{6})\s+([A-Z]{2}\d)\s+(\d{4})\s+(\d{4})/i;
//     const match = line.match(flightRegex);

//     if (!match) return null;

//     const [_, index, iata, flightNumber, bookingClass, date, dayOfWeek, route, status, depTime, arrTime] = match;

//     return {
//         segmentNumber: Number(index),
//         // airlineIata: iata.toUpperCase(),
//         // airlineName: getAirlineName(iata.toUpperCase()),
//         // flightNumber: flightNumber,
//         airline: airportsData.getAirlineByIata(iata.toUpperCase()),
//         class: bookingClass,
//         date: date,
//         // origin: route.substring(0, 3),
//         // destination: route.substring(3, 6),
//         origin: airportsData.getAirportByIata(route.substring(0, 3)),
//         destination: airportsData.getAirportByIata(route.substring(3, 6)),
//         status: status,
//         departure: `${depTime.slice(0, 2)}:${depTime.slice(2)}`,
//         arrival: `${arrTime.slice(0, 2)}:${arrTime.slice(2)}`
//     };
// }


// module.exports = convertFlightCodes


// mongodb://developer_db_user:HqeC33vNtNg61gx0@cluster0.e777a51.mongodb.net/jumbo-travel