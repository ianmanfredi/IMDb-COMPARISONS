import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Film, Tv, X, TrendingUp, Star, Calendar, Clock, Users, ArrowDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

const API_KEY = '9f68f335'; // YOUR CONFIGURED API KEY
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
  
  // =======================================================
  // 1. SMART HEADER STATE
  // Se asume que el header tiene una altura de ~150px (h-40) para el cálculo de ocultamiento.
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const headerHeight = 150; // Aproximadamente la altura del header en pixeles
  // =======================================================

  // ========== UX: SCROLL REFERENCE ==========
  const comparisonRef = useRef(null);

  // ========== SEARCH LOGIC ==========
  const handleSearch = useCallback(async (query, type, page = 1) => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError('');
    setCurrentPage(page);
    
    try {
      const response = await fetch(
        `${API_URL}?apikey=${API_KEY}&s=${query}&type=${type}&page=${page}`
      );
      const data = await response.json();
      
      if (data.Response === 'True') {
        const shuffledResults = page === 1 && query === "best movies" 
            ? data.Search.sort(() => 0.5 - Math.random()) 
            : data.Search;

        setResults(shuffledResults);
        setTotalResults(parseInt(data.totalResults));
      } else {
        setResults([]);
        setTotalResults(0);
        setError(data.Error || 'No results found for your query.');
      }
    } catch (err) {
      setError('Error connecting to the API.');
      console.error(err);
    }
    
    setLoading(false);
  }, []);

  // ========== INITIAL LOAD (RECOMMENDATIONS) ==========
  useEffect(() => {
    handleSearch("best movies", "", 1);
  }, [handleSearch]);

  // =======================================================
  // 2. SMART HEADER LOGIC
  const controlHeader = useCallback(() => {
    // Zona segura: si estamos cerca de la parte superior, siempre mostrar.
    const safeZone = 100;

    if (window.scrollY < safeZone) { 
        setShowHeader(true);
    } 
    // Si el usuario sube (scroll hacia arriba)
    else if (window.scrollY < lastScrollY) {
      setShowHeader(true);
    } 
    // Si el usuario baja (scroll hacia abajo) y está fuera de la zona segura.
    else if (window.scrollY > lastScrollY) {
      setShowHeader(false);
    }

    setLastScrollY(window.scrollY);
  }, [lastScrollY]);

  useEffect(() => {
    window.addEventListener('scroll', controlHeader);
    return () => {
      window.removeEventListener('scroll', controlHeader);
    };
  }, [controlHeader]);
  // =======================================================

  // ========== SELECT ITEM ==========
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
      console.error('Error fetching details:', err);
    }
    
    setLoading(false);
  };

  // ========== ADD TO COMPARISON - CORRECTED LOGIC ==========
  const addToComparison = (item) => {
    if (comparison[0] === null) {
      setComparison([item, null]); 
    } else if (comparison[1] === null) {
      setComparison([comparison[0], item]);
    } else {
      setComparison([item, null]); 
    }
  };

  // ========== NORMALIZE RATINGS ==========
  const normalizeRating = (source, value) => {
    if (source.includes('Internet Movie Database')) {
        const numericValue = parseFloat(value.split('/')[0]);
        return numericValue * 10;
    } else if (source.includes('Rotten Tomatoes')) {
        return parseInt(value.replace('%', ''));
    } else if (source.includes('Metacritic')) {
        return parseInt(value.split('/')[0]);
    }
    return 0;
  };

  // ========== GET CHART DATA ==========
  const getChartData = () => {
    if (!comparison[0] || !comparison[1]) return [];

    const sources = ['Internet Movie Database', 'Rotten Tomatoes', 'Metacritic'];
    
    return sources.map(source => {
      const rating1 = comparison[0].Ratings.find(r => r.Source === source);
      const rating2 = comparison[1].Ratings.find(r => r.Source === source);
      
      const displayName = source.replace('Internet Movie Database', 'IMDb').replace('Rotten Tomatoes', 'RT');

      return {
        name: displayName,
        [comparison[0].Title]: rating1 ? normalizeRating(rating1.Source, rating1.Value) : 0,
        [comparison[1].Title]: rating2 ? normalizeRating(rating2.Source, rating2.Value) : 0
      };
    });
  };

  // ========== GET RADAR DATA ==========
  const getRadarData = () => {
    if (!comparison[0] || !comparison[1]) return [];
    
    const data1 = comparison[0].Ratings;
    const data2 = comparison[1].Ratings;

    return data1.map(r1 => {
        const r2 = data2.find(r => r.Source === r1.Source);

        const displayName = r1.Source.replace('Internet Movie Database', 'IMDb').replace('Rotten Tomatoes', 'RT');

        return {
          subject: displayName,
          A: normalizeRating(r1.Source, r1.Value),
          B: r2 ? normalizeRating(r2.Source, r2.Value) : 0,
          fullMark: 100
        }
    });
  };

  const totalPages = Math.ceil(totalResults / 10);
  const isFirstItemSelected = comparison[0] !== null && comparison[1] === null;

  // ========== UX: AUTO-SCROLL AJUSTADO ==========
  useEffect(() => {
    if (comparison[0] && comparison[1] && comparisonRef.current) {
      comparisonRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [comparison]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      
      {/* ======================================================= */}
      {/* HEADER: SMART HEADER IMPLEMENTATION */}
      <header 
        className={`fixed w-full z-50 bg-gray-800/95 backdrop-blur-lg shadow-xl border-b border-yellow-500/30 transition-all duration-300 ease-out`}
        style={{ 
            height: `${headerHeight}px`,
            top: showHeader ? '0px' : `-${headerHeight}px`
        }} 
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Film className="w-6 h-6 text-yellow-500" />
            <h1 className="text-2xl font-bold text-white">
              Movie & Series Comparator
            </h1>
          </div>
          
          {/* SEARCH BAR (Compacta) */}
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch(searchQuery, searchType)}
                  placeholder="Search movie or series..." 
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-700/50 text-white border border-gray-500/30 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all"
                />
              </div>
              
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                className="px-4 py-3 rounded-xl bg-slate-700/50 text-white border border-gray-500/30 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
              >
                <option value="">📺 All</option>
                <option value="movie">🎬 Movies</option>
                <option value="series">📺 Series</option>
              </select>
              
              <button
                onClick={() => handleSearch(searchQuery, searchType)}
                disabled={loading}
                className="px-8 py-3 bg-yellow-500 text-black hover:bg-yellow-600 rounded-xl font-semibold transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-yellow-500/50"
              >
                {loading ? '⏳ Searching...' : '🔍 Search'}
              </button>
            </div>
          </div>
        </div>
      </header>
      {/* ======================================================= */}


      {/* CONTENIDO PRINCIPAL: Se mantiene el margen superior para compensar el fixed header */}
      <div 
        className="container mx-auto px-4 py-8" 
        style={{ paddingTop: `${headerHeight + 32}px` }}
      >
        
        {/* LOADING */}
        {loading && (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-yellow-500"></div>
            <p className="mt-4 text-gray-300 text-lg">Loading...</p>
          </div>
        )}

        {/* ERROR */}
        {error && !loading && (
          <div className="max-w-2xl mx-auto bg-red-900/30 border border-red-500 rounded-xl p-6 text-center backdrop-blur-sm">
            <p className="text-red-200 text-lg">❌ {error}</p>
          </div>
        )}

        {/* RESULTS */}
        {results.length > 0 && !loading && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-6 h-6 text-yellow-500" />
              <h2 className="text-3xl font-bold text-white">
                {searchQuery ? "Search Results" : "Recommended for You"} 
              </h2>
              <span className="px-3 py-1 bg-yellow-500/20 rounded-full text-yellow-300 text-sm">
                {totalResults} results
              </span>
            </div>
            
            {/* FEEDBACK VISUAL: MENSAJE DESPUÉS DE LA PRIMERA SELECCIÓN */}
            {isFirstItemSelected && (
              <div className="max-w-3xl mx-auto bg-yellow-900/30 border border-yellow-500 rounded-xl p-4 text-center mb-6 backdrop-blur-sm">
                <p className="text-yellow-200 text-lg font-semibold flex items-center justify-center gap-3">
                  <ArrowDown className="w-5 h-5 animate-bounce" />
                  You selected: <span className="text-white">{comparison[0].Title}</span>. Now choose the second item to compare!
                  <ArrowDown className="w-5 h-5 animate-bounce" />
                </p>
              </div>
            )}


            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {results.map((item) => (
                <div
                  key={item.imdbID}
                  onClick={() => selectItem(item.imdbID)}
                  className={`group cursor-pointer bg-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm border transition-all transform hover:scale-105 hover:shadow-2xl ${
                      comparison[0]?.imdbID === item.imdbID 
                      ? 'border-yellow-500 ring-4 ring-yellow-500/50' 
                      : 'border-gray-700 hover:border-yellow-500 hover:shadow-yellow-500/30'
                  }`}
                >
                  <div className="relative overflow-hidden">
                    <img
                      src={item.Poster !== 'N/A' ? item.Poster : 'https://via.placeholder.com/300x450/1e293b/facc15?text=No+Image'}
                      alt={item.Title}
                      className="w-full h-60 object-cover group-hover:scale-110 transition-transform duration-300" 
                    />
                    {/* Overlay si es el item seleccionado */}
                    {comparison[0]?.imdbID === item.imdbID && (
                        <div className="absolute inset-0 bg-yellow-500/30 flex items-center justify-center text-white font-bold text-xl backdrop-blur-sm">
                            SELECTED #1
                        </div>
                    )}
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
                          ? 'bg-yellow-500/20 text-yellow-300'
                          : 'bg-indigo-500/20 text-indigo-300'
                      }`}>
                        {item.Type === 'movie' ? '🎬 Movie' : '📺 Series'}
                      </span>
                  </div>
                </div>
              ))}
            </div>

            {/* PAGINATION */}
            {/* CORRECCIÓN DE ERROR DE SINTAXIS EN LA LÍNEA 344/345 */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8">
                <button
                  onClick={() => handleSearch(searchQuery || "best movies", searchType, currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-gray-700"
                >
                  ← Previous
                </button>
                <span className="px-6 py-3 bg-yellow-500/20 rounded-xl text-yellow-300 font-semibold border border-yellow-500/30">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => handleSearch(searchQuery || "best movies", searchType, currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-gray-700"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}

        {/* COMPARISON SECTION */}
        {(comparison[0] || comparison[1]) && (
          <div className="space-y-8" ref={comparisonRef}> 
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-yellow-500" />
                <h2 className="text-3xl font-bold text-white">Comparison</h2>
              </div>
              <button
                onClick={() => setComparison([null, null])}
                className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl transition-all border border-red-500/30 flex items-center gap-2"
              >
                <X className="w-5 h-5" />
                Clear
              </button>
            </div>

            {/* COMPARISON CARDS - Usar items-start para evitar desalineación vertical */}
            <div className="grid lg:grid-cols-2 gap-8 items-start"> 
              {/* CARD 1 */}
              <div className={`rounded-2xl p-6 backdrop-blur-sm border-2 transition-all ${
                comparison[0] 
                  ? 'bg-slate-700/50 border-yellow-500'
                  : 'bg-slate-800/30 border-slate-700'
              }`}>
                {comparison[0] ? (
                  <DetailCard item={comparison[0]} color="yellow" /> 
                ) : (
                  <div className="text-center py-20 text-gray-400">
                    <Film className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Select a Movie or Series</p>
                  </div>
                )}
              </div>

              {/* CARD 2 */}
              <div className={`rounded-2xl p-6 backdrop-blur-sm border-2 transition-all ${
                comparison[1] 
                  ? 'bg-slate-700/50 border-indigo-500'
                  : 'bg-slate-800/30 border-slate-700'
              }`}>
                {comparison[1] ? (
                  <DetailCard item={comparison[1]} color="indigo" /> 
                ) : (
                  <div className="text-center py-20 text-gray-400">
                    <Tv className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Select another one to compare</p>
                  </div>
                )}
              </div>
            </div>

            {/* CHARTS */}
            {comparison[0] && comparison[1] && (
              <div className="grid lg:grid-cols-2 gap-8">
                {/* BAR CHART */}
                <div className="bg-slate-800/50 rounded-2xl p-6 backdrop-blur-sm border border-gray-700">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-yellow-500" />
                    Rating Comparison
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={getChartData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" stroke="#9CA3AF" />
                      <YAxis domain={[0, 100]} stroke="#9CA3AF" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #eab308', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Legend />
                      <Bar dataKey={comparison[0].Title} fill="#eab308" radius={[8, 8, 0, 0]} />
                      <Bar dataKey={comparison[1].Title} fill="#4f46e5" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* RADAR CHART */}
                <div className="bg-slate-800/50 rounded-2xl p-6 backdrop-blur-sm border border-gray-700">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Star className="w-6 h-6 text-yellow-500" />
                    Radar View
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={getRadarData()}>
                      <PolarGrid stroke="#374151" />
                      <PolarAngleAxis dataKey="subject" stroke="#9CA3AF" />
                      <PolarRadiusAxis domain={[0, 100]} stroke="#9CA3AF" />
                      <Radar name={comparison[0].Title} dataKey="A" stroke="#eab308" fill="#eab308" fillOpacity={0.6} />
                      <Radar name={comparison[1].Title} dataKey="B" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.6} />
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
        <p>Powered by OMDb API • Built with React + Recharts + Vite</p>
      </footer>
    </div>
  );
}

// =======================================================
// SEPARACIÓN DEL COMPONENTE DETAILED CARD (para mejor organización)
// =======================================================
function DetailCard({ item, color }) {
  const accentColor = color === 'yellow' ? 'text-yellow-400' : 'text-indigo-400';
  const borderColor = color === 'yellow' ? 'border-yellow-500/20' : 'border-indigo-500/20';

  return (
    <div className="space-y-6">
      <div className="relative rounded-xl overflow-hidden shadow-2xl">
        {/* Contenedor con altura fija h-64 para la imagen (alineación) */}
        <div className="w-full h-64"> 
          <img
            src={item.Poster !== 'N/A' ? item.Poster : 'https://via.placeholder.com/400x600/1e293b/facc15?text=No+Image'}
            alt={item.Title}
            className="w-full h-full object-cover"  
          />
        </div>
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
            <p className="text-gray-400 mb-1">Genre</p>
            <p className="text-white font-semibold">{item.Genre}</p>
          </div>
        </div>

        <div>
          <p className="text-gray-400 mb-2 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Actors
          </p>
          <p className="text-white text-sm">{item.Actors}</p>
        </div>

        {/* Área de Plot con altura fija h-48 para igualar la altura de las tarjetas */}
        <div className={`bg-slate-900/50 rounded-xl p-4 border ${borderColor} h-48 overflow-y-auto`}> 
          <p className="text-gray-400 mb-2">📝 Plot</p>
          <p className="text-gray-300 text-sm leading-relaxed">{item.Plot}</p>
        </div>

        <div>
          <p className="text-gray-400 mb-3 flex items-center gap-2">
            <Star className={`w-5 h-5 ${accentColor}`} />
            Ratings
          </p>
          <div className="space-y-2">
            {item.Ratings.map((rating, idx) => (
              <div key={idx} className={`flex justify-between items-center bg-slate-900/50 rounded-lg p-3 border ${borderColor}`}>
                <span className="text-gray-300 text-sm">{rating.Source}</span>
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
