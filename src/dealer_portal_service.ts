import {
    getOrders,
    getChallans,
    getDealers,
    getCurrentDealerCode,
    Dealer,
    Order,
    Challan
} from './bcare.ts';

let activeDealerTab: 'orders' | 'delivered' | 'pending' | 'ledger' = 'orders';

export function switchDealerSubTab(tab: 'orders' | 'delivered' | 'pending' | 'ledger') {
    activeDealerTab = tab;
    ['orders', 'delivered', 'pending', 'ledger'].forEach(t => {
        const btn = document.getElementById(`dlrSubTabBtn-${t}`);
        const content = document.getElementById(`dlrSubTabContent-${t}`);
        if (btn) {
            if (t === tab) {
                btn.className = 'px-4 py-2 border-b-2 font-bold text-sm text-emerald-700 border-emerald-600 bg-emerald-50 rounded-t-lg transition flex items-center gap-1.5';
            } else {
                btn.className = 'px-4 py-2 border-b-2 font-semibold text-sm text-slate-600 border-transparent hover:text-slate-800 transition flex items-center gap-1.5';
            }
        }
        if (content) {
            if (t === tab) content.classList.remove('hidden');
            else content.classList.add('hidden');
        }
    });
}

export function renderDealerPortal() {
    const dealerCode = getCurrentDealerCode();
    const dealers = getDealers();
    const dealer = dealers.find(d => d.code === dealerCode) || dealers[0];
    if (!dealer) return;

    const nameEl = document.getElementById('dlrPortalName');
    const codeEl = document.getElementById('dlrPortalCode');
    const locEl = document.getElementById('dlrPortalLocation');
    const phoneEl = document.getElementById('dlrPortalPhone');
    const creditEl = document.getElementById('dlrPortalCredit');

    if (nameEl) nameEl.innerText = dealer.name;
    if (codeEl) codeEl.innerText = dealer.code;
    if (locEl) locEl.innerText = `${dealer.zone} জেলা (${dealer.address || 'ঠিকানা সংরক্ষিত'})`;
    if (phoneEl) phoneEl.innerText = dealer.mobile;
    if (creditEl) creditEl.innerText = `৳ ${(dealer.credit || 0).toLocaleString()}`;

    const allOrders = getOrders();
    const dealerOrders = allOrders.filter(o => o.dealerCode === dealer.code);

    const allChallans = getChallans();
    const dealerChallans = allChallans.filter(c => c.dealerCode === dealer.code);

    renderDealerOrdersTable(dealerOrders);
    renderDealerDeliveredTable(dealerChallans);
    renderDealerPendingTable(dealerOrders);
    renderDealerLedgerReport(dealer, dealerOrders);

    switchDealerSubTab(activeDealerTab);
}

