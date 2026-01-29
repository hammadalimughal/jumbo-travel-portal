const airportsData = require("aircodes");

const passengerFormat = {
    MR: "Adult Male",
    MRS: "Married Female",
    MS: "Adult Female",
    MISS: "Female (usually under 18)",
    CHD: "Child",
    INF: "Infant",
    MSTR: "Male Child"
};

const passengerCodes = Object.keys(passengerFormat);

const isPassenger = (line) => passengerCodes.some((item) => line.includes(item));
// const isFlight = (line) => /^\s*\d+[\.\s]+[A-Z0-9]{2}\s+\d{1,4}/i.test(line);
const isFlight = (line) => {
    const flightPattern = /^\s*\d+[\.\s]+[A-Z0-9]{2}\s*\d{1,4}/i;
    return flightPattern.test(line);
};

// Helper to convert GDS date/time to ISO
function formatToISO(gdsDate, gdsTime) {
    const months = {
        JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
        JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11
    };

    const day = parseInt(gdsDate.substring(0, 2));
    const monthStr = gdsDate.substring(2).toUpperCase();
    const month = months[monthStr];
    
    const now = new Date();
    let year = now.getFullYear();

    // If flight month is earlier than current month, assume next year
    if (month < now.getMonth()) {
        year++;
    }

    const hours = gdsTime.substring(0, 2);
    const minutes = gdsTime.substring(2, 4);

    // Creates date in local time - change to Date.UTC if needed for your DB
    const dateObj = new Date(year, month, day, hours, minutes);
    return dateObj.toISOString();
}

function parsePassengerLine(line) {
    const indexMatch = line.match(/^(\d+)[\.\s]?/);
    const passengerNumber = indexMatch ? Number(indexMatch[1]) : null;
    const titleMatch = line.match(new RegExp(`\\b(${passengerCodes.join('|')})\\b`));
    
    if (!titleMatch) return null;

    const title = titleMatch[1];
    const cleaned = line.replace(/^(\d+)[\.\s]?/, '').replace(new RegExp(`\\s+${title}$`), '');
    const [lastName, firstPart] = cleaned.split('/');
    if (!lastName || !firstPart) return null;

    const nameParts = firstPart.trim().split(/\s+/);
    return {
        passengerNumber,
        lastName,
        firstName: nameParts[0],
        middleName: nameParts.slice(1).join(' ') || null,
        title,
        type: passengerFormat[title]
    };
}

// function parseFlightLine(line) {
//     const flightRegex = /^(\d+)[\.\s]+([A-Z0-9]{2})\s+(\d+)\s+([A-Z])\s+(\d{2}[A-Z]{3})\s+(\d)\s+([A-Z]{6})\s+([A-Z]{2}\d)\s+(\d{4})\s+(\d{4})/i;
//     const match = line.match(flightRegex);

//     if (!match) return null;

//     const [_, index, iata, flightNumber, bookingClass, date, , route, status, depTime, arrTime] = match;

//     return {
//         segmentNumber: Number(index),
//         flightNumber,
//         airline: airportsData.getAirlineByIata(iata.toUpperCase()),
//         class: bookingClass,
//         date,
//         origin: airportsData.getAirportByIata(route.substring(0, 3)),
//         destination: airportsData.getAirportByIata(route.substring(3, 6)),
//         status,
//         departureISO: formatToISO(date, depTime),
//         arrivalISO: formatToISO(date, arrTime) // Note: This assumes same-day arrival. 
//     };
// }
function parseFlightLine(line) {
    // 1. Updated Regex:
    // (\d+)                -> Segment Number
    // ([A-Z0-9]{2})        -> Airline Code
    // \s* -> Optional space (handles SV 120 and SV120)
    // (\d{1,4})            -> Flight Number
    // \s*([A-Z])?          -> OPTIONAL Booking Class (The fix!)
    // \s+(\d{2}[A-Z]{3})   -> Date (28JUL)
    // \s+(\d)              -> Day of week
    // \s+([A-Z]{6})        -> Route (LHRJED)
    // \s+([A-Z]{2}\d)      -> Status (HK4)
    // \s+(\d{4})\s+(\d{4}) -> Times
    const flightRegex = /^\s*(\d+)[\.\s]+([A-Z0-9]{2})\s*(\d{1,4})\s*([A-Z])?\s+(\d{2}[A-Z]{3})\s+(\d)\s+([A-Z]{6})\s+([A-Z]{2}\d)\s+(\d{4})\s+(\d{4})/i;
    
    const match = line.match(flightRegex);
    if (!match) return null;

    // Destructure the match
    const [_, index, iata, flightNum, bookingClass, date, day, route, status, dep, arr] = match;

    const originCode = route.substring(0, 3);
    const destinationCode = route.substring(3, 6);

    return {
        segmentNumber: Number(index),
        flightNumber: flightNum,
        airline: airportsData.getAirlineByIata(iata.toUpperCase()),
        // If booking class is missing, we return null or a default
        class: bookingClass || null,
        date: date,
        origin: airportsData.getAirportByIata(originCode),
        destination: airportsData.getAirportByIata(destinationCode),
        status: status,
        departureISO: formatToISO(date, dep),
        arrivalISO: formatToISO(date, arr)
    };
}
const convertFlightCodes = (rawData) => {
    const segments = rawData.split(/\n|(?=\s\d+[\.\s]+[A-Z]+\/)/).map(l => l.trim()).filter(Boolean);
    const result = { passengers: [], flights: [] };

    segments.forEach((segment) => {
        console.log(`${segment} ${isPassenger(segment) ? 'Passenger': isFlight(segment) ? 'Flight' : 'Unspecified'}`)
        if (isPassenger(segment)) {
            const p = parsePassengerLine(segment);
            if (p) result.passengers.push(p);
        } else if (isFlight(segment)) {
            const f = parseFlightLine(segment);
            if (f) result.flights.push(f);
        }
    });

    return result;
};

module.exports = convertFlightCodes;