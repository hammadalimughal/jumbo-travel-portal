import { Card, Typography, Form, Input, Button, message, Space, Divider } from 'antd';
import { NumberOutlined } from '@ant-design/icons';
import React from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';

const VerifyOTP = ({ isDark }) => {
  const [form] = Form.useForm();
  const [countdown, setCountdown] = React.useState(0);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const { verifyOTP, resendOTP, authLoading } = useAuthContext();

  React.useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSubmit = async (values, e) => {
    e?.preventDefault?.();
    const result = await verifyOTP(email, values.otp);
    if (result.success) {
      message.success('OTP verified successfully!');
      navigate('/reset-password');
    } else {
      message.error(result.error || 'Invalid OTP');
    }
  };

  const handleResendOTP = async () => {
    const result = await resendOTP(email);
    if (result.success) {
      message.success('OTP resent to your email!');
      setCountdown(60);
    } else {
      message.error(result.error || 'Failed to resend OTP');
    }
  };

  return (
    <div
      style={{
        padding: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isDark ? '#141414' : '#ffffff',
        borderRadius: 0,
        minHeight: '100vh',
      }}
    >
      <Card style={{ width: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Typography.Title level={3} style={{ marginBottom: 8 }}>
            Verify OTP
          </Typography.Title>
          <Typography.Text type="secondary">
            Enter the code sent to your email
          </Typography.Text>
        </div>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item style={{ marginBottom: 8 }}>
            <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
              Email: {email}
            </Typography.Text>
          </Form.Item>
          <Form.Item
            name="otp"
            label="One-Time Password"
            rules={[
              { required: true, message: 'Please enter the OTP' },
              {
                pattern: /^\d{6}$/,
                message: 'OTP must be exactly 6 digits',
              },
            ]}
          >
            <Input
              prefix={<NumberOutlined />}
              placeholder="000000"
              maxLength="6"
              style={{ letterSpacing: '4px', fontSize: '18px' }}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={authLoading}>
              Verify OTP
            </Button>
          </Form.Item>
          <Divider plain>Need help?</Divider>
          <Space direction="vertical" style={{ width: '100%' }}>
            {countdown > 0 ? (
              <Button block disabled>
                Resend OTP in {countdown}s
              </Button>
            ) : (
              <Button
                type="dashed"
                block
                onClick={handleResendOTP}
                loading={authLoading}
              >
                Resend OTP
              </Button>
            )}
            <Link to="/forgot-password" style={{ textDecoration: 'none' }}>
              <Button type="text" block>
                Back to Forgot Password
              </Button>
            </Link>
            <Link to="/login" style={{ textDecoration: 'none' }}>
              <Button type="text" block>
                Back to Login
              </Button>
            </Link>
          </Space>
        </Form>
      </Card>
    </div>
  );
};

export default VerifyOTP;