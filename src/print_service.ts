// Universal Print & CSV Export Engine for BCarebd.Com

export function getCompanyBranding() {
    try {
        const stored = localStorage.getItem('bcare_branding');
        if (stored) return JSON.parse(stored);
    } catch { /* fallback */ }
    return {
        name: 'BCarebd.Com',
        subtitle: 'ভেটেরিনারি অ্যানিম্যাল মেডিসিন প্রস্তুতকারক প্রতিষ্ঠান',
        logo: '',
        bannerText: 'BCarebd.Com পোর্টালে স্বাগতম। জোনভিত্তিক সেলস ও কালেকশন নিয়মিত আপডেট করুন।'
    };
}

export function printContent(elementId: string, docTitle: string = 'ডকুমেন্ট') {
    const el = document.getElementById(elementId);
    if (!el) {
        console.error(`Print element #${elementId} not found`);
        window.print();
        return;
    }

    const branding = getCompanyBranding();
    const now = new Date();
    const dateStr = now.toLocaleDateString('bn-BD');
    const timeStr = now.toLocaleTimeString('bn-BD');

    // Create or update Universal Print Container for @media print
    let printContainer = document.getElementById('universalPrintContainer');
    if (!printContainer) {
        printContainer = document.createElement('div');
        printContainer.id = 'universalPrintContainer';
        document.body.appendChild(printContainer);
    }

    const formattedDocumentHtml = `
        <div class="print-document bg-white text-slate-900 p-6 max-w-4xl mx-auto" style="font-family: 'Hind Siliguri', sans-serif;">
            <div style="text-align: center; border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 16px;">
                <h1 style="font-size: 24px; font-weight: 800; color: #065f46; margin: 0;">${branding.name}</h1>
                <p style="font-size: 13px; color: #475569; margin: 4px 0;">${branding.subtitle}</p>
                <div style="display: inline-block; background: #065f46; color: white; padding: 4px 14px; border-radius: 9999px; font-size: 13px; font-weight: bold; margin-top: 6px;">
                    ${docTitle}
                </div>
                <div style="font-size: 11px; color: #64748b; margin-top: 6px;">
                    প্রিন্ট তারিখ: <b>${dateStr}</b>, সময়: <b>${timeStr}</b>
                </div>
            </div>
            <div class="print-body-content">
                ${el.innerHTML}
            </div>
        </div>
    `;

    printContainer.innerHTML = formattedDocumentHtml;

    // Show on-screen Print Preview Modal so users always see the formatted document
    let previewModal = document.getElementById('universalPrintModal');
    if (!previewModal) {
        previewModal = document.createElement('div');
        previewModal.id = 'universalPrintModal';
        previewModal.className = 'fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-2 sm:p-4';
        document.body.appendChild(previewModal);
    }

    previewModal.innerHTML = `
        <div class="bg-white rounded-2xl max-w-4xl w-full shadow-2xl flex flex-col max-h-[94vh] overflow-hidden border">
            <!-- Modal Header -->
            <div class="bg-emerald-900 text-white px-5 py-3.5 flex justify-between items-center flex-shrink-0">
                <div class="flex items-center gap-2">
                    <span class="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center text-white">
                        <i class="fa-solid fa-print"></i>
                    </span>
                    <div>
                        <h3 class="font-bold text-sm sm:text-base">${docTitle} - প্রিন্ট প্রিভিউ</h3>
                        <p class="text-[11px] text-emerald-200">নিচে প্রিভিউ দেখে প্রিন্ট করুন বা ব্রাউজারের প্রিন্ট ডায়ালগ ব্যবহার করুন</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <button type="button" onclick="window.triggerBrowserPrint()" class="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs shadow flex items-center gap-1.5 transition">
                        <i class="fa-solid fa-print text-sm"></i> প্রিন্ট করুন (Print Now)
                    </button>
                    <button type="button" onclick="document.getElementById('universalPrintModal').classList.add('hidden')" class="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg text-xs font-bold transition">
                        ✕ বন্ধ করুন
                    </button>
                </div>
            </div>

            <!-- Scrollable Content -->
            <div class="flex-grow overflow-y-auto p-4 sm:p-6 bg-slate-100" id="printModalScrollArea">
                <div class="bg-white shadow-lg rounded-xl border border-slate-200 overflow-hidden">
                    ${formattedDocumentHtml}
                </div>
            </div>
        </div>
    `;

    previewModal.classList.remove('hidden');

    // Automatically invoke window.print
    setTimeout(() => {
        try {
            window.print();
        } catch (err) {
            console.warn('Direct print blocked by sandbox, preview shown:', err);
        }
    }, 200);
}

export function triggerBrowserPrint() {
    window.print();
}

export function exportTableToCSV(containerOrTableId: string, filename: string = 'export_data') {
    const container = document.getElementById(containerOrTableId);
    if (!container) {
        alert('এক্সপোর্ট করার জন্য টেবিল পাওয়া যায়নি!');
        return;
    }

    const table = container.tagName.toLowerCase() === 'table' ? (container as HTMLTableElement) : container.querySelector('table');
    if (!table) {
        alert('এই সেকশনে এক্সপোর্টযোগ্য কোনো টেবিল ডাটা পাওয়া যায়নি!');
        return;
    }

    const rows: string[] = [];
    const tableRows = table.querySelectorAll('tr');

    tableRows.forEach(row => {
        const rowData: string[] = [];
        const cells = row.querySelectorAll('th, td');
        
        cells.forEach(cell => {
            const clone = cell.cloneNode(true) as HTMLElement;
            clone.querySelectorAll('button, .no-print').forEach(b => b.remove());
            
            let text = clone.innerText || clone.textContent || '';
            text = text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
            text = text.replace(/"/g, '""');
            rowData.push(`"${text}"`);
        });

        if (rowData.length > 0) {
            rows.push(rowData.join(','));
        }
    });

    if (rows.length === 0) {
        alert('টেবিলে কোনো ডাটা নেই!');
        return;
    }

    const csvContent = '\uFEFF' + rows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

if (typeof window !== 'undefined') {
    (window as any).printContent = printContent;
    (window as any).triggerBrowserPrint = triggerBrowserPrint;
    (window as any).exportTableToCSV = exportTableToCSV;
    (window as any).getCompanyBranding = getCompanyBranding;
}
