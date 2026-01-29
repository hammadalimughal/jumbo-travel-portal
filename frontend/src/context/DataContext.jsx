import React from 'react';
import { message } from 'antd';
import { API_BASE } from '../config/data';
import { useAuthContext } from './AuthContext';

const appendIfPresent = (formData, key, value) => {
    if (value !== undefined && value !== null && value !== '') {
        formData.append(key, value);
    }
};

export const DataContext = React.createContext(null);

export const DataProvider = ({ children }) => {
    const [messageApi, contextHolder] = message.useMessage();
    const { isAuthenticated, user } = useAuthContext();

    const notifySuccess = (content, options = {}) => {
        if (typeof options === 'number') return messageApi.success({ content, duration: options });
        if (typeof options === 'object' && options !== null) return messageApi.success({ content, ...options });
        return messageApi.success(content);
    };

    const notifyError = (content, options = {}) => {
        if (typeof options === 'number') return messageApi.error({ content, duration: options });
        if (typeof options === 'object' && options !== null) return messageApi.error({ content, ...options });
        return messageApi.error(content);
    };
    const [hotels, setHotels] = React.useState([]);
    const [hotelsLoading, setHotelsLoading] = React.useState(true);

    const fetchHotels = React.useCallback(async () => {
        setHotelsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/hotel/getall`, { credentials: 'include' });
            const json = await res.json();
            if (json.success) {
                setHotels(json.data || []);
            } else {
                throw new Error(json.error || 'Failed to fetch hotels');
            }
        } catch (error) {
            console.error('fetchHotels:', error.message);
            notifyError(error.message || 'Failed to fetch hotels');
        } finally {
            setHotelsLoading(false);
        }
    }, []);

    React.useEffect(() => {
        if (isAuthenticated) {
            fetchHotels()
        }
    }, [isAuthenticated, fetchHotels]);

    const saveHotel = React.useCallback(
        async (values, hotelId) => {
            const method = hotelId ? 'PUT' : 'POST';
            const url = hotelId ? `${API_BASE}/hotel/${hotelId}` : `${API_BASE}/hotel/create`;
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(values),
            });
            const json = await res.json();
            if (!json.success) {
                throw new Error(json.error || 'Failed to save hotel');
            }
            await fetchHotels();
            notifySuccess(hotelId ? 'Hotel updated' : 'Hotel created');
            return json.data;
        },
        [fetchHotels]
    );

    const deleteHotel = React.useCallback(
        async (hotelId) => {
            const res = await fetch(`${API_BASE}/hotel/${hotelId}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            const json = await res.json();
            if (!json.success) {
                throw new Error(json.error || 'Failed to delete hotel');
            }
            await fetchHotels();
            notifySuccess('Hotel deleted');
        },
        [fetchHotels]
    );

    const value = React.useMemo(
        () => ({
            hotels,
            hotelsLoading,
            refreshHotels: fetchHotels,
            saveHotel,
            deleteHotel,
            notifySuccess,
            notifyError,
        }),
        [hotels, hotelsLoading, fetchHotels]
    );

    return (
        <DataContext.Provider value={value}>
            {contextHolder}
            {children}
        </DataContext.Provider>
    );
};

export const useDataContext = () => {
    const ctx = React.useContext(DataContext);
    if (!ctx) {
        throw new Error('useDataContext must be used within DataProvider');
    }
    return ctx;
};