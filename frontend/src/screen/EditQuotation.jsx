import React, { useEffect, useState, useRef } from 'react';
import { Form, Input, InputNumber, Select, DatePicker, Button, Card, Row, Col, Space, message, Typography, Alert, Spin, Popconfirm, Table, Tag, Checkbox } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);
import { useDataContext } from '../context/DataContext';
import { API_BASE } from '../config/data';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
const { Title } = Typography;

const EditQuotation = ({ isDark }) => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const { id } = useParams();
  const [selectedCurrency, setSelectedCurrency] = useState('GBP');
  const [exchangeRates, setExchangeRates] = useState({ USD: 1.08, GBP: 0.85, EUR: 1.0, AED: 4.0, SAR: 4.1 });
  const [bookingType, setBookingType] = useState('Individual');
  const bookingTypeRef = useRef('Individual');
  useEffect(() => {
    bookingTypeRef.current = bookingType;
  }, [bookingType]);

  const [summary, setSummary] = useState({
    groups: [],
    totals: { adults: 0, children: 0, infants: 0, pax: 0, amount: 0 },
    hotels: []
  });

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const response = await fetch('https://open.er-api.com/v6/latest/EUR');
        const data = await response.json();
        if (data && data.rates) {
          setExchangeRates(data.rates);
        }
      } catch (error) {
        console.error('Failed to fetch exchange rates, using local fallbacks:', error);
      }
    };
    fetchRates();
  }, []);

  const handleCurrencyChange = (newCurrency) => {
    const prevRate = exchangeRates[selectedCurrency] || 1;
    const newRate = exchangeRates[newCurrency] || 1;
    const factor = newRate / prevRate;

    const adultP = form.getFieldValue('priceAdult');
    const childP = form.getFieldValue('priceChild');
    const infantP = form.getFieldValue('priceInfant');

    const patch = {};
    if (adultP !== undefined && adultP !== null) {
      const val = Number((adultP * factor).toFixed(2));
      patch.priceAdult = val;
      setPrice(prev => ({ ...prev, adults: val }));
    }
    if (childP !== undefined && childP !== null) {
      const val = Number((childP * factor).toFixed(2));
      patch.priceChild = val;
      setPrice(prev => ({ ...prev, children: val }));
    }
    if (infantP !== undefined && infantP !== null) {
      const val = Number((infantP * factor).toFixed(2));
      patch.priceInfant = val;
      setPrice(prev => ({ ...prev, infant: val }));
    }

    form.setFieldsValue(patch);
    setSelectedCurrency(newCurrency);

    if (bookingType === 'Group') {
      setTimeout(() => {
        handleValuesChange({}, form.getFieldsValue());
      }, 50);
    }
  };

  const currencySymbols = {
    USD: '$', EUR: '€', GBP: '£', AED: 'AED', SAR: 'SAR',
    CAD: 'C$', AUD: 'A$', JPY: '¥', INR: '₹', CNY: '¥',
    CHF: 'CHF', SGD: 'S$', HKD: 'HK$', NZD: 'NZ$', SEK: 'kr',
    NOK: 'kr', DKK: 'kr', TRY: '₺', RUB: '₽', ZAR: 'R',
    BRL: 'R$', MXN: '$', PLN: 'zł', PHP: '₱', IDR: 'Rp',
    THB: '฿', MYR: 'RM', VND: '₫', KRW: '₩'
  };
  const getSymbol = (code) => currencySymbols[code] || code || '£';

  const [price, setPrice] = useState({
    adults: 0,
    infant: 0,
    children: 0
  });
  const [passengerType, setPassengerType] = useState({
    adults: 0,
    infant: 0,
    children: 0
  });
  const [rawCodes, setRawCodes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [form] = Form.useForm();
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [quotationLoading, setQuotationLoading] = useState(true);
  const { hotels } = useDataContext();
  const [formHotels, setFormHotels] = useState([]);

  // Auto-calculates nights and global package price for Group bookings
  const handleValuesChange = (changedValues, allValues) => {
    if (bookingTypeRef.current !== 'Group') return;
    let total = 0;
    const adultPrice = Number(allValues.priceAdult) || 0;
    const childPrice = Number(allValues.priceChild) || 0;
    const infantPrice = Number(allValues.priceInfant) || 0;

    let topHotelsUpdated = false;
    const topHotels = allValues.hotels || [];
    const updatedTopHotels = topHotels.map((hotel) => {
      if (hotel.check_in && hotel.check_out) {
        const start = dayjs(hotel.check_in);
        const end = dayjs(hotel.check_out);
        const diff = end.diff(start, 'day');
        const expectedNights = diff > 0 ? diff : 0;
        if (hotel.nights !== expectedNights) {
          topHotelsUpdated = true;
          return { ...hotel, nights: expectedNights };
        }
      }
      return hotel;
    });
    if (topHotelsUpdated) {
      form.setFieldsValue({ hotels: updatedTopHotels });
    }

    let totalAdults = 0;
    let totalChildren = 0;
    let totalInfants = 0;
    const summaryGroups = [];

    const updatedGroups = (allValues.groups || []).map((group, index) => {
      const adults = Number(group.adults) || 0;
      const children = Number(group.children) || 0;
      const infants = Number(group.infants) || 0;
      
      totalAdults += adults;
      totalChildren += children;
      totalInfants += infants;

      const groupAmount = (adults * adultPrice) + (children * childPrice) + (infants * infantPrice);
      total += groupAmount;

      summaryGroups.push({
        index: index + 1,
        leaderName: group.customer_name || `Group #${index + 1}`,
        adults,
        childrenCount: children,
        infants,
        pax: adults + children + infants,
        amount: groupAmount
      });

      return group;
    });

    const patch = { totalPrice: total };
    form.setFieldsValue(patch);

    // Compute consolidated hotel summary
    const hotelSummaryMap = {};
    const currentTopHotels = form.getFieldValue('hotels') || [];
    (updatedGroups || []).forEach(group => {
      const extraServices = group.extra_services || [];
      if (!extraServices.includes('Hotels')) return;

      (group.hotels || []).forEach((h, hIdx) => {
        const topHotel = currentTopHotels[hIdx];
        if (!topHotel || (!topHotel.hotel_id && !topHotel.name)) return;

        const hotelObj = hotels.find(item => item._id === topHotel.hotel_id);
        const hotelName = hotelObj ? hotelObj.name : (topHotel.name || 'Manual Entry');
        const checkInStr = topHotel.check_in ? dayjs(topHotel.check_in).format('YYYY-MM-DD') : 'N/A';
        const checkOutStr = topHotel.check_out ? dayjs(topHotel.check_out).format('YYYY-MM-DD') : 'N/A';
        const nights = Number(topHotel.nights) || 0;
        const key = `${hotelName}_${checkInStr}_${checkOutStr}_${nights}`;
        
        if (!hotelSummaryMap[key]) {
          hotelSummaryMap[key] = {
            key,
            hotelName,
            checkIn: topHotel.check_in,
            checkOut: topHotel.check_out,
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
    const hotelSummaryList = Object.values(hotelSummaryMap);

    // Update the summary state
    setSummary({
      groups: summaryGroups,
      totals: {
        adults: totalAdults,
        children: totalChildren,
        infants: totalInfants,
        pax: totalAdults + totalChildren + totalInfants,
        amount: total
      },
      hotels: hotelSummaryList
    });
  };

  const addHotelRoom = (groupIndex, hotelIndex) => {
    const currentGroups = form.getFieldValue('groups') || [];
    const group = currentGroups[groupIndex] || {};
    const hotelsList = group.hotels || [];
    const hotel = hotelsList[hotelIndex] || {};
    const rooms = hotel.rooms || [];
    const updatedRooms = [
      ...rooms,
      { room_type: null, noOfRooms: 1, meal_plan: null }
    ];
    form.setFieldValue(['groups', groupIndex, 'hotels', hotelIndex, 'rooms'], updatedRooms);
  };

  // Fetch quotation details on mount
  useEffect(() => {
    const fetchQuotationDetails = async () => {
      try {
        const response = await fetch(`${API_BASE}/quotation/detail/${id}`);
        const result = await response.json();
        if (result.success && result.data) {
          const qData = result.data;
          const bType = qData.bookingType || 'Individual';
          setBookingType(bType);

          setSelectedCurrency(qData.pricing?.currency || 'GBP');

          // Prefill Form fields
          form.setFieldsValue({
            customer_name: qData.customer_name,
            customer_email: qData.customer_email,
            customer_phone: qData.customer_phone,
            travel_date: qData.travel_date ? dayjs.utc(qData.travel_date) : null,
            passengers_names: qData.passengers_names,
            currency: qData.pricing?.currency || 'GBP',
            adults: qData.passenger_counts?.adults || 0,
            children: qData.passenger_counts?.children || 0,
            infants: qData.passenger_counts?.infants || 0,
            priceAdult: qData.pricing?.priceAdult || 0,
            priceChild: qData.pricing?.priceChild || 0,
            priceInfant: qData.pricing?.priceInfant || 0,
            totalPrice: qData.pricing?.totalPrice || 0,
            special_conditions: qData.special_conditions,
            notes: qData.notes,
            cancellation_policy: qData.cancellation_policy
          });

          // Prefill state variables for pricing auto-calculations
          setPrice({
            adults: qData.pricing?.priceAdult || 0,
            children: qData.pricing?.priceChild || 0,
            infant: qData.pricing?.priceInfant || 0
          });

          setPassengerType({
            adults: qData.passenger_counts?.adults || 0,
            children: qData.passenger_counts?.children || 0,
            infant: qData.passenger_counts?.infants || 0
          });

          // Prefill flights state
          if (qData.flights && qData.flights.length > 0) {
            const loadedFlights = qData.flights.map((f, index) => ({
              ...f,
              id: f._id || (Date.now() + index),
              from: f.from || '',
              to: f.to || '',
              date: f.date ? dayjs.utc(f.date) : null,
              departureDateTime: f.departureDateTime ? dayjs.utc(f.departureDateTime) : null,
              arrivalDateTime: f.arrivalDateTime ? dayjs.utc(f.arrivalDateTime) : null,
              airline: f.airline || ''
            }));
            setFlights(loadedFlights);
          }

          if (bType === 'Group') {
            if (qData.groups && qData.groups.length > 0) {
              let topHotelsList = qData.hotels || [];
              if (topHotelsList.length === 0) {
                topHotelsList = qData.groups[0]?.hotels || [];
              }
              const formattedTopHotels = topHotelsList.map(h => ({
                hotel_id: h.hotel_id?._id || h.hotel_id,
                name: h.name,
                check_in: h.check_in ? dayjs.utc(h.check_in) : null,
                check_out: h.check_out ? dayjs.utc(h.check_out) : null,
                nights: h.nights
              }));
              form.setFieldsValue({ hotels: formattedTopHotels });

              const formattedGroups = qData.groups.map((group, groupIndex) => {
                const formattedHotels = (group.hotels || []).map((h, hotelIndex) => {
                  let rooms = h.rooms || [];
                  if (rooms.length === 0 && (h.room_type || h.noOfRooms || h.meal_plan)) {
                    rooms = [
                      {
                        id: Date.now() + groupIndex * 1000 + hotelIndex * 10 + 999,
                        room_type: h.room_type,
                        noOfRooms: h.noOfRooms || 1,
                        meal_plan: h.meal_plan
                      }
                    ];
                  }
                  if (rooms.length === 0) {
                    rooms = [
                      {
                        id: Date.now() + groupIndex * 1000 + hotelIndex * 10 + 999,
                        room_type: null,
                        noOfRooms: 1,
                        meal_plan: null
                      }
                    ];
                  }
                  return {
                    rooms: rooms.map((r, rIdx) => ({
                      ...r,
                      id: r.id || r._id || (Date.now() + groupIndex * 1000 + hotelIndex * 10 + rIdx + 1000)
                    }))
                  };
                });

                const hotelsData = [];
                for (let i = 0; i < formattedTopHotels.length; i++) {
                  const existingGroupHotel = formattedHotels[i];
                  if (existingGroupHotel) {
                    hotelsData.push(existingGroupHotel);
                  } else {
                    hotelsData.push({
                      rooms: [{ id: Date.now() + groupIndex * 1000 + i * 10 + 999, room_type: null, noOfRooms: 1, meal_plan: null }]
                    });
                  }
                }

                return {
                  ...group,
                  travel_date: group.travel_date ? dayjs.utc(group.travel_date) : null,
                  hotels: hotelsData
                };
              });
              form.setFieldsValue({ groups: formattedGroups });
              
              // Calculate initial summary directly from database values to avoid stale closure / race conditions
              const adultPrice = Number(qData.pricing?.priceAdult) || 0;
              const childPrice = Number(qData.pricing?.priceChild) || 0;
              const infantPrice = Number(qData.pricing?.priceInfant) || 0;

              let totalAdults = 0;
              let totalChildren = 0;
              let totalInfants = 0;
              let total = 0;
              const summaryGroups = [];
              const hotelSummaryMap = {};

              formattedGroups.forEach((group, index) => {
                const adults = Number(group.adults) || 0;
                const children = Number(group.children) || 0;
                const infants = Number(group.infants) || 0;

                totalAdults += adults;
                totalChildren += children;
                totalInfants += infants;

                const groupAmount = (adults * adultPrice) + (children * childPrice) + (infants * infantPrice);
                total += groupAmount;

                summaryGroups.push({
                  index: index + 1,
                  leaderName: group.customer_name || `Group #${index + 1}`,
                  adults,
                  childrenCount: children,
                  infants,
                  pax: adults + children + infants,
                  amount: groupAmount
                });

                const extraServices = group.extra_services || [];
                if (extraServices.includes('Hotels')) {
                  (group.hotels || []).forEach((h, hIdx) => {
                    const topHotel = formattedTopHotels[hIdx];
                    if (!topHotel || (!topHotel.hotel_id && !topHotel.name)) return;
                    
                    const hotelObj = hotels.find(item => item._id === topHotel.hotel_id);
                    const hotelName = hotelObj ? hotelObj.name : (topHotel.name || 'Manual Entry');
                    const checkInStr = topHotel.check_in ? dayjs(topHotel.check_in).format('YYYY-MM-DD') : 'N/A';
                    const checkOutStr = topHotel.check_out ? dayjs(topHotel.check_out).format('YYYY-MM-DD') : 'N/A';
                    const nights = Number(topHotel.nights) || 0;
                    const key = `${hotelName}_${checkInStr}_${checkOutStr}_${nights}`;
                    
                    if (!hotelSummaryMap[key]) {
                      hotelSummaryMap[key] = {
                        key,
                        hotelName,
                        checkIn: topHotel.check_in,
                        checkOut: topHotel.check_out,
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
                }
              });

              const hotelSummaryList = Object.values(hotelSummaryMap);

              setSummary({
                groups: summaryGroups,
                totals: {
                  adults: totalAdults,
                  children: totalChildren,
                  infants: totalInfants,
                  pax: totalAdults + totalChildren + totalInfants,
                  amount: total
                },
                hotels: hotelSummaryList
              });
            }
          } else {
            // Prefill hotels state
            if (qData.hotels && qData.hotels.length > 0) {
              const loadedHotels = qData.hotels.map((h, index) => {
                let rooms = h.rooms || [];
                if (rooms.length === 0 && (h.room_type || h.noOfRooms || h.meal_plan)) {
                  rooms = [
                    {
                      id: Date.now() + index + 999,
                      room_type: h.room_type,
                      noOfRooms: h.noOfRooms || 1,
                      meal_plan: h.meal_plan
                    }
                  ];
                }
                if (rooms.length === 0) {
                  rooms = [
                    {
                      id: Date.now() + index + 999,
                      room_type: null,
                      noOfRooms: 1,
                      meal_plan: null
                    }
                  ];
                }

                return {
                  id: h._id || (Date.now() + index),
                  hotel_id: h.hotel_id?._id || h.hotel_id,
                  check_in: h.check_in ? dayjs.utc(h.check_in) : null,
                  check_out: h.check_out ? dayjs.utc(h.check_out) : null,
                  nights: h.nights || 0,
                  rooms: rooms.map((r, rIdx) => ({
                    ...r,
                    id: r.id || r._id || (Date.now() + index + rIdx + 1000)
                  }))
                };
              });
              setFormHotels(loadedHotels);
            }
          }
        } else {
          message.error(result.error || 'Failed to fetch quotation details');
        }
      } catch (error) {
        console.error(error);
        message.error('Error fetching quotation details: ' + error.message);
      } finally {
        setQuotationLoading(false);
      }
    };

    if (id) {
      fetchQuotationDetails();
    }
  }, [id, form]);

  const addHotel = () => {
    const newHotel = {
      id: Date.now(),
      hotel_id: null,
      check_in: null,
      check_out: null,
      nights: 0,
      rooms: [
        {
          id: Date.now() + 1,
          room_type: null,
          noOfRooms: 1,
          meal_plan: null
        }
      ]
    };
    setFormHotels([...formHotels, newHotel]);
  };

  const removeHotel = (id) => {
    setFormHotels(formHotels.filter(h => h.id !== id));
  };

  const updateHotel = (id, field, value) => {
    setFormHotels(formHotels.map(h => {
      if (h.id === id) {
        const updatedHotel = { ...h, [field]: value };

        // Auto-calculate nights if both dates exist
        if (updatedHotel.check_in && updatedHotel.check_out) {
          const start = dayjs(updatedHotel.check_in);
          const end = dayjs(updatedHotel.check_out);

          // Calculate difference in days
          const diff = end.diff(start, 'day');

          // Ensure we don't have negative nights
          updatedHotel.nights = diff > 0 ? diff : 0;
        }

        return updatedHotel;
      }
      return h;
    }));
  };

  const addRoomToHotel = (hotelId) => {
    setFormHotels(formHotels.map(h => {
      if (h.id === hotelId) {
        return {
          ...h,
          rooms: [
            ...(h.rooms || []),
            {
              id: Date.now(),
              room_type: null,
              noOfRooms: 1,
              meal_plan: null
            }
          ]
        };
      }
      return h;
    }));
  };

  const removeRoomFromHotel = (hotelId, roomId) => {
    setFormHotels(formHotels.map(h => {
      if (h.id === hotelId) {
        return {
          ...h,
          rooms: (h.rooms || []).filter(r => r.id !== roomId)
        };
      }
      return h;
    }));
  };

  const updateRoomInHotel = (hotelId, roomId, field, value) => {
    setFormHotels(formHotels.map(h => {
      if (h.id === hotelId) {
        return {
          ...h,
          rooms: (h.rooms || []).map(r => r.id === roomId ? { ...r, [field]: value } : r)
        };
      }
      return h;
    }));
  };

  const passengerOptions = Array.from({ length: 30 }, (_, i) => ({
    label: i.toString(),
    value: i,
  }));

  useEffect(() => {
    if (bookingType === 'Group') return;
    const total =
      (price.adults * passengerType.adults) +
      (price.children * passengerType.children) +
      (price.infant * passengerType.infant);

    // Physical update of the value shown in the "totalPrice" InputNumber
    form.setFieldsValue({ totalPrice: total });
  }, [price, passengerType, form, bookingType]);

  const rawCodesParser = async () => {
    if (!rawCodes.trim()) {
      message.error('Please paste itinerary code first');
      return;
    }
    setProcessing(true);
    try {
      setFlights([]);
      const response = await fetch(`${API_BASE}/quotation/process-raw-codes`, {
        method: 'POST',
        headers: {
          "Content-Type": 'application/json'
        },
        body: JSON.stringify({ rawCodes })
      });
      const result = await response.json();

      if (result.success && result.data) {
        const { passengers, flights: parsedFlightsData } = result.data;

        // Format passenger names
        const passengerNames = passengers
          .map(p => `${p.firstName} ${p.lastName}`)
          .join(', ');

        if (bookingType === 'Group') {
          // Auto-fill parsed details to the first group in the list for user convenience
          const currentGroups = form.getFieldValue('groups') || [{}];
          const adultCount = passengers.filter(item => item.type.category === 'adult').length;
          const childCount = passengers.filter(item => item.type.category === 'children').length;
          const infantCount = passengers.filter(item => item.type.category === 'infant').length;

          currentGroups[0] = {
            ...currentGroups[0],
            customer_name: passengerNames.split(', ')[0] || '',
            passengers_names: passengerNames,
            adults: adultCount,
            children: childCount,
            infants: infantCount
          };
          form.setFieldsValue({ groups: currentGroups });
        } else {
          // Set passenger names to form
          form.setFieldValue('passengers_names', passengerNames);

          // Count passengers
          const adultCount = passengers.filter(item => item.type.category === 'adult').length;
          const childCount = passengers.filter(item => item.type.category === 'children').length;
          const infantCount = passengers.filter(item => item.type.category === 'infant').length;

          // 1. Update the Form (for the UI)
          form.setFieldsValue({
            adults: adultCount,
            children: childCount,
            infants: infantCount
          });

          // 2. Update the State (for the Pricing Math)
          setPassengerType({
            adults: adultCount,
            children: childCount,
            infant: infantCount
          });
        }

        // Parse and set flights
        if (parsedFlightsData && parsedFlightsData.length > 0) {
          const parsedFlights = parsedFlightsData.map((flight, index) => ({
            ...flight,
            id: Date.now() + index,
            from: flight.origin?.city || flight.origin?.iata || '',
            to: flight.destination?.city || flight.destination?.iata || '',
            date: flight.departureISO ? dayjs.utc(flight.departureISO) : null,
            departureDateTime: flight.departureISO ? dayjs.utc(flight.departureISO) : null,
            arrivalDateTime: flight.arrivalISO ? dayjs.utc(flight.arrivalISO) : null,
            airline: flight.airline?.name || flight.airline?.iata || ''
          }));
          setFlights(parsedFlights);
        }

        if (bookingType === 'Group') {
          handleValuesChange({}, form.getFieldsValue());
        }

        message.success('Data parsed and flight segments updated successfully!');
      } else {
        message.error(result.error || 'Failed to parse itinerary');
      }
    } catch (error) {
      console.error(error);
      message.error('Error parsing itinerary: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const hotelOptions = hotels.map((item) => ({
    value: item._id,
    label: `${item.name} ${item.hotelType ? ` - ${item.hotelType} Stars` : ''}`,
    location: `${item.city}, ${item.country}`,
  }));

  const addFlight = () => {
    setFlights([...flights, { id: Date.now(), from: '', to: '', date: null, departureDateTime: null, arrivalDateTime: null, airline: '' }]);
  };

  const removeFlight = (id) => {
    setFlights(flights.filter((flight) => flight.id !== id));
  };

  const updateFlight = (id, field, value) => {
    setFlights(
      flights.map((flight) =>
        flight.id === id ? { ...flight, [field]: value } : flight
      )
    );
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      if (bookingType === 'Group') {
        const formattedTopHotels = (values.hotels || []).map(h => {
          const hotelObj = hotels.find(item => item._id === h.hotel_id);
          return {
            hotel_id: h.hotel_id,
            name: hotelObj ? hotelObj.name : (h.name || 'Manual Entry'),
            check_in: h.check_in ? h.check_in.format('YYYY-MM-DD') : null,
            check_out: h.check_out ? h.check_out.format('YYYY-MM-DD') : null,
            nights: h.nights,
            rooms: []
          };
        });

        const formattedGroups = (values.groups || []).map(group => {
          const extraServices = group.extra_services || [];
          const isHotelsChecked = extraServices.includes('Hotels');
          const formattedHotels = (values.hotels || []).map((topHotel, hIdx) => {
            const groupHotel = group.hotels?.[hIdx] || {};
            const firstRoom = isHotelsChecked ? (groupHotel.rooms?.[0] || {}) : {};
            return {
              hotel_id: topHotel.hotel_id,
              check_in: topHotel.check_in ? topHotel.check_in.format('YYYY-MM-DD') : null,
              check_out: topHotel.check_out ? topHotel.check_out.format('YYYY-MM-DD') : null,
              nights: topHotel.nights,
              rooms: isHotelsChecked ? (groupHotel.rooms || []).map(r => ({
                room_type: r.room_type,
                noOfRooms: r.noOfRooms,
                meal_plan: r.meal_plan
              })) : [],
              room_type: isHotelsChecked ? firstRoom.room_type : undefined,
              noOfRooms: isHotelsChecked ? (firstRoom.noOfRooms || 0) : 0,
              meal_plan: isHotelsChecked ? firstRoom.meal_plan : undefined
            };
          });
          return {
            ...group,
            travel_date: group.travel_date ? group.travel_date.format('YYYY-MM-DD') : null,
            hotels: formattedHotels
          };
        });

        const rate = exchangeRates[selectedCurrency] || 1;
        const formData = {
          ...values,
          bookingType: 'Group',
          created_by: user.id,
          currency: selectedCurrency,
          exchangeRate: rate,
          basePriceAdult: Number(((values.priceAdult || 0) / rate).toFixed(2)),
          basePriceChild: Number(((values.priceChild || 0) / rate).toFixed(2)),
          basePriceInfant: Number(((values.priceInfant || 0) / rate).toFixed(2)),
          baseTotalPrice: Number(((values.totalPrice || 0) / rate).toFixed(2)),
          travel_date: formattedGroups[0]?.travel_date || null,
          customer_name: formattedGroups[0]?.customer_name || '',
          customer_email: formattedGroups[0]?.customer_email || '',
          customer_phone: formattedGroups[0]?.customer_phone || '',
          adults: formattedGroups.reduce((sum, g) => sum + (Number(g.adults) || 0), 0),
          children: formattedGroups.reduce((sum, g) => sum + (Number(g.children) || 0), 0),
          infants: formattedGroups.reduce((sum, g) => sum + (Number(g.infants) || 0), 0),
          double_rooms: 0,
          triple_rooms: 0,
          quadruple_rooms: 0,
          total_rooms_required: 0,
          rooms_booked: 0,
          remaining_rooms: 0,
          hotels: formattedTopHotels,
          flights: flights.map((f) => ({
            ...f,
            date: f.date ? f.date.format('YYYY-MM-DD') : null,
            departureDateTime: f.departureDateTime ? f.departureDateTime.format('YYYY-MM-DD HH:mm:ss') : null,
            arrivalDateTime: f.arrivalDateTime ? f.arrivalDateTime.format('YYYY-MM-DD HH:mm:ss') : null
          })),
          groups: formattedGroups
        };

        console.log('Update Group Form Data:', formData);
        const response = await fetch(`${API_BASE}/quotation/update/${id}`, {
          method: 'PUT',
          headers: {
            "Content-Type": 'application/json'
          },
          body: JSON.stringify(formData)
        });
        const result = await response.json();
        if (result.success) {
          message.success('Group quotation updated successfully!');
          navigate('/quotations');
          return;
        }
        message.error(result.error);
      } else {
        const isHotelsValid = formHotels.every(h =>
          h.hotel_id && h.check_in && h.check_out && h.nights >= 0 &&
          h.rooms && h.rooms.length > 0 && h.rooms.every(r => r.room_type && r.meal_plan && r.noOfRooms > 0)
        );

        if (formHotels.length > 0 && !isHotelsValid) {
          message.error("Please fill in all hotel details (Room types, Meal plans, Dates, Nights).");
          return;
        }

        const rate = exchangeRates[selectedCurrency] || 1;
        const formData = {
          ...values,
          created_by: user.id,
          bookingType: 'Individual',
          travel_date: values.travel_date ? values.travel_date.format('YYYY-MM-DD') : null,
          currency: selectedCurrency,
          exchangeRate: rate,
          basePriceAdult: Number(((values.priceAdult || 0) / rate).toFixed(2)),
          basePriceChild: Number(((values.priceChild || 0) / rate).toFixed(2)),
          basePriceInfant: Number(((values.priceInfant || 0) / rate).toFixed(2)),
          baseTotalPrice: Number(((values.totalPrice || 0) / rate).toFixed(2)),
          flights: flights.map((f) => ({
            ...f,
            date: f.date ? f.date.format('YYYY-MM-DD') : null,
            departureDateTime: f.departureDateTime ? f.departureDateTime.format('YYYY-MM-DD HH:mm:ss') : null,
            arrivalDateTime: f.arrivalDateTime ? f.arrivalDateTime.format('YYYY-MM-DD HH:mm:ss') : null
          })),
          hotels: formHotels.map(h => {
            const firstRoom = h.rooms?.[0] || {};
            return {
              hotel_id: h.hotel_id,
              check_in: h.check_in ? h.check_in.format('YYYY-MM-DD') : null,
              check_out: h.check_out ? h.check_out.format('YYYY-MM-DD') : null,
              nights: h.nights,
              rooms: (h.rooms || []).map(r => ({
                room_type: r.room_type,
                noOfRooms: r.noOfRooms,
                meal_plan: r.meal_plan
              })),
              room_type: firstRoom.room_type,
              noOfRooms: firstRoom.noOfRooms || 1,
              meal_plan: firstRoom.meal_plan
            };
          })
        };

        console.log('Update Form Data:', formData);
        const response = await fetch(`${API_BASE}/quotation/update/${id}`, {
          method: 'PUT',
          headers: {
            "Content-Type": 'application/json'
          },
          body: JSON.stringify(formData)
        });
        const result = await response.json();
        if (result.success) {
          message.success('Quotation updated successfully!');
          navigate('/quotations');
          return;
        }
        message.error(result.error);
      }
    } catch (error) {
      console.error(error);
      message.error('Failed to update quotation');
    } finally {
      setLoading(false);
    }
  };

  const disabledCheckIn = (current) => {
    return current && current < dayjs().startOf('day');
  };

  const disabledCheckOut = (checkInDate) => (current) => {
    return current && current < dayjs(checkInDate).startOf('day');
  };

  const cardStyle = {
    backgroundColor: isDark ? '#1f1f1f' : '#ffffff',
    marginBottom: 24,
  };

  if (quotationLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="Loading quotation details..." />
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <Title level={3} style={{ marginBottom: 0 }}>Edit Quotation</Title>
      </div>

      {/* AI Convert Section */}
      <Card style={cardStyle} size="small">
        <div style={{ marginBottom: 16 }}>
          <Alert message="Paste Amadeus / Airline Itinerary Code then click convert to update flight details." style={{ marginBottom: 8 }} type="info" />
          <Form.Item name="raw_itinerary" style={{ marginBottom: 8 }}>
            <Input.TextArea
              rows={6}
              placeholder="Paste itinerary..."
              id="raw_itinerary"
              onChange={(e) => setRawCodes(e.target.value)}
            />
          </Form.Item>
          <Button type="primary" onClick={rawCodesParser} loading={processing}>
            Convert Data
          </Button>
        </div>
      </Card>
      
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        onValuesChange={handleValuesChange}
        autoComplete="off"
      >
        {bookingType === 'Group' ? (
          <>
            {/* Global Settings */}
            <Card style={cardStyle} title="Global Settings" size="small">
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item
                    label="Quotation Currency"
                    name="currency"
                    initialValue="GBP"
                  >
                    <Select
                      showSearch
                      optionFilterProp="label"
                      onChange={handleCurrencyChange}
                      options={Object.keys(exchangeRates).map((code) => {
                        const sym = currencySymbols[code] ? ` (${currencySymbols[code]})` : '';
                        return {
                          value: code,
                          label: `${code}${sym} - Rate: ${(exchangeRates[code] || 1).toFixed(4)}`
                        };
                      })}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </>
        ) : (
          <>
            {/* Customer Details */}
            <Card style={cardStyle} title="Customer Details" size="small">
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item
                    label="Customer Name"
                    name="customer_name"
                    rules={[{ required: true, message: 'Please enter customer name' }]}
                  >
                    <Input placeholder="Enter customer name" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item
                    label="Email"
                    name="customer_email"
                    rules={[
                      { type: 'email', message: 'Invalid email' },
                    ]}
                  >
                    <Input placeholder="Enter email" type="email" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item
                    label="Phone"
                    name="customer_phone"
                  >
                    <Input placeholder="Enter phone number" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* Travel Details */}
            <Card style={cardStyle} title="Travel Details" size="small">
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item
                    label="Travel Date"
                    name="travel_date"
                    rules={[{ required: true, message: 'Please select travel date' }]}
                  >
                    <DatePicker format="DD-MM-YYYY" style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item
                    label="Quotation Currency"
                    name="currency"
                    initialValue="GBP"
                  >
                    <Select
                      showSearch
                      optionFilterProp="label"
                      onChange={handleCurrencyChange}
                      options={Object.keys(exchangeRates).map((code) => {
                        const sym = currencySymbols[code] ? ` (${currencySymbols[code]})` : '';
                        return {
                          value: code,
                          label: `${code}${sym} - Rate: ${(exchangeRates[code] || 1).toFixed(4)}`
                        };
                      })}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item
                    label="Passengers Names"
                    name="passengers_names"
                  >
                    <Input.TextArea rows={3} placeholder="Auto-populated" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item
                    label="Adults"
                    name="adults"
                    initialValue={0}
                  >
                    <Select
                      onChange={(val) => setPassengerType({ ...passengerType, adults: val })}
                      options={passengerOptions}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item
                    label="Children"
                    name="children"
                    initialValue={0}
                  >
                    <Select
                      onChange={(val) => setPassengerType({ ...passengerType, children: val })}
                      options={passengerOptions}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item
                    label="Infants"
                    name="infants"
                    initialValue={0}
                  >
                    <Select
                      onChange={(val) => setPassengerType({ ...passengerType, infant: val })}
                      options={passengerOptions}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </>
        )}

        {/* Flight Details */}
        <Card style={cardStyle} title="Flight Details" size="small">
          <div style={{ marginBottom: 16 }}>
            {flights.length === 0 ? (
              <p style={{ color: '#999' }}>No flights added yet</p>
            ) : (
              flights.map((flight) => (
                <Card key={flight.id} style={{ marginBottom: 12, backgroundColor: isDark ? '#262626' : '#fafafa' }}>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} md={5}>
                      <Form.Item label="From" style={{ marginBottom: 0 }}>
                        <Input
                          placeholder="From"
                          value={flight.from}
                          onChange={(e) => updateFlight(flight.id, 'from', e.target.value)}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} md={5}>
                      <Form.Item label="To" style={{ marginBottom: 0 }}>
                        <Input
                          placeholder="To"
                          value={flight.to}
                          onChange={(e) => updateFlight(flight.id, 'to', e.target.value)}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} md={5}>
                      <Form.Item label="Date" style={{ marginBottom: 0 }}>
                        <DatePicker
                          format="DD-MM-YYYY HH:mm:ss"
                          style={{ width: '100%' }}
                          value={flight.date}
                          onChange={(date) => updateFlight(flight.id, 'date', date)}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} md={5}>
                      <Form.Item label="Airline" style={{ marginBottom: 0 }}>
                        <Input
                          placeholder="Airline"
                          value={flight.airline}
                          onChange={(e) => updateFlight(flight.id, 'airline', e.target.value)}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} md={4}>
                      <Form.Item label=" " style={{ marginBottom: 0 }}>
                        <Popconfirm
                          title="Remove Flight Segment"
                          description="Are you sure you want to remove this flight segment?"
                          onConfirm={() => removeFlight(flight.id)}
                          okText="Yes"
                          cancelText="No"
                        >
                          <Button
                            danger
                            icon={<DeleteOutlined />}
                          >
                            Remove
                          </Button>
                        </Popconfirm>
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
                    <Col xs={24} sm={12} md={12}>
                      <Form.Item label="Departure Date & Time" style={{ marginBottom: 0 }}>
                        <DatePicker
                          format="DD-MM-YYYY HH:mm:ss"
                          showTime
                          style={{ width: '100%' }}
                          value={flight.departureDateTime}
                          onChange={(date) => updateFlight(flight.id, 'departureDateTime', date)}
                          placeholder="Select departure date and time"
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} md={12}>
                      <Form.Item label="Arrival Date & Time" style={{ marginBottom: 0 }}>
                        <DatePicker
                          format="DD-MM-YYYY HH:mm:ss"
                          showTime
                          style={{ width: '100%' }}
                          value={flight.arrivalDateTime}
                          onChange={(date) => updateFlight(flight.id, 'arrivalDateTime', date)}
                          placeholder="Select arrival date and time"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>
              ))
            )}
          </div>
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={addFlight}
            block
            style={{ marginBottom: 24 }}
          >
            Add Flight Segment
          </Button>
        </Card>

        {bookingType === 'Group' ? (
          <>
            {/* Accommodation Stays (All Groups) */}
            <Card style={cardStyle} title="Accommodation Stays (All Groups)" size="small">
              <Form.List name="hotels" initialValue={[{}]}>
                {(hotelFields, { add: addHotel, remove: removeHotel }) => (
                  <div>
                    {hotelFields.map(({ key: hKey, name: hName, ...restHField }) => (
                      <Card
                        key={hKey}
                        style={{ marginBottom: 12, backgroundColor: isDark ? '#262626' : '#fafafa' }}
                        extra={
                          <Popconfirm
                            title="Remove Hotel Stay"
                            description="Are you sure you want to remove this hotel stay?"
                            onConfirm={() => removeHotel(hName)}
                            okText="Yes"
                            cancelText="No"
                          >
                            <Button
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                            />
                          </Popconfirm>
                        }
                      >
                        <Row gutter={[16, 16]}>
                          <Col xs={24} sm={12} md={6}>
                            <Form.Item
                              {...restHField}
                              label="Hotel"
                              name={[hName, 'hotel_id']}
                              style={{ marginBottom: 0 }}
                              rules={[{ required: true, message: 'Please select a hotel' }]}
                            >
                              <Select
                                showSearch
                                placeholder="-- Select Hotel --"
                                optionFilterProp="label"
                                filterOption={(input, option) => {
                                  const term = (input || '').toLowerCase();
                                  const labelMatches = (option?.label || '').toLowerCase().includes(term);
                                  const locationMatches = (option?.location || '').toLowerCase().includes(term);
                                  return labelMatches || locationMatches;
                                }}
                                options={hotelOptions}
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12} md={6}>
                            <Form.Item
                              {...restHField}
                              label="Check-in"
                              name={[hName, 'check_in']}
                              style={{ marginBottom: 0 }}
                              rules={[{ required: true, message: 'Check-in is required' }]}
                            >
                              <DatePicker
                                format="DD-MM-YYYY"
                                style={{ width: '100%' }}
                                disabledDate={disabledCheckIn}
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12} md={6}>
                            <Form.Item
                              {...restHField}
                              label="Check-out"
                              name={[hName, 'check_out']}
                              style={{ marginBottom: 0 }}
                              rules={[{ required: true, message: 'Check-out is required' }]}
                            >
                              <DatePicker
                                format="DD-MM-YYYY"
                                style={{ width: '100%' }}
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12} md={6}>
                            <Form.Item
                              {...restHField}
                              label="Nights"
                              name={[hName, 'nights']}
                              style={{ marginBottom: 0 }}
                            >
                              <InputNumber min={0} style={{ width: '100%' }} readOnly />
                            </Form.Item>
                          </Col>
                        </Row>
                      </Card>
                    ))}
                    <Button
                      type="dashed"
                      icon={<PlusOutlined />}
                      onClick={() => addHotel()}
                      block
                    >
                      Add Hotel Stay
                    </Button>
                  </div>
                )}
              </Form.List>
            </Card>

            {/* Groups Form List */}
            <Form.List name="groups" initialValue={[{}]}>
              {(fields, { add, remove }) => (
                <div>
                  {fields.map(({ key, name, ...restField }) => (
                    <Card
                      key={key}
                      title={`Group Leader & Room Requirements #${name + 1}`}
                      style={{
                        backgroundColor: isDark ? '#1a1a1a' : '#f9f9f9',
                        border: `1px solid ${isDark ? '#303030' : '#e8e8e8'}`,
                        marginBottom: 32,
                        borderRadius: '8px'
                      }}
                      extra={
                        fields.length > 1 && (
                          <Popconfirm
                            title="Remove Group"
                            description="Are you sure you want to remove this group?"
                            onConfirm={() => remove(name)}
                            okText="Yes"
                            cancelText="No"
                          >
                            <Button
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                            >
                              Remove Group
                            </Button>
                          </Popconfirm>
                        )
                      }
                    >
                      {/* Group Leader Details */}
                      <Card style={cardStyle} title="Group Leader Details" size="small">
                        <Row gutter={[16, 16]}>
                          <Col xs={24} sm={12} md={8}>
                            <Form.Item
                              {...restField}
                              label="Group Leader Name"
                              name={[name, 'customer_name']}
                              rules={[{ required: true, message: 'Please enter group leader name' }]}
                            >
                              <Input placeholder="Enter group leader name" />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12} md={8}>
                            <Form.Item
                              {...restField}
                              label="Email"
                              name={[name, 'customer_email']}
                              rules={[{ type: 'email', message: 'Invalid email' }]}
                            >
                              <Input placeholder="Enter email" type="email" />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12} md={8}>
                            <Form.Item
                              {...restField}
                              label="Phone"
                              name={[name, 'customer_phone']}
                            >
                              <Input placeholder="Enter phone number" />
                            </Form.Item>
                          </Col>
                        </Row>
                      </Card>

                      {/* Travel Details */}
                      <Card style={cardStyle} title="Travel Details" size="small">
                        <Row gutter={[16, 16]}>
                          <Col xs={24} sm={12} md={8}>
                            <Form.Item
                              {...restField}
                              label="Travel Date"
                              name={[name, 'travel_date']}
                              rules={[{ required: true, message: 'Please select travel date' }]}
                            >
                              <DatePicker format="DD-MM-YYYY" style={{ width: '100%' }} />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12} md={8}>
                            <Form.Item
                              {...restField}
                              label="Passengers Names"
                              name={[name, 'passengers_names']}
                            >
                              <Input.TextArea rows={3} placeholder="Enter passenger names" />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12} md={8}>
                            <Form.Item
                              {...restField}
                              label="Adults"
                              name={[name, 'adults']}
                              initialValue={0}
                            >
                              <Select options={passengerOptions} />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12} md={8}>
                            <Form.Item
                              {...restField}
                              label="Children"
                              name={[name, 'children']}
                              initialValue={0}
                            >
                              <Select options={passengerOptions} />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12} md={8}>
                            <Form.Item
                              {...restField}
                              label="Infants"
                              name={[name, 'infants']}
                              initialValue={0}
                            >
                              <Select options={passengerOptions} />
                            </Form.Item>
                          </Col>
                          <Col xs={24}>
                            <Form.Item
                              {...restField}
                              label="Included Services"
                              name={[name, 'extra_services']}
                              initialValue={[]}
                            >
                              <Checkbox.Group
                                options={[
                                  { label: 'Air Ticket', value: 'Air Ticket' },
                                  { label: 'Hotels', value: 'Hotels' },
                                  { label: 'Transport', value: 'Transport' },
                                  { label: 'Umrah Visa', value: 'Umrah Visa' }
                                ]}
                              />
                            </Form.Item>
                          </Col>
                        </Row>
                      </Card>

                      {/* Accommodation                      {/* Accommodation Room Configurations for Group */}
                      <Form.Item noStyle dependencies={['hotels', ['groups', name, 'extra_services']]}>
                        {() => {
                          const extraServices = form.getFieldValue(['groups', name, 'extra_services']) || [];
                          const isHotelsChecked = extraServices.includes('Hotels');
                          if (!isHotelsChecked) return null;

                          const topHotels = form.getFieldValue('hotels') || [];
                          if (topHotels.length === 0) {
                            return (
                              <Alert
                                message="Please add Accommodation Stays at the top level first."
                                type="info"
                                showIcon
                                style={{ marginBottom: 16 }}
                              />
                            );
                          }

                          return (
                            <Card style={cardStyle} title="Accommodation Room Configurations" size="small">
                              {topHotels.map((topHotel, hIdx) => {
                                const hotelObj = hotels.find(item => item._id === topHotel.hotel_id);
                                const hotelLabel = hotelObj ? hotelObj.name : (topHotel.name || `Stay #${hIdx + 1}`);
                                const checkInStr = topHotel.check_in ? dayjs(topHotel.check_in).format('DD-MM-YYYY') : '';
                                const checkOutStr = topHotel.check_out ? dayjs(topHotel.check_out).format('DD-MM-YYYY') : '';
                                const nights = topHotel.nights || 0;

                                return (
                                  <Card
                                    key={hIdx}
                                    type="inner"
                                    title={
                                      <span>
                                        <strong>{hotelLabel}</strong>
                                        {checkInStr && ` (${checkInStr} to ${checkOutStr}, ${nights} Nights)`}
                                      </span>
                                    }
                                    style={{ marginBottom: 16 }}
                                  >
                                    <Form.List name={[name, 'hotels', hIdx, 'rooms']} initialValue={[{ noOfRooms: 1 }]}>
                                      {(roomFields, { add: addRoom, remove: removeRoom }) => (
                                        <div>
                                          {roomFields.map(({ key: rKey, name: rName, ...restRField }) => (
                                            <Row gutter={[8, 8]} key={rKey} align="middle" style={{ marginBottom: 8 }}>
                                              <Col xs={24} sm={8}>
                                                <Form.Item
                                                  {...restRField}
                                                  name={[rName, 'room_type']}
                                                  style={{ marginBottom: 0 }}
                                                  rules={[{ required: true, message: 'Required' }]}
                                                >
                                                  <Select
                                                    placeholder="Room Type"
                                                    style={{ width: '100%' }}
                                                    options={[
                                                      { label: "Single", value: "Single" },
                                                      { label: "Double", value: "Double" },
                                                      { label: "Triple", value: "Triple" },
                                                      { label: "Quad", value: "Quad" },
                                                      { label: "Suites", value: "Suites" },
                                                      { label: "Family Room", value: "Family Room" }
                                                    ]}
                                                  />
                                                </Form.Item>
                                              </Col>
                                              <Col xs={12} sm={6}>
                                                <Form.Item
                                                  {...restRField}
                                                  name={[rName, 'noOfRooms']}
                                                  style={{ marginBottom: 0 }}
                                                  rules={[{ required: true, message: 'Required' }]}
                                                >
                                                  <InputNumber
                                                    min={1}
                                                    placeholder="Rooms"
                                                    style={{ width: '100%' }}
                                                  />
                                                </Form.Item>
                                              </Col>
                                              <Col xs={12} sm={8}>
                                                <Form.Item
                                                  {...restRField}
                                                  name={[rName, 'meal_plan']}
                                                  style={{ marginBottom: 0 }}
                                                  rules={[{ required: true, message: 'Required' }]}
                                                >
                                                  <Select
                                                    placeholder="Meal Plan"
                                                    style={{ width: '100%' }}
                                                    options={[
                                                      { label: "Room Only", value: "Room Only" },
                                                      { label: "Breakfast", value: "Breakfast" },
                                                      { label: "Half Board", value: "Half Board" },
                                                      { label: "Full Board", value: "Full Board" }
                                                    ]}
                                                  />
                                                </Form.Item>
                                              </Col>
                                              <Col xs={24} sm={2} style={{ textAlign: 'right' }}>
                                                {roomFields.length > 1 && (
                                                  <Button
                                                    type="text"
                                                    danger
                                                    icon={<DeleteOutlined />}
                                                    onClick={() => removeRoom(rName)}
                                                  />
                                                )}
                                              </Col>
                                            </Row>
                                          ))}
                                          <Button
                                            type="dashed"
                                            icon={<PlusOutlined />}
                                            onClick={() => addRoom()}
                                            block
                                            size="small"
                                            style={{ marginTop: 8 }}
                                          >
                                            Add Room Type
                                          </Button>
                                        </div>
                                      )}
                                    </Form.List>
                                  </Card>
                                );
                              })}
                            </Card>
                          );
                        }}
                      </Form.Item>
                    </Card>
                  ))}
                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={() => add({})}
                    block
                    style={{ marginBottom: 32, height: 48 }}
                  >
                    Add Another Group
                  </Button>
                </div>
              )}
            </Form.List>
          </>
        ) : (
          <>
            {/* Hotel Details */}
            <Card style={cardStyle} title="Hotel Details" size="small">
              <div style={{ marginBottom: 16 }}>
                {formHotels.length === 0 ? (
                  <p style={{ color: '#999' }}>No hotels added yet</p>
                ) : (
                  formHotels.map((hotel) => (
                    <Card
                      key={hotel.id}
                      style={{ marginBottom: 12, backgroundColor: isDark ? '#262626' : '#fafafa' }}
                      extra={
                        <Popconfirm
                          title="Remove Hotel Stay"
                          description="Are you sure you want to remove this hotel stay?"
                          onConfirm={() => removeHotel(hotel.id)}
                          okText="Yes"
                          cancelText="No"
                        >
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                          />
                        </Popconfirm>
                      }
                    >
                      <Row gutter={[16, 16]}>
                        <Col xs={24} sm={12} md={6}>
                          <Form.Item
                            label="Hotel"
                            style={{ marginBottom: 0 }}
                            required
                          >
                            <Select
                              showSearch
                              placeholder="-- Select Hotel --"
                              optionFilterProp="label"
                              filterOption={(input, option) => {
                                const term = (input || '').toLowerCase();
                                const labelMatches = (option?.label || '').toLowerCase().includes(term);
                                const locationMatches = (option?.location || '').toLowerCase().includes(term);
                                return labelMatches || locationMatches;
                              }}
                              options={hotelOptions}
                              value={hotel.hotel_id}
                              onChange={(val) => updateHotel(hotel.id, 'hotel_id', val)}
                            />
                          </Form.Item>
                        </Col>

                        <Col xs={24} sm={12} md={6}>
                          <Form.Item
                            label="Check-in"
                            style={{ marginBottom: 0 }}
                            required
                          >
                            <DatePicker
                              format="DD-MM-YYYY"
                              style={{ width: '100%' }}
                              disabledDate={disabledCheckIn}
                              value={hotel.check_in}
                              onChange={(date) => updateHotel(hotel.id, 'check_in', date)}
                            />
                          </Form.Item>
                        </Col>

                        <Col xs={24} sm={12} md={6}>
                          <Form.Item
                            label="Check-out"
                            style={{ marginBottom: 0 }}
                            required
                          >
                            <DatePicker
                              format="DD-MM-YYYY"
                              style={{ width: '100%' }}
                              value={hotel.check_out}
                              disabled={!hotel.check_in}
                              disabledDate={disabledCheckOut(hotel.check_in)}
                              onChange={(date) => updateHotel(hotel.id, 'check_out', date)}
                            />
                          </Form.Item>
                        </Col>

                        <Col xs={24} sm={12} md={6}>
                          <Form.Item
                            label="Nights"
                            style={{ marginBottom: 0 }}
                            required
                          >
                            <InputNumber
                              min={0}
                              style={{ width: '100%' }}
                              placeholder="Number of nights"
                              value={hotel.nights}
                              onChange={(val) => updateHotel(hotel.id, 'nights', val)}
                            />
                          </Form.Item>
                        </Col>
                      </Row>

                      <div style={{ marginTop: 16, padding: 12, borderRadius: 8, border: '1px dashed #d9d9d9', background: isDark ? '#1f1f1f' : '#fafafa' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontWeight: 'bold' }}>Rooms Configuration</span>
                          <Button
                            type="link"
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={() => addRoomToHotel(hotel.id)}
                          >
                            Add Room Type
                          </Button>
                        </div>

                        {(hotel.rooms || []).map((room, rIdx) => (
                          <Row gutter={[8, 8]} key={room.id || rIdx} align="middle" style={{ marginBottom: 8 }}>
                            <Col xs={24} sm={8}>
                              <Select
                                placeholder="Room Type"
                                style={{ width: '100%' }}
                                value={room.room_type}
                                onChange={(val) => updateRoomInHotel(hotel.id, room.id, 'room_type', val)}
                                options={[
                                  { label: "Single", value: "Single" },
                                  { label: "Double", value: "Double" },
                                  { label: "Triple", value: "Triple" },
                                  { label: "Quad", value: "Quad" },
                                  { label: "Suites", value: "Suites" },
                                  { label: "Family Room", value: "Family Room" }
                                ]}
                              />
                            </Col>
                            <Col xs={12} sm={6}>
                              <InputNumber
                                min={1}
                                placeholder="No. of Rooms"
                                style={{ width: '100%' }}
                                value={room.noOfRooms}
                                onChange={(val) => updateRoomInHotel(hotel.id, room.id, 'noOfRooms', val)}
                              />
                            </Col>
                            <Col xs={12} sm={8}>
                              <Select
                                placeholder="Meal Plan"
                                style={{ width: '100%' }}
                                value={room.meal_plan}
                                onChange={(val) => updateRoomInHotel(hotel.id, room.id, 'meal_plan', val)}
                                options={[
                                  { label: "Room Only", value: "Room Only" },
                                  { label: "Breakfast", value: "Breakfast" },
                                  { label: "Half Board", value: "Half Board" },
                                  { label: "Full Board", value: "Full Board" }
                                ]}
                              />
                            </Col>
                            <Col xs={24} sm={2} style={{ textAlign: 'right' }}>
                              <Popconfirm
                                title="Remove Room Type"
                                description="Are you sure you want to remove this room configuration?"
                                onConfirm={() => removeRoomFromHotel(hotel.id, room.id)}
                                okText="Yes"
                                cancelText="No"
                                disabled={(hotel.rooms || []).length <= 1}
                              >
                                <Button
                                  type="text"
                                  danger
                                  disabled={(hotel.rooms || []).length <= 1}
                                  icon={<DeleteOutlined />}
                                />
                              </Popconfirm>
                            </Col>
                          </Row>
                        ))}
                      </div>
                    </Card>
                  ))
                )}
              </div>
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={addHotel}
                block
              >
                Add Hotel Room
              </Button>
            </Card>
          </>
        )}

        {/* Pricing */}
        <Card title="Pricing" size="small" style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Form.Item
                label={`Adult Price (${getSymbol(selectedCurrency)})`}
                name="priceAdult"
                rules={[{ required: true, message: 'Required' }]}
              >
                <InputNumber
                  min={0}
                  step={0.01}
                  style={{ width: '100%' }}
                  onChange={val => {
                    if (bookingType === 'Individual') {
                      setPrice({ ...price, adults: Number(val) });
                    }
                  }}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={8}>
              <Form.Item
                label={`Child Price (${getSymbol(selectedCurrency)})`}
                name="priceChild"
                rules={[{ required: true, message: 'Required' }]}
              >
                <InputNumber
                  min={0}
                  step={0.01}
                  style={{ width: '100%' }}
                  onChange={val => {
                    if (bookingType === 'Individual') {
                      setPrice({ ...price, children: Number(val) });
                    }
                  }}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={8}>
              <Form.Item
                label={`Infant Price (${getSymbol(selectedCurrency)})`}
                name="priceInfant"
                rules={[{ required: true, message: 'Required' }]}
              >
                <InputNumber
                  min={0}
                  step={0.01}
                  style={{ width: '100%' }}
                  onChange={val => {
                    if (bookingType === 'Individual') {
                      setPrice({ ...price, infant: Number(val) });
                    }
                  }}
                />
              </Form.Item>
            </Col>

            {bookingType !== 'Group' && (
              <Col span={24}>
                <Form.Item
                  label={`Total Package Price (${getSymbol(selectedCurrency)})`}
                  name="totalPrice"
                >
                  <InputNumber
                    readOnly
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            )}
          </Row>
        </Card>

        {bookingType === 'Group' && (
          <>
            {/* Quotation Summary & Totals */}
            <Card title="Quotation Summary & Totals" size="small" style={{ marginBottom: 24, backgroundColor: isDark ? '#1f1f1f' : '#ffffff' }}>
              <Table
                dataSource={summary.groups}
                columns={[
                  {
                    title: 'Group / Leader',
                    dataIndex: 'leaderName',
                    key: 'leaderName',
                    render: (text, record) => (
                      <span style={{ fontWeight: 'bold' }}>
                        {record.index ? `#${record.index} - ` : ''}{text || 'N/A'}
                      </span>
                    )
                  },
                  {
                    title: 'Adults',
                    dataIndex: 'adults',
                    key: 'adults',
                    align: 'center'
                  },
                  {
                    title: 'Children',
                    dataIndex: 'childrenCount',
                    key: 'childrenCount',
                    align: 'center'
                  },
                  {
                    title: 'Infants',
                    dataIndex: 'infants',
                    key: 'infants',
                    align: 'center'
                  },
                  {
                    title: 'Total Passengers (PAX)',
                    dataIndex: 'pax',
                    key: 'pax',
                    align: 'center',
                    render: (val) => <Tag color="blue">{val}</Tag>
                  },
                  {
                    title: 'Subtotal Amount',
                    dataIndex: 'amount',
                    key: 'amount',
                    align: 'right',
                    render: (val) => <span style={{ fontWeight: 'bold', color: '#16a34a' }}>{getSymbol(selectedCurrency)}{val.toFixed(2)}</span>
                  }
                ]}
                pagination={false}
                rowKey="index"
                summary={() => (
                  <Table.Summary fixed>
                    <Table.Summary.Row style={{ background: isDark ? '#262626' : '#fafafa', fontWeight: 'bold' }}>
                      <Table.Summary.Cell index={0}>Overall Totals</Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="center">{summary.totals.adults}</Table.Summary.Cell>
                      <Table.Summary.Cell index={2} align="center">{summary.totals.children}</Table.Summary.Cell>
                      <Table.Summary.Cell index={3} align="center">{summary.totals.infants}</Table.Summary.Cell>
                      <Table.Summary.Cell index={4} align="center">
                        <Tag color="geekblue" style={{ fontSize: '13px', padding: '2px 8px' }}>
                          {summary.totals.pax} PAX
                        </Tag>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={5} align="right">
                        <span style={{ color: '#16a34a', fontSize: '15px' }}>
                          {getSymbol(selectedCurrency)}{summary.totals.amount.toFixed(2)}
                        </span>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />
            </Card>

            {/* Hotel Accommodation Summary */}
            <Card title="Hotel Accommodation Summary" size="small" style={{ marginBottom: 24, backgroundColor: isDark ? '#1f1f1f' : '#ffffff' }}>
              <Table
                dataSource={summary.hotels || []}
                pagination={false}
                size="small"
                rowKey="key"
                columns={[
                  { title: 'Hotel', dataIndex: 'hotelName' },
                  { title: 'Nights', dataIndex: 'nights', align: 'center' },
                  { title: 'Check-in', dataIndex: 'checkIn', render: d => d ? dayjs(d).format('DD-MM-YYYY') : 'N/A' },
                  { title: 'Check-out', dataIndex: 'checkOut', render: d => d ? dayjs(d).format('DD-MM-YYYY') : 'N/A' },
                  { title: 'Single', dataIndex: 'Single', align: 'center', render: val => val || '-' },
                  { title: 'Double', dataIndex: 'Double', align: 'center', render: val => val || '-' },
                  { title: 'Triple', dataIndex: 'Triple', align: 'center', render: val => val || '-' },
                  { title: 'Quad', dataIndex: 'Quad', align: 'center', render: val => val || '-' },
                  { title: 'Suites', dataIndex: 'Suites', align: 'center', render: val => val || '-' },
                  { title: 'Family Room', dataIndex: 'Family Room', align: 'center', render: val => val || '-' },
                  { title: 'Total Rooms', dataIndex: 'totalRooms', align: 'center', render: val => <Tag color="blue">{val}</Tag> }
                ]}
              />
            </Card>
          </>
        )}

        {/* Additional Information */}
        <Card style={cardStyle} title="Additional Information" size="small">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Form.Item
                label="Special Conditions"
                name="special_conditions"
              >
                <Input.TextArea rows={3} placeholder="Enter special conditions" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="Booking Notes"
                name="notes"
              >
                <Input.TextArea rows={3} placeholder="Enter booking notes" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="Terms & Condition"
                name="cancellation_policy"
              >
                <Input.TextArea rows={3} placeholder="Enter cancellation policy" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Submit Button */}
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" size="medium" loading={loading}>
              Save Quotation Changes
            </Button>
            <Button size="medium" onClick={() => navigate('/quotations')}>
              Cancel
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};

export default EditQuotation;
