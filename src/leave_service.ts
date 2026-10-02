import {
    getLeaveApplications, saveLeaveApplications,
    getCurrentRole, getCurrentUser, getCurrentZone, getCurrentUsername,
    getNotifications, saveNotifications,
    LeaveApplication
} from './bcare.ts';

export function openLeaveFormModal(editId?: string) {
    const apps = getLeaveApplications();
    const app = editId ? apps.find(a => a.id === editId) : null;

    if (app && app.status !== 'Pending') {
        alert('এডমিন কর্তৃক নিষ্পত্তি হওয়া আবেদন আর এডিট করা যাবে না!');
        return;
    }

    (document.getElementById('lfEditId') as HTMLInputElement).value = app ? app.id : '';
    (document.getElementById('lfReason') as HTMLInputElement).value = app ? app.reason : '';
    (document.getElementById('lfDays') as HTMLInputElement).value = app ? app.days.toString() : '3';
    (document.getElementById('lfFromDate') as HTMLInputElement).value = app ? app.fromDate : new Date().toISOString().split('T')[0];
    (document.getElementById('lfToDate') as HTMLInputElement).value = app ? app.toDate : new Date().toISOString().split('T')[0];
    
    (document.getElementById('lfModalTitle') as HTMLElement).innerText = app ? 'ছুটির আবেদন পরিবর্তন (এডিট)' : 'নতুন ছুটির আবেদন';

    document.getElementById('leaveApplyModal')?.classList.remove('hidden');
}

export function saveLeaveApplicationForm(e: Event) {
    e.preventDefault();
    const editId = (document.getElementById('lfEditId') as HTMLInputElement).value;
    const reason = (document.getElementById('lfReason') as HTMLInputElement).value.trim();
    const days = Number((document.getElementById('lfDays') as HTMLInputElement).value);
    const fromDate = (document.getElementById('lfFromDate') as HTMLInputElement).value;
    const toDate = (document.getElementById('lfToDate') as HTMLInputElement).value;

    if (days <= 0) {
        alert('ছুটির দিন সংখ্যা কমপক্ষে ১ হতে হবে!');
        return;
    }

    const apps = getLeaveApplications();
    const userName = getCurrentUser();
    const username = getCurrentUsername();
    const zone = getCurrentZone();

    if (editId) {
        const existing = apps.find(a => a.id === editId);
        if (existing && existing.status === 'Pending') {
            existing.reason = reason;
            existing.days = days;
            existing.fromDate = fromDate;
            existing.toDate = toDate;
            saveLeaveApplications(apps);
            alert('ছুটির আবেদন সফলভাবে আপডেট করা হয়েছে!');
        }
    } else {
        const newApp: LeaveApplication = {
            id: 'LV-' + Date.now().toString().slice(-5),
            name: userName,
            username: username,
            zone: zone,
            reason: reason,
            days: days,
            approvedDays: days,
            fromDate: fromDate,
            toDate: toDate,
            applyDate: new Date().toISOString().split('T')[0],
            status: 'Pending'
        };
        apps.unshift(newApp);
        saveLeaveApplications(apps);

        const notifs = getNotifications();
        notifs.unshift({
            id: 'NOTIF-' + Date.now(),
            targetUser: 'Admin',
            title: `🏖️ ছুটির আবেদন: ${userName}`,
            message: `${userName} (${zone} জোন) ${fromDate} হতে ${toDate} পর্যন্ত (${days} দিন) ছুটির আবেদন করেছেন (কারণ: ${reason})। এডমিনের অনুমোদনের অপেক্ষা।`,
            type: 'leave_approval',
            date: newApp.applyDate,
            read: false
        });
        saveNotifications(notifs);
        alert('ছুটির আবেদন সফলভাবে সাবমিট হয়েছে! এডমিনের অনুমোদনের অপেক্ষায় রয়েছে।');
    }

    document.getElementById('leaveApplyModal')?.classList.add('hidden');
    renderProfileLeaveSection();
    renderAdminLeaveBoard();
}

