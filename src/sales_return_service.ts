import {
    getDealers,
    getProducts, saveProducts,
    getOrders, saveOrders,
    getChallans,
    getSalesReturns, saveSalesReturns,
    getCurrentRole, getCurrentUser, getCurrentZone,
    getNotifications, saveNotifications,
    SalesReturn, SalesReturnItem
} from './bcare.ts';
import { readFileAsBase64 } from './master_modify_service.ts';

export interface ReturnDraftItem extends SalesReturnItem {
    maxDelivered: number;
    refInfo: string;
    delDate: string;
    selected: boolean;
}

let currentReturnDraftItems: ReturnDraftItem[] = [];

// Initialize or populate dealer dropdown and controls in Sales Return panel
export function initSalesReturnTab() {
    const sel = document.getElementById('srDealerSelect') as HTMLSelectElement | null;
    const input = document.getElementById('srDealerCodeInput') as HTMLInputElement | null;
    const dateInput = document.getElementById('srDateInput') as HTMLInputElement | null;
    const role = getCurrentRole();
    const userZone = getCurrentZone();

    let dealers = getDealers();
    if (role === 'employee') {
        dealers = dealers.filter(d => d.zone === userZone);
    }

    if (sel) {
        const currentVal = sel.value;
        sel.innerHTML = '<option value="">-- ডিলার নির্বাচন করুন --</option>';
        dealers.forEach(d => {
            sel.innerHTML += `<option value="${d.code}">[কোড: ${d.code}] ${d.name} (${d.zone})</option>`;
        });
        if (currentVal && dealers.some(d => d.code === currentVal)) {
            sel.value = currentVal;
        } else if (dealers.length > 0 && !input?.value) {
            // Pre-select first dealer if none selected
            sel.value = dealers[0].code;
            if (input) input.value = dealers[0].code;
        }
    }

    if (input && sel && sel.value && !input.value) {
        input.value = sel.value;
    }

    const currentDealerCode = input?.value || sel?.value;
    if (currentDealerCode) {
        populateDealerDeliveryDates(currentDealerCode);
        updateSelectedDealerCard();
        searchDeliveredChallanForReturn(false);
    }
}

export function syncSalesReturnDealerInput(val: string) {
    const q = (val || '').trim().toLowerCase();
    const sel = document.getElementById('srDealerSelect') as HTMLSelectElement | null;
    const role = getCurrentRole();
    const userZone = getCurrentZone();

    let dealers = getDealers();
    if (role === 'employee') {
        dealers = dealers.filter(d => d.zone === userZone);
    }

    if (!q) {
        if (sel) sel.value = '';
        updateSelectedDealerCard();
        populateDealerDeliveryDates('');
        renderDeliveredReportEmptyState('ডিলার কোড লিখুন বা তালিকা থেকে ডিলার নির্বাচন করুন।');
        return;
    }

    const matched = dealers.find(d => 
        d.code.toLowerCase() === q || 
        d.code.toLowerCase().startsWith(q) || 
        d.name.toLowerCase().includes(q)
    );

    if (matched) {
        if (sel) sel.value = matched.code;
        updateSelectedDealerCard();
        populateDealerDeliveryDates(matched.code);
        searchDeliveredChallanForReturn(false);
    } else {
        if (sel) sel.value = '';
        updateSelectedDealerCard();
        populateDealerDeliveryDates('');
    }
}

export function syncSalesReturnDealerSelect(val: string) {
    const input = document.getElementById('srDealerCodeInput') as HTMLInputElement | null;
    if (input) {
        input.value = val;
    }
    updateSelectedDealerCard();
    populateDealerDeliveryDates(val);
    searchDeliveredChallanForReturn(false);
}

export function populateDealerDeliveryDates(dealerCode: string) {
    const dateDropdown = document.getElementById('srDeliveryDateDropdown') as HTMLSelectElement | null;
    if (!dateDropdown) return;

    if (!dealerCode) {
        dateDropdown.innerHTML = '<option value="">-- সকল তারিখের ডেলিভারি --</option>';
        return;
    }

    const challans = getChallans().filter(c => c.dealerCode.toLowerCase() === dealerCode.toLowerCase());
    const orders = getOrders().filter(o => o.dealerCode.toLowerCase() === dealerCode.toLowerCase() && (o.deliveryStatus === 'Delivered' || o.items.some(i => (i.deliveredQty || 0) > 0)));

    const dateMap: { [date: string]: { challanIds: string[]; totalQty: number } } = {};

    challans.forEach(c => {
        const d = c.date || c.timestamp?.split(' ')[0] || '';
        if (d) {
            if (!dateMap[d]) dateMap[d] = { challanIds: [], totalQty: 0 };
            dateMap[d].challanIds.push(c.id);
            dateMap[d].totalQty += (c.totalQty || c.items.reduce((s, i) => s + (i.qty || 0), 0));
        }
    });

    orders.forEach(o => {
        const d = o.date;
        if (d && !dateMap[d]) {
            const delQty = o.items.reduce((s, i) => s + (i.deliveredQty || 0), 0);
            if (delQty > 0) {
                dateMap[d] = { challanIds: [o.id], totalQty: delQty };
            }
        }
    });

    const dates = Object.keys(dateMap).sort().reverse();

    dateDropdown.innerHTML = `<option value="">-- সকল তারিখের ডেলিভারি (${dates.length} টি ডেলিভারি তারিখ) --</option>`;
    dates.forEach(d => {
        const info = dateMap[d];
        dateDropdown.innerHTML += `<option value="${d}">📅 ${d} (চালান: ${info.challanIds.join(', ')} - ${info.totalQty} পিস)</option>`;
    });
}

