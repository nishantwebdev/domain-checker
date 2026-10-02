import React, { useState } from 'react';
import { Search, Loader2, Info, ShieldCheck } from 'lucide-react';
import axios from 'axios';

export default function SingleDomainForm({ onInspect }: { onInspect: (data: any) => void }) {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await axios.post('/api/v1/checks/single', { domain: input });

            // If the backend returns 'queued', we could ideally poll or listen via websockets,
            // but for a single check, the dispatchSync ensures it's completed synchronously in the controller.
            setResult(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || err.response?.data?.message || 'An error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <form onSubmit={handleSubmit} className="relative flex items-center">
                    <Search className="absolute left-4 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Enter domain or email address..."
                        autoComplete="off"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl py-3 pl-12 pr-32 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className="absolute right-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors flex items-center cursor-pointer"
                    >
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        {loading ? 'Analyzing...' : 'Analyze'}
                    </button>
                </form>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 flex items-center">
                    <Info className="w-3 h-3 mr-1" /> Extracts domain automatically from email addresses or URLs.
                </p>
            </div>

            {loading && (
                <div className="animate-pulse bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm h-64 flex items-center justify-center">
                    <div className="flex flex-col items-center text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                        <p className="font-medium text-sm">Performing deep DNS and blacklist analysis...</p>
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl p-4 text-sm font-medium">
                    {error}
                </div>
            )}

            {result && !loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Overview Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">Health Overview</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-700">
                                <span className="text-slate-600 dark:text-slate-300">Target Domain</span>
                                <span className="font-semibold text-slate-900 dark:text-white">{result.domain}</span>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-700">
                                <span className="text-slate-600 dark:text-slate-300">Status</span>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${result.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                                    {result.status}
                                </span>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-700">
                                <span className="text-slate-600 dark:text-slate-300">DNSBL Status</span>
                                <div className="text-right">
                                    {result.is_blacklisted ? (
                                        <span className="text-red-600 dark:text-red-400 font-medium flex items-center justify-end">
                                            Blacklisted ({result.listed_blacklists?.length} lists)
                                        </span>
                                    ) : (
                                        <span className="text-green-600 dark:text-green-400 font-medium block">Clean</span>
                                    )}
                                    <span className="text-xs text-slate-500 dark:text-slate-400">Score: {result.blacklist_score ?? 0} / {result.max_blacklist_score ?? 0}</span>
                                </div>
                            </div>
                            <div className="pt-2">
                                <button
                                    onClick={() => onInspect(result)}
                                    className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 py-2 rounded-lg text-sm font-medium transition-colors"
                                >
                                    View Full DNS Records
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Provider Intelligence Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                            <ShieldCheck className="w-32 h-32" />
                        </div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">Provider Intelligence</h3>

                        <div className="mb-6">
                            <div className="text-3xl font-bold text-slate-900 dark:text-white capitalize mb-1">
                                {result.mail_provider.replace('_', ' ')}
                            </div>
                            {result.mail_provider !== 'not_detected' && (
                                <div className="flex items-center text-sm">
                                    <span className="text-slate-500 dark:text-slate-400 mr-2">Confidence:</span>
                                    <span className={`font-medium capitalize ${result.provider_confidence === 'high' ? 'text-green-600 dark:text-green-400' :
                                            result.provider_confidence === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
                                                'text-slate-600 dark:text-slate-300'
                                        }`}>
                                        {result.provider_confidence || 'N/A'}
                                    </span>
                                </div>
                            )}
                        </div>

                        {result.detection_reasons && result.detection_reasons.length > 0 && (
                            <div>
                                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Detection Reasons</h4>
                                <ul className="space-y-2">
                                    {result.detection_reasons.map((reason: string, idx: number) => (
                                        <li key={idx} className="text-sm text-slate-700 dark:text-slate-300 flex items-start">
                                            <span className="text-blue-500 mr-2">•</span>
                                            {reason}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
