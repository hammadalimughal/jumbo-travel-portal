import React, { useEffect, useState } from 'react';
import { Row, Col, Table, Button, Space, Typography, Card, message, Modal, Tag } from 'antd';
import { UndoOutlined, DeleteOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { API_BASE } from '../config/data';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const TrashedQuotations = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const navigate = useNavigate();

    const fetchTrash = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/quotation/trash`);
            const result = await res.json();
            if (result.success) {
                setData(result.data);
            } else {
                message.error(result.error);
            }
        } catch (err) {
            message.error("Failed to fetch trash data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTrash();
    }, []);

    const handleRestore = async (id) => {
        try {
            const res = await fetch(`${API_BASE}/quotation/restore-trash/${id}`, {
                method: 'PATCH'
            });
            const result = await res.json();
            if (result.success) {
                message.success("Quotation restored successfully");
                fetchTrash(); // Refresh the list
            } else {
                message.error(result.error);
            }
        } catch (err) {
            message.error("Restoration failed");
        }
    };

    const columns = [
        {
            title: 'Quotation No',
            dataIndex: 'quotation_no',
            key: 'quotation_no',
            render: (text) => <Text strong>{text}</Text>
        },
        {
            title: 'Customer',
            dataIndex: 'customer_name',
            key: 'customer_name',
        },
        {
            title: 'Total Price',
            dataIndex: ['pricing', 'totalPrice'],
            key: 'totalPrice',
            render: (price) => `£${price?.toFixed(2)}`
        },
        {
            title: 'Deleted At',
            dataIndex: 'deleted_at',
            key: 'deleted_at',
            render: (date) => dayjs(date).format('DD-MM-YYYY HH:mm')
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Space size="middle">
                    <Button 
                        type="primary" 
                        icon={<UndoOutlined />} 
                        onClick={() => handleRestore(record._id)}
                    >
                        Restore
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: '24px' }}>
            <Card>
                <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
                    <Col>
                        <Space direction="vertical" size={0}>
                            <Button 
                                type="link" 
                                icon={<ArrowLeftOutlined />} 
                                onClick={() => navigate('/quotations')}
                                style={{ padding: 0 }}
                            >
                                Back to Active Quotations
                            </Button>
                            <Title level={2} style={{ margin: 0 }}>Trash Bin</Title>
                        </Space>
                    </Col>
                    <Col>
                        <Tag color="error">{data.length} Items in Trash</Tag>
                    </Col>
                </Row>

                <Table 
                    columns={columns} 
                    dataSource={data} 
                    rowKey="_id" 
                    loading={loading}
                    locale={{ emptyText: 'Your trash is currently empty' }}
                />
            </Card>
        </div>
    );
};

export default TrashedQuotations;