export function selectDeliveryDateForReturn(dateVal: string) {
    const dateInput = document.getElementById('srDateInput') as HTMLInputElement | null;
    if (dateInput) {
        dateInput.value = dateVal;
    }
    searchDeliveredChallanForReturn(false);
}

export function updateSelectedDealerCard() {
    const sel = document.getElementById('srDealerSelect') as HTMLSelectElement | null;
    const input = document.getElementById('srDealerCodeInput') as HTMLInputElement | null;
    const card = document.getElementById('srSelectedDealerCard');
    if (!card) return;

    const dealerCode = (input?.value?.trim() || sel?.value || '').toLowerCase();
    if (!dealerCode) {
        card.classList.add('hidden');
        return;
    }

    const dealers = getDealers();
    const dealer = dealers.find(d => d.code.toLowerCase() === dealerCode || d.name.toLowerCase().includes(dealerCode));
    if (dealer) {
        const challans = getChallans().filter(c => c.dealerCode.toLowerCase() === dealer.code.toLowerCase());
        const totalDeliveredPieces = challans.reduce((s, c) => s + (c.totalQty || c.items.reduce((sum, i) => sum + (i.qty || 0), 0)), 0);

        card.innerHTML = `
            <div class="bg-gradient-to-r from-blue-50 via-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-xl p-3 flex flex-wrap justify-between items-center gap-3 text-xs shadow-sm">
                <div class="flex items-center gap-2.5 flex-wrap">
                    <span class="bg-emerald-800 text-white font-mono font-bold px-2.5 py-1 rounded text-xs shadow-xs">ডিলার কোড: ${dealer.code}</span>
                    <span class="font-black text-slate-800 text-sm sm:text-base">${dealer.name}</span>
                    <span class="text-blue-800 font-bold bg-blue-100 border border-blue-200 px-2 py-0.5 rounded text-[11px]">${dealer.zone} জেলা</span>
                    <span class="bg-teal-100 text-teal-800 font-semibold px-2 py-0.5 rounded text-[11px]">মোট চালানের সংখ্যা: ${challans.length} টি (${totalDeliveredPieces} পিস)</span>
                </div>
                <div class="text-slate-600 text-[11px] flex items-center gap-2 flex-wrap">
                    <span><i class="fa-solid fa-phone text-emerald-600 mr-1"></i>${dealer.mobile}</span>
                    <span class="text-slate-300">|</span>
                    <span><i class="fa-solid fa-location-dot text-red-500 mr-1"></i>${dealer.address}</span>
                </div>
            </div>
        `;
        card.classList.remove('hidden');
    } else {
        card.classList.add('hidden');
    }
}

export function showAllDeliveredForReturn() {
    const dateInput = document.getElementById('srDateInput') as HTMLInputElement | null;
    const dateDropdown = document.getElementById('srDeliveryDateDropdown') as HTMLSelectElement | null;
    if (dateInput) dateInput.value = '';
    if (dateDropdown) dateDropdown.value = '';
    searchDeliveredChallanForReturn(true);
}

export function renderDeliveredReportEmptyState(msg: string) {
    const tbody = document.getElementById('srItemsTableBody');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate-400 font-medium">${msg}</td></tr>`;
    }
    updateDraftSummaryDisplay();
}

