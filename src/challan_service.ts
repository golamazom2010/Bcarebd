import {
    getOrders, saveOrders,
    getDealers,
    getProducts, saveProducts,
    getChallans, saveChallans,
    getCurrentRole, getCurrentUser, getCurrentZone,
    getNotifications, saveNotifications,
    Challan, ChallanItem, PendingItemRemaining
} from './bcare.ts';
import { printContent } from './print_service.ts';

let currentChallanDraftItems: {
    code: string;
    name: string;
    unit: string;
    rate: number;
    availableStock: number;
    pendingQty: number;
    challanQty: number;
    ordersInfo: string;
    orderRefs: { orderId: string; date: string; qty: number }[];
}[] = [];

let activeChallanBeingViewed: Challan | null = null;

export function renderFactoryChallanPanel() {
    const dealerSelect = document.getElementById('challanDealerSelect') as HTMLSelectElement | null;
    if (dealerSelect) {
        dealerSelect.innerHTML = '<option value="">-- ডিলার কোড বা নাম নির্বাচন করুন --</option>';
        const dealers = getDealers();
        const orders = getOrders();
        
        dealers.forEach(d => {
            const hasPending = orders.some(o => o.dealerCode === d.code && o.deliveryStatus !== 'Delivered');
            dealerSelect.innerHTML += `<option value="${d.code}">[ডিলার কোড: ${d.code}] ${d.name} — জোন: ${d.zone} (${d.address}) ${hasPending ? '⚠️ [পেন্ডিং অর্ডার আছে]' : ''}</option>`;
        });
    }

    renderIssuedChallansTable();
}

export function searchDealerForChallan(query: string) {
    const q = (query || '').trim().toLowerCase();
    const dealerSelect = document.getElementById('challanDealerSelect') as HTMLSelectElement | null;
    if (!dealerSelect) return;
    if (!q) {
        dealerSelect.value = '';
        loadDealerPendingChallanItems();
        return;
    }
    const dealers = getDealers();
    const matched = dealers.find(d => 
        d.code.toLowerCase() === q || 
        d.code.toLowerCase().startsWith(q) || 
        d.name.toLowerCase().includes(q)
    );
    if (matched) {
        dealerSelect.value = matched.code;
        loadDealerPendingChallanItems();
    }
}

export function loadDealerPendingChallanItems() {
    const sel = document.getElementById('challanDealerSelect') as HTMLSelectElement;
    const dealerCode = sel?.value;
    const tbody = document.getElementById('challanItemsTableBody');
    const infoCard = document.getElementById('selectedDealerChallanInfo');
    if (!tbody) return;

    if (!dealerCode) {
        tbody.innerHTML = '<tr><td colspan="7" class="p-6 text-center text-slate-400">চালান তৈরি করতে ওপর থেকে একজন ডিলার নির্বাচন করুন।</td></tr>';
        currentChallanDraftItems = [];
        if (infoCard) infoCard.classList.add('hidden');
        return;
    }

    const dealer = getDealers().find(d => d.code === dealerCode);
    if (infoCard && dealer) {
        infoCard.innerHTML = `
            <div class="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border-2 border-emerald-300 rounded-xl p-3.5 shadow-xs flex flex-wrap justify-between items-center gap-3">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow shrink-0">
                        <i class="fa-solid fa-store"></i>
                    </div>
                    <div>
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="bg-emerald-700 text-white text-xs font-mono font-black px-2.5 py-0.5 rounded shadow-xs">ডিলার কোড: ${dealer.code}</span>
                            <h4 class="font-extrabold text-slate-800 text-base">${dealer.name}</h4>
                        </div>
                        <p class="text-xs text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
                            <span><i class="fa-solid fa-user-tie text-slate-500"></i> স্বত্বাধিকারী: <b>${dealer.chairman || 'N/A'}</b></span>
                            <span class="text-slate-300">|</span>
                            <span><i class="fa-solid fa-phone text-emerald-600"></i> মোবাইল: <b>${dealer.mobile}</b></span>
                        </p>
                    </div>
                </div>
                <div class="bg-white/90 border border-blue-200 px-3.5 py-2 rounded-xl text-left sm:text-right shadow-xs">
                    <span class="text-[10px] font-bold text-blue-800 uppercase block tracking-wider"><i class="fa-solid fa-location-dot text-red-500 mr-1"></i> ডেলিভারি লোকেশন</span>
                    <span class="text-xs font-bold text-slate-800">${dealer.zone} জেলা</span>
                    <p class="text-[11px] text-slate-600 font-medium">${dealer.address}</p>
                </div>
            </div>
        `;
        infoCard.classList.remove('hidden');
    }

    const orders = getOrders().filter(o => o.dealerCode === dealerCode && o.deliveryStatus !== 'Delivered');
    
    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="p-6 text-center text-emerald-700 font-semibold bg-emerald-50">এই ডিলারের কোনো পেন্ডিং আনডেলিভার্ড অর্ডার নেই।</td></tr>';
        currentChallanDraftItems = [];
        return;
    }

    const products = getProducts();
    const productMap: { [code: string]: typeof currentChallanDraftItems[0] } = {};

    orders.forEach(o => {
        o.items.forEach(item => {
            const pendingForItem = (item.qty || 0) - (item.deliveredQty || 0);
            if (pendingForItem > 0) {
                if (!productMap[item.code]) {
                    const prod = products.find(p => p.code === item.code);
                    const stock = prod ? prod.stock : 0;
                    productMap[item.code] = {
                        code: item.code,
                        name: item.name,
                        unit: item.unit || 'পিস',
                        rate: item.rate || 0,
                        availableStock: stock,
                        pendingQty: 0,
                        challanQty: 0,
                        ordersInfo: '',
                        orderRefs: []
                    };
                }
                productMap[item.code].pendingQty += pendingForItem;
                productMap[item.code].orderRefs.push({
                    orderId: o.id,
                    date: o.date,
                    qty: pendingForItem
                });
            }
        });
    });

    currentChallanDraftItems = Object.values(productMap).map(p => {
        p.challanQty = Math.max(0, Math.min(p.pendingQty, p.availableStock));
        p.ordersInfo = p.orderRefs.map(r => `${r.orderId} (${r.qty} ${p.unit})`).join(', ');
        return p;
    });

    renderDraftChallanTable();
}