export function renderProfileLeaveSection() {
    const container = document.getElementById('profileLeaveContainer');
    if (!container) return;

    const apps = getLeaveApplications();
    const username = getCurrentUsername();
    const role = getCurrentRole();

    const userApps = apps.filter(a => role === 'admin' ? true : (a.username === username || a.name === getCurrentUser()));

    if (userApps.length === 0) {
        container.innerHTML = '<p class="text-xs text-slate-400 py-3 text-center">আপনার কোনো ছুটির আবেদন নেই।</p>';
        return;
    }

    container.innerHTML = '';
    userApps.forEach(a => {
        let badge = '';
        if (a.status === 'Approved') {
            badge = `<span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">অনুমোদিত (${a.approvedDays || a.days} দিন)</span>`;
        } else if (a.status === 'Rejected') {
            badge = `<span class="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full">প্রত্যাখ্যাত</span>`;
        } else {
            badge = `<span class="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">বিবেচনাধীন</span>`;
        }

        const editBtn = a.status === 'Pending'
            ? `<button onclick="window.openLeaveFormModal('${a.id}')" class="text-indigo-600 hover:text-indigo-800 text-xs font-bold underline ml-2">পরিবর্তন (Edit)</button>`
            : '';

        container.innerHTML += `
            <div class="bg-white p-3 rounded-lg border text-xs space-y-1">
                <div class="flex justify-between items-center">
                    <span class="font-bold text-slate-800">${a.reason}</span>
                    <div>${badge} ${editBtn}</div>
                </div>
                <div class="text-slate-500 text-[11px] flex justify-between">
                    <span>তারিখ: ${a.fromDate} হতে ${a.toDate} (${a.days} দিন)</span>
                    <span>আবেদনের তারিখ: ${a.applyDate}</span>
                </div>
                ${a.adminNote ? `<div class="bg-slate-50 p-1.5 rounded border text-[11px] text-slate-700 mt-1"><b>এডমিন নোট:</b> ${a.adminNote}</div>` : ''}
            </div>
        `;
    });
}