export function searchDeliveredChallanForReturn(showAlertIfNoDealer = true) {
    const sel = document.getElementById('srDealerSelect') as HTMLSelectElement | null;
    const input = document.getElementById('srDealerCodeInput') as HTMLInputElement | null;
    const dateInput = document.getElementById('srDateInput') as HTMLInputElement | null;
    const dateDropdown = document.getElementById('srDeliveryDateDropdown') as HTMLSelectElement | null;
    const tbody = document.getElementById('srItemsTableBody');
    if (!tbody) return;

    const rawDealer = (input?.value?.trim() || sel?.value || '').toLowerCase();
    if (!rawDealer) {
        if (showAlertIfNoDealer) {
            alert('অনুগ্রহ করে ডিলার কোড টাইপ করুন (যেমন: 2201) বা ড্রপডাউন থেকে ডিলার নির্বাচন করুন!');
        }
        renderDeliveredReportEmptyState('ডিলার কোড টাইপ করে অথবা তালিকা থেকে নির্বাচন করে চালান অনুসন্ধান করুন।');
        return;
    }

    const dealers = getDealers();
    const dealer = dealers.find(d => d.code.toLowerCase() === rawDealer || d.name.toLowerCase().includes(rawDealer));

    if (!dealer) {
        if (showAlertIfNoDealer) {
            alert(`ডিলার [${rawDealer}] খুঁজে পাওয়া যায়নি! সঠিক ডিলার কোড দিন (যেমন: 2201)`);
        }
        renderDeliveredReportEmptyState(`⚠️ ডিলার কোড [${rawDealer}] এর কোনো তথ্য পাওয়া যায়নি।`);
        return;
    }

    // Sync input and select
    if (sel && sel.value !== dealer.code) sel.value = dealer.code;
    if (input && input.value !== dealer.code) input.value = dealer.code;
    updateSelectedDealerCard();

    // Check date
    let filterDate = dateInput?.value?.trim() || dateDropdown?.value?.trim() || '';

    // Synchronize both date controls
    if (dateInput && filterDate) dateInput.value = filterDate;
    if (dateDropdown && filterDate) dateDropdown.value = filterDate;

    // 1. Gather all deliveries from Challans for this dealer
    const allChallans = getChallans().filter(c => c.dealerCode.toLowerCase() === dealer.code.toLowerCase());
    
    // 2. Gather delivered items from Orders
    const allOrders = getOrders().filter(o => o.dealerCode.toLowerCase() === dealer.code.toLowerCase());

    const rawDeliveredItems: ReturnDraftItem[] = [];

    allChallans.forEach(c => {
        const cDate = c.date || (c.timestamp ? c.timestamp.split(' ')[0] : '');
        c.items.forEach(it => {
            rawDeliveredItems.push({
                code: it.code,
                name: it.name,
                unit: it.unit || 'পিস',
                qty: it.qty, // default return qty
                maxDelivered: it.qty,
                rate: it.rate || 0,
                condition: 'Good',
                refInfo: `চালান: ${c.id}`,
                delDate: cDate || 'তারিখ নেই',
                selected: true
            });
        });
    });

    allOrders.forEach(o => {
        if (o.deliveryStatus === 'Delivered' || o.items.some(i => (i.deliveredQty || 0) > 0)) {
            o.items.forEach(it => {
                const deliveredCount = o.deliveryStatus === 'Delivered' ? it.qty : (it.deliveredQty || 0);
                if (deliveredCount > 0) {
                    // Check if already covered by challan
                    const alreadyChallan = rawDeliveredItems.some(x => x.code === it.code && x.delDate === o.date);
                    if (!alreadyChallan) {
                        rawDeliveredItems.push({
                            code: it.code,
                            name: it.name,
                            unit: it.unit || 'পিস',
                            qty: deliveredCount,
                            maxDelivered: deliveredCount,
                            rate: it.rate || 0,
                            condition: 'Good',
                            refInfo: `অর্ডার: ${o.id}`,
                            delDate: o.date,
                            selected: true
                        });
                    }
                }
            });
        }
    });

    if (rawDeliveredItems.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="p-8 text-center bg-amber-50 text-amber-900 border border-amber-200 rounded-lg">
                    <div class="text-base font-bold mb-1">⚠️ কোনো ডেলিভারিকৃত চালান বা পণ্য পাওয়া যায়নি!</div>
                    <p class="text-xs text-amber-700">ডিলার [${dealer.name}] এর নামে এখনও কোনো চালান ইস্যু বা ডেলিভারি সম্পন্ন হয়নি। ফ্যাক্টরি থেকে চালান ইস্যু হলে এখানে দেখা যাবে।</p>
                </td>
            </tr>
        `;
        currentReturnDraftItems = [];
        updateDraftSummaryDisplay();
        return;
    }

    let filteredItems = rawDeliveredItems;
    if (filterDate) {
        filteredItems = rawDeliveredItems.filter(item => item.delDate === filterDate);
    }

    if (filteredItems.length === 0 && filterDate) {
        // No delivery on the exact chosen date, but dealer has deliveries on other dates
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="p-6 text-center bg-amber-50 text-amber-900 border border-amber-200">
                    <div class="text-sm font-bold text-amber-900 mb-1">
                        ⚠️ নির্ধারিত তারিখে (${filterDate}) ডিলার [${dealer.name}] এর কোনো ডেলিভারি চালান পাওয়া যায়নি।
                    </div>
                    <p class="text-xs text-slate-600 mb-3">এই ডিলারের অন্যান্য তারিখে মোট <b>${rawDeliveredItems.length}</b> টি আইটেম ডেলিভারি করা হয়েছে।</p>
                    <button type="button" onclick="window.showAllDeliveredForReturn()" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg text-xs shadow flex items-center gap-1.5 mx-auto transition cursor-pointer">
                        <i class="fa-solid fa-boxes-packing"></i> ডিলারের সকল ডেলিভারিকৃত চালান ও পণ্য দেখুন (${rawDeliveredItems.length} টি)
                    </button>
                </td>
            </tr>
        `;
        currentReturnDraftItems = [];
        updateDraftSummaryDisplay();
        return;
    }

    currentReturnDraftItems = filteredItems;
    renderReturnDraftTable(dealer.name, filterDate);
}

