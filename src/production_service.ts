import {
    getProducts, saveProducts,
    getProductionEntries, saveProductionEntries,
    getCurrentRole, getCurrentUser,
    getNotifications, saveNotifications,
    ProductionEntry
} from './bcare.ts';

export function openProductionEntryModal() {
    const role = getCurrentRole();
    if (role !== 'factory' && role !== 'admin') {
        alert('শুধুমাত্র ফ্যাক্টরি প্রোডাকশন ম্যানেজার ও এডমিন প্রোডাকশন এন্ট্রি দিতে পারবেন!');
        return;
    }

    const sel = document.getElementById('peProductSelect') as HTMLSelectElement | null;
    if (sel) {
        sel.innerHTML = '<option value="">-- প্রোডাক্ট নির্বাচন করুন --</option>';
        getProducts().forEach(p => {
            sel.innerHTML += `<option value="${p.code}" data-name="${p.name}" data-unit="${p.unit || 'পিস'}">[${p.code}] ${p.name} (বর্তমান স্টক: ${p.stock})</option>`;
        });
    }

    (document.getElementById('peBatchNo') as HTMLInputElement).value = 'BATCH-' + Date.now().toString().slice(-4);
    (document.getElementById('peQty') as HTMLInputElement).value = '';
    (document.getElementById('peDate') as HTMLInputElement).value = new Date().toISOString().split('T')[0];
    (document.getElementById('peNotes') as HTMLInputElement).value = '';

    document.getElementById('productionEntryModal')?.classList.remove('hidden');
}

export function saveProductionEntry(e: Event) {
    e.preventDefault();
    const sel = document.getElementById('peProductSelect') as HTMLSelectElement;
    const opt = sel.options[sel.selectedIndex];
    if (!sel.value) {
        alert('অনুগ্রহ করে একটি প্রোডাক্ট নির্বাচন করুন!');
        return;
    }

    const prodCode = sel.value;
    const prodName = opt.getAttribute('data-name') || '';
    const unit = opt.getAttribute('data-unit') || 'পিস';
    const batchNo = (document.getElementById('peBatchNo') as HTMLInputElement).value.trim();
    const qty = Number((document.getElementById('peQty') as HTMLInputElement).value);
    const date = (document.getElementById('peDate') as HTMLInputElement).value;
    const notes = (document.getElementById('peNotes') as HTMLInputElement).value.trim();

    if (qty <= 0) {
        alert('প্রোডাকশন সংখ্যা শূন্য বা তার কম হতে পারে না!');
        return;
    }

    const entries = getProductionEntries();
    const newEntry: ProductionEntry = {
        id: 'PRD-ENT-' + Date.now().toString().slice(-5),
        batchNo: batchNo,
        prodCode: prodCode,
        prodName: prodName,
        unit: unit,
        qty: qty,
        approvedQty: qty,
        date: date,
        enteredBy: getCurrentUser(),
        notes: notes,
        status: 'Pending'
    };

    entries.unshift(newEntry);
    saveProductionEntries(entries);

    const notifs = getNotifications();
    notifs.unshift({
        id: 'NOTIF-' + Date.now(),
        targetUser: 'Admin',
        title: `🏭 নতুন প্রোডাকশন অনুমোদনের অপেক্ষা: ${batchNo}`,
        message: `${newEntry.enteredBy} কর্তৃক [${prodName}] এর ${qty} ${unit} তৈরির এন্ট্রি দেওয়া হয়েছে। এডমিনের অনুমোদনের অপেক্ষা।`,
        type: 'production_approval',
        date: date,
        read: false
    });
    saveNotifications(notifs);

    (document.getElementById('productionEntryModal') as HTMLElement)?.classList.add('hidden');
    renderProductionManagementBoard();
    if ((window as any).loadAllData) (window as any).loadAllData();
    alert(`প্রোডাকশন ব্যাচ [${batchNo}] সফলভাবে এন্ট্রি হয়েছে! এডমিন অনুমোদন করার পর এটি স্বয়ংক্রিয়ভাবে মূল স্টকে যুক্ত হবে।`);
}

