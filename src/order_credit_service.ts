import {
    getOrders, saveOrders,
    getDealers, saveDealers,
    getOrderCancelRequests, saveOrderCancelRequests,
    getCurrentRole, getCurrentUser,
    getNotifications, saveNotifications,
    OrderCancelRequest
} from './bcare.ts';

export function openOrderCancelModal(orderId: string, itemCode: string) {
    const orders = getOrders();
    const ord = orders.find(o => o.id === orderId);
    if (!ord) return;

    const item = ord.items.find(i => i.code === itemCode);
    if (!item) return;

    const remainingQty = (item.qty || 0) - (item.deliveredQty || 0);
    if (remainingQty <= 0) {
        alert('এই পণ্যটি ইতোমধ্যে সম্পূর্ণ ডেলিভারি হয়ে গেছে, তাই অর্ডার ক্যান্সেল করা যাবে না!');
        return;
    }

    (document.getElementById('cancelOrderId') as HTMLElement).innerText = ord.id;
    (document.getElementById('cancelDealerName') as HTMLElement).innerText = `${ord.dealerName} (${ord.zone})`;
    (document.getElementById('cancelItemName') as HTMLElement).innerText = `[${item.code}] ${item.name} (রেট: ৳${item.rate})`;
    (document.getElementById('cancelMaxQty') as HTMLElement).innerText = `${remainingQty} ${item.unit}`;

    (document.getElementById('cancelFormOrderId') as HTMLInputElement).value = ord.id;
    (document.getElementById('cancelFormItemCode') as HTMLInputElement).value = item.code;
    (document.getElementById('cancelFormDealerCode') as HTMLInputElement).value = ord.dealerCode;
    (document.getElementById('cancelQtyInput') as HTMLInputElement).value = remainingQty.toString();
    (document.getElementById('cancelQtyInput') as HTMLInputElement).max = remainingQty.toString();
    (document.getElementById('cancelReasonInput') as HTMLInputElement).value = 'ডিলারের নিজস্ব অনুরোধে বাতিল';

    document.getElementById('orderCancelModal')?.classList.remove('hidden');
}

export function submitOrderCancelRequest(e: Event) {
    e.preventDefault();
    const orderId = (document.getElementById('cancelFormOrderId') as HTMLInputElement).value;
    const itemCode = (document.getElementById('cancelFormItemCode') as HTMLInputElement).value;
    const dealerCode = (document.getElementById('cancelFormDealerCode') as HTMLInputElement).value;
    const cancelQty = Number((document.getElementById('cancelQtyInput') as HTMLInputElement).value);
    const reason = (document.getElementById('cancelReasonInput') as HTMLInputElement).value.trim();

    const orders = getOrders();
    const ord = orders.find(o => o.id === orderId);
    if (!ord) return;

    const item = ord.items.find(i => i.code === itemCode);
    if (!item) return;

    const remainingQty = (item.qty || 0) - (item.deliveredQty || 0);
    if (cancelQty <= 0 || cancelQty > remainingQty) {
        alert(`বাতিলকৃত পরিমাণ ১ থেকে ${remainingQty} এর মধ্যে হতে হবে!`);
        return;
    }

    const amount = cancelQty * item.rate;
    const requests = getOrderCancelRequests();
    const newReq: OrderCancelRequest = {
        id: 'CAN-' + Date.now().toString().slice(-6),
        orderId: ord.id,
        dealerCode: dealerCode,
        dealerName: ord.dealerName,
        itemCode: item.code,
        itemName: item.name,
        unit: item.unit || 'পিস',
        cancelQty: cancelQty,
        amount: amount,
        requestedBy: getCurrentUser(),
        date: new Date().toISOString().split('T')[0],
        reason: reason,
        status: 'Pending'
    };

    requests.unshift(newReq);
    saveOrderCancelRequests(requests);

    const notifs = getNotifications();
    notifs.unshift({
        id: 'NOTIF-' + Date.now(),
        targetUser: 'Admin',
        title: `⚠️ অর্ডার ক্যান্সেল ও ক্রেডিট আবেদন: ${ord.id}`,
        message: `${newReq.requestedBy} কর্তৃক ডিলার [${ord.dealerName}] এর অর্ডারের [${item.name}] পণ্য থেকে ${cancelQty} ${item.unit} বাতিলের আবেদন করা হয়েছে (ক্রেডিট মূল্য: ৳${amount.toLocaleString()})।`,
        type: 'order_cancel',
        date: newReq.date,
        read: false
    });
    saveNotifications(notifs);

    document.getElementById('orderCancelModal')?.classList.add('hidden');
    renderOrderCancelManagementBoard();
    if ((window as any).loadAllData) (window as any).loadAllData();
    alert(`অর্ডার বাতিলের আবেদন দাখিল হয়েছে! এডমিনের অনুমোদনের পর পণ্যটি আনডেলিভারি থেকে বাদ যাবে এবং ডিলারের ব্যালেন্সে ৳ ${amount.toLocaleString()} ক্রেডিট যুক্ত হবে।`);
}