export function renderReturnDraftTable(dealerName?: string, filterDate?: string) {
    const tbody = document.getElementById('srItemsTableBody');
    const reportTitleEl = document.getElementById('srReportTitleInfo');
    if (!tbody) return;

    if (reportTitleEl) {
        if (currentReturnDraftItems.length > 0) {
            const dateText = filterDate ? `তারিখ: <b class="text-indigo-800 font-mono">${filterDate}</b>` : '<b class="text-emerald-800">সকল তারিখের ডেলিভারি চালান</b>';
            reportTitleEl.innerHTML = `
                <div class="bg-indigo-50/70 border border-indigo-200 rounded-lg px-3 py-1.5 flex flex-wrap justify-between items-center text-xs">
                    <div>
                        <span class="text-slate-600">ডেলিভারি রিপোর্ট:</span> ডিলার [<b>${dealerName || ''}</b>] | ${dateText}
                    </div>
                    <div class="flex items-center gap-2">
                        <button type="button" onclick="window.toggleSelectAllReturnItems(true)" class="text-blue-700 hover:text-blue-900 font-bold hover:underline text-[11px]">সবগুলো নির্বাচন করুন</button>
                        <span class="text-slate-300">|</span>
                        <button type="button" onclick="window.toggleSelectAllReturnItems(false)" class="text-slate-500 hover:text-slate-800 font-semibold hover:underline text-[11px]">সব আনচেক করুন</button>
                    </div>
                </div>
            `;
            reportTitleEl.classList.remove('hidden');
        } else {
            reportTitleEl.classList.add('hidden');
        }
    }

    if (currentReturnDraftItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="p-6 text-center text-slate-400">রিটার্ন করার জন্য কোনো আইটেম পাওয়া যায়নি।</td></tr>';
        updateDraftSummaryDisplay();
        return;
    }

    tbody.innerHTML = '';
    currentReturnDraftItems.forEach((it, idx) => {
        const isSelected = it.selected !== false;
        const rowBg = isSelected ? 'bg-white hover:bg-slate-50' : 'bg-slate-100/60 opacity-60';

        tbody.innerHTML += `
            <tr class="${rowBg} border-b transition">
                <td class="p-2.5 text-center">
                    <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="window.toggleReturnItemSelection(${idx}, this.checked)" class="w-4 h-4 text-emerald-600 rounded cursor-pointer" title="এই আইটেমটি রিটার্নে অন্তর্ভুক্ত করতে টিক দিন">
                </td>
                <td class="p-2.5 font-bold text-slate-800">
                    <span class="font-mono text-emerald-800">[${it.code}]</span> ${it.name}
                    <div class="text-[11px] text-slate-500 font-normal">রেট: ৳${it.rate.toLocaleString()} / ${it.unit}</div>
                </td>
                <td class="p-2.5 text-xs text-indigo-900 font-semibold">
                    <span class="bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded font-mono font-bold">${it.refInfo}</span>
                    <div class="text-[10px] text-slate-500 font-normal mt-1"><i class="fa-solid fa-calendar-day mr-1"></i>${it.delDate}</div>
                </td>
                <td class="p-2.5 text-center font-black text-blue-700 bg-blue-50/50 text-xs">
                    ${it.maxDelivered} ${it.unit}
                </td>
                <td class="p-2.5 text-center">
                    <div class="inline-flex items-center gap-1">
                        <input type="number" min="1" max="${it.maxDelivered}" value="${it.qty}" 
                            ${!isSelected ? 'disabled' : ''}
                            oninput="window.updateReturnDraftQty(${idx}, this.value)" 
                            class="w-20 px-2 py-1.5 border-2 border-emerald-500 rounded-lg text-center font-black text-emerald-900 bg-white focus:ring-2 focus:ring-emerald-500 shadow-xs">
                        <span class="text-[11px] font-semibold text-slate-500">${it.unit}</span>
                    </div>
                </td>
                <td class="p-2.5 text-center">
                    <select ${!isSelected ? 'disabled' : ''} onchange="window.updateReturnCondition(${idx}, this.value)" class="px-2 py-1.5 border rounded-lg text-xs bg-white font-bold text-slate-700 shadow-xs">
                        <option value="Good" ${it.condition === 'Good' ? 'selected' : ''}>ভালো মাল (ডিলার গ্রহণ করেনি - Good Stock)</option>
                        <option value="Damaged" ${it.condition === 'Damaged' ? 'selected' : ''}>ড্যামেজ মাল (নষ্ট/ভাঙা/মেয়াদোত্তীর্ণ - Bad Stock)</option>
                    </select>
                </td>
                <td class="p-2.5 text-right whitespace-nowrap">
                    <button type="button" onclick="window.removeReturnDraftItem(${idx})" class="text-red-600 hover:text-red-800 text-xs font-bold px-2 py-1 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition" title="তালিকা থেকে বাদ দিন">
                        <i class="fa-solid fa-trash mr-1"></i> বাদ
                    </button>
                </td>
            </tr>
        `;
    });

    updateDraftSummaryDisplay();
}

