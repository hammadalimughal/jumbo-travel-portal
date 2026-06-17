import { Card, Typography, Form, Input, Button, message, Divider } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';

const ForgotPassword = ({ isDark }) => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { forgotPassword, authLoading } = useAuthContext();

  const handleSubmit = async (values, e) => {
    e?.preventDefault?.();
    const result = await forgotPassword(values.email);
    if (result.success) {
      message.success('OTP sent to your email!');
      navigate(`/verify-otp?email=${encodeURIComponent(values.email)}`);
    } else {
      message.error(result.error || 'Failed to send OTP');
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
        height: '100vh',
      }}
    >
      <Card style={{ width: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Typography.Title level={3} style={{ marginBottom: 8 }}>
            Forgot Password?
          </Typography.Title>
          <Typography.Text type="secondary">
            We'll help you reset your password
          </Typography.Text>
        </div>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Enter a valid email' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="you@example.com" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={authLoading}>
              Send OTP
            </Button>
          </Form.Item>
          <Divider plain>Remember your password?</Divider>
          <Form.Item>
            <Link to="/login" style={{ textDecoration: 'none' }}>
              <Button type="default" block>
                Login here
              </Button>
            </Link>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default ForgotPassword;
