import { usePage } from '@inertiajs/react';
import { ShieldCheck } from 'lucide-react';

export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-blue-600 text-white shadow-sm">
                <ShieldCheck className="size-5" />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-tight font-bold text-slate-900 dark:text-white">
                    Domain Checker
                </span>
            </div>
        </>
    );
}