export function toggleReturnItemSelection(idx: number, checked: boolean) {
    if (currentReturnDraftItems[idx]) {
        currentReturnDraftItems[idx].selected = checked;
        renderReturnDraftTable();
    }
}

export function toggleSelectAllReturnItems(selectAll: boolean) {
    currentReturnDraftItems.forEach(it => {
        it.selected = selectAll;
    });
    renderReturnDraftTable();
}

export function updateReturnDraftQty(idx: number, val: string) {
    const qty = parseInt(val) || 0;
    const item = currentReturnDraftItems[idx];
    if (!item) return;

    if (qty > item.maxDelivered) {
        alert(`সর্বোচ্চ ডেলিভারিকৃত সংখ্যা ${item.maxDelivered} ${item.unit}! এর বেশি রিটার্ন করা যাবে না।`);
        item.qty = item.maxDelivered;
    } else {
        item.qty = Math.max(1, qty);
    }
    updateDraftSummaryDisplay();
}

export function updateReturnCondition(idx: number, cond: string) {
    if (currentReturnDraftItems[idx]) {
        currentReturnDraftItems[idx].condition = cond as any;
    }
}

export function removeReturnDraftItem(idx: number) {
    currentReturnDraftItems.splice(idx, 1);
    renderReturnDraftTable();
}

export function updateDraftSummaryDisplay() {
    const summaryEl = document.getElementById('srDraftSummaryBox');
    if (!summaryEl) return;

    const selectedItems = currentReturnDraftItems.filter(i => i.selected !== false);
    if (selectedItems.length === 0) {
        summaryEl.innerHTML = '<span class="text-slate-400 italic">কোনো পণ্য রিটার্ন তালিকায় নির্বাচিত করা হয়নি।</span>';
        return;
    }

    const totalQty = selectedItems.reduce((s, i) => s + (i.qty || 0), 0);
    const totalVal = selectedItems.reduce((s, i) => s + ((i.qty || 0) * (i.rate || 0)), 0);

    summaryEl.innerHTML = `
        <div class="flex flex-wrap items-center gap-4 text-xs">
            <span class="bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold px-3 py-1 rounded-lg">
                <i class="fa-solid fa-boxes-stacked mr-1 text-emerald-700"></i> নির্বাচিত মোট পণ্য: <b>${selectedItems.length}</b> টি আইটেম (<b>${totalQty}</b> পিস)
            </span>
            <span class="bg-blue-100 text-blue-900 border border-blue-300 font-bold px-3 py-1 rounded-lg">
                <i class="fa-solid fa-bangladeshi-taka-sign mr-1 text-blue-700"></i> আনুমানিক মোট ফেরত মূল্য: <b>৳${totalVal.toLocaleString()}</b>
            </span>
        </div>
    `;
}

