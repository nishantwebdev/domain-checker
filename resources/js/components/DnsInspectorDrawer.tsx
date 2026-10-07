import React from 'react';
import { X, Copy, Check, Server, Shield, Mail } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    data: any;
}

export default function DnsInspectorDrawer({ isOpen, onClose, data }: Props) {
    const [copied, setCopied] = React.useState<string | null>(null);

    if (!isOpen || !data) return null;

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    const CodeBlock = ({ label, content, id }: { label: string; content: any; id: string }) => {
        const textContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
        
        if (!content || (Array.isArray(content) && content.length === 0) || Object.keys(content).length === 0) {
            return (
                <div className="mb-6">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{label}</h4>
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg text-slate-400 text-sm italic">
                        No records found.
                    </div>
                </div>
            );
        }

        return (
            <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</h4>
                    <button 
                        onClick={() => copyToClipboard(textContent, id)}
                        className="text-xs flex items-center text-slate-400 hover:text-blue-500 transition-colors"
                    >
                        {copied === id ? <Check className="w-3 h-3 mr-1 text-green-500" /> : <Copy className="w-3 h-3 mr-1" />}
                        {copied === id ? 'Copied' : 'Copy'}
                    </button>
                </div>
                <pre className="p-4 bg-slate-900 text-slate-300 rounded-xl overflow-x-auto text-xs font-mono border border-slate-800">
                    {textContent}
                </pre>
            </div>
        );
    };

    return (
        <>
            {/* Backdrop */}
            <div 
                className={`fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            ></div>

            {/* Drawer */}
            <div className={`fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-slate-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col border-l border-slate-200 dark:border-slate-700`}>
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">DNS Inspector</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{data.domain}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white dark:bg-slate-800 rounded-full shadow-sm">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/50">
                            <Server className="w-5 h-5 text-blue-600 dark:text-blue-400 mb-2" />
                            <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Mail Provider(s)</div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-white capitalize truncate">
                                {(data.mail_providers || []).length > 0 
                                    ? data.mail_providers.map((p: any) => p.provider.replace('_', ' ')).join(', ')
                                    : 'Not detected'}
                            </div>
                        </div>
                        <div className={`p-4 rounded-xl border ${data.is_blacklisted ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/50' : 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800/50'}`}>
                            <Shield className={`w-5 h-5 mb-2 ${data.is_blacklisted ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`} />
                            <div className={`text-xs font-medium mb-1 ${data.is_blacklisted ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>Reputation</div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">
                                {data.is_blacklisted ? 'Blacklisted' : 'Clean'}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <CodeBlock label="MX Records" content={data.mx_records} id="mx" />
                        <CodeBlock label="SPF Record" content={data.spf_record} id="spf" />
                        <CodeBlock label="DMARC Record" content={data.dmarc_record} id="dmarc" />
                        <CodeBlock label="DKIM Selectors" content={data.dkim_record} id="dkim" />
                        
                        {data.listed_blacklists && data.listed_blacklists.length > 0 && (
                            <CodeBlock label="Blacklist Matches" content={data.listed_blacklists} id="rbl" />
                        )}
                        
                        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                            <CodeBlock label="Raw DNS Response (All Records)" content={data.dns_records_all} id="all" />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
