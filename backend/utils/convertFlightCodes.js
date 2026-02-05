const airportsData = require("aircodes");

const passengerFormat = {
    MR: { label: "Adult Male", category: "adult" },
    MRS: { label: "Married Female", category: "adult" },
    MS: { label: "Adult Female", category: "adult" },
    MISS: { label: "Female (usually under 18)", category: "children" },
    MSTR: { label: "Male Child", category: "children" },
    CHD: { label: "Child", category: "children" },
    INF: { label: "Infant", category: "infant" },
};

const passengerCodes = Object.keys(passengerFormat);

const isPassenger = (line) => passengerCodes.some((item) => line.includes(item));

const isFlight = (line) => {
    // Allows for optional leading characters like _ before the digit
    const flightPattern = /^\s*[^A-Z0-9]?\d+[\.\s]+[A-Z0-9]{2}\s*\d{1,4}/i;
    return flightPattern.test(line);
};

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

    if (month < now.getMonth()) {
        year++;
    }

    const hours = gdsTime.substring(0, 2);
    const minutes = gdsTime.substring(2, 4);

    const monthFixed = (month + 1).toString().padStart(2, '0');
    const dayFixed = day.toString().padStart(2, '0');

    return `${year}-${monthFixed}-${dayFixed}T${hours}:${minutes}:00`;
}

// FIXED: Now returns an ARRAY of passengers (Adult + Infant)
function parsePassengerLine(line) {
    const passengers = [];
    const indexMatch = line.match(/^(\d+)[\.\s]?/);
    const passengerNumber = indexMatch ? Number(indexMatch[1]) : null;

    // 1. Handle Infant Block - FORCE category to 'infant'
    const infantMatch = line.match(/\(INF([^/]+)\/([^)]+)\)/);
    if (infantMatch) {
        const infLastName = infantMatch[1];
        const infFirstPart = infantMatch[2];
        
        const infTitleMatch = passengerCodes.find(code => infFirstPart.endsWith(code));
        const infFirstName = infTitleMatch ? infFirstPart.slice(0, -infTitleMatch.length) : infFirstPart;
        const infTitle = infTitleMatch || "INF";

        passengers.push({
            passengerNumber,
            lastName: infLastName,
            firstName: infFirstName || null,
            middleName: null,
            title: infTitle,
            // FIX: Overriding the lookup to ensure they are categorized as infant
            type: {
                label: "Infant",
                category: "infant"
            }
        });
    }

    // 2. Parse Adult
    let adultSection = line.replace(/^(\d+)[\.\s]?/, '');
    if (infantMatch) adultSection = adultSection.replace(infantMatch[0], '');

    const titleMatch = adultSection.match(new RegExp(`\\b(${passengerCodes.join('|')})\\b`));
    if (titleMatch) {
        const title = titleMatch[1];
        const nameSection = adultSection.replace(new RegExp(`\\s+${title}$`), '').trim();
        const [lastName, firstPart] = nameSection.split('/');

        if (lastName && firstPart) {
            const nameParts = firstPart.trim().split(/\s+/);
            passengers.unshift({
                passengerNumber,
                lastName,
                firstName: nameParts[0],
                middleName: nameParts.slice(1).join(' ') || null,
                title,
                type: passengerFormat[title]
            });
        }
    }

    return passengers.length > 0 ? passengers : null;
}

function parseFlightLine(line) {
    // UPDATED REGEX:
    // Added [^A-Z0-9]? after the (\d) to ignore underscores or other stray symbols.
    const flightRegex = /^\s*(\d+)[\.\s]+([A-Z0-9]{2})\s*(\d{1,4})\s*([A-Z])?\s+(\d{2}[A-Z]{3})\s+(\d)[^A-Z0-9]?\s*([A-Z]{6})\s+([A-Z]{2}\d)\s+(\d{4})\s+(\d{4})/i;

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
    // FIX: Remove underscores that prevent matching
    const sanitizedData = rawData.replace(/_/g, ' '); 
    
    const segments = sanitizedData.split(/\n/).map(l => l.trim()).filter(Boolean);
    const result = { passengers: [], flights: [] };

    segments.forEach((segment) => {
        if (isPassenger(segment)) {
            const pList = parsePassengerLine(segment);
            if (pList) result.passengers.push(...pList);
        } else if (isFlight(segment)) {
            const f = parseFlightLine(segment);
            if (f) result.flights.push(f);
        }
    });

    return result;
};

module.exports = convertFlightCodes;