export function renderDraftChallanTable() {
    const tbody = document.getElementById('challanItemsTableBody');
    if (!tbody) return;

    if (currentChallanDraftItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-slate-400">চালানের জন্য কোনো আইটেম নির্বাচিত নেই।</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    currentChallanDraftItems.forEach((item, idx) => {
        const hasStock = item.availableStock > 0;
        const qtyInput = hasStock 
            ? `<input type="number" min="1" max="${Math.min(item.pendingQty, item.availableStock)}" value="${item.challanQty}" 
                onchange="window.updateChallanDraftQty(${idx}, this.value)" 
                class="w-24 px-2 py-1 border-2 border-emerald-400 rounded text-center font-bold text-emerald-800 bg-white">`
            : `<span class="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200">স্টক নেই (০)</span>`;

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 border-b">
                <td class="p-2.5 font-bold text-slate-800">[${item.code}] ${item.name}</td>
                <td class="p-2.5 text-xs text-indigo-700 font-semibold bg-indigo-50/50">${item.ordersInfo}</td>
                <td class="p-2.5 text-center text-slate-600 font-medium">${item.unit}</td>
                <td class="p-2.5 text-center font-bold text-amber-700">${item.pendingQty}</td>
                <td class="p-2.5 text-center">${qtyInput}</td>
                <td class="p-2.5 text-right">
                    <button type="button" onclick="window.removeChallanDraftItem(${idx})" class="text-red-600 hover:text-red-800 text-xs font-bold px-2 py-1 bg-red-50 rounded">
                        <i class="fa-solid fa-trash mr-1"></i> বাদ দিন
                    </button>
                </td>
            </tr>
        `;
    });
}

export function updateChallanDraftQty(index: number, val: string) {
    const qty = parseInt(val) || 0;
    const item = currentChallanDraftItems[index];
    if (!item) return;

    if (item.availableStock <= 0) {
        alert(`⚠️ [${item.name}] পণ্যটি বর্তমানে স্টকে নেই (০ পিস)। এটি চালান করা যাবে না!`);
        item.challanQty = 0;
        renderDraftChallanTable();
        return;
    }

    if (qty > item.availableStock) {
        alert(`⚠️ স্টকে মাত্র ${item.availableStock} পিস আছে, এর বেশি চালান করা যাবে না!`);
        item.challanQty = Math.min(item.availableStock, item.pendingQty);
        renderDraftChallanTable();
        return;
    }

    if (qty > item.pendingQty) {
        alert(`⚠️ ডিলারের পেন্ডিং অর্ডার মাত্র ${item.pendingQty} পিস! এর বেশি চালান করা যাবে না।`);
        item.challanQty = Math.min(item.availableStock, item.pendingQty);
        renderDraftChallanTable();
        return;
    }

    item.challanQty = Math.max(1, qty);
}

export function removeChallanDraftItem(index: number) {
    currentChallanDraftItems.splice(index, 1);
    renderDraftChallanTable();
}

export function processCreateChallan() {
    const dealerSelect = document.getElementById('challanDealerSelect') as HTMLSelectElement;
    const dealerCode = dealerSelect?.value;
    if (!dealerCode) {
        alert('অনুগ্রহ করে প্রথমে একজন ডিলার নির্বাচন করুন!');
        return;
    }

    const deliverableItems = currentChallanDraftItems.filter(i => i.challanQty > 0);

    if (deliverableItems.length === 0) {
        alert('চালানের জন্য কমপক্ষে একটি প্রোডাক্ট স্টকে থাকতে হবে ও পরিমাণ ১ এর বেশি হতে হবে!');
        return;
    }

    const dealer = getDealers().find(d => d.code === dealerCode);
    if (!dealer) return;

    const role = getCurrentRole();
    if (role !== 'admin' && role !== 'factory') {
        alert('শুধুমাত্র ফ্যাক্টরি ম্যানেজার ও এডমিন চালান তৈরি করতে পারেন!');
        return;
    }

    const orders = getOrders();
    const products = getProducts();
    const challanItems: ChallanItem[] = [];
    let totalChallanQty = 0;

    deliverableItems.forEach(draftItem => {
        let qtyToDeliver = draftItem.challanQty;
        totalChallanQty += qtyToDeliver;

        challanItems.push({
            code: draftItem.code,
            name: draftItem.name,
            unit: draftItem.unit,
            qty: draftItem.challanQty,
            rate: draftItem.rate,
            ordersInfo: draftItem.ordersInfo
        });

        const prod = products.find(p => p.code === draftItem.code);
        if (prod) {
            prod.stock = Math.max(0, prod.stock - qtyToDeliver);
        }

        for (const order of orders) {
            if (order.dealerCode === dealerCode && order.deliveryStatus !== 'Delivered') {
                for (const ordItem of order.items) {
                    if (ordItem.code === draftItem.code) {
                        const ordRemaining = (ordItem.qty || 0) - (ordItem.deliveredQty || 0);
                        if (ordRemaining > 0 && qtyToDeliver > 0) {
                            const alloc = Math.min(ordRemaining, qtyToDeliver);
                            ordItem.deliveredQty = (ordItem.deliveredQty || 0) + alloc;
                            qtyToDeliver -= alloc;
                        }
                    }
                }

                const allDelivered = order.items.every(i => (i.deliveredQty || 0) >= i.qty);
                if (allDelivered) {
                    order.deliveryStatus = 'Delivered';
                }
            }
            if (qtyToDeliver <= 0) break;
        }
    });

    saveOrders(orders);
    saveProducts(products);

    const remainingPending: PendingItemRemaining[] = [];
    orders.filter(o => o.dealerCode === dealerCode && o.deliveryStatus !== 'Delivered').forEach(o => {
        o.items.forEach(i => {
            const rem = (i.qty || 0) - (i.deliveredQty || 0);
            if (rem > 0) {
                remainingPending.push({
                    orderId: o.id,
                    orderDate: o.date,
                    code: i.code,
                    name: i.name,
                    unit: i.unit,
                    remainingQty: rem
                });
            }
        });
    });

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timestamp = `${dateStr} ${now.toTimeString().split(' ')[0]}`;
    const notes = (document.getElementById('challanTransportNotes') as HTMLInputElement)?.value || '';

    const newChallan: Challan = {
        id: `CHL-${Date.now().toString().slice(-6)}`,
        dealerCode: dealer.code,
        dealerName: dealer.name,
        dealerZone: dealer.zone,
        dealerMobile: dealer.mobile,
        dealerAddress: dealer.address,
        preparedBy: getCurrentUser(),
        timestamp: timestamp,
        date: dateStr,
        items: challanItems,
        remainingPending: remainingPending,
        totalQty: totalChallanQty,
        notes: notes,
        printCount: 0
    };

    const challans = getChallans();
    challans.unshift(newChallan);
    saveChallans(challans);

    const notifs = getNotifications();
    notifs.unshift({
        id: 'NOTIF-' + Date.now(),
        targetUser: 'All',
        title: `📦 নতুন চালান প্রস্তুত: ${newChallan.id}`,
        message: `${newChallan.date} তারিখে ডিলার [${dealer.name}] এর জন্য ${newChallan.totalQty} পিস পণ্যের চালান প্রস্তুত হয়েছে। প্রস্তুতকারক: ${newChallan.preparedBy}`,
        type: 'challan_ready',
        date: dateStr,
        read: false,
        challanId: newChallan.id
    });
    saveNotifications(notifs);

    currentChallanDraftItems = [];
    renderDraftChallanTable();
    renderIssuedChallansTable();
    loadDealerPendingChallanItems();
    if ((window as any).loadAllData) (window as any).loadAllData();

    openChallanPrintModal(newChallan, true);
}

export function openChallanPrintModal(challan: Challan, isInitialCreation: boolean = false) {
    activeChallanBeingViewed = challan;
    (document.getElementById('cpChallanId') as HTMLElement).innerText = challan.id;
    (document.getElementById('cpTimestamp') as HTMLElement).innerText = challan.timestamp;
    (document.getElementById('cpPreparedBy') as HTMLElement).innerText = challan.preparedBy;
    (document.getElementById('cpDealerName') as HTMLElement).innerText = challan.dealerName;
    
    const codeEl = document.getElementById('cpDealerCode');
    if (codeEl) codeEl.innerText = challan.dealerCode;
    const locEl = document.getElementById('cpDealerLocation');
    if (locEl) locEl.innerText = `${challan.dealerZone} জেলা, ${challan.dealerAddress || 'ঠিকানা সংরক্ষিত'}`;
    const codeZoneEl = document.getElementById('cpDealerCodeZone');
    if (codeZoneEl) codeZoneEl.innerText = `কোড: ${challan.dealerCode} | জোন: ${challan.dealerZone}`;
    const contactEl = document.getElementById('cpDealerContact');
    if (contactEl) contactEl.innerText = `${challan.dealerAddress} | মোবা: ${challan.dealerMobile}`;

    const printCount = challan.printCount || 0;
    const badgeContainer = document.getElementById('cpCopyBadge');
    if (badgeContainer) {
        if (printCount === 0) {
            badgeContainer.innerHTML = `<span class="bg-emerald-600 text-white font-black px-3 py-1 rounded-full text-xs uppercase tracking-wider shadow">অরিজিনাল কপি (Original Copy)</span>`;
        } else {
            badgeContainer.innerHTML = `<span class="bg-amber-600 text-white font-black px-3 py-1 rounded-full text-xs uppercase tracking-wider shadow">ডুপ্লিকেট কপি-${printCount} (Duplicate Copy)</span>`;
        }
    }

    const itemsTbody = document.getElementById('cpItemsTableBody');
    if (itemsTbody) {
        itemsTbody.innerHTML = '';
        let totalVal = 0;
        challan.items.forEach(it => {
            const lineVal = it.qty * it.rate;
            totalVal += lineVal;
            itemsTbody.innerHTML += `
                <tr class="border-b">
                    <td class="p-2 border-r font-bold">[${it.code}] ${it.name}</td>
                    <td class="p-2 border-r text-xs text-indigo-700">${it.ordersInfo}</td>
                    <td class="p-2 text-center border-r">${it.unit}</td>
                    <td class="p-2 text-center border-r font-bold text-emerald-800">${it.qty}</td>
                    <td class="p-2 text-right border-r">৳ ${it.rate}</td>
                    <td class="p-2 text-right font-bold">৳ ${lineVal.toLocaleString()}</td>
                </tr>
            `;
        });
        (document.getElementById('cpTotalQty') as HTMLElement).innerText = `${challan.totalQty} একক`;
        (document.getElementById('cpTotalAmount') as HTMLElement).innerText = `৳ ${totalVal.toLocaleString()}`;
    }

    const remTbody = document.getElementById('cpRemainingTableBody');
    if (remTbody) {
        remTbody.innerHTML = '';
        if (challan.remainingPending && challan.remainingPending.length > 0) {
            challan.remainingPending.forEach(r => {
                remTbody.innerHTML += `
                    <tr class="border-b">
                        <td class="p-2 border-r font-medium">[${r.code}] ${r.name}</td>
                        <td class="p-2 border-r text-indigo-700 font-bold">${r.orderId}</td>
                        <td class="p-2 border-r">${r.orderDate}</td>
                        <td class="p-2 text-center font-bold text-amber-700">${r.remainingQty} ${r.unit}</td>
                    </tr>
                `;
            });
        } else {
            remTbody.innerHTML = `<tr><td colspan="4" class="p-3 text-center text-emerald-700 font-semibold bg-emerald-50">🎉 এই ডিলারের আর কোনো পেন্ডিং ডেলিভারি নেই (সকল অর্ডার ডেলিভারি সম্পন্ন)!</td></tr>`;
        }
    }

    const notesDiv = document.getElementById('cpNotesDiv');
    if (notesDiv) {
        if (challan.notes) {
            notesDiv.innerHTML = `<b>পরিবহন নোট:</b> ${challan.notes}`;
            notesDiv.classList.remove('hidden');
        } else {
            notesDiv.classList.add('hidden');
        }
    }

    document.getElementById('challanPrintModal')?.classList.remove('hidden');
}

export function executeChallanPrint() {
    if (!activeChallanBeingViewed) return;

    const challans = getChallans();
    const c = challans.find(x => x.id === activeChallanBeingViewed?.id);
    if (c) {
        c.printCount = (c.printCount || 0) + 1;
        saveChallans(challans);
        activeChallanBeingViewed = c;
    }

    printContent('challanPrintArea', 'ফ্যাক্টরি ডেলিভারি চালান ও গেটপাস');
    renderIssuedChallansTable();
}

export function renderIssuedChallansTable() {
    const tbody = document.getElementById('issuedChallansTableBody');
    if (!tbody) return;
    const challans = getChallans();
    const role = getCurrentRole();
    const userZone = getCurrentZone();

    let list = challans;
    if (role === 'employee') {
        list = challans.filter(c => c.dealerZone === userZone);
    }

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="p-6 text-center text-slate-400">কোনো চালান ইতিহাস পাওয়া যায়নি।</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    list.forEach(c => {
        const itemSummary = c.items.map(i => `${i.name} (${i.qty} ${i.unit})`).join(', ');

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 border-b">
                <td class="p-3 font-mono font-bold text-emerald-800">${c.id}</td>
                <td class="p-3 font-semibold text-xs text-indigo-800">${c.timestamp || c.date}</td>
                <td class="p-3 font-medium">${c.dealerName}<br><span class="text-xs text-blue-700 font-semibold bg-blue-50 px-1 rounded">${c.dealerZone}</span></td>
                <td class="p-3 text-xs text-slate-700">${itemSummary}</td>
                <td class="p-3 text-center font-bold text-emerald-700">${c.totalQty}</td>
                <td class="p-3 text-xs">${c.preparedBy}</td>
                <td class="p-3 text-right whitespace-nowrap">
                    <button onclick="window.viewChallanById('${c.id}')" class="bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1.5 rounded text-xs font-semibold shadow">
                        <i class="fa-solid fa-print mr-1"></i> ভিউ ও প্রিন্ট
                    </button>
                </td>
            </tr>
        `;
    });
}

