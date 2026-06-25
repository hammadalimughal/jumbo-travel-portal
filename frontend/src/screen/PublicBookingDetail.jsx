import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Descriptions, Button, Spin, Typography, Divider, Row, Col, Space, Alert, Result } from 'antd';
import { DownloadOutlined, FileTextOutlined, CalendarOutlined, GlobalOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { API_BASE } from '../config/data';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

const { Title, Text, Paragraph } = Typography;

const getHotelSummary = (groups) => {
    const summaryMap = {};
    (groups || []).forEach(group => {
        const extraServices = group.extra_services || [];
        if (!extraServices.includes('Hotels')) return;
        (group.hotels || []).forEach(h => {
            const hotelName = h.hotel_id?.name || h.name || 'Manual Entry';
            const checkInStr = h.check_in ? dayjs.utc(h.check_in).format('YYYY-MM-DD') : 'N/A';
            const checkOutStr = h.check_out ? dayjs.utc(h.check_out).format('YYYY-MM-DD') : 'N/A';
            const nights = Number(h.nights) || 0;
            
            const key = `${hotelName}_${checkInStr}_${checkOutStr}_${nights}`;
            
            if (!summaryMap[key]) {
                summaryMap[key] = {
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
                    if (summaryMap[key][rType] !== undefined) {
                        summaryMap[key][rType] += count;
                    }
                    summaryMap[key].totalRooms += count;
                });
            } else {
                const rType = h.room_type || 'Single';
                const count = Number(h.noOfRooms) || 1;
                if (summaryMap[key][rType] !== undefined) {
                    summaryMap[key][rType] += count;
                }
                summaryMap[key].totalRooms += count;
            }
        });
    });
    return Object.values(summaryMap);
};

const getSymbol = (currency) => {
    const symbols = { USD: '$', EUR: '€', GBP: '£', AED: 'AED', SAR: 'SAR' };
    return symbols[currency] || currency;
};