export async function submitSalesReturnEntry(e: Event) {
    if (e && e.preventDefault) e.preventDefault();

    const sel = document.getElementById('srDealerSelect') as HTMLSelectElement | null;
    const input = document.getElementById('srDealerCodeInput') as HTMLInputElement | null;
    const rawDealer = input?.value?.trim() || sel?.value;

    if (!rawDealer) {
        alert('অনুগ্রহ করে একজন ডিলার নির্বাচন করুন!');
        return;
    }

    const dealer = getDealers().find(d => d.code.toLowerCase() === rawDealer.toLowerCase() || d.name.toLowerCase().includes(rawDealer.toLowerCase()));
    if (!dealer) {
        alert('ডিলার খুঁজে পাওয়া যায়নি! সঠিক ডিলার কোড লিখুন।');
        return;
    }

    const selectedItems = currentReturnDraftItems.filter(i => i.selected !== false && i.qty > 0);

    if (selectedItems.length === 0) {
        alert('রিটার্ন তালিকায় কমপক্ষে একটি পণ্য সিলেক্ট থাকতে হবে এবং পরিমাণ ১ এর বেশি হতে হবে!');
        return;
    }

    const reason = ((document.getElementById('srReason') as HTMLSelectElement)?.value || 'ড্যামেজ') as any;
    const note = ((document.getElementById('srNotes') as HTMLInputElement)?.value || '').trim();
    const dateInput = document.getElementById('srDateInput') as HTMLInputElement | null;
    const date = dateInput?.value || new Date().toISOString().split('T')[0];
    const photoInput = document.getElementById('srChallanPhoto') as HTMLInputElement | null;
    let photoData = '';

    if (photoInput?.files && photoInput.files[0]) {
        photoData = await readFileAsBase64(photoInput.files[0]);
    }

    const returnItems: SalesReturnItem[] = selectedItems.map(it => ({
        code: it.code,
        name: it.name,
        unit: it.unit,
        qty: it.qty,
        rate: it.rate,
        condition: it.condition
    }));

    const newReturn: SalesReturn = {
        id: 'SR-' + Date.now().toString().slice(-6),
        dealerCode: dealer.code,
        dealerName: dealer.name,
        dealerZone: dealer.zone,
        challanId: selectedItems.map(x => x.refInfo).filter((v, i, a) => a.indexOf(v) === i).join(', ') || 'CHL-SEARCHED',
        date: date,
        items: returnItems,
        reason: reason,
        note: note,
        challanPhoto: photoData,
        enteredBy: getCurrentUser(),
        status: 'Pending'
    };

    const returns = getSalesReturns();
    returns.unshift(newReturn);
    saveSalesReturns(returns);

    // Send notification to Admin
    const notifs = getNotifications();
    notifs.unshift({
        id: 'NOTIF-' + Date.now(),
        targetUser: 'Admin',
        title: `🔄 সেলস রিটার্ন অনুমোদনের অপেক্ষা: ${newReturn.id}`,
        message: `${newReturn.enteredBy} কর্তৃক ডিলার [${dealer.name}] এর জন্য সেলস রিটার্ন দাখিল করা হয়েছে (কারণ: ${reason})। এডমিনের অনুমোদনের পর স্টক ও আনডেলিভারি সমন্বয় হবে।`,
        type: 'sales_return',
        date: date,
        read: false
    });
    saveNotifications(notifs);

    // Reset draft form
    currentReturnDraftItems = [];
    renderDeliveredReportEmptyState('সেলস রিটার্ন আবেদন সফলভাবে দাখিল হয়েছে! ডিলার কোড ও তারিখ দিয়ে নতুন অনুসন্ধান করুন।');
    if (photoInput) photoInput.value = '';
    const noteInput = document.getElementById('srNotes') as HTMLInputElement | null;
    if (noteInput) noteInput.value = '';

    renderSalesReturnManagementBoard();
    if ((window as any).loadAllData) (window as any).loadAllData();
    alert(`✅ সেলস রিটার্ন আবেদন [${newReturn.id}] সফলভাবে দাখিল হয়েছে!\n\nএডমিন এটি যাচাই করে অনুমোদন করলে:\n১. ভালো স্টক সাধারণ ইনভেন্টরিতে এবং ড্যামেজ স্টক আলাদা তালিকায় যোগ হবে।\n২. ডিলারের পেন্ডিং আনডেলিভারি তালিকায় পণ্য পুনরায় সমন্বয় হবে।`);
}

