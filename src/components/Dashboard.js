import React, { useEffect, useState, useContext } from "react";
import { UserContext } from "../context/UserContext";
import { useNavigate } from "react-router-dom";
import {
	// getCompanyDashboard,
	// getCompanyRisk,
	// getCompanyParticipation,
	getCompanies,
	// getCompanyParticipationSummary,
	getEmployees,
	getSurveyApplications,
	getSurveys,
	getCompanyDictamenSummary
} from "../api/nom035";
import {
	Box,
	Typography,
	Paper,
	Button,
	Grid,
	Card,
	CardContent,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
	Chip,
	LinearProgress,
	Avatar,
	Stack
} from "@mui/material";
import {
	People as PeopleIcon,
	Assignment as AssignmentIcon,
	TrendingUp as TrendingUpIcon,
	Warning as WarningIcon,
	Download as DownloadIcon,
	Refresh as RefreshIcon,
	Business as BusinessIcon
} from "@mui/icons-material";
import {
	PieChart,
	Pie,
	Cell,
	Tooltip as RechartsTooltip,
	Legend,
	ResponsiveContainer,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid
} from "recharts";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import theme from "../theme";
import { getLogger } from '../utils/logger';

const COLORS = [theme.palette.primary.dark, theme.palette.primary.light, theme.palette.primary.main, theme.palette.secondary.main];

// Distinct, colorblind-friendly categorical palette (20 colors) for Pie charts
const PIE_COLORS = [
	'#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
	'#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
	'#aec7e8', '#ffbb78', '#98df8a', '#ff9896', '#c5b0d5',
	'#c49c94', '#f7b6d2', '#c7c7c7', '#dbdb8d', '#9edae5'
];

const getPieColor = (index) => PIE_COLORS[index % PIE_COLORS.length];