const PublicBookingDetail = ({ isDark }) => {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchDetails = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE}/quotation/detail/${id}`);
            const result = await response.json();
            if (result.success) {
                setData(result.data);
            } else {
                setError(result.error || 'Failed to retrieve booking details.');
            }
        } catch (err) {
            setError(err.message || 'Error fetching details.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetails();
    }, [id]);

    const pageStyle = {
        minHeight: '100vh',
        background: isDark ? '#141414' : '#f0f2f5',
        padding: '40px 20px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    };

    const containerStyle = {
        maxWidth: '1000px',
        margin: '0 auto',
    };

    const cardStyle = {
        background: isDark ? '#1f1f1f' : '#ffffff',
        borderRadius: '12px',
        boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.05)',
        border: isDark ? '1px solid #303030' : '1px solid #e8e8e8',
        padding: '24px',
        marginBottom: '24px'
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: isDark ? '#141414' : '#f5f5f5' }}>
                <Spin size="large" tip="Loading travel details..." />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div style={pageStyle}>
                <div style={containerStyle}>
                    <Card style={cardStyle}>
                        <Result
                            status="error"
                            title="Unable to load travel details"
                            subTitle={error || "Booking not found."}
                            extra={[
                                <Button type="primary" key="retry" onClick={fetchDetails}>
                                    Try Again
                                </Button>
                            ]}
                        />
                    </Card>
                </div>
            </div>
        );
    }

    const consentStatus = data.consent?.status || 'Pending';
    const isConsentAgreed = consentStatus === 'Agreed';

    return (
        <div style={pageStyle}>
            <div style={containerStyle}>
                
                {/* Header Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <Title level={2} style={{ margin: 0 }}>Travel Itinerary & Booking Details</Title>
                        <Text type="secondary">Quotation Reference: <b>{data.quotation_no}</b></Text>
                    </div>
                    <Space size="middle">
                        <Tag color={isConsentAgreed ? 'success' : 'warning'} style={{ padding: '4px 12px', fontSize: '14px', borderRadius: '4px' }}>
                            Consent: {isConsentAgreed ? 'Agreed' : 'Pending'}
                        </Tag>
                        {data.invoice && (
                            <Button type="primary" icon={<DownloadOutlined />} href={data.invoice} target="_blank" style={{ background: 'linear-gradient(90deg, #1890ff 0%, #096dd9 100%)', border: 'none', borderRadius: '6px' }}>
                                Download PDF
                            </Button>
                        )}
                    </Space>
                </div>

                {/* Consent Alert Banner if pending */}
                {!isConsentAgreed && (
                    <Alert
                        message="Consent Required"
                        description={
                            <span>
                                You have not yet signed the consent form for this booking. Please <a href={`/consent/${id}`} style={{ fontWeight: 'bold', textDecoration: 'underline' }}>visit the Consent Form</a> to submit your agreement.
                            </span>
                        }
                        type="info"
                        showIcon
                        style={{ marginBottom: '24px', borderRadius: '8px' }}
                    />
                )}

                {/* Summary Card */}
                <Card style={cardStyle} bodyStyle={{ padding: 0 }}>
                    <Descriptions bordered size="middle" column={{ xs: 1, sm: 2 }} title="Booking Overview">
                        <Descriptions.Item label="Customer Name"><b>{data.customer_name}</b></Descriptions.Item>
                        <Descriptions.Item label="Contact Email">{data.customer_email || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Contact Phone">{data.customer_phone || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Travel Date">{dayjs.utc(data.travel_date).format('DD MMM YYYY')}</Descriptions.Item>
                        <Descriptions.Item label="Total Passengers" span={2}>
                            {data.passengers_names || 'N/A'}
                            <div style={{ marginTop: '4px' }}>
                                <Tag color="blue">{data.passenger_counts?.adults || 0} Adults</Tag>
                                <Tag color="green">{data.passenger_counts?.children || 0} Children</Tag>
                                <Tag color="orange">{data.passenger_counts?.infants || 0} Infants</Tag>
                            </div>
                        </Descriptions.Item>
                    </Descriptions>
                </Card>

                {/* Flight Details Table */}
                {data.flights && data.flights.length > 0 && (
                    <Card style={cardStyle} title={<Space><CalendarOutlined /><span>Flight Itinerary</span></Space>}>
                        <Table
                            dataSource={data.flights}
                            pagination={false}
                            size="middle"
                            rowKey="_id"
                            scroll={{ x: true }}
                            columns={[
                                { title: 'Airline', dataIndex: 'airline', key: 'airline', render: text => <b>{text}</b> },
                                { title: 'Date', dataIndex: 'departureDateTime', render: d => dayjs.utc(d).format('DD-MM-YYYY') },
                                { title: 'Departure', render: (_, r) => `${r.from} (${dayjs.utc(r.departureDateTime).format('HH:mm')})` },
                                { title: 'Arrival', render: (_, r) => `${r.to} (${dayjs.utc(r.arrivalDateTime).format('HH:mm')})` },
                            ]}
                        />
                    </Card>
                )}

                {/* Hotel Details Table */}
                {((data.hotels && data.hotels.length > 0) || (data.bookingType === 'Group' && getHotelSummary(data.groups).length > 0)) && (
                    <Card style={cardStyle} title={<Space><GlobalOutlined /><span>Accommodation details</span></Space>}>
                        {data.bookingType === 'Group' ? (
                            <Table
                                dataSource={getHotelSummary(data.groups)}
                                pagination={false}
                                size="middle"
                                rowKey="key"
                                scroll={{ x: true }}
                                columns={[
                                    { title: 'Hotel', dataIndex: 'hotelName', render: text => <b>{text}</b> },
                                    { title: 'Nights', dataIndex: 'nights', align: 'center' },
                                    { title: 'Check-in', dataIndex: 'checkIn', render: d => d ? dayjs.utc(d).format('DD-MM-YYYY') : 'N/A' },
                                    { title: 'Check-out', dataIndex: 'checkOut', render: d => d ? dayjs.utc(d).format('DD-MM-YYYY') : 'N/A' },
                                    { title: 'Sgl', dataIndex: 'Single', align: 'center', render: val => val || '-' },
                                    { title: 'Dbl', dataIndex: 'Double', align: 'center', render: val => val || '-' },
                                    { title: 'Tpl', dataIndex: 'Triple', align: 'center', render: val => val || '-' },
                                    { title: 'Qd', dataIndex: 'Quad', align: 'center', render: val => val || '-' },
                                    { title: 'Suite', dataIndex: 'Suites', align: 'center', render: val => val || '-' },
                                    { title: 'Family', dataIndex: 'Family Room', align: 'center', render: val => val || '-' },
                                    { title: 'Total Rooms', dataIndex: 'totalRooms', align: 'center', render: val => <Tag color="blue">{val}</Tag> }
                                ]}
                            />
                        ) : (
                            <Table
                                dataSource={data.hotels}
                                pagination={false}
                                size="middle"
                                rowKey="_id"
                                scroll={{ x: true }}
                                columns={[
                                    { title: 'Hotel', dataIndex: 'hotel_id', render: h => <b>{h?.name || 'Manual Entry'}</b> },
                                    { 
                                        title: 'Rooms Configuration', 
                                        render: (_, record) => {
                                            if (record.rooms && record.rooms.length > 0) {
                                                return (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                        {record.rooms.map((r, rIdx) => (
                                                            <span key={r._id || rIdx}>
                                                                {r.noOfRooms}x {r.room_type} ({r.meal_plan})
                                                            </span>
                                                        ))}
                                                    </div>
                                                );
                                            }
                                            return `${record.noOfRooms || 1}x {record.room_type || 'N/A'} ({record.meal_plan || 'N/A'})`;
                                        }
                                    },
                                    { title: 'Nights', dataIndex: 'nights', align: 'center' },
                                    { title: 'Check-in', dataIndex: 'check_in', render: d => dayjs.utc(d).format('DD-MM-YYYY') },
                                    { title: 'Check-out', dataIndex: 'check_out', render: d => dayjs.utc(d).format('DD-MM-YYYY') },
                                ]}
                            />
                        )}
                    </Card>
                )}

                {/* Groups Breakdown (if Group booking) */}
                {data.bookingType === 'Group' && data.groups && data.groups.length > 0 && (
                    <Card style={cardStyle} title="Group Breakdown">
                        {data.groups.map((group, idx) => (
                            <Descriptions 
                                key={group._id || idx} 
                                bordered 
                                size="small" 
                                column={{ xs: 1, sm: 2 }} 
                                title={`Group #${idx + 1} - ${group.customer_name}`} 
                                style={{ marginBottom: 20 }}
                            >
                                <Descriptions.Item label="Email">{group.customer_email || 'N/A'}</Descriptions.Item>
                                <Descriptions.Item label="Phone">{group.customer_phone || 'N/A'}</Descriptions.Item>
                                <Descriptions.Item label="Travel Date">{group.travel_date ? dayjs.utc(group.travel_date).format('DD-MM-YYYY') : 'N/A'}</Descriptions.Item>
                                <Descriptions.Item label="Passengers" span={2}>
                                    {group.passengers_names || 'N/A'} <br />
                                    <Text type="secondary" style={{ fontSize: '11px' }}>
                                        ({group.adults || 0} Adults, {group.children || 0} Children, {group.infants || 0} Infants)
                                    </Text>
                                </Descriptions.Item>
                                <Descriptions.Item label="Included Services" span={2}>
                                    {group.extra_services && group.extra_services.length > 0 ? (
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            {group.extra_services.map(service => (
                                                <Tag color="cyan" key={service}>{service}</Tag>
                                            ))}
                                        </div>
                                    ) : 'None'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Accommodations Stays" span={2}>
                                    {(group.hotels || []).map((h, hIdx) => {
                                        const hotelName = h.hotel_id?.name || h.name || 'Manual Entry';
                                        const isHotelsChecked = group.extra_services && group.extra_services.includes('Hotels');
                                        const roomsText = isHotelsChecked 
                                            ? (h.rooms && h.rooms.length > 0 
                                                ? h.rooms.map(r => `${r.noOfRooms}x ${r.room_type || 'N/A'} (${r.meal_plan || 'N/A'})`).join(', ') 
                                                : `${h.noOfRooms || 1}x ${h.room_type || 'N/A'} (${h.meal_plan || 'N/A'})`)
                                            : 'None (Not Included)';
                                        return (
                                            <div key={h._id || hIdx} style={{ marginBottom: 8, borderBottom: hIdx < (group.hotels.length - 1) ? '1px dashed #f0f0f0' : 'none', paddingBottom: 8 }}>
                                                <strong>{hotelName}</strong> ({h.nights} Nights, {h.check_in ? dayjs.utc(h.check_in).format('DD-MM-YYYY') : 'N/A'} to {h.check_out ? dayjs.utc(h.check_out).format('DD-MM-YYYY') : 'N/A'})
                                                <br />
                                                Rooms: {roomsText}
                                            </div>
                                        );
                                    })}
                                </Descriptions.Item>
                            </Descriptions>
                        ))}
                    </Card>
                )}

                {/* Additional Information (Policies, Notes, Pricing) */}
                <Row gutter={24}>
                    <Col xs={24} md={16}>
                        {data.special_conditions && (
                            <Card style={{ ...cardStyle, padding: '16px' }} title="Special Conditions" size="small">
                                <Paragraph style={{ whiteSpace: 'pre-line' }}>{data.special_conditions}</Paragraph>
                            </Card>
                        )}
                        {data.cancellation_policy && (
                            <Card style={{ ...cardStyle, padding: '16px' }} title="Cancellation Policy" size="small">
                                <Paragraph style={{ whiteSpace: 'pre-line' }}>{data.cancellation_policy}</Paragraph>
                            </Card>
                        )}
                        {data.notes && (
                            <Card style={{ ...cardStyle, padding: '16px' }} title="Notes" size="small">
                                <Paragraph style={{ whiteSpace: 'pre-line' }}>{data.notes}</Paragraph>
                            </Card>
                        )}
                    </Col>
                    
                    <Col xs={24} md={8}>
                        {/* Pricing Summary Card */}
                        <Card 
                            style={{ 
                                ...cardStyle, 
                                background: isDark ? 'linear-gradient(135deg, #1d39c4 0%, #001529 100%)' : 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)',
                                border: 'none',
                                color: isDark ? '#ffffff' : '#000000',
                            }}
                            title={<span style={{ color: isDark ? '#ffffff' : 'inherit' }}>Pricing Summary</span>}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Text style={{ color: isDark ? '#d9d9d9' : 'inherit' }}>Currency:</Text>
                                    <Text strong style={{ color: isDark ? '#ffffff' : 'inherit' }}>{data.pricing?.currency}</Text>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Text style={{ color: isDark ? '#d9d9d9' : 'inherit' }}>Rate per Adult:</Text>
                                    <Text strong style={{ color: isDark ? '#ffffff' : 'inherit' }}>{getSymbol(data.pricing?.currency)}{data.pricing?.priceAdult?.toFixed(2)}</Text>
                                </div>
                                {data.pricing?.priceChild > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Text style={{ color: isDark ? '#d9d9d9' : 'inherit' }}>Rate per Child:</Text>
                                        <Text strong style={{ color: isDark ? '#ffffff' : 'inherit' }}>{getSymbol(data.pricing?.currency)}{data.pricing?.priceChild?.toFixed(2)}</Text>
                                    </div>
                                )}
                                {data.pricing?.priceInfant > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Text style={{ color: isDark ? '#d9d9d9' : 'inherit' }}>Rate per Infant:</Text>
                                        <Text strong style={{ color: isDark ? '#ffffff' : 'inherit' }}>{getSymbol(data.pricing?.currency)}{data.pricing?.priceInfant?.toFixed(2)}</Text>
                                    </div>
                                )}
                                <Divider style={{ margin: '8px 0', borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Title level={4} style={{ margin: 0, color: isDark ? '#ffffff' : 'inherit' }}>Total Package:</Title>
                                    <Title level={3} style={{ margin: 0, color: isDark ? '#52c41a' : '#237804' }}>
                                        {getSymbol(data.pricing?.currency)}{data.pricing?.totalPrice?.toFixed(2)}
                                    </Title>
                                </div>
                            </div>
                        </Card>
                    </Col>
                </Row>

                {/* Consent Signature Badge if agreed */}
                {isConsentAgreed && data.consent && (
                    <Card style={{ ...cardStyle, borderLeft: '5px solid #52c41a' }} title={<Space><InfoCircleOutlined style={{ color: '#52c41a' }} /><span>Consent Declaration</span></Space>}>
                        <Paragraph>
                            This booking was reviewed and agreed to by <b>{data.consent.clientName}</b> on <b>{dayjs(data.consent.agreedAt).format('DD MMM YYYY, hh:mm A')}</b>.
                        </Paragraph>
                        {data.consent.signature && (
                            <div style={{ marginTop: '12px', padding: '12px', background: isDark ? '#262626' : '#fafafa', borderRadius: '8px', border: '1px dashed #d9d9d9', display: 'inline-block' }}>
                                <Text type="secondary" style={{ display: 'block', fontSize: '11px', marginBottom: '4px' }}>Digitally Signed by</Text>
                                <span style={{ fontFamily: '"Caveat", "Brush Script MT", cursive', fontSize: '26px', color: '#1890ff' }}>
                                    {data.consent.signature}
                                </span>
                            </div>
                        )}
                    </Card>
                )}
            </div>
        </div>
    );
};

export default PublicBookingDetail;
