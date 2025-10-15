import React, { useState, useRef, useEffect } from 'react'; // <-- MODIFICADO: Agregado useRef y useEffect
import { Search, Film, Tv, X, TrendingUp, Star, Calendar, Clock, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

const API_KEY = '9f68f335'; // TU API KEY CONFIGURADA
const API_URL = 'https://www.omdbapi.com/';

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [comparison, setComparison] = useState([null, null]);
  const [error, setError] = useState('');

  // ========== UX: REFERENCIA PARA SCROLL ==========
  const comparisonRef = useRef(null); // <-- NUEVA LÍNEA: Referencia a la sección de comparación

  // ========== BÚSQUEDA ==========
  const handleSearch = async (page = 1) => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setError('');
    setCurrentPage(page);
    
    try {
      const response = await fetch(
        `${API_URL}?apikey=${API_KEY}&s=${searchQuery}&type=${searchType}&page=${page}`
      );
      const data = await response.json();
      
      if (data.Response === 'True') {
        setResults(data.Search);
        setTotalResults(parseInt(data.totalResults));
      } else {
        setResults([]);
        setTotalResults(0);
        setError(data.Error || 'No se encontraron resultados');
      }
    } catch (err) {
      setError('Error al conectar con la API');
      console.error(err);
    }
    
    setLoading(false);
  };

  // ========== SELECCIONAR ITEM ==========
  const selectItem = async (imdbID) => {
    setLoading(true);
    
    try {
      const response = await fetch(
        `${API_URL}?apikey=${API_KEY}&i=${imdbID}&plot=full`
      );
      const data = await response.json();
      
      if (data.Response === 'True') {
        addToComparison(data);
      }
    } catch (err) {
      console.error('Error al obtener detalles:', err);
    }
    
    setLoading(false);
  };

  // ========== AGREGAR A COMPARACIÓN ==========
  const addToComparison = (item) => {
    if (comparison[0] === null) {
      setComparison([item, null]);
    } else if (comparison[1] === null) {
      setComparison([comparison[0], item]);
    } else {
      setComparison([comparison[0], item]);
    }
  };

  // ========== NORMALIZAR CALIFICACIONES ==========
  const normalizeRating = (source, value) => {
    if (source.includes('Internet Movie Database')) {
      return parseFloat(value.split('/')[0]) * 10;
    } else if (source.includes('Rotten Tomatoes')) {
      return parseInt(value);
    } else if (source.includes('Metacritic')) {
      return parseInt(value.split('/')[0]);
    }
    return 0;
  };

  // ========== DATOS PARA GRÁFICOS ==========
  const getChartData = () => {
    if (!comparison[0] || !comparison[1]) return [];

    const sources = ['IMDb', 'Rotten Tomatoes', 'Metacritic'];
    
    return sources.map(source => {
      const rating1 = comparison[0].Ratings.find(r => r.Source.includes(source));
      const rating2 = comparison[1].Ratings.find(r => r.Source.includes(source));
      
      return {
        name: source,
        [comparison[0].Title]: rating1 ? normalizeRating(rating1.Source, rating1.Value) : 0,
        [comparison[1].Title]: rating2 ? normalizeRating(rating2.Source, rating2.Value) : 0
      };
    });
  };

  const getRadarData = () => {
    if (!comparison[0] || !comparison[1]) return [];
    
    return comparison[0].Ratings.map((r, idx) => ({
      subject: r.Source.replace('Internet Movie Database', 'IMDb').replace('Rotten Tomatoes', 'RT'),
      A: normalizeRating(r.Source, r.Value),
      B: comparison[1].Ratings[idx] ? normalizeRating(comparison[1].Ratings[idx].Source, comparison[1].Ratings[idx].Value) : 0,
      fullMark: 100
    }));
  };

  const totalPages = Math.ceil(totalResults / 10);

  // ========== UX: SCROLL AUTOMÁTICO ==========
  useEffect(() => {
    if (comparison[0] && comparison[1] && comparisonRef.current) {
      comparisonRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [comparison]); // Se ejecuta cuando el estado de comparison cambia

  return (
    // ESTILO: Fondo oscuro tipo IMDb
    <div className="min-h-screen bg-gray-900 text-gray-100">
      
      {/* HEADER */}
      {/* ESTILO: Header oscuro con borde amarillo/naranja */}
      <header className="sticky top-0 z-50 bg-gray-800/95 backdrop-blur-lg shadow-xl border-b border-yellow-500/30">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center gap-3 mb-6">
            {/* ESTILO: Ícono de acento amarillo */}
            <Film className="w-10 h-10 text-yellow-500" /> 
            {/* ESTILO: Título blanco sólido */}
            <h1 className="text-4xl font-bold text-white">
              Comparador de Películas y Series
            </h1>
          </div>
          
          {/* BUSCADOR */}
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Buscar película o serie..."
                  // Clases de fondo oscuro y borde amarillo suave
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-700/50 text-white border border-gray-500/30 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all"
                />
              </div>
              
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                // Clases de fondo oscuro y borde amarillo suave
                className="px-4 py-3 rounded-xl bg-slate-700/50 text-white border border-gray-500/30 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
              >
                <option value="">📺 Todo</option>
                <option value="movie">🎬 Películas</option>
                <option value="series">📺 Series</option>
              </select>
              
              {/* ESTILO: Botón de acento amarillo/negro */}
              <button
                onClick={() => handleSearch()}
                disabled={loading}
                className="px-8 py-3 bg-yellow-500 text-black hover:bg-yellow-600 rounded-xl font-semibold transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-yellow-500/50"
              >
                {loading ? '⏳ Buscando...' : '🔍 Buscar'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        
        {/* LOADING */}
        {loading && (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-yellow-500"></div>
            <p className="mt-4 text-gray-300 text-lg">Cargando...</p>
          </div>
        )}

        {/* ERROR */}
        {error && !loading && (
          <div className="max-w-2xl mx-auto bg-red-900/30 border border-red-500 rounded-xl p-6 text-center backdrop-blur-sm">
            <p className="text-red-200 text-lg">❌ {error}</p>
          </div>
        )}

        {/* RESULTADOS */}
        {results.length > 0 && !loading && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-6 h-6 text-yellow-500" /> {/* Ícono de acento amarillo */}
              <h2 className="text-3xl font-bold text-white">Resultados de Búsqueda</h2>
              {/* Clase de acento amarillo suave */}
              <span className="px-3 py-1 bg-yellow-500/20 rounded-full text-yellow-300 text-sm">
                {totalResults} resultados
              </span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {results.map((item) => (
                <div
                  key={item.imdbID}
                  onClick={() => selectItem(item.imdbID)}
                  // Clases de tarjeta oscura con acento amarillo al hover
                  className="group cursor-pointer bg-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm border border-gray-700 hover:border-yellow-500 transition-all transform hover:scale-105 hover:shadow-2xl hover:shadow-yellow-500/30"
                >
                  <div className="relative overflow-hidden">
                    <img
                      src={item.Poster !== 'N/A' ? item.Poster : 'https://via.placeholder.com/300x450/1e293b/facc15?text=Sin+Imagen'}
                      alt={item.Title}
                      className="w-full h-72 object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  
                  <div className="p-4">
                    <h3 className="font-bold text-white text-sm line-clamp-2 mb-2">
                      {item.Title}
                    </h3>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 text-gray-400">
                        <Calendar className="w-3 h-3" />
                        {item.Year}
                      </span>
                      <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                        item.Type === 'movie' 
                          ? 'bg-yellow-500/20 text-yellow-300' // Acento amarillo para películas
                          : 'bg-indigo-500/20 text-indigo-300' // Acento azul/índigo para series
                      }`}>
                        {item.Type === 'movie' ? '🎬 Película' : '📺 Serie'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* PAGINACIÓN */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8">
                <button
                  onClick={() => handleSearch(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-gray-700"
                >
                  ← Anterior
                </button>
                <span className="px-6 py-3 bg-yellow-500/20 rounded-xl text-yellow-300 font-semibold border border-yellow-500/30">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => handleSearch(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-gray-700"
                >
                  Siguiente →
                </button>
              </div>
            )}
          </div>
        )}

        {/* SECCIÓN DE COMPARACIÓN */}
        {/* UX: ref={comparisonRef} para el scroll automático */}
        {(comparison[0] || comparison[1]) && (
          <div className="space-y-8" ref={comparisonRef}> 
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-yellow-500" /> {/* Ícono de acento amarillo */}
                <h2 className="text-3xl font-bold text-white">Comparación</h2>
              </div>
              <button
                onClick={() => setComparison([null, null])}
                className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl transition-all border border-red-500/30 flex items-center gap-2"
              >
                <X className="w-5 h-5" />
                Limpiar
              </button>
            </div>

            {/* TARJETAS DE COMPARACIÓN */}
            <div className="grid lg:grid-cols-2 gap-8">
              {/* TARJETA 1 */}
              <div className={`rounded-2xl p-6 backdrop-blur-sm border-2 transition-all ${
                comparison[0] 
                  ? 'bg-slate-700/50 border-yellow-500' // Acento amarillo y fondo más sutil
                  : 'bg-slate-800/30 border-slate-700'
              }`}>
                {comparison[0] ? (
                  <DetailCard item={comparison[0]} color="yellow" /> {/* Color de acento a amarillo */}
                ) : (
                  <div className="text-center py-20 text-gray-400">
                    <Film className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Selecciona una película o serie</p>
                  </div>
                )}
              </div>

              {/* TARJETA 2 */}
              <div className={`rounded-2xl p-6 backdrop-blur-sm border-2 transition-all ${
                comparison[1] 
                  ? 'bg-slate-700/50 border-indigo-500' // Acento azul/índigo y fondo más sutil
                  : 'bg-slate-800/30 border-slate-700'
              }`}>
                {comparison[1] ? (
                  <DetailCard item={comparison[1]} color="indigo" /> {/* Color de acento a índigo */}
                ) : (
                  <div className="text-center py-20 text-gray-400">
                    <Tv className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Selecciona otra para comparar</p>
                  </div>
                )}
              </div>
            </div>

            {/* GRÁFICOS */}
            {comparison[0] && comparison[1] && (
              <div className="grid lg:grid-cols-2 gap-8">
                {/* GRÁFICO DE BARRAS */}
                <div className="bg-slate-800/50 rounded-2xl p-6 backdrop-blur-sm border border-gray-700">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-yellow-500" /> {/* Acento amarillo */}
                    Comparación de Calificaciones
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={getChartData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" stroke="#9CA3AF" />
                      <YAxis domain={[0, 100]} stroke="#9CA3AF" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #eab308', borderRadius: '8px' }} // Borde amarillo
                        labelStyle={{ color: '#fff' }}
                      />
                      <Legend />
                      <Bar dataKey={comparison[0].Title} fill="#eab308" radius={[8, 8, 0, 0]} /> {/* Color barra 1: Amarillo */}
                      <Bar dataKey={comparison[1].Title} fill="#4f46e5" radius={[8, 8, 0, 0]} /> {/* Color barra 2: Índigo */}
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* GRÁFICO RADAR */}
                <div className="bg-slate-800/50 rounded-2xl p-6 backdrop-blur-sm border border-gray-700">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Star className="w-6 h-6 text-yellow-500" /> {/* Acento amarillo */}
                    Vista Radar
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={getRadarData()}>
                      <PolarGrid stroke="#374151" />
                      <PolarAngleAxis dataKey="subject" stroke="#9CA3AF" />
                      <PolarRadiusAxis domain={[0, 100]} stroke="#9CA3AF" />
                      <Radar name={comparison[0].Title} dataKey="A" stroke="#eab308" fill="#eab308" fillOpacity={0.6} /> {/* Color radar 1: Amarillo */}
                      <Radar name={comparison[1].Title} dataKey="B" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.6} /> {/* Color radar 2: Índigo */}
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <footer className="text-center py-8 text-gray-400 border-t border-gray-700 mt-12">
        <p>Powered by OMDb API • Creado con React + Recharts + Vite</p>
      </footer>
    </div>
  );
}

// ========== COMPONENTE DE TARJETA DETALLADA (Detalles estéticos ajustados) ==========
function DetailCard({ item, color }) {
  // Nota: El color aquí ahora será 'yellow' o 'indigo' según el argumento 'color'
  const accentColor = color === 'yellow' ? 'text-yellow-400' : 'text-indigo-400';
  const borderColor = color === 'yellow' ? 'border-yellow-500/20' : 'border-indigo-500/20';

  return (
    <div className="space-y-6">
      <div className="relative rounded-xl overflow-hidden shadow-2xl">
        <img
          src={item.Poster !== 'N/A' ? item.Poster : 'https://via.placeholder.com/400x600/1e293b/facc15?text=Sin+Imagen'}
          alt={item.Title}
          className="w-full h-96 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h3 className="text-3xl font-bold text-white mb-2">{item.Title}</h3>
          <div className="flex items-center gap-4 text-sm text-gray-200">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {item.Year}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {item.Runtime}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400 mb-1">Director</p>
            <p className="text-white font-semibold">{item.Director}</p>
          </div>
          <div>
            <p className="text-gray-400 mb-1">Género</p>
            <p className="text-white font-semibold">{item.Genre}</p>
          </div>
        </div>

        <div>
          <p className="text-gray-400 mb-2 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Actores
          </p>
          <p className="text-white text-sm">{item.Actors}</p>
        </div>

        {/* Borde sutil en lugar de morado */}
        <div className={`bg-slate-900/50 rounded-xl p-4 border ${borderColor}`}> 
          <p className="text-gray-400 mb-2">📝 Sinopsis</p>
          <p className="text-gray-300 text-sm leading-relaxed">{item.Plot}</p>
        </div>

        <div>
          <p className="text-gray-400 mb-3 flex items-center gap-2">
            <Star className={`w-5 h-5 ${accentColor}`} />
            Calificaciones
          </p>
          <div className="space-y-2">
            {item.Ratings.map((rating, idx) => (
              <div key={idx} className={`flex justify-between items-center bg-slate-900/50 rounded-lg p-3 border ${borderColor}`}>
                <span className="text-gray-300 text-sm">{rating.Source}</span>
                {/* Texto de calificación con color de acento dinámico */}
                <span className={`font-bold text-lg ${accentColor}`}>{rating.Value}</span> 
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