// Generate an HSL color using golden angle for distinct hues
const goldenAngleColor = (idx) => {
	const hue = (idx * 137.508) % 360; // golden angle
	const saturation = 65; // percent
	const lightness = 50; // percent
	return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

// Simple deterministic hash for strings
const hashString = (str) => {
	let h = 0;
	for (let i = 0; i < str.length; i++) {
		h = (h << 5) - h + str.charCodeAt(i);
		h |= 0;
	}
	return Math.abs(h);
};

export default function Dashboard() {
	const { user, loading } = useContext(UserContext);
	const navigate = useNavigate();
	const log = getLogger('Dashboard');

	// helper to check roles (supports string or object with authority/name)
	const hasRole = (roleName) => {
		if (!user || !user.roles) return false;
		try {
			return user.roles.some((r) => {
				if (!r) return false;
				if (typeof r === 'string') return r === roleName;
				if (typeof r === 'object') {
					if (r.authority && typeof r.authority === 'string') return r.authority === roleName;
					if (r.name && typeof r.name === 'string') return r.name === roleName;
				}
				return false;
			});
		} catch (_) {
			return false;
		}
	};

	// derived flags
	const isAdmin = hasRole('ROLE_ADMIN');
	const isCompanyRole = hasRole('ROLE_COMPANY');
	const isCompanyView = isCompanyRole || (!isAdmin && !!(user && user.companyId));
	const showCompanySelector = isAdmin && !isCompanyRole; // only admins without COMPANY role see dropdown

	// Debug + forced hide fallback
	useEffect(() => {
		log.debug('roles/company state', { roles: user?.roles, companyId: user?.companyId, isAdmin, isCompanyRole, isCompanyView, showCompanySelector });
		if (isCompanyView) {
			const fc = document.getElementById('company-selector-form');
			if (fc) fc.style.display = 'none';
			Array.from(document.querySelectorAll('label, .MuiInputLabel-root')).forEach(el => {
				if (el.textContent && el.textContent.trim() === 'Seleccionar Empresa') {
					el.parentElement && (el.parentElement.style.display = 'none');
				}
			});
		}
	}, [user, isAdmin, isCompanyRole, isCompanyView, showCompanySelector]);

	const [dashboard, setDashboard] = useState({ employees: [], surveyStatusCounts: [], surveys: [] });
	const [riskByFactor, setRiskByFactor] = useState({});
	const [participation, setParticipation] = useState([]);
	const [companies, setCompanies] = useState([]);
	const [selectedCompany, setSelectedCompany] = useState("");
	const [dashboardLoading, setDashboardLoading] = useState(false);
	const [showAllRisk, setShowAllRisk] = useState(false);
	const [showAllParticipation, setShowAllParticipation] = useState(false);
	const [participationSummary, setParticipationSummary] = useState(null);

	// NEW: local data for consistent calculations with SurveyResults
	const [employees, setEmployees] = useState([]);
	const [surveys, setSurveys] = useState([]);
	const [applications, setApplications] = useState([]);

	// Log para depuración: mostrar los nombres de los factores que llegan del backend
	useEffect(() => {
		if (riskByFactor && Object.keys(riskByFactor).length > 0) {
			console.log('Factores recibidos en riskByFactor:', Object.keys(riskByFactor));
		}
	}, [riskByFactor]);

	// Helper used in both dashboards
	const isCompleted = (app) => {
		const status = (app?.status || app?.applicationStatus || '').toString().toUpperCase();
		return !!(app?.completedAt || app?.completed || status === 'COMPLETADA' || status === 'COMPLETED' || status === 'COMPLETO');
	};

	const computeFromLocal = (companyId, empList, appList, surveyList) => {
		// Scope employees by company
		const scopedEmployees = (empList || []).filter(e => String(e.companyId || (e.company && e.company.id)) === String(companyId));
		const scopedEmployeeIds = new Set(scopedEmployees.map(e => e.id));

		// Scope applications to company employees
		const scopedApps = (appList || []).filter(a => scopedEmployeeIds.has(a.employeeId));

		// Overall participation (matches SurveyResults default: all employees in company)
		const respondedIds = new Set(scopedApps.filter(isCompleted).map(a => a.employeeId));
		const totalEmployees = scopedEmployeeIds.size;
		const responded = [...respondedIds].filter(id => scopedEmployeeIds.has(id)).length;
		const pending = Math.max(totalEmployees - responded, 0);
		const summary = { responded, pending, total: totalEmployees };
		setParticipationSummary(summary);

		// Per-survey participation for bar chart (only surveys assigned in this company)
		const appsBySurvey = new Map();
		for (const app of scopedApps) {
			if (!appsBySurvey.has(app.surveyId)) appsBySurvey.set(app.surveyId, []);
			appsBySurvey.get(app.surveyId).push(app);
		}
		const barItems = [];
		appsBySurvey.forEach((apps, sId) => {
			const empIds = new Set(apps.map(a => a.employeeId));
			const completedIds = new Set(apps.filter(isCompleted).map(a => a.employeeId));
			const total = empIds.size;
			const done = [...completedIds].filter(id => empIds.has(id)).length;
			const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
			const s = (surveyList || []).find(x => String(x.id) === String(sId)) || {};
			barItems.push({
				name: s.title && s.title.length > 15 ? s.title.substring(0, 15) + "..." : (s.title || `Encuesta ${sId}`),
				completionRate,
				fullName: s.title || `Encuesta ${sId}`
			});
		});
		setParticipation(barItems.sort((a,b)=> b.completionRate - a.completionRate));

		// Update dashboard aggregate counts to keep existing cards working
		setDashboard({
			employees: scopedEmployees,
			surveys: (surveyList || [])
		});
	};

	const fetchData = async (companyId) => {
		setDashboardLoading(true);
		try {
			// Load minimal datasets in parallel
			const [empRes, appRes, survRes] = await Promise.all([
				getEmployees(),
				getSurveyApplications(),
				getSurveys()
			]);
			const empData = empRes.data || [];
			const appData = appRes.data || [];
			const survData = survRes.data || [];
			setEmployees(empData);
			setApplications(appData);
			setSurveys(survData);
			log.info('Dashboard batch loaded (local compute)', {
				employees: empData.length,
				applications: appData.length,
				surveys: survData.length
			});

			// Try to load dictamen summary for future risk usage (optional)
			try {
				if (companyId) {
					const dictRes = await getCompanyDictamenSummary(String(companyId));
					// If backend ever returns factor averages, map them; otherwise leave empty
					const d = dictRes?.data;
					if (d && d.factors) {
						// expecting format: { factors: [{ name, averageScore }] }
						const rb = {};
						(d.factors || []).forEach(f => { if (f && f.name != null && f.averageScore != null) rb[String(f.name)] = Number(f.averageScore); });
						setRiskByFactor(rb);
					}
				}
			} catch (e) {
				log.debug('Dictamen summary not available for risk chart', { message: e?.message });
			}

			// Compute dashboard metrics consistently
			computeFromLocal(companyId, empData, appData, survData);
		} catch (error) {
			log.error('Error fetching dashboard data', { error: error?.message, companyId });
			// Fallback to empty but consistent state
			setEmployees([]);
			setApplications([]);
			setSurveys([]);
			setParticipation([]);
			setParticipationSummary({ responded: 0, pending: 0, total: 0 });
			setDashboard({ employees: [], surveys: [] });
			setRiskByFactor({});
		} finally {
			setDashboardLoading(false);
		}
	};

	useEffect(() => {
		// Evitar navegar repetidamente: si no hay usuario y no estamos ya en /login, navegar.
		try {
			const currentPath = window.location && window.location.pathname ? window.location.pathname : '';
			if (!loading && !user && currentPath !== '/login') navigate('/login');
		} catch (e) {
			if (!loading && !user) navigate('/login');
		}
	}, [loading, user, navigate]);

	useEffect(() => {
		getCompanies().then((res) => {
			log.info('Loaded companies', { count: res.data?.length });
			if (user && isCompanyView) {
				const userCompanyId = String(user.companyId || (user.company && user.company.id));
				const match = res.data.find(c => String(c.id) === userCompanyId);
				setCompanies(match ? [match] : []);
				setSelectedCompany(userCompanyId);
				log.debug('Scoped companies for company view', { companyId: userCompanyId });
				return;
			}
			setCompanies(res.data);
			if (user && isAdmin) {
				if (!selectedCompany || !res.data.some(c => String(c.id) === String(selectedCompany))) {
					if (res.data && res.data.length > 0) setSelectedCompany(String(res.data[0].id));
				}
			} else {
				if (res.data && res.data.length > 0 && !selectedCompany) {
					setSelectedCompany(String(res.data[0].id));
				}
			}
		}).catch((e) => {
			log.error('Failed loading companies', { error: e?.message });
			setCompanies([]);
		});
	}, [user, isCompanyView, isAdmin]);

	// Ensure company view cannot have its selectedCompany changed elsewhere
	useEffect(() => {
		if (user && isCompanyView) {
			const lockedId = String(user.companyId || (user.company && user.company.id));
			if (lockedId && lockedId !== selectedCompany) {
				log.debug('Locking selected company', { lockedId, previous: selectedCompany });
				setSelectedCompany(lockedId);
			}
		}
	}, [user, selectedCompany, isCompanyView]);

	useEffect(() => {
		if (selectedCompany) {
			log.info('Fetching dashboard data', { companyId: selectedCompany });
			fetchData(selectedCompany);
		}
	}, [selectedCompany]);

	if (loading || !user) return <div>Cargando...</div>;
	const pieData = Object.keys(riskByFactor || {}).map((key) => ({ name: key, value: riskByFactor[key] }));
	const barData = (participation || []).map((item) => ({
		name: item.surveyTitle?.length > 15 ? item.surveyTitle.substring(0, 15) + "..." : (item.name || ''),
		completionRate: item.completionRate,
		fullName: item.fullName || item.name || ''
	}));
	// Asignar barData globalmente para otros componentes
	window.dashboardBarData = barData;
	// Mostrar siempre los factores clave de la NOM-035
	const factoresClave = [
		'Sobrecarga',
		'Horas extra',
		'Órdenes contradictorias', // Falta de control
		'Violencia presenciada',   // Violencia
		'Organización del jefe'    // Liderazgo negativo
	];
	// If filtering by factoresClave yields no matches, fallback to all factors to avoid empty chart
	const matchedFactors = factoresClave
		.map(factor => pieData.find(d => d.name === factor))
		.filter(Boolean);
	const pieDataLimited = showAllRisk ? pieData : (matchedFactors.length > 0 ? matchedFactors : pieData);

	// Stable color mapping per factor name (consistent across toggles and renders)
	const pieColorMap = (() => {
		const allNames = (pieData || []).map(d => d.name).sort();
		const map = {};
		allNames.forEach((name, i) => {
			if (i < PIE_COLORS.length) {
				map[name] = PIE_COLORS[i];
			} else {
				const seed = hashString(name);
				map[name] = goldenAngleColor(seed % 360);
			}
		});
		return map;
	})();
	const barDataLimited = showAllParticipation ? barData : barData.slice(0, 5);
	const stats = {
		totalEmployees: dashboard.employees?.length || 0,
		totalSurveys: dashboard.surveys?.length || 0,
		avgCompletion: participation.length > 0 ? (participation.reduce((a, b) => a + b.completionRate, 0) / participation.length).toFixed(1) : 0,
		highRiskFactors: pieData.filter((p) => p.value > 70).length,
		responded: participationSummary ? participationSummary.responded : 0,
		pending: participationSummary ? participationSummary.pending : (dashboard.employees?.length || 0)
	};
	// Altura dinámica para las gráficas (debe ir después de definir los datos limitados)
	const pieChartHeight = Math.max(360, (pieDataLimited.length || 1) * 60);
	const barChartHeight = Math.max(360, (barDataLimited.length || 1) * 60);

	const exportRiskExcel = () => {
		const ws = XLSX.utils.json_to_sheet(pieData.map((d) => ({ Factor: d.name, AverageRisk: d.value })));
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, "RiskByFactor");
		const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
		saveAs(new Blob([buf], { type: "application/octet-stream" }), "riesgo_por_factor.xlsx");
	};

	// Exportar participación a Excel
	const exportParticipationExcel = () => {
		const ws = XLSX.utils.json_to_sheet(barData.map((d) => ({ Encuesta: d.fullName, Participacion: d.completionRate })));
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, "Participacion");
		const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
		saveAs(new Blob([buf], { type: "application/octet-stream" }), "participacion_por_encuesta.xlsx");
	};

	const StatCard = ({ title, value, icon, subtitle, trend }) => (
		<Card sx={{ height: '100%', background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.light} 100%)`, color: 'white' }}>
			<CardContent sx={{ p: 2 }}>
				<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
					<Box>
						<Typography variant="body2" sx={{ opacity: 0.9 }}>{title}</Typography>
						<Typography variant="h5" sx={{ fontWeight: 700 }}>{value}</Typography>
						{subtitle && <Typography variant="caption">{subtitle}</Typography>}
					</Box>
					<Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>{icon}</Avatar>
				</Box>
				{trend && <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>{trend}</Typography>}
			</CardContent>
		</Card>
	);

	return (
		<Box sx={{ p: 3, backgroundColor: '#f8fafc', minHeight: '100vh' }}>
			<Box sx={{ mb: 3 }}>
				   <Typography variant="h4" sx={{ fontWeight: 700 }}>Dashboard de Resultados</Typography>
				<Typography variant="body2" color="text.secondary">Resumen ejecutivo de riesgos psicosociales y participación</Typography>
			</Box>

			<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
				{isCompanyView ? (
					<Box sx={{ display: 'flex', alignItems: 'center', minWidth: 240 }}>
						<BusinessIcon sx={{ mr: 1 }} />
						<Typography variant="subtitle1">{companies[0]?.name || '—'}</Typography>
					</Box>
				) : showCompanySelector ? (
					<FormControl id="company-selector-form" sx={{ minWidth: 240 }}>
						<InputLabel>Seleccionar Empresa</InputLabel>
						<Select
							value={selectedCompany}
							label="Seleccionar Empresa"
							onChange={(e) => setSelectedCompany(String(e.target.value))}
							MenuProps={{ PaperProps: { style: { maxHeight: 300 } } }}
						>
							{companies.map((c) => (
								<MenuItem key={c.id} value={String(c.id)}><BusinessIcon sx={{ mr: 1 }} />{c.name}</MenuItem>
							))}
						</Select>
					</FormControl>
				) : (
					<Box sx={{ display: 'flex', alignItems: 'center', minWidth: 240 }}>
						<BusinessIcon sx={{ mr: 1 }} />
						<Typography variant="subtitle1">{companies.find(c => String(c.id) === String(selectedCompany))?.name || '—'}</Typography>
					</Box>
				)}

				<Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => { log.debug('Manual refresh click', { companyId: selectedCompany }); fetchData(selectedCompany); }} disabled={loading}>
					Actualizar
				</Button>
			</Box>

			{dashboardLoading && <LinearProgress sx={{ mb: 2 }} />}

			<Grid container columnSpacing={2} rowSpacing={2} sx={{ mb: 3 }}>
				<Grid><StatCard title="Total Empleados" value={stats.totalEmployees} icon={<PeopleIcon />} subtitle="Personal registrado" trend="" /></Grid>
				<Grid><StatCard title="Encuestas Activas" value={stats.totalSurveys} icon={<AssignmentIcon />} subtitle="En el sistema" trend="" /></Grid>
				<Grid><StatCard title="Participación Promedio" value={`${stats.avgCompletion}%`} icon={<TrendingUpIcon />} subtitle="Promedio por encuesta" trend="" /></Grid>
				<Grid><StatCard title="Respondidos" value={stats.responded} icon={<TrendingUpIcon />} subtitle="Aplicaciones completadas" trend="" /></Grid>
				<Grid><StatCard title="Pendientes" value={stats.pending} icon={<WarningIcon />} subtitle="Aplicaciones sin completar" trend={stats.pending === 0 ? '✓ Completo' : ''} /></Grid>
				<Grid><StatCard title="Factores de Riesgo" value={stats.highRiskFactors} icon={<WarningIcon />} subtitle=">70 promedio" trend={stats.highRiskFactors > 0 ? '⚠ Revisar' : '✓ Bajo'} /></Grid>
			</Grid>

			<Grid container columnSpacing={2} rowSpacing={2}>
				<Grid sx={{ flex: 1, minWidth: 0 }}>
					<Paper sx={{ p: 2, height: 440 }}>
						<Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
							<Box>
								<Typography variant="h6">Riesgo por Factor</Typography>
								<Typography variant="body2" color="text.secondary">Distribución de niveles de riesgo psicosocial</Typography>
							</Box>
							<Box>
								<Button variant="text" startIcon={<DownloadIcon />} onClick={exportRiskExcel}>Exportar</Button>
								{pieData.length > 5 && (
									<Button size="small" sx={{ ml: 1 }} onClick={() => setShowAllRisk(v => !v)}>
										{showAllRisk ? 'Ver menos' : 'Ver todos'}
									</Button>
								)}
							</Box>
						</Box>
						{pieDataLimited.length > 0 ? (
							<ResponsiveContainer width="100%" height={pieChartHeight}>
								<PieChart>
									<Pie data={pieDataLimited} dataKey="value" nameKey="name" innerRadius={40} outerRadius={100} label>
										{pieDataLimited.map((entry, i) => (
											<Cell key={i} fill={pieColorMap[entry.name] || getPieColor(i)} stroke="#ffffff" strokeWidth={1} />
										))}
									</Pie>
									<RechartsTooltip />
									<Legend />
								</PieChart>
							</ResponsiveContainer>
						) : (
							<Box sx={{ height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography color="text.secondary">No hay datos de riesgo disponibles</Typography></Box>
						)}
					</Paper>
				</Grid>

				<Grid sx={{ flex: 1, minWidth: 0 }}>
					<Paper sx={{ p: 2, height: 440 }}>
						<Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
							<Box>
								<Typography variant="h6">Participación por Encuesta</Typography>
								<Typography variant="body2" color="text.secondary">Porcentaje de participación en cada evaluación</Typography>
							</Box>
							<Box>
								<Button variant="text" startIcon={<DownloadIcon />} onClick={exportParticipationExcel}>Exportar</Button>
								{barData.length > 5 && (
									<Button size="small" sx={{ ml: 1 }} onClick={() => setShowAllParticipation(v => !v)}>
										{showAllParticipation ? 'Ver menos' : 'Ver todos'}
									</Button>
								)}
							</Box>
						</Box>
						{barData.length > 0 ? (
							<ResponsiveContainer width="100%" height={barChartHeight}>
								<BarChart data={barDataLimited} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
									<CartesianGrid strokeDasharray="3 3" />
									<XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} height={80} />
									<YAxis />
									<RechartsTooltip />
									<Bar dataKey="completionRate" fill={COLORS[0]} />
								</BarChart>
							</ResponsiveContainer>
						) : (
							<Box sx={{ height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography color="text.secondary">No hay datos de participación disponibles</Typography></Box>
						)}
					</Paper>
				</Grid>
			</Grid>
		</Box>
	);
}
