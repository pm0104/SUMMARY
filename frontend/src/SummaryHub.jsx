import { useState, useEffect, useContext } from 'react';
import { MyContext } from './MyContext.jsx';
import './SummaryHub.css';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';

function SummaryHub({ onBack }) {
    const { token } = useContext(MyContext);
    const [summaries, setSummaries] = useState([]);
    const [activeFilter, setActiveFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [expandedSummary, setExpandedSummary] = useState(null);
    const [stats, setStats] = useState({ total: 0, byType: {} });

    const filters = [
        { key: 'all', label: 'All', icon: '📊' },
        { key: 'url', label: 'Articles', icon: '🌐' },
        { key: 'file', label: 'Documents', icon: '📄' },
        { key: 'youtube', label: 'Videos', icon: '🎥' },
        { key: 'audio', label: 'Audio', icon: '🎵' }
    ];

    const fetchSummaries = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (activeFilter !== 'all') params.append('type', activeFilter);
            if (searchQuery) params.append('search', searchQuery);
            
            const response = await fetch(`/api/summaries?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setSummaries(data.summaries || []);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const fetchStats = async () => {
        try {
            const response = await fetch('/api/summaries-stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setStats(data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchFullSummary = async (id) => {
        if (expandedId === id) {
            setExpandedId(null);
            setExpandedSummary(null);
            return;
        }
        try {
            const response = await fetch(`/api/summaries/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setExpandedId(id);
            setExpandedSummary(data.summary);
        } catch (err) {
            console.error(err);
        }
    };

    const deleteSummary = async (id, e) => {
        e.stopPropagation();
        if (!confirm('Delete this summary?')) return;
        try {
            await fetch(`/api/summaries/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setSummaries(prev => prev.filter(s => s._id !== id));
            fetchStats();
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => { fetchSummaries(); }, [activeFilter, searchQuery]);
    useEffect(() => { fetchStats(); }, []);

    const getTypeIcon = (type) => {
        switch(type) {
            case 'url': return '🌐';
            case 'youtube': return '🎥';
            case 'file': return '📄';
            case 'audio': return '🎵';
            default: return '💬';
        }
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div className="summaryHub">
            <div className="hubHeader">
                <div className="hubHeaderLeft">
                    <button className="hubBackBtn" onClick={onBack}>
                        <i className="fa-solid fa-arrow-left"></i>
                    </button>
                    <h1>📊 My Summaries</h1>
                </div>
                <div className="hubSearch">
                    <i className="fa-solid fa-magnifying-glass"></i>
                    <input 
                        placeholder="Search summaries..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="hubStats">
                {filters.map(f => (
                    <div 
                        key={f.key}
                        className={`hubStatCard ${activeFilter === f.key ? 'active' : ''}`}
                        onClick={() => setActiveFilter(f.key)}
                    >
                        <span className="hubStatIcon">{f.icon}</span>
                        <span className="hubStatCount">
                            {f.key === 'all' ? stats.total : (stats.byType?.[f.key] || 0)}
                        </span>
                        <span className="hubStatLabel">{f.label}</span>
                    </div>
                ))}
            </div>

            <div className="hubGrid">
                {loading ? (
                    <div className="hubEmpty">Loading...</div>
                ) : summaries.length === 0 ? (
                    <div className="hubEmpty">
                        <span className="hubEmptyIcon">📭</span>
                        <p>No summaries yet</p>
                        <p className="hubEmptySub">Paste a URL, upload a file, or share a YouTube link to get started</p>
                    </div>
                ) : (
                    summaries.map(s => (
                        <div key={s._id} className={`hubCard ${expandedId === s._id ? 'expanded' : ''}`} onClick={() => fetchFullSummary(s._id)}>
                            <div className="hubCardHeader">
                                <span className="hubCardType">{getTypeIcon(s.type)}</span>
                                <span className="hubCardDate">{formatDate(s.createdAt)}</span>
                                <button className="hubCardDelete" onClick={(e) => deleteSummary(s._id, e)}>
                                    <i className="fa-solid fa-trash"></i>
                                </button>
                            </div>
                            <h3 className="hubCardTitle">{s.title}</h3>
                            {s.source && s.source !== s.title && (
                                <p className="hubCardSource">{s.type === 'url' ? s.metadata?.domain : s.source}</p>
                            )}
                            <div className="hubCardMeta">
                                {s.metadata?.wordCount > 0 && <span>{s.metadata.wordCount.toLocaleString()} words</span>}
                                {s.metadata?.pageCount > 0 && <span>{s.metadata.pageCount} pages</span>}
                                {s.metadata?.duration && <span>{s.metadata.duration}</span>}
                                {s.metadata?.channel && <span>{s.metadata.channel}</span>}
                            </div>
                            {expandedId === s._id && expandedSummary && (
                                <div className="hubCardContent">
                                    <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{expandedSummary}</ReactMarkdown>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default SummaryHub;
