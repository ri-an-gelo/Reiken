import api from "../axios";
import { createContext, useState, useCallback } from "react";

export const ServerContext = createContext();

export const ServerProvider = ({ children }) => {
    const [account, setAccount] = useState(() => {
        try {
            const stored = localStorage.getItem("user");
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const signup = useCallback(async (name, email, password) => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.post("/signup", { name, email, password });
            localStorage.setItem("user", JSON.stringify(response.data));
            setAccount(response.data);
            return response.data;
        } catch (err) {
            const msg = err.response?.data?.error || err.message || "Signup failed";
            setError(msg);
            throw new Error(msg);
        } finally {
            setLoading(false);
        }
    }, []);

    const login = useCallback(async (email, password) => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.post("/login", { email, password });
            localStorage.setItem("user", JSON.stringify(response.data));
            setAccount(response.data);
            return response.data;
        } catch (err) {
            const msg = err.response?.data?.error || err.message || "Login failed";
            setError(msg);
            throw new Error(msg);
        } finally {
            setLoading(false);
        }
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem("user");
        setAccount(null);
    }, []);

    return (
        <ServerContext.Provider value={{ account, signup, login, logout, loading, error }}>
            {children}
        </ServerContext.Provider>
    );
};