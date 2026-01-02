import React, { createContext, useState, useEffect } from "react";
import { getCurrentUser } from "../api/nom035";
import axios from "axios";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);

	// Normaliza la estructura del usuario para que siempre tengamos companyId y roles
	const normalizeUser = (u = {}) => {
		const roles = u.roles || u.authorities || [];
		return {
			...u,
			roles,
			companyId: String(u.companyId || (u.company && u.company.id) || u.company_id || '')
		};
	};

	useEffect(() => {
		// Si hay credenciales guardadas, setéalas en axios y pide /users/me; si no, evita el 401 y termina rápido
		const savedAuth = sessionStorage.getItem('auth');
		if (!savedAuth) {
			setUser(null);
			setLoading(false);
			return;
		}
		axios.defaults.headers.common.Authorization = `Basic ${savedAuth}`;
		getCurrentUser()
			.then(res => {
				const normalized = normalizeUser(res.data);
				setUser(normalized);
				setLoading(false);
			})
			.catch(() => {
				setUser(null);
				setLoading(false);
			});
	}, []);


	// Nuevo login: valida contra backend usando Basic Auth
	const login = async (username, password) => {
		const basicAuth = btoa(`${username}:${password}`);
		const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
		try {
			const res = await axios.get(`${API_URL}/api/users/me`, {
				headers: { Authorization: `Basic ${basicAuth}` }
			});
			const normalized = normalizeUser(res.data);
			setUser(normalized);
			// Persist Basic auth and set it globally so axios keeps sending it after refresh
			sessionStorage.setItem('auth', basicAuth);
			axios.defaults.headers.common.Authorization = `Basic ${basicAuth}`;
			return { success: true };
		} catch (err) {
			setUser(null);
			delete axios.defaults.headers.common.Authorization;
			sessionStorage.removeItem('auth');
			return { success: false, error: 'Usuario o contraseña incorrectos' };
		}
	};

	const logout = () => {
		setUser(null);
		sessionStorage.removeItem('auth');
	};

	return (
		<UserContext.Provider value={{ user, setUser, login, logout, loading }}>
			{children}
		</UserContext.Provider>
	);
};