export function renderOrderCancelManagementBoard() {
    const tbody = document.getElementById('orderCancelTableBody');
    if (!tbody) return;

    const requests = getOrderCancelRequests();
    const role = getCurrentRole();

    if (requests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="p-6 text-center text-slate-400">কোনো অর্ডার বাতিল আবেদন নেই।</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    requests.forEach((req, idx) => {
        let statusBadge = '';
        if (req.status === 'Approved') {
            statusBadge = `<span class="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-max"><i class="fa-solid fa-check"></i> অনুমোদিত (ক্রেডিট যোগ হয়েছে)</span>`;
        } else if (req.status === 'Rejected') {
            statusBadge = `<span class="bg-red-100 text-red-800 text-xs font-bold px-2 py-0.5 rounded-full w-max">বাতিলকৃত</span>`;
        } else {
            statusBadge = `<span class="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full animate-pulse w-max">এডমিন অনুমোদন পেন্ডিং</span>`;
        }

        let actionHtml = '';
        if (req.status === 'Pending') {
            if (role === 'admin') {
                actionHtml = `
                    <div class="flex items-center gap-1 justify-end">
                        <button onclick="window.approveOrderCancelRequest(${idx})" class="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded text-xs font-semibold shadow">
                            অনুমোদন করুন
                        </button>
                        <button onclick="window.rejectOrderCancelRequest(${idx})" class="bg-red-50 text-red-600 hover:bg-red-100 px-2 py-1 rounded text-xs font-semibold border border-red-200">
                            প্রত্যাখ্যান
                        </button>
                    </div>
                `;
            } else {
                actionHtml = `<span class="text-xs text-slate-400 italic">এডমিনের অনুমোদনের অপেক্ষায়</span>`;
            }
        } else {
            actionHtml = `<span class="text-xs text-slate-500 font-medium">${req.adminNote || 'কার্যক্রম সম্পন্ন'}</span>`;
        }

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 border-b">
                <td class="p-2.5 font-bold text-slate-800">${req.orderId}<br><span class="text-[10px] text-slate-500 font-normal">${req.date}</span></td>
                <td class="p-2.5 font-medium">${req.dealerName}</td>
                <td class="p-2.5 font-semibold text-slate-800">[${req.itemCode}] ${req.itemName}</td>
                <td class="p-2.5 text-center font-bold text-red-600">-${req.cancelQty} ${req.unit}</td>
                <td class="p-2.5 text-right font-bold text-emerald-700">৳ ${req.amount.toLocaleString()}</td>
                <td class="p-2.5 text-xs text-slate-600">${req.reason}</td>
                <td class="p-2.5">${statusBadge}</td>
                <td class="p-2.5 text-right whitespace-nowrap">${actionHtml}</td>
            </tr>
        `;
    });
}

export function approveOrderCancelRequest(idx: number) {
    if (getCurrentRole() !== 'admin') {
        alert('শুধুমাত্র এডমিন অনুমোদন করতে পারেন!');
        return;
    }

    const requests = getOrderCancelRequests();
    const req = requests[idx];
    if (!req) return;

    const orders = getOrders();
    const ord = orders.find(o => o.id === req.orderId);
    if (ord) {
        const item = ord.items.find(i => i.code === req.itemCode);
        if (item) {
            item.qty = Math.max(item.deliveredQty || 0, item.qty - req.cancelQty);
            ord.amount = ord.items.reduce((s, it) => s + (it.qty * it.rate), 0);
            ord.due = Math.max(0, ord.amount - ord.collection - (ord.creditUsed || 0));

            const allDelivered = ord.items.every(i => (i.deliveredQty || 0) >= i.qty);
            if (allDelivered) ord.deliveryStatus = 'Delivered';
        }
        saveOrders(orders);
    }

    const dealers = getDealers();
    const dealer = dealers.find(d => d.code === req.dealerCode);
    if (dealer) {
        dealer.credit = (dealer.credit || 0) + req.amount;
        saveDealers(dealers);
    }

    req.status = 'Approved';
    req.adminNote = `এডমিন কর্তৃক অনুমোদিত। ডিলার ব্যালেন্সে ৳ ${req.amount.toLocaleString()} ক্রেডিট যুক্ত হয়েছে।`;
    saveOrderCancelRequests(requests);

    const notifs = getNotifications();
    notifs.unshift({
        id: 'NOTIF-' + Date.now(),
        targetUser: 'All',
        title: `✅ অর্ডার বাতিল ও ক্রেডিট অনুমোদন: ${req.orderId}`,
        message: `ডিলার [${req.dealerName}] এর অর্ডারের [${req.itemName}] পণ্য বাতিল অনুমোদিত হয়েছে। ডিলারের একাউন্টে ৳ ${req.amount.toLocaleString()} ক্রেডিট যোগ হয়েছে।`,
        type: 'order_cancel',
        date: new Date().toISOString().split('T')[0],
        read: false
    });
    saveNotifications(notifs);

    renderOrderCancelManagementBoard();
    if ((window as any).loadAllData) (window as any).loadAllData();
    alert(`অর্ডার বাতিল সফলভাবে অনুমোদিত হয়েছে! আন্ডেলিভারি পণ্য সমন্বয় হয়েছে এবং ডিলারের একাউন্টে ৳ ${req.amount.toLocaleString()} ক্রেডিট যোগ হয়েছে।`);
}

export function rejectOrderCancelRequest(idx: number) {
    if (getCurrentRole() !== 'admin') {
        alert('শুধুমাত্র এডমিন বাতিল করতে পারেন!');
        return;
    }
    const note = prompt('বাতিলের কারণ উল্লেখ করুন:', 'পণ্য ইতোমধ্যে প্যাকেজিং সম্পন্ন বা গাড়িতে লোড হয়েছে');
    if (note === null) return;

    const requests = getOrderCancelRequests();
    const req = requests[idx];
    if (!req) return;

    req.status = 'Rejected';
    req.adminNote = `প্রত্যাখ্যান: ${note}`;
    saveOrderCancelRequests(requests);

    renderOrderCancelManagementBoard();
    alert('অর্ডার বাতিলের আবেদন প্রত্যাখ্যান করা হয়েছে।');
}

export function requestDealerCashRefund(dealerCode: string) {
    const dealers = getDealers();
    const d = dealers.find(x => x.code === dealerCode);
    if (!d || !d.credit || d.credit <= 0) {
        alert('এই ডিলারের কোনো অব্যবহৃত ক্রেডিট ব্যালেন্স নেই!');
        return;
    }

    const conf = confirm(`ডিলার [${d.name}] এর বর্তমান ক্রেডিট ৳ ${d.credit.toLocaleString()} সম্পূর্ণ ক্যাশ রিফান্ড নেওয়ার আবেদন একাউন্টস ম্যানেজারের কাছে পাঠাতে চান?`);
    if (!conf) return;

    const notifs = getNotifications();
    notifs.unshift({
        id: 'NOTIF-' + Date.now(),
        targetUser: 'accounts',
        title: `💵 ক্যাশ রিফান্ড আবেদন: ${d.name}`,
        message: `ডিলার [${d.name}] (কোড: ${d.code}) এর অর্জিত ক্রেডিট ৳ ${d.credit.toLocaleString()} নগদ টাকা ফেরত (ক্যাশ রিফান্ড) অনুমোদনের জন্য একাউন্টসে প্রেরণ করা হয়েছে।`,
        type: 'general',
        date: new Date().toISOString().split('T')[0],
        read: false
    });
    saveNotifications(notifs);

    alert(`ডিলার [${d.name}] এর ক্রেডিট ৳ ${d.credit.toLocaleString()} নগদ ফেরতের জন্য একাউন্টস ম্যানেজারের কাছে আবেদন সফলভাবে পাঠানো হয়েছে!`);
}

if (typeof window !== 'undefined') {
    (window as any).openOrderCancelModal = openOrderCancelModal;
    (window as any).submitOrderCancelRequest = submitOrderCancelRequest;
    (window as any).renderOrderCancelManagementBoard = renderOrderCancelManagementBoard;
    (window as any).approveOrderCancelRequest = approveOrderCancelRequest;
    (window as any).rejectOrderCancelRequest = rejectOrderCancelRequest;
    (window as any).requestDealerCashRefund = requestDealerCashRefund;
}