function renderDealerOrdersTable(orders: Order[]) {
    const tbody = document.getElementById('dlrOrdersTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center text-slate-400">আপনার কোনো অর্ডার তথ্য নেই।</td></tr>`;
        return;
    }

    orders.forEach(o => {
        const itemsSummary = o.items.map(i => `<b>${i.name}</b>: ${i.qty} ${i.unit}`).join('<br>');
        const isDelivered = o.deliveryStatus === 'Delivered';
        const statusBadge = isDelivered
            ? `<button onclick="window.openOrderLineStatusModal('${o.id}')" class="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1 shadow-xs hover:bg-emerald-200 cursor-pointer"><i class="fa-solid fa-circle-check text-emerald-600"></i> Delivered</button>`
            : `<button onclick="window.openOrderLineStatusModal('${o.id}')" class="bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1 shadow-xs hover:bg-amber-200 cursor-pointer"><i class="fa-solid fa-clock text-amber-600"></i> Pending</button>`;

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 border-b">
                <td class="p-3 font-bold text-emerald-800 font-mono text-xs">${o.id}</td>
                <td class="p-3 text-xs text-slate-600">${o.date}</td>
                <td class="p-3 text-xs leading-relaxed">${itemsSummary}</td>
                <td class="p-3 text-xs font-bold">৳${o.amount.toLocaleString()}</td>
                <td class="p-3 text-xs text-emerald-700 font-semibold">৳${o.collection.toLocaleString()}</td>
                <td class="p-3 text-xs text-amber-600 font-bold">৳${o.due.toLocaleString()}</td>
                <td class="p-3 text-center">${statusBadge}</td>
                <td class="p-3 text-right">
                    <button onclick="window.printOrderInvoice('${o.id}')" class="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1 rounded text-xs font-semibold shadow-xs inline-flex items-center gap-1">
                        <i class="fa-solid fa-print"></i> ইনভয়েস
                    </button>
                </td>
            </tr>
        `;
    });
}

function renderDealerDeliveredTable(challans: Challan[]) {
    const tbody = document.getElementById('dlrDeliveredTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (challans.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400">আপনার এখনও কোনো ডেলিভারি চালান ইস্যু হয়নি।</td></tr>`;
        return;
    }

    challans.forEach(c => {
        const itemsList = c.items.map(i => `<b>${i.name}</b> (${i.qty} ${i.unit})`).join(', ');
        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 border-b">
                <td class="p-3 font-bold text-emerald-800 font-mono text-xs">${c.id}</td>
                <td class="p-3 text-xs text-slate-600">${c.timestamp || c.date}</td>
                <td class="p-3 text-xs">${itemsList}</td>
                <td class="p-3 text-center text-xs font-bold text-emerald-700">${c.totalQty} পিস</td>
                <td class="p-3 text-xs text-slate-500">${c.notes || 'সাধারণ পরিবহন'}</td>
                <td class="p-3 text-right">
                    <button onclick="window.viewChallanById('${c.id}')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded text-xs font-semibold shadow inline-flex items-center gap-1 transition">
                        <i class="fa-solid fa-file-invoice"></i> চালান দেখুন ও প্রিন্ট
                    </button>
                </td>
            </tr>
        `;
    });
}

function renderDealerPendingTable(orders: Order[]) {
    const tbody = document.getElementById('dlrPendingTableBody');
    const totalEl = document.getElementById('dlrPendingTotalQty');
    if (!tbody) return;
    tbody.innerHTML = '';

    let totalPendingQty = 0;
    const pendingRows: { orderId: string; date: string; code: string; name: string; unit: string; qty: number }[] = [];

    orders.filter(o => o.deliveryStatus !== 'Delivered').forEach(o => {
        o.items.forEach(i => {
            const delivered = i.deliveredQty || 0;
            const remaining = (i.qty || 0) - delivered;
            if (remaining > 0) {
                totalPendingQty += remaining;
                pendingRows.push({
                    orderId: o.id,
                    date: o.date,
                    code: i.code,
                    name: i.name,
                    unit: i.unit || 'পিস',
                    qty: remaining
                });
            }
        });
    });

    if (totalEl) totalEl.innerText = `${totalPendingQty} টি`;

    if (pendingRows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-emerald-700 font-semibold bg-emerald-50">আপনার কোনো পণ্য পেন্ডিং নেই! সকল অর্ডারকৃত পণ্য সফলভাবে ডেলিভারি করা হয়েছে।</td></tr>`;
        return;
    }

    pendingRows.forEach((row, idx) => {
        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 border-b">
                <td class="p-3 text-center text-slate-500 text-xs">${idx + 1}</td>
                <td class="p-3 text-xs">
                    <span class="font-bold text-slate-800">[${row.code}] ${row.name}</span>
                </td>
                <td class="p-3 text-xs font-mono font-bold text-blue-700">${row.orderId}</td>
                <td class="p-3 text-xs text-slate-600">${row.date}</td>
                <td class="p-3 text-center font-bold text-amber-700 text-xs bg-amber-50">${row.qty} ${row.unit}</td>
            </tr>
        `;
    });
}

function renderDealerLedgerReport(dealer: Dealer, orders: Order[]) {
    const totalBill = orders.reduce((sum, o) => sum + o.amount, 0);
    const totalPaid = orders.reduce((sum, o) => sum + o.collection, 0);
    const totalDue = orders.reduce((sum, o) => sum + o.due, 0);

    const b1 = document.getElementById('dlrLedgerTotalBill');
    const b2 = document.getElementById('dlrLedgerTotalPaid');
    const b3 = document.getElementById('dlrLedgerTotalDue');
    const b4 = document.getElementById('dlrLedgerCreditBal');

    if (b1) b1.innerText = `৳ ${totalBill.toLocaleString()}`;
    if (b2) b2.innerText = `৳ ${totalPaid.toLocaleString()}`;
    if (b3) b3.innerText = `৳ ${totalDue.toLocaleString()}`;
    if (b4) b4.innerText = `৳ ${(dealer.credit || 0).toLocaleString()}`;

    const tbody = document.getElementById('dlrLedgerTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400">কোনো লেজার হিসাব তথ্য নেই।</td></tr>`;
        return;
    }

    orders.slice().reverse().forEach((o, idx) => {
        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 border-b">
                <td class="p-2.5 text-center text-slate-500 text-xs">${idx + 1}</td>
                <td class="p-2.5 text-xs text-slate-600">${o.date}</td>
                <td class="p-2.5 text-xs font-mono font-bold text-emerald-800">${o.id}</td>
                <td class="p-2.5 text-xs text-right font-bold text-slate-800">৳${o.amount.toLocaleString()}</td>
                <td class="p-2.5 text-xs text-right text-emerald-700 font-semibold">৳${o.collection.toLocaleString()}</td>
                <td class="p-2.5 text-xs text-right font-bold text-amber-600">৳${o.due.toLocaleString()}</td>
            </tr>
        `;
    });
}

if (typeof window !== 'undefined') {
    (window as any).switchDealerSubTab = switchDealerSubTab;
    (window as any).renderDealerPortal = renderDealerPortal;
}
