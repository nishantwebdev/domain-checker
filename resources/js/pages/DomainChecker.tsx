import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEcho } from '@laravel/echo-react';
import SingleDomainForm from '@/components/SingleDomainForm';
import BulkUploadModal from '@/components/BulkUploadModal';
import LiveResultsTable from '@/components/LiveResultsTable';
import DnsInspectorDrawer from '@/components/DnsInspectorDrawer';
import { Search, UploadCloud, ShieldCheck, Download } from 'lucide-react';

const queryClient = new QueryClient();

export default function DomainChecker() {
    return (
        <QueryClientProvider client={queryClient}>
            <DomainCheckerContent />
        </QueryClientProvider>
    );
}

function DomainCheckerContent() {
    const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
    const [isUploadModalOpen, setUploadModalOpen] = useState(false);
    const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
    const [selectedDomainCheck, setSelectedDomainCheck] = useState<any | null>(null);
    const [bulkInvalidDomains, setBulkInvalidDomains] = useState<string[]>([]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
            <Head title="Domain Intelligence Suite" />

            <header className="shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="bg-blue-600 p-2 rounded-lg text-white shadow-md">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                            Domain Health & Provider Intelligence
                        </h1>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Tabs */}
                <div className="flex space-x-1 mb-8 bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl max-w-sm">
                    <button
                        onClick={() => setActiveTab('single')}
                        className={`flex-1 flex items-center justify-center py-2 px-4 rounded-lg text-sm font-medium transition-all cursor-pointer ${activeTab === 'single'
                            ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                    >
                        <Search className="w-4 h-4 mr-2" />
                        Single Check
                    </button>
                    <button
                        onClick={() => setActiveTab('bulk')}
                        className={`flex-1 flex items-center justify-center py-2 px-4 rounded-lg text-sm font-medium transition-all cursor-pointer ${activeTab === 'bulk'
                            ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                    >
                        <UploadCloud className="w-4 h-4 mr-2" />
                        Bulk Scan
                    </button>
                </div>

                {activeTab === 'single' && (
                    <div className="max-w-3xl">
                        <SingleDomainForm onInspect={(check) => setSelectedDomainCheck(check)} />
                    </div>
                )}

                {activeTab === 'bulk' && (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Bulk Operations</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Scan up to 10,000 domains concurrently.</p>
                            </div>
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-3 border-r border-slate-300 dark:border-slate-600 pr-4">
                                    <a
                                        href="/storage/samples/sample_domains.csv"
                                        download
                                        className="flex items-center text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                                    >
                                        <Download className="w-3.5 h-3.5 mr-1" />
                                        Sample .CSV
                                    </a>
                                    <a
                                        href="/storage/samples/sample_domains.txt"
                                        download
                                        className="flex items-center text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                                    >
                                        <Download className="w-3.5 h-3.5 mr-1" />
                                        Sample .TXT
                                    </a>
                                </div>
                                <button
                                    onClick={() => setUploadModalOpen(true)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center"
                                >
                                    <UploadCloud className="w-4 h-4 mr-2" />
                                    New Bulk Scan
                                </button>
                            </div>
                        </div>

                        {currentBatchId ? (
                            <>
                                {bulkInvalidDomains.length > 0 && (
                                    <div className="mb-6 p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800">
                                        <h4 className="font-semibold mb-2">
                                            The following domains were invalid and skipped:
                                        </h4>
                                        <ul className="list-disc pl-5 max-h-32 overflow-y-auto mb-1">
                                            {bulkInvalidDomains.map((d, i) => (
                                                <li key={i} className="truncate">{d}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                <LiveResultsTable
                                    batchId={currentBatchId}
                                    onInspect={(check) => setSelectedDomainCheck(check)}
                                />
                            </>
                        ) : (
                            <div className="bg-white dark:bg-slate-800 rounded-xl p-12 border border-slate-200 dark:border-slate-700 border-dashed text-center">
                                <UploadCloud className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No Active Scans</h3>
                                <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">
                                    Upload a CSV or TXT file containing a list of domains or emails to get started.
                                </p>
                                <button
                                    onClick={() => setUploadModalOpen(true)}
                                    className="bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                                >
                                    Upload List
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </main>

            <BulkUploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setUploadModalOpen(false)}
                onUploadStart={(batchId, invalidDomains = []) => {
                    setCurrentBatchId(batchId);
                    setBulkInvalidDomains(invalidDomains);
                    setActiveTab('bulk');
                    setUploadModalOpen(false);
                }}
            />

            <DnsInspectorDrawer
                isOpen={!!selectedDomainCheck}
                onClose={() => setSelectedDomainCheck(null)}
                data={selectedDomainCheck}
            />
        </div>
    );
}