export function renderProductionManagementBoard() {
    const tbody = document.getElementById('productionTableBody');
    if (!tbody) return;

    const entries = getProductionEntries();
    const role = getCurrentRole();

    if (entries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="p-6 text-center text-slate-400">কোনো প্রোডাকশন এন্ট্রি নেই।</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    entries.forEach((ent, idx) => {
        let statusBadge = '';
        if (ent.status === 'Approved') {
            statusBadge = `<span class="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 w-max"><i class="fa-solid fa-check"></i> অনুমোদিত (স্টকে যোগ হয়েছে)</span>`;
        } else if (ent.status === 'Rejected') {
            statusBadge = `<span class="bg-red-100 text-red-800 text-xs font-bold px-2.5 py-1 rounded-full w-max">বাতিলকৃত</span>`;
        } else {
            statusBadge = `<span class="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full animate-pulse w-max">অনুমোদন পেন্ডিং</span>`;
        }

        let actionHtml = '';
        if (ent.status === 'Pending') {
            if (role === 'admin') {
                actionHtml = `
                    <div class="flex items-center gap-1 justify-end">
                        <button onclick="window.openAdminProductionApprovalModal(${idx})" class="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded text-xs font-semibold shadow">
                            অনুমোদন ও পরিবর্তন
                        </button>
                        <button onclick="window.rejectProductionEntry(${idx})" class="bg-red-50 text-red-600 hover:bg-red-100 px-2 py-1 rounded text-xs font-semibold border border-red-200">
                            বাতিল
                        </button>
                    </div>
                `;
            } else {
                actionHtml = `<span class="text-xs text-slate-400 italic">এডমিনের অনুমোদনের অপেক্ষায়</span>`;
            }
        } else {
            actionHtml = `<span class="text-xs text-slate-500 font-medium">${ent.adminNote || 'কার্যক্রম সম্পন্ন'}</span>`;
        }

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 border-b">
                <td class="p-3 font-mono font-bold text-slate-800">${ent.batchNo}<br><span class="text-[10px] text-slate-500 font-normal">${ent.date}</span></td>
                <td class="p-3 font-semibold text-slate-800">[${ent.prodCode}] ${ent.prodName}</td>
                <td class="p-3 font-bold text-indigo-700">${ent.qty} ${ent.unit}</td>
                <td class="p-3 font-bold text-emerald-700">${ent.approvedQty !== undefined ? `${ent.approvedQty} ${ent.unit}` : '-'}</td>
                <td class="p-3 text-xs text-slate-600">${ent.enteredBy}</td>
                <td class="p-3 text-xs text-slate-500">${ent.notes || '-'}</td>
                <td class="p-3">${statusBadge}</td>
                <td class="p-3 text-right whitespace-nowrap">${actionHtml}</td>
            </tr>
        `;
    });
}

export function openAdminProductionApprovalModal(idx: number) {
    if (getCurrentRole() !== 'admin') {
        alert('শুধুমাত্র এডমিন অনুমোদন করতে পারেন!');
        return;
    }

    const entries = getProductionEntries();
    const ent = entries[idx];
    if (!ent) return;

    (document.getElementById('apprProdBatchNo') as HTMLElement).innerText = ent.batchNo;
    (document.getElementById('apprProdName') as HTMLElement).innerText = `[${ent.prodCode}] ${ent.prodName}`;
    (document.getElementById('apprProdOriginalQty') as HTMLElement).innerText = `${ent.qty} ${ent.unit}`;
    (document.getElementById('apprProdIndex') as HTMLInputElement).value = idx.toString();
    (document.getElementById('apprProdQtyInput') as HTMLInputElement).value = (ent.approvedQty || ent.qty).toString();
    (document.getElementById('apprProdAdminNote') as HTMLInputElement).value = '';

    document.getElementById('adminProductionApprovalModal')?.classList.remove('hidden');
}

export function confirmAdminProductionApproval(e: Event) {
    e.preventDefault();
    const idx = parseInt((document.getElementById('apprProdIndex') as HTMLInputElement).value);
    const newQty = Number((document.getElementById('apprProdQtyInput') as HTMLInputElement).value);
    const adminNote = (document.getElementById('apprProdAdminNote') as HTMLInputElement).value.trim();

    if (newQty <= 0) {
        alert('অনুমোদিত সংখ্যা ০ বা তার কম হতে পারে না!');
        return;
    }

    const entries = getProductionEntries();
    const ent = entries[idx];
    if (!ent) return;

    ent.status = 'Approved';
    ent.approvedQty = newQty;
    ent.adminNote = adminNote || `এডমিন কর্তৃক ${newQty} ${ent.unit} অনুমোদিত হয়েছে।`;

    saveProductionEntries(entries);

    const products = getProducts();
    const prod = products.find(p => p.code === ent.prodCode);
    if (prod) {
        prod.stock = (prod.stock || 0) + newQty;
        saveProducts(products);
    }

    const notifs = getNotifications();
    notifs.unshift({
        id: 'NOTIF-' + Date.now(),
        targetUser: ent.enteredBy || 'factory1',
        title: `✅ প্রোডাকশন অনুমোদিত: ${ent.batchNo}`,
        message: `ব্যাচ [${ent.batchNo}] এর জন্য ${newQty} ${ent.unit} এডমিন কর্তৃক অনুমোদিত হয়েছে এবং সরাসরি মূল স্টকে যুক্ত হয়েছে।`,
        type: 'production_approval',
        date: new Date().toISOString().split('T')[0],
        read: false
    });
    saveNotifications(notifs);

    document.getElementById('adminProductionApprovalModal')?.classList.add('hidden');
    renderProductionManagementBoard();
    if ((window as any).loadAllData) (window as any).loadAllData();
    alert(`প্রোডাকশন ব্যাচ [${ent.batchNo}] সফলভাবে অনুমোদিত হয়েছে এবং ${newQty} ${ent.unit} সরাসরি স্টকে যুক্ত হয়েছে!`);
}

export function rejectProductionEntry(idx: number) {
    if (getCurrentRole() !== 'admin') {
        alert('শুধুমাত্র এডমিন বাতিল করতে পারেন!');
        return;
    }
    const note = prompt('বাতিলের কারণ উল্লেখ করুন:', 'ল্যাব টেস্ট উত্তীর্ণ নয় / মানসম্মত নয়');
    if (note === null) return;

    const entries = getProductionEntries();
    const ent = entries[idx];
    if (!ent) return;

    ent.status = 'Rejected';
    ent.adminNote = `বাতিল: ${note}`;
    saveProductionEntries(entries);

    renderProductionManagementBoard();
    alert('প্রোডাকশন ব্যাচ বাতিল করা হয়েছে।');
}

if (typeof window !== 'undefined') {
    (window as any).openProductionEntryModal = openProductionEntryModal;
    (window as any).saveProductionEntry = saveProductionEntry;
    (window as any).renderProductionManagementBoard = renderProductionManagementBoard;
    (window as any).openAdminProductionApprovalModal = openAdminProductionApprovalModal;
    (window as any).confirmAdminProductionApproval = confirmAdminProductionApproval;
    (window as any).rejectProductionEntry = rejectProductionEntry;
}
