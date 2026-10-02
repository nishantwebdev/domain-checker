import React, { useState, useCallback } from 'react';
import { X, UploadCloud, FileText, Loader2 } from 'lucide-react';
import axios from 'axios';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onUploadStart: (batchId: string, invalidDomains?: string[]) => void;
}

export default function BulkUploadModal({ isOpen, onClose, onUploadStart }: Props) {
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [invalidDomains, setInvalidDomains] = useState<string[]>([]);
    const [uploadedBatchId, setUploadedBatchId] = useState<string | null>(null);

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const onDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelection(e.dataTransfer.files[0]);
        }
    }, []);

    const handleFileSelection = (selectedFile: File) => {
        setError(null);
        setInvalidDomains([]);
        setUploadedBatchId(null);
        if (!selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.txt')) {
            setError('Only .csv and .txt files are supported.');
            return;
        }
        setFile(selectedFile);
    };

    const handleUpload = async () => {
        if (!file) return;
        
        setIsUploading(true);
        setError(null);
        
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const response = await axios.post('/api/v1/checks/bulk', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                }
            });
            
            onUploadStart(response.data.batch_id, response.data.invalid_domains || []);
            setFile(null);
        } catch (err: any) {
            setError(err.response?.data?.error || err.response?.data?.message || 'An error occurred during upload.');
            if (err.response?.data?.invalid_domains) {
                setInvalidDomains(err.response?.data?.invalid_domains);
            }
        } finally {
            setIsUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Upload Bulk Domains</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6">
                    {error && (
                        <div className="mb-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm border border-red-100 dark:border-red-800">
                            {error}
                        </div>
                    )}
                    
                    {invalidDomains.length > 0 && !uploadedBatchId && (
                        <div className={`mb-4 p-4 rounded-lg border text-sm bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800`}>
                            <h4 className="font-semibold mb-2">
                                Please remove the invalid domains and try again:
                            </h4>
                            <ul className="list-disc pl-5 max-h-32 overflow-y-auto mb-3">
                                {invalidDomains.map((d, i) => (
                                    <li key={i} className="truncate">{d}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {!file && !uploadedBatchId ? (
                        <div
                            onDragOver={onDragOver}
                            onDragLeave={onDragLeave}
                            onDrop={onDrop}
                            className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors cursor-pointer ${
                                isDragging 
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                                    : 'border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                            }`}
                            onClick={() => document.getElementById('file-upload')?.click()}
                        >
                            <input
                                id="file-upload"
                                type="file"
                                accept=".csv,.txt"
                                className="hidden"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                        handleFileSelection(e.target.files[0]);
                                    }
                                }}
                            />
                            <UploadCloud className={`w-10 h-10 mb-4 ${isDragging ? 'text-blue-500' : 'text-slate-400'}`} />
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Click or drag and drop to upload
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                .CSV or .TXT files only (max 10MB)
                            </p>
                        </div>
                    ) : (
                        <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-6">
                            <div className="flex items-center space-x-4 mb-6">
                                <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg text-blue-600 dark:text-blue-400">
                                    <FileText className="w-8 h-8" />
                                </div>
                                <div className="flex-1 truncate">
                                    <h4 className="text-sm font-medium text-slate-900 dark:text-white truncate">{file?.name}</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {file ? (file.size / 1024).toFixed(1) : 0} KB
                                    </p>
                                </div>
                                {!uploadedBatchId && (
                                    <button
                                        onClick={() => {
                                            setFile(null);
                                            setInvalidDomains([]);
                                        }}
                                        className="text-slate-400 hover:text-red-500 transition-colors p-2"
                                        disabled={isUploading}
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                            
                            {!uploadedBatchId && (
                                <div className="flex justify-end space-x-3">
                                    <button
                                        onClick={onClose}
                                        disabled={isUploading}
                                        className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleUpload}
                                        disabled={isUploading}
                                        className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center disabled:opacity-50"
                                    >
                                        {isUploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        {isUploading ? 'Uploading & Starting...' : 'Start Scan'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