export function viewChallanById(id: string) {
    const challans = getChallans();
    const c = challans.find(x => x.id === id);
    if (c) {
        openChallanPrintModal(c, false);
    } else {
        alert(`চালান [${id}] পাওয়া যায়নি!`);
    }
}

export function viewChallanByOrderId(orderId: string) {
    const challans = getChallans();
    let c = challans.find(ch => 
        ch.items.some(it => it.ordersInfo && it.ordersInfo.includes(orderId))
    );

    if (!c) {
        const orders = getOrders();
        const ord = orders.find(o => o.id === orderId);
        if (ord) {
            c = challans.find(ch => ch.dealerCode === ord.dealerCode);
        }
    }

    if (c) {
        openChallanPrintModal(c, false);
    } else {
        alert(`অর্ডার [${orderId}] এর সাথে সংশ্লিষ্ট কোনো চালান পাওয়া যায়নি।`);
    }
}

if (typeof window !== 'undefined') {
    (window as any).renderFactoryChallanPanel = renderFactoryChallanPanel;
    (window as any).loadDealerPendingChallanItems = loadDealerPendingChallanItems;
    (window as any).updateChallanDraftQty = updateChallanDraftQty;
    (window as any).removeChallanDraftItem = removeChallanDraftItem;
    (window as any).processCreateChallan = processCreateChallan;
    (window as any).viewChallanById = viewChallanById;
    (window as any).viewChallanByOrderId = viewChallanByOrderId;
    (window as any).searchDealerForChallan = searchDealerForChallan;
    (window as any).executeChallanPrint = executeChallanPrint;
}
