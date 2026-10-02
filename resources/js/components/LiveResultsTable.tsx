import React, { useState, useEffect } from 'react';
import { 
    useReactTable, 
    getCoreRowModel, 
    flexRender, 
    getPaginationRowModel,
    ColumnDef
} from '@tanstack/react-table';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Download, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useEcho } from '@laravel/echo-react';

interface Props {
    batchId: string;
    onInspect: (data: any) => void;
}

export default function LiveResultsTable({ batchId, onInspect }: Props) {
    const queryClient = useQueryClient();
    const echo = (window as any).Echo;
    
    const [statusFilter, setStatusFilter] = useState('all');
    const [pageIndex, setPageIndex] = useState(0);

    // Fetch initial data
    const { data, isLoading } = useQuery({
        queryKey: ['batch', batchId, statusFilter, pageIndex],
        queryFn: async () => {
            const res = await axios.get(`/api/v1/checks/batch/${batchId}?status=${statusFilter}&page=${pageIndex + 1}`);
            return res.data;
        },
        keepPreviousData: true,
    });

    // Real-time updates via WebSockets
    useEffect(() => {
        if (!echo || !batchId) return;

        const channel = echo.channel(`batch.${batchId}`);
        
        channel.listen('.App\\Events\\DomainCheckedEvent', (e: any) => {
            // Optimistically update the cache for the current page
            queryClient.setQueryData(
                ['batch', batchId, statusFilter, pageIndex],
                (oldData: any) => {
                    if (!oldData || !oldData.checks || !oldData.checks.data) return oldData;
                    
                    const newData = { 
                        ...oldData, 
                        checks: { ...oldData.checks, data: [...oldData.checks.data] }
                    };
                    
                    const itemIndex = newData.checks.data.findIndex((i: any) => i.id === e.id);
                    
                    if (itemIndex > -1) {
                        newData.checks.data[itemIndex] = { ...newData.checks.data[itemIndex], ...e };
                    }
                    
                    // Update batch progress
                    if (newData.batch) {
                        newData.batch = { ...newData.batch };
                        newData.batch.processed_domains = Math.min(
                            newData.batch.processed_domains + 1, 
                            newData.batch.total_domains
                        );
                    }
                    
                    return newData;
                }
            );
        });

        return () => {
            channel.stopListening('.App\\Events\\DomainCheckedEvent');
            echo.leaveChannel(`batch.${batchId}`);
        };
    }, [echo, batchId, statusFilter, pageIndex, queryClient]);

    const columns = React.useMemo<ColumnDef<any>[]>(() => [
        {
            accessorKey: 'domain',
            header: 'Domain',
            cell: info => <span className="font-medium">{info.getValue() as string}</span>,
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: info => {
                const val = info.getValue() as string;
                if (val === 'completed') return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Completed</span>;
                if (val === 'failed') return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" /> Failed</span>;
                if (val === 'checking') return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 animate-pulse"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Checking</span>;
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">Queued</span>;
            },
        },
        {
            accessorKey: 'is_blacklisted',
            header: 'DNSBL',
            cell: info => {
                const isBlacklisted = info.getValue() as boolean;
                const row = info.row.original;
                const status = row.status;
                if (status !== 'completed') return <span className="text-slate-400">-</span>;
                return isBlacklisted ? 
                    <span className="text-red-600 font-medium flex items-center"><AlertCircle className="w-3 h-3 mr-1" /> Blacklisted (Score: {row.blacklist_score ?? 0} / {row.max_blacklist_score ?? 0})</span> : 
                    <span className="text-green-600 font-medium">Clean (Score: {row.blacklist_score ?? 0} / {row.max_blacklist_score ?? 0})</span>;
            }
        },
        {
            accessorKey: 'mail_provider',
            header: 'Provider',
            cell: info => {
                const row = info.row.original;
                if (row.status !== 'completed') return <span className="text-slate-400">-</span>;
                
                return (
                    <div className="flex flex-col">
                        <div className="flex items-center space-x-2">
                            <span className="capitalize font-semibold text-slate-800 dark:text-slate-200">
                                {row.mail_provider.replace('_', ' ')}
                            </span>
                            {row.provider_confidence && row.mail_provider !== 'not_detected' && (
                                <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold ${
                                    row.provider_confidence === 'high' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' :
                                    row.provider_confidence === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400' :
                                    'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                }`}>
                                    {row.provider_confidence}
                                </span>
                            )}
                        </div>
                        {row.detection_reasons && row.detection_reasons.length > 0 && (
                            <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm truncate block" title={row.detection_reasons[0]}>
                                {row.detection_reasons[0]}
                            </span>
                        )}
                    </div>
                );
            }
        }
    ], [onInspect]);

    const table = useReactTable({
        data: data?.checks?.data || [],
        columns,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        pageCount: data?.checks?.last_page || -1,
    });

    const batch = data?.batch;
    const progress = batch ? Math.round((batch.processed_domains / batch.total_domains) * 100) : 0;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
            
            {/* Header & Progress */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-end mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Scan Progress</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {batch ? `${batch.processed_domains} / ${batch.total_domains} domains checked` : 'Loading...'}
                        </p>
                    </div>
                    <a
                        href={`/api/v1/checks/batch/${batchId}/export`}
                        download
                        className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                    >
                        <Download className="w-4 h-4 mr-2" /> Export CSV
                    </a>
                </div>
                
                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                    <div 
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out" 
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </div>

            {/* Filters */}
            <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex space-x-2 overflow-x-auto">
                {['all', 'clean', 'blacklisted', 'google_workspace', 'microsoft_365', 'other', 'failed'].map((filter) => (
                    <button
                        key={filter}
                        onClick={() => {
                            setStatusFilter(filter);
                            setPageIndex(0);
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap capitalize transition-colors ${
                            statusFilter === filter 
                                ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900' 
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                    >
                        {filter.replace('_', ' ')}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="overflow-x-auto min-h-[400px]">
                <table className="w-full text-left border-collapse">
                    <thead>
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id} className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                                {headerGroup.headers.map(header => (
                                    <th key={header.id} className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {isLoading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                    <Loader2 className="w-6 h-6 mx-auto animate-spin mb-2" />
                                    Loading domains...
                                </td>
                            </tr>
                        ) : table.getRowModel().rows.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                                    No domains found for this filter.
                                </td>
                            </tr>
                        ) : (
                            table.getRowModel().rows.map(row => (
                                <tr 
                                    key={row.id} 
                                    className="hover:bg-slate-100/50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                                    onClick={() => row.original.status === 'completed' && onInspect(row.original)}
                                >
                                    {row.getVisibleCells().map(cell => (
                                        <td key={cell.id} className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {data?.checks && data.checks.last_page > 1 && (
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                        Page {data.checks.current_page} of {data.checks.last_page}
                    </span>
                    <div className="space-x-2">
                        <button
                            onClick={() => setPageIndex(old => Math.max(0, old - 1))}
                            disabled={pageIndex === 0}
                            className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded text-sm disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setPageIndex(old => old + 1)}
                            disabled={pageIndex >= data.checks.last_page - 1}
                            className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded text-sm disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