export function renderSalesReturnManagementBoard() {
    initSalesReturnTab();

    const tbody = document.getElementById('salesReturnTableBody');
    if (!tbody) return;

    const returns = getSalesReturns();
    const role = getCurrentRole();
    const userZone = getCurrentZone();

    let displayReturns = returns;
    if (role === 'employee') {
        displayReturns = returns.filter(r => r.dealerZone === userZone);
    }

    if (displayReturns.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="p-6 text-center text-slate-400 font-medium">কোনো সেলস রিটার্ন রেকর্ড নেই।</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    displayReturns.forEach((sr) => {
        const itemSummary = sr.items.map(i => `${i.name} (<b>${i.qty} ${i.unit}</b> - <span class="${i.condition === 'Damaged' ? 'text-red-600 font-bold' : 'text-emerald-700 font-bold'}">${i.condition === 'Damaged' ? 'ড্যামেজ' : 'ভালো'}</span>)`).join('<br>');
        let statusBadge = '';
        if (sr.status === 'Approved') {
            statusBadge = `<span class="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 w-max"><i class="fa-solid fa-check"></i> অনুমোদিত ও সমন্বয় সম্পন্ন</span>`;
        } else if (sr.status === 'Rejected') {
            statusBadge = `<span class="bg-red-100 text-red-800 text-xs font-bold px-2.5 py-1 rounded-full w-max">বাতিলকৃত</span>`;
        } else {
            statusBadge = `<span class="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full animate-pulse w-max">এডমিন অনুমোদন পেন্ডিং</span>`;
        }

        const realIdx = returns.findIndex(x => x.id === sr.id);

        let actionHtml = '';
        if (sr.status === 'Pending') {
            if (role === 'admin') {
                actionHtml = `
                    <div class="flex items-center gap-1 justify-end">
                        <button onclick="window.openAdminReturnApprovalModal(${realIdx})" class="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded text-xs font-bold shadow transition cursor-pointer">
                            চেক ও অনুমোদন
                        </button>
                        <button onclick="window.rejectSalesReturn(${realIdx})" class="bg-red-50 text-red-600 hover:bg-red-100 px-2 py-1 rounded text-xs font-semibold border border-red-200 transition cursor-pointer">
                            বাতিল
                        </button>
                    </div>
                `;
            } else {
                actionHtml = `<span class="text-xs text-slate-400 italic">এডমিনের অনুমোদনের অপেক্ষায়</span>`;
            }
        } else {
            actionHtml = `<span class="text-xs text-slate-500 font-medium">${sr.adminNote || 'কার্যক্রম সম্পন্ন'}</span>`;
        }

        const photoThumb = sr.challanPhoto 
            ? `<img src="${sr.challanPhoto}" class="w-10 h-10 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition shadow-xs" onclick="window.zoomImage('${sr.challanPhoto}')">`
            : `<span class="text-[10px] text-slate-400">ছবি নেই</span>`;

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 border-b">
                <td class="p-2.5 font-mono font-bold text-slate-800">${sr.id}<br><span class="text-[10px] text-slate-500 font-normal">${sr.date}</span></td>
                <td class="p-2.5 font-medium">${sr.dealerName}<br><span class="text-xs text-blue-700 font-semibold bg-blue-50 px-1 rounded">${sr.dealerZone}</span></td>
                <td class="p-2.5 text-xs">${itemSummary}</td>
                <td class="p-2.5 text-xs font-semibold text-slate-700">${sr.reason}${sr.note ? ` (${sr.note})` : ''}</td>
                <td class="p-2.5 text-center">${photoThumb}</td>
                <td class="p-2.5 text-xs text-slate-600">${sr.enteredBy}</td>
                <td class="p-2.5">${statusBadge}</td>
                <td class="p-2.5 text-right whitespace-nowrap">${actionHtml}</td>
            </tr>
        `;
    });
}

export function openAdminReturnApprovalModal(idx: number) {
    if (getCurrentRole() !== 'admin') {
        alert('শুধুমাত্র এডমিন অনুমোদন করতে পারেন!');
        return;
    }

    const returns = getSalesReturns();
    const sr = returns[idx];
    if (!sr) return;

    const idEl = document.getElementById('apprReturnId');
    const dlrEl = document.getElementById('apprReturnDealer');
    const rsnEl = document.getElementById('apprReturnReason');
    const idxEl = document.getElementById('apprReturnIndex') as HTMLInputElement | null;
    const noteEl = document.getElementById('apprReturnAdminNote') as HTMLInputElement | null;

    if (idEl) idEl.innerText = sr.id;
    if (dlrEl) dlrEl.innerText = `${sr.dealerName} (${sr.dealerZone})`;
    if (rsnEl) rsnEl.innerText = `${sr.reason} ${sr.note ? `- ${sr.note}` : ''}`;
    if (idxEl) idxEl.value = idx.toString();
    if (noteEl) noteEl.value = '';

    const imgContainer = document.getElementById('apprReturnPhotoContainer');
    if (imgContainer) {
        if (sr.challanPhoto) {
            imgContainer.innerHTML = `<img src="${sr.challanPhoto}" class="max-h-40 rounded-lg border shadow-xs cursor-pointer" onclick="window.zoomImage('${sr.challanPhoto}')">`;
        } else {
            imgContainer.innerHTML = `<span class="text-xs text-slate-400 italic">কোনো ছবি সংযুক্ত নেই</span>`;
        }
    }

    const itemsContainer = document.getElementById('apprReturnItemsTableBody');
    if (itemsContainer) {
        itemsContainer.innerHTML = '';
        sr.items.forEach((it, itIdx) => {
            itemsContainer.innerHTML += `
                <tr class="border-b text-xs">
                    <td class="p-2 font-bold text-slate-800">[${it.code}] ${it.name}</td>
                    <td class="p-2 text-center">
                        <input type="number" min="1" id="apprReturnQty_${itIdx}" value="${it.qty}" class="w-16 px-1.5 py-1 border rounded text-center font-bold text-emerald-800">
                    </td>
                    <td class="p-2 text-center">
                        <select id="apprReturnCond_${itIdx}" class="px-2 py-1 border rounded-lg text-xs bg-white font-semibold">
                            <option value="Good" ${it.condition === 'Good' ? 'selected' : ''}>ভালো স্টক (Good Stock এ যোগ)</option>
                            <option value="Damaged" ${it.condition === 'Damaged' ? 'selected' : ''}>ড্যামেজ স্টক (Bad Stock এ যোগ)</option>
                        </select>
                    </td>
                </tr>
            `;
        });
    }

    document.getElementById('adminReturnApprovalModal')?.classList.remove('hidden');
}

export function confirmAdminReturnApproval(e: Event) {
    if (e && e.preventDefault) e.preventDefault();

    const idx = parseInt((document.getElementById('apprReturnIndex') as HTMLInputElement).value);
    const returns = getSalesReturns();
    const sr = returns[idx];
    if (!sr) return;

    const adminNote = (document.getElementById('apprReturnAdminNote') as HTMLInputElement).value.trim();

    const products = getProducts();
    const orders = getOrders();

    sr.items.forEach((it, itIdx) => {
        const qtyInput = document.getElementById(`apprReturnQty_${itIdx}`) as HTMLInputElement | null;
        const condSelect = document.getElementById(`apprReturnCond_${itIdx}`) as HTMLSelectElement | null;
        const approvedQty = qtyInput ? Number(qtyInput.value) : it.qty;
        const approvedCond = condSelect ? condSelect.value : it.condition;

        it.qty = approvedQty;
        it.condition = approvedCond as any;

        // Requirement 8: Good goes to stock, Damaged goes to badStock
        const prod = products.find(p => p.code === it.code);
        if (prod) {
            if (approvedCond === 'Damaged') {
                prod.badStock = (prod.badStock || 0) + approvedQty;
            } else {
                prod.stock = (prod.stock || 0) + approvedQty;
            }
        }

        // Add the returned qty back to the Dealer's Undelivered orders!
        let returnRestockRemaining = approvedQty;
        for (const ord of orders) {
            if (ord.dealerCode === sr.dealerCode) {
                for (const ordItem of ord.items) {
                    if (ordItem.code === it.code && (ordItem.deliveredQty || 0) > 0) {
                        const reduceDelivered = Math.min(ordItem.deliveredQty || 0, returnRestockRemaining);
                        ordItem.deliveredQty = (ordItem.deliveredQty || 0) - reduceDelivered;
                        returnRestockRemaining -= reduceDelivered;
                        ord.deliveryStatus = 'Pending';
                    }
                    if (returnRestockRemaining <= 0) break;
                }
            }
            if (returnRestockRemaining <= 0) break;
        }
    });

    sr.status = 'Approved';
    sr.adminNote = adminNote || 'এডমিন কর্তৃক অনুমোদিত ও স্টক এবং আনডেলিভারি সমন্বয় সম্পন্ন।';

    saveProducts(products);
    saveOrders(orders);
    saveSalesReturns(returns);

    const notifs = getNotifications();
    notifs.unshift({
        id: 'NOTIF-' + Date.now(),
        targetUser: 'All',
        title: `✅ সেলস রিটার্ন অনুমোদিত: ${sr.id}`,
        message: `ডিলার [${sr.dealerName}] এর সেলস রিটার্ন অনুমোদিত হয়েছে। ভালো/ড্যামেজ স্টক সমন্বয় করা হয়েছে এবং ডিলারের আন্ডেলিভেরীতে পণ্য পুনরায় যুক্ত হয়েছে।`,
        type: 'sales_return',
        date: new Date().toISOString().split('T')[0],
        read: false
    });
    saveNotifications(notifs);

    document.getElementById('adminReturnApprovalModal')?.classList.add('hidden');
    renderSalesReturnManagementBoard();
    if ((window as any).loadAllData) (window as any).loadAllData();
    alert('সেলস রিটার্ন সফলভাবে অনুমোদিত হয়েছে! স্টক আপডেট হয়েছে এবং ডিলারের আনডেলিভারি পুনরায় বৃদ্ধি করা হয়েছে।');
}

export function rejectSalesReturn(idx: number) {
    if (getCurrentRole() !== 'admin') {
        alert('শুধুমাত্র এডমিন বাতিল করতে পারেন!');
        return;
    }
    const note = prompt('বাতিলের কারণ লিখুন:', 'যথাযথ চালান বা প্রমাণক অনুপস্থিত');
    if (note === null) return;

    const returns = getSalesReturns();
    const sr = returns[idx];
    if (!sr) return;

    sr.status = 'Rejected';
    sr.adminNote = `বাতিল: ${note}`;
    saveSalesReturns(returns);

    renderSalesReturnManagementBoard();
    alert('সেলস রিটার্ন বাতিল করা হয়েছে।');
}

export function openSalesReturnModal() {
    if ((window as any).switchTab) {
        (window as any).switchTab('salesReturn');
    }
}

if (typeof window !== 'undefined') {
    (window as any).openSalesReturnModal = openSalesReturnModal;
    (window as any).initSalesReturnTab = initSalesReturnTab;
    (window as any).syncSalesReturnDealerInput = syncSalesReturnDealerInput;
    (window as any).syncSalesReturnDealerSelect = syncSalesReturnDealerSelect;
    (window as any).selectDeliveryDateForReturn = selectDeliveryDateForReturn;
    (window as any).updateSelectedDealerCard = updateSelectedDealerCard;
    (window as any).showAllDeliveredForReturn = showAllDeliveredForReturn;
    (window as any).searchDeliveredChallanForReturn = searchDeliveredChallanForReturn;
    (window as any).toggleReturnItemSelection = toggleReturnItemSelection;
    (window as any).toggleSelectAllReturnItems = toggleSelectAllReturnItems;
    (window as any).updateReturnDraftQty = updateReturnDraftQty;
    (window as any).updateReturnCondition = updateReturnCondition;
    (window as any).removeReturnDraftItem = removeReturnDraftItem;
    (window as any).submitSalesReturnEntry = submitSalesReturnEntry;
    (window as any).renderSalesReturnManagementBoard = renderSalesReturnManagementBoard;
    (window as any).openAdminReturnApprovalModal = openAdminReturnApprovalModal;
    (window as any).confirmAdminReturnApproval = confirmAdminReturnApproval;
    (window as any).rejectSalesReturn = rejectSalesReturn;
}
