
import React, { createContext, useState, useEffect } from "react";
import { getCurrentUser } from "../api/nom035";
import axios from "axios";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		// Intenta obtener el usuario actual al cargar la app
		getCurrentUser()
			.then(res => {
				setUser(res.data);
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
		try {
			const res = await axios.get("http://localhost:8080/api/users/me", {
				headers: { Authorization: `Basic ${basicAuth}` }
			});
			setUser(res.data);
			sessionStorage.setItem('auth', basicAuth);
			return { success: true };
		} catch (err) {
			setUser(null);
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

