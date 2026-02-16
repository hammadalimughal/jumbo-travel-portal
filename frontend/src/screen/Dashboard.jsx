import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Segmented, Table, Typography, Space, Checkbox } from 'antd';
import { DollarCircleOutlined, FileTextOutlined, RocketOutlined } from '@ant-design/icons';
import { API_BASE } from '../config/data'
const { Title } = Typography;

const AntdDashboard = () => {
    const [filter, setFilter] = useState('Daily');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const res = await fetch(`${API_BASE}/quotation/dashboard-stats?filter=${filter}`);
            const result = await res.json();
            setData(result);
            setLoading(false);
        };
        fetchData();
    }, [filter]);

    // Calculate totals for top cards
    const totals = data.reduce((acc, curr) => ({
        amount: acc.amount + curr.amount,
        quotes: acc.quotes + curr.quotes,
        flights: acc.flights + curr.flights
    }), { amount: 0, quotes: 0, flights: 0 });

    const columns = [
        { title: 'Date Period', dataIndex: '_id', key: '_id' },
        { title: 'Quotations', dataIndex: 'quotes', key: 'quotes' },
        { title: 'Flights', dataIndex: 'flights', key: 'flights' },
        {
            title: 'Total Amount',
            dataIndex: 'amount',
            key: 'amount',
            render: (val) => `$${val.toLocaleString()}`
        }
    ];

    return (
        <div style={{ padding: '24px', minHeight: '100vh' }}>
            <Space direction="vertical" size="large" style={{ display: 'flex' }}>
                <Row justify="space-between" align="middle">
                    <Col><Title level={2}>Jumbo Travel Analytics</Title></Col>
                    <Col>
                        <Segmented
                            options={['Daily', 'Weekly', 'Monthly']}
                            value={filter}
                            onChange={setFilter}
                        />
                    </Col>
                </Row>

                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={8}>
                        <Card bordered={false} className="stat-card">
                            <Statistic
                                title="Total Amount"
                                value={totals.amount}
                                precision={2}
                                prefix={<DollarCircleOutlined style={{ color: '#52c41a' }} />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Card bordered={false}>
                            <Statistic
                                title="Total Quotations"
                                value={totals.quotes}
                                prefix={<FileTextOutlined style={{ color: '#1890ff' }} />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Card bordered={false}>
                            <Statistic
                                title="Total Flights"
                                value={totals.flights}
                                prefix={<RocketOutlined style={{ color: '#eb2f96' }} />}
                            />
                        </Card>
                    </Col>
                </Row>

                <Card title={`${filter} Breakdown`}>
                    <Table
                        dataSource={data}
                        columns={columns}
                        rowKey="_id"
                        loading={loading}
                        pagination={{ pageSize: 5 }}
                    />
                </Card>
            </Space>
        </div>
    );
};

export default AntdDashboard;