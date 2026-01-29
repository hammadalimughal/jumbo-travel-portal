import React from 'react';
import Cookies from 'js-cookie';
import { API_BASE } from '../config/data';

export const AuthContext = React.createContext(null);

const decodeJwt = (token) => {
    try {
        const payload = token.split('.')[1];
        const json = JSON.parse(atob(payload));
        return json;
    } catch {
        return null;
    }
};

export const AuthProvider = ({ children }) => {
    const [authToken, setAuthToken] = React.useState(null);
    const [user, setUser] = React.useState(null);
    const [isAuthenticated, setIsAuthenticated] = React.useState(false);
    const [authLoading, setAuthLoading] = React.useState(false);
    const [resetToken, setResetToken] = React.useState(null);

    React.useEffect(() => {
        const token = Cookies.get('authtoken');
        if (token) {
            setAuthToken(token);
            setIsAuthenticated(true);
            const decoded = decodeJwt(token);
            setUser(decoded || null);
        } else {
            setAuthToken(null);
            setIsAuthenticated(false);
            setUser(null);
        }
    }, []);

    const register = React.useCallback(async (name, email, phone, password) => {
        setAuthLoading(true);
        try {
            const res = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name, email, phone, password }),
            });
            const json = await res.json();
            if (!json.success && res.status !== 200) {
                throw new Error(json.error || 'Registration failed');
            }
            const token = json.authtoken || Cookies.get('authtoken');
            if (token) {
                Cookies.set('authtoken', token, { sameSite: 'Lax' });
                setAuthToken(token);
                setIsAuthenticated(true);
                const decoded = decodeJwt(token);
                setUser(decoded || null);
            }
            return { success: true };
        } catch (error) {
            console.log(error)
            return { success: false, error: error.message };
        } finally {
            setAuthLoading(false);
        }
    }, []);

    const login = React.useCallback(async (email, password) => {
        setAuthLoading(true);
        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, password }),
            });
            const json = await res.json();
            if (!json.success && res.status !== 200) {
                throw new Error(json.error || 'Invalid credentials');
            }
            const token = json.authtoken || Cookies.get('authtoken');
            if (token) {
                Cookies.set('authtoken', token, { sameSite: 'Lax' });
                setAuthToken(token);
                setIsAuthenticated(true);
                const decoded = decodeJwt(token);
                setUser(decoded || null);
            }
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            setAuthLoading(false);
        }
    }, []);

    const forgotPassword = React.useCallback(async (email) => {
        setAuthLoading(true);
        try {
            const res = await fetch(`${API_BASE}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email }),
            });
            const json = await res.json();
            if (!json.success) {
                throw new Error(json.error || 'Failed to send OTP');
            }
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            setAuthLoading(false);
        }
    }, []);

    const verifyOTP = React.useCallback(async (email, otp) => {
        setAuthLoading(true);
        try {
            const res = await fetch(`${API_BASE}/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, otp }),
            });
            const json = await res.json();
            if (!json.success) {
                throw new Error(json.error || 'Invalid or expired OTP');
            }
            if (json.resetToken) {
                localStorage.setItem('resetToken', json.resetToken);
                setResetToken(json.resetToken);
            }
            return { success: true, resetToken: json.resetToken };
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            setAuthLoading(false);
        }
    }, []);

    const resendOTP = React.useCallback(async (email) => {
        setAuthLoading(true);
        try {
            const res = await fetch(`${API_BASE}/auth/resend-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email }),
            });
            const json = await res.json();
            if (!json.success) {
                throw new Error(json.error || 'Failed to resend OTP');
            }
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            setAuthLoading(false);
        }
    }, []);

    const resetPassword = React.useCallback(async (token, newPassword, confirmPassword) => {
        setAuthLoading(true);
        try {
            const res = await fetch(`${API_BASE}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ token, newPassword, confirmPassword }),
            });
            const json = await res.json();
            if (!json.success) {
                throw new Error(json.error || 'Failed to reset password');
            }
            localStorage.removeItem('resetToken');
            setResetToken(null);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            setAuthLoading(false);
        }
    }, []);

    const logout = React.useCallback(async () => {
        try {
            await fetch(`${API_BASE}/auth/logout`, { method: 'GET', credentials: 'include' });
        } catch {}
        Cookies.remove('authtoken');
        setAuthToken(null);
        setIsAuthenticated(false);
        setUser(null);
    }, []);

    const value = React.useMemo(
        () => ({
            authToken,
            user,
            isAuthenticated,
            authLoading,
            resetToken,
            login,
            register,
            forgotPassword,
            verifyOTP,
            resendOTP,
            resetPassword,
            logout,
        }),
        [authToken, user, isAuthenticated, authLoading, resetToken, login, register, forgotPassword, verifyOTP, resendOTP, resetPassword, logout]
    );

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuthContext = () => {
    const ctx = React.useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuthContext must be used within AuthProvider');
    }
    return ctx;
};