const airportsData = require("aircodes");

const passengerFormat = {
    MR: { label: "Adult Male", category: "adult" },
    MRS: { label: "Married Female", category: "adult" },
    MS: { label: "Adult Female", category: "adult" },
    SRC: { label: "Senior Adult", category: "senior" },
    SNN: { label: "Senior Citizen", category: "senior" },
    C12: { label: "Youth (12 years)", category: "adult" }, // Category Adult hai
    C13: { label: "Youth (13 years)", category: "adult" },
    C14: { label: "Youth (14 years)", category: "adult" },
    C15: { label: "Youth (15 years)", category: "adult" },
    YTH: { label: "Youth", category: "adult" },
    CHD: { label: "Child", category: "children" },
    C03: { label: "Child (3 years)", category: "children" },
    C04: { label: "Child (4 years)", category: "children" },
    C05: { label: "Child (5 years)", category: "children" },
    C06: { label: "Child (6 years)", category: "children" },
    C07: { label: "Child (7 years)", category: "children" },
    C08: { label: "Child (8 years)", category: "children" },
    C09: { label: "Child (9 years)", category: "children" },
    C10: { label: "Child (10 years)", category: "children" },
    C11: { label: "Child (11 years)", category: "children" },
    MSTR: { label: "Male Child", category: "children" },
    MISS: { label: "Female Child", category: "children" },
    INF: { label: "Infant", category: "infant" },
    IN: { label: "Infant without Seat", category: "infant" },
    INS: { label: "Infant with Seat", category: "infant" },
    MIL: { label: "Military Personnel", category: "military" },
    STU: { label: "Student", category: "student" },
    SEA: { label: "Seaman/Crew", category: "crew" },
    GOV: { label: "Government Official", category: "official" },
    LBR: { label: "Laborer/Worker", category: "worker" },
    CLG: { label: "Clergy", category: "official" },
    BLD: { label: "Blind", category: "assistance" },
    DEAF: { label: "Deaf", category: "assistance" },
    MED: { label: "Medical Case", category: "assistance" },
    DPNA: { label: "Developmental Disability", category: "assistance" },
    EXST: { label: "Extra Seat", category: "special" },
    BAG: { label: "Cabin Baggage", category: "special" },
    BRV: { label: "Bereavement", category: "special" }
};

const passengerCodes = Object.keys(passengerFormat);

const isPassenger = (line) => passengerCodes.some((item) => line.includes(item));

const isFlight = (line) => {
    const sanitizedLine = line.replace(/[*_]/g, ' ');
    const flightPattern = /^\s*\d+[\.\s]+[A-Z0-9]{2}\s*\d{1,4}/i;
    return flightPattern.test(sanitizedLine);
};

function formatToISO(gdsDate, gdsTime, referenceDepartureTime = null) {
    const months = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };
    const day = parseInt(gdsDate.substring(0, 2));
    const monthStr = gdsDate.substring(2).toUpperCase();
    const month = months[monthStr];
    const now = new Date();
    let year = now.getFullYear();
    if (month < now.getMonth()) year++;
    let dateObj = new Date(year, month, day);
    if (referenceDepartureTime && parseInt(gdsTime) < parseInt(referenceDepartureTime)) {
        dateObj.setDate(dateObj.getDate() + 1);
    }
    const finalYear = dateObj.getFullYear();
    const finalMonth = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const finalDay = dateObj.getDate().toString().padStart(2, '0');
    return `${finalYear}-${finalMonth}-${finalDay}T${gdsTime.substring(0, 2)}:${gdsTime.substring(2, 4)}:00`;
}

function parsePassengerLine(line) {
    const passengers = [];
    const indexMatch = line.match(/^(\d+)[\.\s]?/);
    const passengerNumber = indexMatch ? Number(indexMatch[1]) : null;

    // 1. Handle Infant (INF)
    const infantMatch = line.match(/\(INF([^/]+)\/([^)]+)\)/);
    if (infantMatch) {
        const infLastName = infantMatch[1];
        const infFirstPart = infantMatch[2];
        const infTitleMatch = passengerCodes.find(code => infFirstPart.endsWith(code));
        passengers.push({
            passengerNumber,
            lastName: infLastName,
            firstName: infTitleMatch ? infFirstPart.slice(0, -infTitleMatch.length) : infFirstPart,
            middleName: null,
            title: infTitleMatch || "INF",
            type: { label: "Infant", category: "infant" }
        });
    }

    // 2. Handle Adult/Child with forced category logic
    let mainSection = line.replace(/^(\d+)[\.\s]?/, '');
    if (infantMatch) mainSection = mainSection.replace(infantMatch[0], '');

    // Check for Category in brackets: (CHD/...) or (C12/...)
    const bracketMatch = mainSection.match(/\(([^/)]+)\//);
    let forcedType = null;
    if (bracketMatch) {
        const typeCode = bracketMatch[1].toUpperCase();
        if (passengerFormat[typeCode]) forcedType = passengerFormat[typeCode];
    }

    // Clean brackets for name parsing
    const cleanSection = mainSection.replace(/\([^)]+\)/g, '').trim();
    const titleMatch = cleanSection.match(new RegExp(`\\b(${passengerCodes.join('|')})\\b`, 'i'));
    
    if (titleMatch) {
        const title = titleMatch[1].toUpperCase();
        const nameSection = cleanSection.replace(new RegExp(`\\s*${title}\\s*$`, 'i'), '').trim();
        const [lastName, firstPart] = nameSection.split('/');

        if (lastName && firstPart) {
            const nameParts = firstPart.trim().split(/\s+/);
            passengers.unshift({
                passengerNumber,
                lastName,
                firstName: nameParts[0],
                middleName: nameParts.slice(1).join(' ') || null,
                title,
                type: forcedType || passengerFormat[title] // forcedType (C12) ko priority di
            });
        }
    }
    return passengers.length > 0 ? passengers : null;
}

function parseFlightLine(line) {
    const flightRegex = /^\s*(\d+)[\.\s]+([A-Z0-9]{2})\s*(\d{1,4})\s*([A-Z])?\s+(\d{2}[A-Z]{3})\s+(\d)[^A-Z0-9]?\s*([A-Z]{6})\s+([A-Z]{2}\d)\s+(\d{4})\s+(\d{4})/i;
    const match = line.match(flightRegex);
    if (!match) return null;
    const [_, index, iata, flightNum, bookingClass, date, day, route, status, dep, arr] = match;
    return {
        segmentNumber: Number(index),
        flightNumber: flightNum,
        airline: airportsData.getAirlineByIata(iata.toUpperCase()),
        class: bookingClass || null,
        date: date,
        origin: airportsData.getAirportByIata(route.substring(0, 3)),
        destination: airportsData.getAirportByIata(route.substring(3, 6)),
        status: status,
        departureISO: formatToISO(date, dep),
        arrivalISO: formatToISO(date, arr, dep)
    };
}

const convertFlightCodes = (rawData) => {
    const sanitizedData = rawData.replace(/_/g, ' ');
    const segments = sanitizedData.split(/\n/).map(l => l.trim()).filter(Boolean);
    const result = { passengers: [], flights: [] };
    segments.forEach((segment) => {
        if (isFlight(segment)) {
            const f = parseFlightLine(segment);
            if (f) result.flights.push(f);
        } else if (isPassenger(segment)) {
            const pList = parsePassengerLine(segment);
            if (pList) result.passengers.push(...pList);
        }
    });
    return result;
};

module.exports = convertFlightCodes;