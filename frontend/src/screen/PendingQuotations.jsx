import React, { useEffect, useState } from 'react';
import { Card, List, Tag, Badge, Empty, Spin, Button } from 'antd';
import dayjs from 'dayjs';
import { API_BASE } from '../config/data';
import QuotationDetailModal from './QuotationDetailModal';

const PendingQuotations = () => {
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewId, setViewId] = React.useState(null);
    const [modalOpen, setModalOpen] = React.useState(false);

    const openDetails = (id) => {
        setViewId(id);
        setModalOpen(true);
    };
    const fetchData = async () => {
        try {
            const res = await fetch(`${API_BASE}/quotation/fetch-pending-travel`);
            const result = await res.json();
            if (result.success) setList(result.data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [modalOpen]);

    if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

    return (
        <div style={{ padding: '24px' }}>
            <h2>Incomplete Upcoming Trips (Next 7 Days)</h2>
            <List
                grid={{ gutter: 16, column: 3 }}
                dataSource={list}
                locale={{ emptyText: <Empty description="All upcoming trips are fully processed!" /> }}
                renderItem={(item) => (
                    <List.Item>
                        <Badge.Ribbon text={`${dayjs(item.travel_date).diff(dayjs(), 'day')} days left`} color="red">
                            <Card title={item.customer_name} size="small">
                                <p><b>ID:</b> {item.quotation_no}</p>
                                <p><b>Date:</b> {dayjs(item.travel_date).format('DD MMM YYYY')}</p>
                                <div style={{ marginTop: '10px' }}>
                                    {!item.tracking?.is_confirmed && <Tag color="error">Confirmation Missing</Tag>}
                                    {!item.tracking?.hotel_booking_done && <Tag color="warning">Hotel Not Booked</Tag>}
                                    {!item.tracking?.responded_to_client && <Tag color="processing">No Client Response</Tag>}
                                </div>
                                <Button style={{marginTop: '20px'}} onClick={() => openDetails(item._id)} type="primary">See Details</Button>
                            </Card>
                        </Badge.Ribbon>
                    </List.Item>
                )}
            />
            <QuotationDetailModal
                open={modalOpen}
                quotationId={viewId}
                onCancel={() => setModalOpen(false)}
            />
        </div>
    );
};

export default PendingQuotations;