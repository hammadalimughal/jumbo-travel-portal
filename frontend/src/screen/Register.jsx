import { Card, Typography, Form, Input, Button, Checkbox, Divider } from 'antd';
import { LockOutlined, UserOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';

const Register = ({ isDark }) => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { register, authLoading } = useAuthContext();

  const handleSubmit = async (values, e) => {
    e?.preventDefault?.();
    const result = await register(values.name, values.email, values.phone, values.password);
    if (result.success) {
      navigate('/');
    } else {
      form.setFields([
        { name: 'email', errors: [] },
        { name: 'password', errors: [result.error || 'Registration failed'] },
      ]);
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
            Create Account
          </Typography.Title>
          <Typography.Text type="secondary">
            Join us for your travel adventures
          </Typography.Text>
        </div>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="Full Name"
            rules={[
              { required: true, message: 'Please enter your full name' },
              { min: 2, message: 'Name must be at least 2 characters' },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="John Doe" />
          </Form.Item>
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
          <Form.Item
            name="phone"
            label="Phone Number"
            rules={[
              { required: true, message: 'Please enter your phone number' },
            ]}
          >
            <Input prefix={<PhoneOutlined />} placeholder="+1 (555) 000-0000" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: 'Please enter your password' },
              { min: 6, message: 'Password must be at least 6 characters' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="Confirm Password"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Please confirm your password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
          </Form.Item>
          <Form.Item
            name="agree"
            valuePropName="checked"
            rules={[
              {
                validator: (_, value) =>
                  value ? Promise.resolve() : Promise.reject(new Error('Please accept terms')),
              },
            ]}
          >
            <Checkbox>I agree to the Terms and Conditions</Checkbox>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={authLoading}>
              Create Account
            </Button>
          </Form.Item>
          <Divider plain>Already have an account?</Divider>
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

export default Register;