export function renderAdminLeaveBoard() {
    const tbody = document.getElementById('liveAppTableBody');
    if (!tbody) return;

    const apps = getLeaveApplications();
    const role = getCurrentRole();

    if (apps.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-slate-400">কোনো ছুটির আবেদন নেই।</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    apps.forEach((a, idx) => {
        let badge = '';
        if (a.status === 'Approved') {
            badge = `<span class="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">অনুমোদিত (${a.approvedDays || a.days} দিন)</span>`;
        } else if (a.status === 'Rejected') {
            badge = `<span class="bg-red-100 text-red-800 text-xs font-bold px-2.5 py-0.5 rounded-full">প্রত্যাখ্যাত</span>`;
        } else {
            badge = `<span class="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full animate-pulse">বিবেচনাধীন</span>`;
        }

        let actionHtml = '';
        if (a.status === 'Pending') {
            if (role === 'admin') {
                actionHtml = `
                    <div class="flex items-center gap-1 justify-end">
                        <button onclick="window.openAdminLeaveApprovalModal(${idx})" class="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded text-xs font-semibold shadow">
                            অনুমোদন ও দিন সমন্বয়
                        </button>
                        <button onclick="window.rejectLeaveDirect(${idx})" class="bg-red-50 text-red-600 hover:bg-red-100 px-2 py-1 rounded text-xs font-semibold border border-red-200">
                            প্রত্যাখ্যান
                        </button>
                    </div>
                `;
            } else {
                actionHtml = `<span class="text-xs text-slate-400 italic">এডমিনের অনুমোদনের অপেক্ষায়</span>`;
            }
        } else {
            actionHtml = `<span class="text-xs text-slate-500 font-medium">${a.adminNote || 'নিষ্পন্ন'}</span>`;
        }

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 border-b">
                <td class="p-3 font-semibold text-slate-800">${a.name}<br><span class="text-[10px] text-blue-700 font-bold bg-blue-50 px-1 rounded">${a.zone}</span></td>
                <td class="p-3 text-slate-700">${a.reason}</td>
                <td class="p-3 text-xs text-slate-500">${a.fromDate} হতে ${a.toDate}<br><b class="text-indigo-800">${a.days} দিন</b></td>
                <td class="p-3 text-xs text-slate-400">${a.applyDate}</td>
                <td class="p-3">${badge}</td>
                <td class="p-3 text-right whitespace-nowrap">${actionHtml}</td>
            </tr>
        `;
    });
}

export function openAdminLeaveApprovalModal(idx: number) {
    if (getCurrentRole() !== 'admin') {
        alert('শুধুমাত্র এডমিন অনুমোদন করতে পারেন!');
        return;
    }

    const apps = getLeaveApplications();
    const a = apps[idx];
    if (!a) return;

    (document.getElementById('apprLeaveApplicant') as HTMLElement).innerText = `${a.name} (${a.zone})`;
    (document.getElementById('apprLeaveReason') as HTMLElement).innerText = a.reason;
    (document.getElementById('apprLeaveRequestedDays') as HTMLElement).innerText = `${a.days} দিন (${a.fromDate} হতে ${a.toDate})`;
    (document.getElementById('apprLeaveIndex') as HTMLInputElement).value = idx.toString();
    (document.getElementById('apprLeaveDaysInput') as HTMLInputElement).value = (a.approvedDays || a.days).toString();
    (document.getElementById('apprLeaveNoteInput') as HTMLInputElement).value = '';

    document.getElementById('adminLeaveApprovalModal')?.classList.remove('hidden');
}

export function confirmAdminLeaveApproval(e: Event) {
    e.preventDefault();
    const idx = parseInt((document.getElementById('apprLeaveIndex') as HTMLInputElement).value);
    const approvedDays = Number((document.getElementById('apprLeaveDaysInput') as HTMLInputElement).value);
    const note = (document.getElementById('apprLeaveNoteInput') as HTMLInputElement).value.trim();

    if (approvedDays <= 0) {
        alert('অনুমোদিত ছুটির দিন কমপক্ষে ১ হতে হবে!');
        return;
    }

    const apps = getLeaveApplications();
    const a = apps[idx];
    if (!a) return;

    a.status = 'Approved';
    a.approvedDays = approvedDays;
    a.adminNote = note || `এডমিন কর্তৃক ${approvedDays} দিন ছুটি অনুমোদিত হয়েছে।`;
    saveLeaveApplications(apps);

    const notifs = getNotifications();
    notifs.unshift({
        id: 'NOTIF-' + Date.now(),
        targetUser: a.username || a.name,
        title: `🏖️ ছুটির আবেদন অনুমোদিত হয়েছে!`,
        message: `আপনার ${a.applyDate} তারিখের ছুটির আবেদনটি এডমিন কর্তৃক অনুমোদিত হয়েছে। অনুমোদিত দিন: ${approvedDays} দিন। ${note ? `নোট: ${note}` : ''}`,
        type: 'leave_approval',
        date: new Date().toISOString().split('T')[0],
        read: false
    });
    saveNotifications(notifs);

    document.getElementById('adminLeaveApprovalModal')?.classList.add('hidden');
    renderAdminLeaveBoard();
    renderProfileLeaveSection();
    alert(`ছুটির আবেদন সফলভাবে অনুমোদিত হয়েছে (${approvedDays} দিন)!`);
}

export function rejectLeaveDirect(idx: number) {
    if (getCurrentRole() !== 'admin') {
        alert('শুধুমাত্র এডমিন প্রত্যাখ্যান করতে পারেন!');
        return;
    }

    const note = prompt('প্রত্যাখ্যানের কারণ বা নোট লিখুন:', 'কাজের চাপ বেশি থাকার কারণে এই মুহূর্তে ছুটি সম্ভব নয়');
    if (note === null) return;

    const apps = getLeaveApplications();
    const a = apps[idx];
    if (!a) return;

    a.status = 'Rejected';
    a.adminNote = `প্রত্যাখ্যাত: ${note}`;
    saveLeaveApplications(apps);

    const notifs = getNotifications();
    notifs.unshift({
        id: 'NOTIF-' + Date.now(),
        targetUser: a.username || a.name,
        title: `❌ ছুটির আবেদন প্রত্যাখ্যাত হয়েছে`,
        message: `আপনার ${a.applyDate} তারিখের ছুটির আবেদনটি প্রত্যাখ্যাত হয়েছে। কারণ: ${note}`,
        type: 'leave_approval',
        date: new Date().toISOString().split('T')[0],
        read: false
    });
    saveNotifications(notifs);

    renderAdminLeaveBoard();
    renderProfileLeaveSection();
    alert('ছুটির আবেদন প্রত্যাখ্যাত হয়েছে।');
}

if (typeof window !== 'undefined') {
    (window as any).openLeaveFormModal = openLeaveFormModal;
    (window as any).saveLeaveApplicationForm = saveLeaveApplicationForm;
    (window as any).renderProfileLeaveSection = renderProfileLeaveSection;
    (window as any).renderAdminLeaveBoard = renderAdminLeaveBoard;
    (window as any).openAdminLeaveApprovalModal = openAdminLeaveApprovalModal;
    (window as any).confirmAdminLeaveApproval = confirmAdminLeaveApproval;
    (window as any).rejectLeaveDirect = rejectLeaveDirect;
}
