import {
    bdDistricts,
    getUsers, saveUsers,
    getDealers, saveDealers,
    getProducts, saveProducts,
    getOrders, saveOrders,
    getSalesPersons, saveSalesPersons,
    getSalesTargets, saveSalesTargets,
    getDealerApps, saveDealerApps,
    getLiveApps, saveLiveApps,
    getChallans, saveChallans,
    getCurrentRole, getCurrentUser, getCurrentZone, getCurrentUsername,
    getNotifications, saveNotifications,
    getUserReadNotifIds, markNotifAsReadForUser, markAllNotifsAsReadForUser,
    isDealerActive,
    Dealer, Order, OrderItem, Product, SalesPerson, Challan, AppNotification
} from './bcare.ts';
import { printContent, getCompanyBranding } from './print_service.ts';
import {
    renderFactoryChallanPanel,
    loadDealerPendingChallanItems,
    processCreateChallan,
    viewChallanById,
    viewChallanByOrderId,
    searchDealerForChallan
} from './challan_service.ts';
import {
    openMasterModifyModal,
    switchMasterModifyTab,
    readFileAsBase64
} from './master_modify_service.ts';
import {
    openLeaveFormModal,
    saveLeaveApplicationForm,
    renderProfileLeaveSection,
    renderAdminLeaveBoard,
    openAdminLeaveApprovalModal,
    confirmAdminLeaveApproval,
    rejectLeaveDirect
} from './leave_service.ts';
import {
    openProductionEntryModal,
    saveProductionEntry,
    renderProductionManagementBoard,
    openAdminProductionApprovalModal,
    confirmAdminProductionApproval,
    rejectProductionEntry
} from './production_service.ts';
import {
    openSalesReturnModal,
    initSalesReturnTab,
    syncSalesReturnDealerInput,
    syncSalesReturnDealerSelect,
    selectDeliveryDateForReturn,
    showAllDeliveredForReturn,
    toggleReturnItemSelection,
    toggleSelectAllReturnItems,
    searchDeliveredChallanForReturn,
    updateReturnDraftQty,
    updateReturnCondition,
    removeReturnDraftItem,
    submitSalesReturnEntry,
    renderSalesReturnManagementBoard,
    openAdminReturnApprovalModal,
    confirmAdminReturnApproval,
    rejectSalesReturn
} from './sales_return_service.ts';
import {
    openOrderCancelModal,
    submitOrderCancelRequest,
    renderOrderCancelManagementBoard,
    approveOrderCancelRequest,
    rejectOrderCancelRequest,
    requestDealerCashRefund
} from './order_credit_service.ts';
import {
    renderDealerPortal,
    switchDealerSubTab
} from './dealer_portal_service.ts';

declare global {
    interface Window {
        [key: string]: any;
    }
}

export function initBCareApp() {
    applyCompanyBranding();
    populateDistricts();
    
    if (localStorage.getItem('bcare_logged_in') === 'true') {
        initApp();
    } else {
        try {
            const remembered = localStorage.getItem('bcare_remembered_credentials');
            if (remembered) {
                const creds = JSON.parse(remembered);
                const inputEl = document.getElementById('loginUserIdInput') as HTMLInputElement | null;
                const passEl = document.getElementById('loginPass') as HTMLInputElement | null;
                const remEl = document.getElementById('rememberMeCheckbox') as HTMLInputElement | null;
                if (inputEl && creds.username) inputEl.value = creds.username;
                if (passEl && creds.pass) passEl.value = creds.pass;
                if (remEl) remEl.checked = true;
            }
        } catch { /* ignore */ }
    }
}

export function populateDistricts() {
    const role = getCurrentRole();
    const userZone = getCurrentZone();
    const selects = ['ucZone', 'dlrZone', 'appDlrZone', 'spZone', 'dealerZoneFilter'];
    selects.forEach(id => {
        const el = document.getElementById(id) as HTMLSelectElement | null;
        if (el) {
            if (id === 'appDlrZone' && role === 'employee') {
                el.innerHTML = `<option value="${userZone}" selected>${userZone} জেলা (আপনার নির্ধারিত জোন)</option>`;
                el.disabled = true;
                return;
            }
            el.innerHTML = id === 'dealerZoneFilter' ? '<option value="All">সকল জোন (All Zones)</option>' : '';
            bdDistricts.forEach(d => {
                el.innerHTML += `<option value="${d}">${d} জেলা</option>`;
            });
        }
    });
}

export function togglePasswordVisibility() {
    const input = document.getElementById('loginPass') as HTMLInputElement | null;
    const icon = document.getElementById('passEyeIcon');
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        icon?.classList.remove('fa-eye');
        icon?.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon?.classList.remove('fa-eye-slash');
        icon?.classList.add('fa-eye');
    }
}

// Requirement 1: Login without role selection. Only ID and Password.
export function handleLogin(e: Event) {
    e.preventDefault();
    const inputEl = document.getElementById('loginUserIdInput') as HTMLInputElement;
    const passEl = document.getElementById('loginPass') as HTMLInputElement;
    const remEl = document.getElementById('rememberMeCheckbox') as HTMLInputElement;

    const rawId = (inputEl?.value || '').trim();
    const pass = (passEl?.value || '').trim();

    if (!rawId) {
        alert('অনুগ্রহ করে ইউজার আইডি / স্টাফ আইডি / ডিলার কোড লিখুন!');
        return;
    }

    const users = getUsers();
    const dealers = getDealers();
    const sps = getSalesPersons();

    let matchedUser = users.find(u => 
        u.username.toLowerCase() === rawId.toLowerCase() || 
        (u.code && u.code.toLowerCase() === rawId.toLowerCase())
    );

    // If not found in users, check dealers by code
    if (!matchedUser) {
        const d = dealers.find(x => x.code.toLowerCase() === rawId.toLowerCase());
        if (d) {
            matchedUser = {
                name: d.name,
                role: 'dealer',
                username: d.code,
                code: d.code,
                pass: '12345',
                zone: d.zone,
                status: d.status
            };
        }
    }

    // If not found in dealers, check sales persons by id
    if (!matchedUser) {
        const sp = sps.find(x => x.id.toLowerCase() === rawId.toLowerCase());
        if (sp) {
            matchedUser = {
                name: sp.name,
                role: 'employee',
                username: sp.id,
                code: sp.id,
                pass: '12345',
                zone: sp.zone,
                status: sp.status
            };
        }
    }

    // Default admin fallbacks
    if (!matchedUser) {
        const lower = rawId.toLowerCase();
        if (lower === 'admin1' || lower === 'admin') {
            matchedUser = {
                name: 'Admin 1 (এডমিন এক)',
                role: 'admin',
                username: 'admin1',
                pass: '12345',
                zone: 'All',
                status: 'Active'
            };
        } else if (lower === 'admin2') {
            matchedUser = {
                name: 'Admin 2 (এডমিন দুই)',
                role: 'admin',
                username: 'admin2',
                pass: '12345',
                zone: 'All',
                status: 'Active'
            };
        } else if (lower === 'factory1' || lower === 'factory') {
            matchedUser = {
                name: 'ফ্যাক্টরি ম্যানেজার',
                role: 'factory',
                username: 'factory1',
                pass: '12345',
                zone: 'All',
                status: 'Active'
            };
        } else if (lower === 'acc1' || lower === 'accounts') {
            matchedUser = {
                name: 'একাউন্টস ম্যানেজার',
                role: 'accounts',
                username: 'acc1',
                pass: '12345',
                zone: 'All',
                status: 'Active'
            };
        }
    }

    // Validate password
    const expectedPass = matchedUser?.pass || '12345';
    if (!matchedUser || pass !== expectedPass) {
        document.getElementById('loginError')?.classList.remove('hidden');
        return;
    }

    // Check inactive status
    if (matchedUser.status && (matchedUser.status.toLowerCase() === 'inactive' || matchedUser.status === 'নিষ্ক্রিয়')) {
        alert('⚠️ আপনার অ্যাকাউন্টটি বর্তমানে নিষ্ক্রিয় (Inactive) রয়েছে। এডমিন দ্বারা সক্রিয় না করা পর্যন্ত লগইন করা যাবে না।');
        return;
    }

    if (matchedUser.role === 'employee') {
        const spRecord = sps.find(s => s.name === matchedUser!.name || s.id === matchedUser!.code || s.id === matchedUser!.username);
        if (spRecord && (spRecord.status === 'Inactive' || spRecord.status === 'নিষ্ক্রিয়')) {
            alert('⚠️ আপনার সেলস পার্সন অ্যাকাউন্টটি বর্তমানে নিষ্ক্রিয় (Inactive) রয়েছে। এডমিনের সাথে যোগাযোগ করুন।');
            return;
        }
        if (spRecord && spRecord.zone) {
            matchedUser.zone = spRecord.zone;
        }
    }

    if (matchedUser.role === 'dealer') {
        const d = dealers.find(x => x.code === matchedUser!.code || x.code === matchedUser!.username || x.name === matchedUser!.name);
        if (d) {
            if (!isDealerActive(d)) {
                alert('⚠️ আপনার ডিলার অ্যাকাউন্টটি বর্তমানে নিষ্ক্রিয় (Inactive) রয়েছে। এডমিন দ্বারা সক্রিয় না করা পর্যন্ত লগইন বা কোনো রিপোর্ট দেখা যাবে না।');
                return;
            }
            localStorage.setItem('bcare_dealer_code', d.code);
        }
    }

    if (remEl && remEl.checked) {
        localStorage.setItem('bcare_remembered_credentials', JSON.stringify({
            username: matchedUser.username,
            pass: pass
        }));
    } else {
        localStorage.removeItem('bcare_remembered_credentials');
    }

    localStorage.setItem('bcare_logged_in', 'true');
    localStorage.setItem('bcare_role', matchedUser.role);
    localStorage.setItem('bcare_user', matchedUser.name);
    localStorage.setItem('bcare_username', matchedUser.username);
    localStorage.setItem('bcare_zone', matchedUser.zone || 'ঢাকা');
    
    document.getElementById('loginError')?.classList.add('hidden');
    initApp();
}

export function handleLogout() {
    localStorage.removeItem('bcare_logged_in');
    localStorage.removeItem('bcare_role');
    localStorage.removeItem('bcare_user');
    localStorage.removeItem('bcare_username');
    localStorage.removeItem('bcare_zone');
    localStorage.removeItem('bcare_dealer_code');
    location.reload();
}

export function initApp() {
    document.getElementById('loginPage')?.classList.add('hidden');
    document.getElementById('mainApp')?.classList.remove('hidden');
    const role = getCurrentRole();
    const user = getCurrentUser();
    const zone = getCurrentZone();

    const currentUserNameEl = document.getElementById('currentUserName');
    const currentUserRoleEl = document.getElementById('currentUserRole');
    if (currentUserNameEl) currentUserNameEl.innerText = user;
    if (currentUserRoleEl) currentUserRoleEl.innerText = `${role.toUpperCase()}${role === 'employee' ? ` (${zone} জোন)` : ''}`;

    if (role === 'dealer') {
        document.getElementById('btn-products')?.classList.add('hidden');
        document.getElementById('btn-dealers')?.classList.add('hidden');
        document.getElementById('btn-orders')?.classList.add('hidden');
        document.getElementById('btn-factoryPanel')?.classList.add('hidden');
        document.getElementById('btn-production')?.classList.add('hidden');
        document.getElementById('btn-records')?.classList.add('hidden');
        document.getElementById('btn-profile')?.classList.add('hidden');
        document.getElementById('btn-adminPanel')?.classList.add('hidden');
        document.getElementById('btn-masterModify')?.classList.add('hidden');
        document.getElementById('changeNoticeBtn')?.classList.add('hidden');
        document.getElementById('placeOrderBtnMain')?.classList.add('hidden');

        document.getElementById('btn-dealerPortal')?.classList.remove('hidden');
        renderDealerPortal();
        switchTab('dealerPortal');
        checkUserNotifications();
        return;
    } else {
        document.getElementById('btn-dealerPortal')?.classList.add('hidden');
        document.getElementById('btn-products')?.classList.remove('hidden');
        document.getElementById('btn-dealers')?.classList.remove('hidden');
        document.getElementById('btn-orders')?.classList.remove('hidden');
        document.getElementById('btn-records')?.classList.remove('hidden');
        document.getElementById('btn-profile')?.classList.remove('hidden');
    }

    if (role === 'admin') {
        document.getElementById('btn-adminPanel')?.classList.remove('hidden');
        document.getElementById('btn-masterModify')?.classList.remove('hidden');
        document.getElementById('changeNoticeBtn')?.classList.remove('hidden');
        document.getElementById('addProductBtn')?.classList.remove('hidden');
        document.getElementById('addDealerBtn')?.classList.remove('hidden');
        document.getElementById('dealerZoneFilterDiv')?.classList.remove('hidden');
    } else {
        document.getElementById('btn-adminPanel')?.classList.add('hidden');
        document.getElementById('btn-masterModify')?.classList.add('hidden');
        document.getElementById('addProductBtn')?.classList.add('hidden');
        document.getElementById('addDealerBtn')?.classList.add('hidden');
        document.getElementById('changeNoticeBtn')?.classList.add('hidden');
        document.getElementById('dealerZoneFilterDiv')?.classList.add('hidden');
    }

    if (role === 'admin' || role === 'factory') {
        document.getElementById('btn-factoryPanel')?.classList.remove('hidden');
        document.getElementById('btn-production')?.classList.remove('hidden');
    } else {
        document.getElementById('btn-factoryPanel')?.classList.add('hidden');
        document.getElementById('btn-production')?.classList.add('hidden');
    }

    if (role === 'admin' || role === 'factory' || role === 'employee') {
        document.getElementById('btn-salesReturn')?.classList.remove('hidden');
    } else {
        document.getElementById('btn-salesReturn')?.classList.add('hidden');
    }

    if (role === 'admin' || role === 'employee') {
        document.getElementById('placeOrderBtnMain')?.classList.remove('hidden');
    } else {
        document.getElementById('placeOrderBtnMain')?.classList.add('hidden');
    }

    applyCompanyBranding();
    loadAllData();
}

export function switchTab(id: string) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(el => {
        el.classList.remove('bg-emerald-600', 'text-white');
        el.classList.add('text-slate-600', 'hover:bg-slate-100');
    });
    const targetTab = document.getElementById('tab-' + id);
    if (targetTab) targetTab.classList.remove('hidden');

    const btn = document.getElementById('btn-' + id);
    if (btn) {
        btn.classList.add('bg-emerald-600', 'text-white');
        btn.classList.remove('text-slate-600', 'hover:bg-slate-100');
    }
    if (id === 'dealerPortal') renderDealerPortal();
    if (id === 'factoryPanel') renderFactoryChallanPanel();
    if (id === 'salesReturn') renderSalesReturnManagementBoard();
    if (id === 'adminPanel') {
        renderAdminEvaluationBoard();
        renderAdminLeaveBoard();
        renderOrderCancelManagementBoard();
    }
    if (id === 'profile') renderProfileAndLedger();
    if (id === 'production') renderProductionManagementBoard();
    if (id === 'records') generateMasterReport();
}

export function openCompanyBrandingModal() {
    if (getCurrentRole() !== 'admin') {
        alert('শুধুমাত্র এডমিন কোম্পানির নাম, স্লোগান ও ব্যানার পরিবর্তন করতে পারবেন!');
        return;
    }
    const branding = getCompanyBranding();
    const nameInput = document.getElementById('brandNameInput') as HTMLInputElement | null;
    const subInput = document.getElementById('brandSubtitleInput') as HTMLInputElement | null;
    const bannerInput = document.getElementById('brandBannerInput') as HTMLInputElement | null;

    if (nameInput) nameInput.value = branding.name || 'BCarebd.Com';
    if (subInput) subInput.value = branding.subtitle || 'ভেটেরিনারি অ্যানিম্যাল মেডিসিন প্রস্তুতকারক প্রতিষ্ঠান';
    if (bannerInput) bannerInput.value = branding.bannerText || 'BCarebd.Com পোর্টালে স্বাগতম। জোনভিত্তিক সেলস ও কালেকশন নিয়মিত আপডেট করুন।';

    document.getElementById('companyBrandingModal')?.classList.remove('hidden');
}

export function saveCompanyBranding(e: Event) {
    e.preventDefault();
    if (getCurrentRole() !== 'admin') {
        alert('শুধুমাত্র এডমিন কোম্পানির ব্র্যান্ডিং পরিবর্তন করতে পারবেন!');
        return;
    }
    const name = (document.getElementById('brandNameInput') as HTMLInputElement)?.value.trim();
    const subtitle = (document.getElementById('brandSubtitleInput') as HTMLInputElement)?.value.trim();
    const banner = (document.getElementById('brandBannerInput') as HTMLInputElement)?.value.trim();

    const branding = {
        name: name || 'BCarebd.Com',
        subtitle: subtitle || 'ভেটেরিনারি অ্যানিম্যাল মেডিসিন প্রস্তুতকারক প্রতিষ্ঠান',
        bannerText: banner || 'BCarebd.Com পোর্টালে স্বাগতম। জোনভিত্তিক সেলস ও কালেকশন নিয়মিত আপডেট করুন।'
    };

    localStorage.setItem('bcare_branding', JSON.stringify(branding));
    localStorage.setItem('bcare_notice', branding.bannerText);

    applyCompanyBranding();
    closeModal('companyBrandingModal');
    alert('কোম্পানির নাম, স্লোগান ও ব্যানার সফলভাবে আপডেট করা হয়েছে!');
}

export function applyCompanyBranding() {
    const branding = getCompanyBranding();
    const headerTitle = document.getElementById('companyHeaderTitle');
    const headerSubtitle = document.getElementById('companyHeaderSubtitle');
    const noticeEl = document.getElementById('topNoticeText');

    if (headerTitle) headerTitle.innerText = branding.name;
    if (headerSubtitle) headerSubtitle.innerText = branding.subtitle;
    if (noticeEl) noticeEl.innerText = branding.bannerText;
}

export function closeModal(id: string) {
    document.getElementById(id)?.classList.add('hidden');
}

export function zoomImage(src: string) {
    if (!src) return;
    const img = document.getElementById('zoomedImg') as HTMLImageElement;
    if (img) img.src = src;
    document.getElementById('imageZoomModal')?.classList.remove('hidden');
}

export function closeImageZoom() {
    document.getElementById('imageZoomModal')?.classList.add('hidden');
}

export function loadAllData() {
    renderProducts();
    renderDealers();
    renderOrders();
    renderSalesPersons();
    renderAdminEvaluationBoard();
    renderSystemUsers();
    renderDealerApps();
    renderLiveApps();
    renderAdminLeaveBoard();
    renderProfileLeaveSection();
    renderProductionManagementBoard();
    renderFactoryChallanPanel();
    checkUserNotifications();
}

export function renderDealers() {
    const list = getDealers();
    const tbody = document.getElementById('dealerTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const role = getCurrentRole();
    const userZone = getCurrentZone();

    let displayList = list;
    if (role === 'employee') {
        displayList = list.filter(d => d.zone === userZone);
        const infoBadge = document.getElementById('dealerZoneNotice');
        if (infoBadge) {
            infoBadge.innerHTML = `<span class="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-1 rounded">আপনার নির্ধারিত জোন: <b>${userZone}</b> (মোট ডিলার: ${displayList.length})</span>`;
        }
    } else {
        const filterVal = (document.getElementById('dealerZoneFilter') as HTMLSelectElement)?.value || 'All';
        if (filterVal !== 'All') {
            displayList = list.filter(d => d.zone === filterVal);
        }
        const infoBadge = document.getElementById('dealerZoneNotice');
        if (infoBadge) {
            infoBadge.innerHTML = `<span class="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-1 rounded">এডমিন ভিউ: সকল জোন (মোট ডিলার: ${displayList.length})</span>`;
        }
    }

    if (displayList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center text-slate-500 font-medium">কোনো ডিলার পাওয়া যায়নি (${role === 'employee' ? userZone + ' জোন' : 'সকল জোন'})।</td></tr>`;
        return;
    }

    displayList.forEach((d) => {
        const active = isDealerActive(d);
        const statusBadge = active
            ? `<span class="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-xs font-bold"><span class="w-2 h-2 rounded-full bg-emerald-600"></span> সক্রিয় (Active)</span>`
            : `<span class="inline-flex items-center gap-1.5 bg-red-100 text-red-800 px-2.5 py-1 rounded-full text-xs font-bold"><span class="w-2 h-2 rounded-full bg-red-600"></span> নিষ্ক্রিয় (Inactive)</span>`;

        let actionHtml = '';
        if (role === 'admin') {
            const toggleText = active ? 'নিষ্ক্রিয় করুন' : 'সক্রিয় করুন';
            const toggleClass = active ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200';
            actionHtml = `
                <div class="flex items-center justify-end space-x-1">
                    <button onclick="window.openEditDealerModal('${d.code}')" class="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 shadow-xs cursor-pointer" title="তথ্য ও ছবি এডিট করুন">
                        <i class="fa-solid fa-pen-to-square"></i> এডিট
                    </button>
                    <button onclick="toggleDealerStatus('${d.code}')" class="${toggleClass} px-2 py-1 rounded text-xs font-semibold cursor-pointer">${toggleText}</button>
                    <button onclick="deleteDealerByCode('${d.code}')" class="text-red-600 bg-red-50 hover:bg-red-100 px-2 py-1 rounded text-xs cursor-pointer">ডিলিট</button>
                </div>
            `;
        } else {
            actionHtml = `
                <span class="inline-flex items-center gap-1 text-slate-400 text-xs italic font-medium px-2 py-1 bg-slate-50 rounded border border-slate-200" title="সেলস পারসন ডিলার নিষ্ক্রিয় বা এডিট করতে পারবে না (শুধুমাত্র এডমিন করতে পারেন)">
                    <i class="fa-solid fa-eye text-slate-400"></i> শুধুমাত্র দর্শন
                </span>
            `;
        }

        const creditBadge = d.credit && d.credit > 0 
            ? `<div class="mt-1"><span class="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-xs inline-flex items-center gap-1"><i class="fa-solid fa-coins text-amber-600"></i> ক্রেডিট: ৳${d.credit.toLocaleString()}</span></div>`
            : '';

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 transition border-b">
                <td class="p-3"><img src="${d.image || 'https://images.unsplash.com/photo-1578496781985-452d4a934d50?w=80&auto=format&fit=crop&q=60'}" class="w-10 h-10 object-cover rounded-lg border cursor-pointer shadow-xs hover:opacity-90" onclick="zoomImage('${d.image || 'https://images.unsplash.com/photo-1578496781985-452d4a934d50?w=80&auto=format&fit=crop&q=60'}')"></td>
                <td class="p-3 font-bold text-emerald-800">${d.code}</td>
                <td class="p-3 font-medium text-slate-800">${d.name}${creditBadge}</td>
                <td class="p-3 text-xs font-semibold text-slate-600">${d.chairman || 'N/A'}</td>
                <td class="p-3 text-xs text-blue-700 font-semibold"><span class="bg-blue-50 px-2 py-0.5 rounded border border-blue-200">${d.zone}</span><br><span class="text-slate-500 font-normal mt-1 block">${d.address}</span></td>
                <td class="p-3 text-xs font-medium text-slate-700">${d.mobile}</td>
                <td class="p-3">${statusBadge}</td>
                <td class="p-3 text-right">${actionHtml}</td>
            </tr>
        `;
    });
    renderDealerApps();
}

export function filterDealersByZone() {
    renderDealers();
}

export function toggleDealerStatus(code: string) {
    if (getCurrentRole() !== 'admin') {
        alert('⚠️ ডিলার সক্রিয় বা নিষ্ক্রিয় করার অনুমতি শুধুমাত্র এডমিনের রয়েছে! সেলস পারসন ডিলার নিষ্ক্রিয় করতে পারবে না।');
        return;
    }
    const list = getDealers();
    const idx = list.findIndex(d => d.code === code);
    if (idx !== -1) {
        const currentActive = isDealerActive(list[idx]);
        list[idx].status = currentActive ? 'Inactive' : 'Active';
        saveDealers(list);
        renderDealers();
        alert(`ডিলার [${code}] সফলভাবে ${list[idx].status === 'Active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে!`);
    }
}

export function deleteDealerByCode(code: string) {
    if (getCurrentRole() !== 'admin') {
        alert('⚠️ ডিলার ডিলিট করার অনুমতি শুধুমাত্র এডমিনের রয়েছে!');
        return;
    }
    if (confirm(`ডিলার [${code}] সত্যিই ডিলিট করতে চান?`)) {
        let list = getDealers();
        list = list.filter(d => d.code !== code);
        saveDealers(list);
        renderDealers();
    }
}

export function openDealerModal() {
    if (getCurrentRole() !== 'admin') {
        alert('শুধুমাত্র এডমিন সরাসরি ডিলার যোগ করতে পারেন! সেলস পারসন ডিলার আবেদন ফরম ব্যবহার করবেন।');
        return;
    }
    document.getElementById('dealerModal')?.classList.remove('hidden');
}

export async function saveDealerDirect(e: Event) {
    e.preventDefault();
    if (getCurrentRole() !== 'admin') {
        alert('শুধুমাত্র এডমিন সরাসরি ডিলার যোগ করতে পারেন!');
        return;
    }
    const code = (document.getElementById('dlrCode') as HTMLInputElement).value.trim();
    const name = (document.getElementById('dlrName') as HTMLInputElement).value.trim();
    const chairman = (document.getElementById('dlrChairman') as HTMLInputElement).value.trim();
    const zone = (document.getElementById('dlrZone') as HTMLSelectElement).value;
    const mobile = (document.getElementById('dlrMobile') as HTMLInputElement).value.trim();
    const address = (document.getElementById('dlrAddress') as HTMLInputElement).value.trim();
    const status = (document.getElementById('dlrStatus') as HTMLSelectElement).value as 'Active' | 'Inactive';

    let image = '';
    const fileInput = document.getElementById('dlrImageFile') as HTMLInputElement;
    if (fileInput?.files && fileInput.files[0]) {
        image = await readFileAsBase64(fileInput.files[0]);
    }

    let list = getDealers();
    if (list.some(d => d.code === code)) {
        alert('এই কোডের ডিলার ইতোমধ্যে বিদ্যমান!');
        return;
    }
    list.push({
        code,
        name,
        chairman,
        zone,
        mobile,
        address,
        image: image || 'https://images.unsplash.com/photo-1578496781985-452d4a934d50?w=120&auto=format&fit=crop&q=60',
        status: status || 'Active'
    });
    saveDealers(list);
    closeModal('dealerModal');
    renderDealers();
    alert('ডিলার সফলভাবে যোগ করা হয়েছে!');
}

export async function previewDealerEditImage(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files[0]) {
        const b64 = await readFileAsBase64(target.files[0]);
        const img = document.getElementById('editDlrImagePreview') as HTMLImageElement;
        if (img) img.src = b64;
    }
}

export function openEditDealerModal(code: string) {
    if (getCurrentRole() !== 'admin') {
        alert('⚠️ ডিলার তথ্য এডিট বা পরিবর্তন করার অনুমতি শুধুমাত্র এডমিনের রয়েছে! সেলস পারসন শুধুমাত্র দেখতে পারবে।');
        return;
    }
    const dealers = getDealers();
    const d = dealers.find(x => x.code === code);
    if (!d) return;

    (document.getElementById('editDlrCode') as HTMLInputElement).value = d.code;
    (document.getElementById('editDlrCodeDisplay') as HTMLElement).innerText = `ডিলার কোড: ${d.code}`;
    (document.getElementById('editDlrName') as HTMLInputElement).value = d.name;
    (document.getElementById('editDlrChairman') as HTMLInputElement).value = d.chairman || '';
    (document.getElementById('editDlrMobile') as HTMLInputElement).value = d.mobile || '';
    (document.getElementById('editDlrAddress') as HTMLInputElement).value = d.address || '';
    (document.getElementById('editDlrStatus') as HTMLSelectElement).value = d.status || 'Active';

    const urlInput = document.getElementById('editDlrImageUrl') as HTMLInputElement;
    if (urlInput) urlInput.value = d.image && !d.image.startsWith('data:') ? d.image : '';

    const zoneSel = document.getElementById('editDlrZone') as HTMLSelectElement;
    if (zoneSel) {
        zoneSel.innerHTML = '';
        bdDistricts.forEach(dist => {
            zoneSel.innerHTML += `<option value="${dist}" ${dist === d.zone ? 'selected' : ''}>${dist} জেলা</option>`;
        });
    }

    const preview = document.getElementById('editDlrImagePreview') as HTMLImageElement;
    if (preview) {
        preview.src = d.image || 'https://images.unsplash.com/photo-1578496781985-452d4a934d50?w=120&auto=format&fit=crop&q=60';
    }

    const fileInput = document.getElementById('editDlrImageFile') as HTMLInputElement;
    if (fileInput) fileInput.value = '';

    document.getElementById('editDealerModal')?.classList.remove('hidden');
}

export async function saveEditDealer(e: Event) {
    e.preventDefault();
    if (getCurrentRole() !== 'admin') {
        alert('⚠️ ডিলার তথ্য এডিট বা পরিবর্তন করার অনুমতি শুধুমাত্র এডমিনের রয়েছে!');
        return;
    }
    const code = (document.getElementById('editDlrCode') as HTMLInputElement).value;
    const dealers = getDealers();
    const d = dealers.find(x => x.code === code);
    if (!d) return;

    d.name = (document.getElementById('editDlrName') as HTMLInputElement).value.trim();
    d.chairman = (document.getElementById('editDlrChairman') as HTMLInputElement).value.trim();
    d.zone = (document.getElementById('editDlrZone') as HTMLSelectElement).value;
    d.mobile = (document.getElementById('editDlrMobile') as HTMLInputElement).value.trim();
    d.address = (document.getElementById('editDlrAddress') as HTMLInputElement).value.trim();
    d.status = (document.getElementById('editDlrStatus') as HTMLSelectElement).value as any;

    const fileInput = document.getElementById('editDlrImageFile') as HTMLInputElement;
    if (fileInput?.files && fileInput.files[0]) {
        d.image = await readFileAsBase64(fileInput.files[0]);
    } else {
        const urlVal = (document.getElementById('editDlrImageUrl') as HTMLInputElement)?.value.trim();
        if (urlVal) {
            d.image = urlVal;
        }
    }

    saveDealers(dealers);
    closeModal('editDealerModal');
    renderDealers();
    alert(`ডিলার [${d.name}] এর তথ্য ও ছবি সফলভাবে সংরক্ষণ করা হয়েছে!`);
}

export function openOrderModal() {
    const role = getCurrentRole();
    if (role !== 'admin' && role !== 'employee') {
        alert('⚠️ অর্ডার এন্ট্রি শুধুমাত্র সেলসম্যান এবং এডমিন দিতে পারবেন!');
        return;
    }

    const dlrSel = document.getElementById('ordDealerSelect') as HTMLSelectElement | null;
    if (!dlrSel) return;
    dlrSel.innerHTML = '';

    const userZone = getCurrentZone();
    const allDealers = getDealers();

    let availableDealers = allDealers;
    if (role === 'employee') {
        availableDealers = allDealers.filter(d => d.zone === userZone);
    }

    if (availableDealers.length === 0) {
        alert(role === 'employee' ? `আপনার জোনে (${userZone}) কোনো ডিলার পাওয়া যায়নি!` : 'কোনো ডিলার পাওয়া যায়নি!');
        return;
    }

    availableDealers.forEach(d => {
        const active = isDealerActive(d);
        const statusText = active ? 'সক্রিয়' : 'নিষ্ক্রিয় (অর্ডার বন্ধ)';
        const disabledAttr = (role === 'employee' && !active) ? 'disabled class="text-red-500 bg-red-50"' : '';
        dlrSel.innerHTML += `<option value="${d.code}" data-name="${d.name}" data-zone="${d.zone}" data-status="${d.status}" ${disabledAttr}>[${d.code}] ${d.name} (${d.zone}) - ${statusText}</option>`;
    });

    checkSelectedDealerForOrder();

    document.getElementById('orderItemsContainer')!.innerHTML = '';
    addOrderItemRow();
    calculateOrderLiveTotal();
    document.getElementById('orderModal')?.classList.remove('hidden');
}

export function checkSelectedDealerForOrder() {
    const dlrSel = document.getElementById('ordDealerSelect') as HTMLSelectElement | null;
    const warningEl = document.getElementById('orderDealerWarning');
    if (!dlrSel || !warningEl) return;

    const opt = dlrSel.options[dlrSel.selectedIndex];
    if (!opt) return;

    const status = opt.getAttribute('data-status') || '';
    const active = status.toLowerCase() === 'active' || status === 'সক্রিয়';
    const role = getCurrentRole();

    if (!active) {
        warningEl.classList.remove('hidden');
        warningEl.innerHTML = `⚠️ <b>সতর্কতা:</b> এই ডিলারটি <b>নিষ্ক্রিয় (Inactive)</b>। ${role === 'employee' ? '<span class="text-red-700 font-bold underline">সেলস পারসন নিষ্ক্রিয় ডিলারের কোডে অর্ডার প্লেস করতে পারবে না!</span>' : 'এডমিন হিসেবে অর্ডার প্লেস করা যাবে।'}`;
    } else {
        warningEl.classList.add('hidden');
    }
}

export function addOrderItemRow() {
    const container = document.getElementById('orderItemsContainer');
    if (!container) return;
    const products = getProducts();
    let prodOptions = products.map(p => `<option value="${p.code}" data-name="${p.name}" data-unit="${p.unit || 'পিস'}" data-rate="${p.rate}">[${p.code}] ${p.name} - ৳${p.rate} (${p.unit || 'পিস'})</option>`).join('');

    const row = document.createElement('div');
    row.className = 'flex gap-2 items-center item-row bg-white p-2 rounded-lg border';
    row.innerHTML = `
        <select class="prod-select flex-grow px-2 py-1.5 border rounded-lg text-sm bg-white" onchange="calculateOrderLiveTotal()">${prodOptions}</select>
        <input type="number" min="1" value="1" class="qty-input w-24 px-2 py-1.5 border rounded-lg text-sm text-center" placeholder="পরিমাণ" oninput="calculateOrderLiveTotal()">
        <button type="button" onclick="this.parentElement.remove(); calculateOrderLiveTotal();" class="text-red-600 hover:text-red-800 px-2 py-1 text-sm font-bold">×</button>
    `;
    container.appendChild(row);
    calculateOrderLiveTotal();
}

export function calculateOrderLiveTotal() {
    let total = 0;
    document.querySelectorAll('.item-row').forEach(row => {
        const s = row.querySelector('.prod-select') as HTMLSelectElement;
        const q = row.querySelector('.qty-input') as HTMLInputElement;
        if (s && q) {
            const opt = s.options[s.selectedIndex];
            const rate = Number(opt?.getAttribute('data-rate') || 0);
            const qty = Number(q.value) || 0;
            total += (rate * qty);
        }
    });

    const billEl = document.getElementById('liveTotalBill');
    const dueEl = document.getElementById('liveDueAmount');
    const collInput = document.getElementById('ordCollection') as HTMLInputElement;
    const collection = Number(collInput?.value || 0);

    if (billEl) billEl.innerText = `৳ ${total.toLocaleString()}`;
    if (dueEl) dueEl.innerText = `৳ ${(total - collection).toLocaleString()}`;
}

export function saveOrder(e: Event) {
    e.preventDefault();
    const role = getCurrentRole();
    if (role !== 'admin' && role !== 'employee') {
        alert('⚠️ অর্ডার এন্ট্রি শুধুমাত্র সেলসম্যান এবং এডমিন দিতে পারবেন!');
        return;
    }

    const dlrSelect = document.getElementById('ordDealerSelect') as HTMLSelectElement;
    const opt = dlrSelect.options[dlrSelect.selectedIndex];
    if (!opt) {
        alert('অনুগ্রহ করে একজন ডিলার নির্বাচন করুন!');
        return;
    }

    const dealerCode = dlrSelect.value;
    const dealerName = opt.getAttribute('data-name') || '';
    const dealerZone = opt.getAttribute('data-zone') || '';
    const rawStatus = opt.getAttribute('data-status') || '';
    const isDealerActiveStatus = rawStatus.toLowerCase() === 'active' || rawStatus === 'সক্রিয়';

    const userZone = getCurrentZone();
    const userName = getCurrentUser();

    if (role === 'employee' && !isDealerActiveStatus) {
        alert('⚠️ ডিলার নিষ্ক্রিয় (Inactive)! সেলস পারসন নিষ্ক্রিয় ডিলারের কোডে কোনো অর্ডার প্লেস করতে পারবে না।');
        return;
    }

    if (role === 'employee' && dealerZone !== userZone) {
        alert(`⚠️ অঞ্চল বৈষম্য: আপনি [${userZone}] জোনের সেলস ম্যান। আপনি [${dealerZone}] জোনের ডিলারের জন্য অর্ডার প্লেস করতে পারবেন না।`);
        return;
    }

    const items: OrderItem[] = [];
    let totalAmount = 0;

    const rows = document.querySelectorAll('.item-row');
    if (rows.length === 0) {
        alert('কমপক্ষে একটি আইটেম যোগ করুন!');
        return;
    }

    rows.forEach(row => {
        const s = row.querySelector('.prod-select') as HTMLSelectElement;
        const selectedOpt = s.options[s.selectedIndex];
        const qty = Number((row.querySelector('.qty-input') as HTMLInputElement).value);
        const rate = Number(selectedOpt.getAttribute('data-rate'));
        totalAmount += (qty * rate);
        items.push({
            code: selectedOpt.value,
            name: selectedOpt.getAttribute('data-name') || '',
            unit: selectedOpt.getAttribute('data-unit') || 'পিস',
            qty: qty,
            deliveredQty: 0,
            rate: rate
        });
    });

    const collection = Number((document.getElementById('ordCollection') as HTMLInputElement).value);
    const orders = getOrders();
    const newOrderId = 'ORD-' + (1000 + orders.length + 1);

    const newOrder: Order = {
        id: newOrderId,
        date: new Date().toISOString().split('T')[0],
        dealerCode: dealerCode,
        dealerName: dealerName,
        zone: dealerZone,
        emp: userName,
        items: items,
        amount: totalAmount,
        collection: collection,
        due: totalAmount - collection,
        deliveryStatus: 'Pending'
    };

    orders.unshift(newOrder);
    saveOrders(orders);
    closeModal('orderModal');
    loadAllData();
    alert(`অর্ডার [${newOrderId}] সফলভাবে প্লেস করা হয়েছে!`);
}

// Requirement 3: Comprehensive fix for Undelivered and Delivered Reports
export function generateMasterReport() {
    const type = (document.getElementById('reportType') as HTMLSelectElement).value;
    const timeframe = (document.getElementById('reportTimeframe') as HTMLSelectElement).value;
    const container = document.getElementById('masterReportContainer');
    if (!container) return;

    const role = getCurrentRole();
    const userZone = getCurrentZone();

    let orders = getOrders();
    let dealers = getDealers();
    let targets = getSalesTargets();
    let challans = getChallans();

    if (role === 'employee') {
        orders = orders.filter(o => o.zone === userZone);
        dealers = dealers.filter(d => d.zone === userZone);
        targets = targets.filter(t => t.zone === userZone);
        challans = challans.filter(c => c.dealerZone === userZone);
    }

    const zoneHeader = role === 'employee'
        ? `<div class="bg-blue-50 border border-blue-200 text-blue-900 px-3 py-1.5 rounded-lg text-xs font-semibold mb-3">রিপোর্ট অঞ্চল: <b>${userZone} জোন (সেলস ম্যান: ${getCurrentUser()})</b></div>`
        : `<div class="bg-emerald-50 border border-emerald-200 text-emerald-900 px-3 py-1.5 rounded-lg text-xs font-semibold mb-3">রিপোর্ট অঞ্চল: <b>সকল জোন (Admin View)</b></div>`;

    let html = `
        <div class="printable-report space-y-4 p-4">
            <div class="text-center border-b pb-2">
                <h3 class="text-lg font-bold text-slate-800">BCarebd.Com - Master Report (${timeframe.toUpperCase()})</h3>
                <p class="text-xs text-slate-500">তারিখ: ${new Date().toLocaleDateString('bn-BD')}</p>
            </div>
            ${zoneHeader}
    `;

    const marksBlock = `
        <div class="flex justify-between pt-10 mt-6 border-t text-xs font-semibold text-slate-700">
            <div>তৈরী করেছেন: ____________<br><span class="text-[10px] text-slate-500">(${getCurrentUser()})</span></div>
            <div>ম্যানেজার স্বাক্ষর: ____________</div>
            <div>এডমিন সিল ও অনুমোদন: ____________</div>
        </div>
    `;

    // 1. UNDELIVERED REPORT: Fix accurate calculation of pending remaining quantities
    if (type === 'dealerUndelivered') {
        const undeliveredMap: { 
            [key: string]: { 
                dealerCode: string;
                dealer: string; 
                zone: string; 
                code: string; 
                name: string; 
                unit: string;
                rate: number;
                totalOrdered: number;
                delivered: number;
                pendingQty: number; 
                pendingValue: number;
                orderRefs: { id: string; date: string; rem: number }[];
            } 
        } = {};

        let grandPendingQty = 0;
        let grandPendingValue = 0;

        orders.forEach(o => {
            o.items.forEach(i => {
                const del = i.deliveredQty || 0;
                const rem = (i.qty || 0) - del;
                if (rem > 0) {
                    const key = `${o.dealerCode}_${i.code}`;
                    if (!undeliveredMap[key]) {
                        undeliveredMap[key] = {
                            dealerCode: o.dealerCode,
                            dealer: o.dealerName,
                            zone: o.zone,
                            code: i.code,
                            name: i.name,
                            unit: i.unit || 'পিস',
                            rate: i.rate || 0,
                            totalOrdered: 0,
                            delivered: 0,
                            pendingQty: 0,
                            pendingValue: 0,
                            orderRefs: []
                        };
                    }
                    undeliveredMap[key].totalOrdered += i.qty;
                    undeliveredMap[key].delivered += del;
                    undeliveredMap[key].pendingQty += rem;
                    undeliveredMap[key].pendingValue += (rem * (i.rate || 0));
                    undeliveredMap[key].orderRefs.push({ id: o.id, date: o.date, rem: rem });

                    grandPendingQty += rem;
                    grandPendingValue += (rem * (i.rate || 0));
                }
            });
        });

        const rows = Object.values(undeliveredMap);

        html += `
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                    <span class="text-xs text-amber-800 font-bold uppercase">মোট আনডেলিভারি পণ্যের সংখ্যা</span>
                    <h4 class="text-xl font-black text-amber-900 mt-1">${grandPendingQty.toLocaleString()} টি</h4>
                </div>
                <div class="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                    <span class="text-xs text-red-800 font-bold uppercase">মোট আনডেলিভারি পণ্যের আর্থিক মূল্য</span>
                    <h4 class="text-xl font-black text-red-900 mt-1">৳ ${grandPendingValue.toLocaleString()}</h4>
                </div>
            </div>

            <table class="w-full text-left border-collapse text-xs">
                <thead>
                    <tr class="bg-slate-100 text-slate-700 font-bold">
                        <th class="p-2 border">ডিলার কোড ও নাম</th>
                        <th class="p-2 border">জোন</th>
                        <th class="p-2 border">প্রোডাক্ট কোড ও নাম</th>
                        <th class="p-2 border text-center">অর্ডার সংখ্যা</th>
                        <th class="p-2 border text-center text-emerald-800">ডেলিভার্ড</th>
                        <th class="p-2 border text-center text-amber-700 font-black bg-amber-50">সঠিক বাকি সংখ্যা (Undelivered)</th>
                        <th class="p-2 border text-right">বাকি মূল্য (৳)</th>
                        <th class="p-2 border">সংশ্লিষ্ট অর্ডার নম্বর ও তারিখসমূহ</th>
                    </tr>
                </thead>
                <tbody>
        `;

        if (rows.length === 0) {
            html += `<tr><td colspan="8" class="p-6 text-center text-emerald-700 font-bold bg-emerald-50">🎉 কোনো আনডেলিভার্ড অর্ডার নেই! সকল পণ্য সফলভাবে ডেলিভারি করা হয়েছে।</td></tr>`;
        } else {
            rows.forEach(m => {
                const orderSummary = m.orderRefs.map(r => `${r.id} (${r.rem} ${m.unit})`).join(', ');
                html += `
                    <tr class="hover:bg-slate-50 border-b">
                        <td class="p-2 border font-medium">[${m.dealerCode}] ${m.dealer}</td>
                        <td class="p-2 border text-blue-700 font-semibold">${m.zone}</td>
                        <td class="p-2 border font-bold text-slate-800">[${m.code}] ${m.name}</td>
                        <td class="p-2 border text-center">${m.totalOrdered} ${m.unit}</td>
                        <td class="p-2 border text-center text-emerald-700 font-bold">${m.delivered} ${m.unit}</td>
                        <td class="p-2 border text-center font-black text-amber-700 bg-amber-50/70 text-sm">${m.pendingQty} ${m.unit}</td>
                        <td class="p-2 border text-right font-bold text-red-700">৳ ${m.pendingValue.toLocaleString()}</td>
                        <td class="p-2 border text-[11px] text-slate-600 font-mono">${orderSummary}</td>
                    </tr>
                `;
            });

            html += `
                <tr class="bg-slate-100 font-bold border-t-2 border-slate-300">
                    <td colspan="5" class="p-2.5 text-right uppercase">সর্বমোট আনডেলিভারি (Grand Total):</td>
                    <td class="p-2.5 text-center text-amber-900 bg-amber-100 text-sm">${grandPendingQty.toLocaleString()} টি</td>
                    <td class="p-2.5 text-right text-red-800 font-black">৳ ${grandPendingValue.toLocaleString()}</td>
                    <td class="p-2.5"></td>
                </tr>
            `;
        }
        html += `</tbody></table>`;
    } 
    // 2. DELIVERY REPORT: Include ALL delivered items (from Challans and Orders)
    else if (type === 'dealerDelivery') {
        let totalDeliveredQty = 0;
        let totalDeliveredValue = 0;
        const deliveryEntries: {
            refId: string;
            type: 'Challan' | 'Order';
            date: string;
            dealerCode: string;
            dealerName: string;
            zone: string;
            itemsDesc: string;
            totalQty: number;
            totalAmount: number;
            preparedBy: string;
            notes: string;
        }[] = [];

        // Add from Challans
        challans.forEach(c => {
            let chValue = 0;
            const itemsList = c.items.map(i => {
                const lineVal = (i.qty || 0) * (i.rate || 0);
                chValue += lineVal;
                return `${i.name}: <b>${i.qty} ${i.unit}</b>`;
            }).join(', ');

            totalDeliveredQty += c.totalQty;
            totalDeliveredValue += chValue;

            deliveryEntries.push({
                refId: c.id,
                type: 'Challan',
                date: c.timestamp || c.date,
                dealerCode: c.dealerCode,
                dealerName: c.dealerName,
                zone: c.dealerZone,
                itemsDesc: itemsList,
                totalQty: c.totalQty,
                totalAmount: chValue,
                preparedBy: c.preparedBy || 'ফ্যাক্টরি ইনচার্জ',
                notes: c.notes || 'গেটপাস চালান'
            });
        });

        // Add from Orders that have delivered items not tracked in challans
        orders.forEach(o => {
            const hasChallanForOrder = challans.some(c => c.items.some(it => it.ordersInfo && it.ordersInfo.includes(o.id)));
            if (!hasChallanForOrder && (o.deliveryStatus === 'Delivered' || o.items.some(i => (i.deliveredQty || 0) > 0))) {
                let ordDelQty = 0;
                let ordDelVal = 0;
                const itemsList = o.items.filter(i => (i.deliveredQty || 0) > 0 || o.deliveryStatus === 'Delivered').map(i => {
                    const dQty = o.deliveryStatus === 'Delivered' ? i.qty : (i.deliveredQty || 0);
                    ordDelQty += dQty;
                    ordDelVal += (dQty * i.rate);
                    return `${i.name}: <b>${dQty} ${i.unit}</b>`;
                }).join(', ');

                if (ordDelQty > 0) {
                    totalDeliveredQty += ordDelQty;
                    totalDeliveredValue += ordDelVal;

                    deliveryEntries.push({
                        refId: o.id,
                        type: 'Order',
                        date: o.date,
                        dealerCode: o.dealerCode,
                        dealerName: o.dealerName,
                        zone: o.zone,
                        itemsDesc: itemsList,
                        totalQty: ordDelQty,
                        totalAmount: ordDelVal,
                        preparedBy: o.emp,
                        notes: 'সরাসরি ডেলিভারি'
                    });
                }
            }
        });

        html += `
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <div class="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                    <span class="text-xs text-blue-800 font-bold uppercase">মোট ডেলিভারি সংখ্যা / চালান</span>
                    <h4 class="text-xl font-black text-blue-900 mt-1">${deliveryEntries.length} টি</h4>
                </div>
                <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                    <span class="text-xs text-emerald-800 font-bold uppercase">সর্বমোট ডেলিভারিকৃত পণ্য</span>
                    <h4 class="text-xl font-black text-emerald-900 mt-1">${totalDeliveredQty.toLocaleString()} টি</h4>
                </div>
                <div class="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
                    <span class="text-xs text-purple-800 font-bold uppercase">মোট ডেলিভারি পণ্যের আর্থিক মূল্য</span>
                    <h4 class="text-xl font-black text-purple-900 mt-1">৳ ${totalDeliveredValue.toLocaleString()}</h4>
                </div>
            </div>

            <table class="w-full text-left border-collapse text-xs">
                <thead>
                    <tr class="bg-slate-100 text-slate-700 font-bold">
                        <th class="p-2 border">ডেলিভারি রেফারেন্স</th>
                        <th class="p-2 border">তারিখ ও সময়</th>
                        <th class="p-2 border">ডিলার কোড ও নাম</th>
                        <th class="p-2 border">জোন</th>
                        <th class="p-2 border">ডেলিভারিকৃত পণ্য বিবরণ</th>
                        <th class="p-2 border text-center text-emerald-800">মোট সংখ্যা</th>
                        <th class="p-2 border text-right">মূল্য (৳)</th>
                        <th class="p-2 border">পরিবহন / ইনচার্জ</th>
                        <th class="p-2 border text-right">চালান প্রিন্ট</th>
                    </tr>
                </thead>
                <tbody>
        `;

        if (deliveryEntries.length === 0) {
            html += `<tr><td colspan="9" class="p-6 text-center text-slate-400">কোনো ডেলিভারি রেকর্ড পাওয়া যায়নি।</td></tr>`;
        } else {
            deliveryEntries.forEach(ent => {
                const actionBtn = ent.type === 'Challan'
                    ? `<button onclick="window.viewChallanById('${ent.refId}')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded text-xs font-bold inline-flex items-center gap-1 shadow-xs transition"><i class="fa-solid fa-file-invoice"></i> চালান ভিউ</button>`
                    : `<button onclick="window.printOrderInvoice('${ent.refId}')" class="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-bold inline-flex items-center gap-1 shadow-xs transition"><i class="fa-solid fa-print"></i> ইনভয়েস</button>`;

                html += `
                    <tr class="hover:bg-slate-50 border-b">
                        <td class="p-2 border font-bold text-emerald-800 font-mono">${ent.refId}</td>
                        <td class="p-2 border text-slate-600">${ent.date}</td>
                        <td class="p-2 border font-medium">[${ent.dealerCode}] ${ent.dealerName}</td>
                        <td class="p-2 border text-blue-700 font-semibold">${ent.zone}</td>
                        <td class="p-2 border text-[11px] leading-relaxed">${ent.itemsDesc}</td>
                        <td class="p-2 border text-center font-bold text-emerald-700">${ent.totalQty}</td>
                        <td class="p-2 border text-right font-bold text-slate-800">৳ ${ent.totalAmount.toLocaleString()}</td>
                        <td class="p-2 border text-slate-500 text-[11px]">${ent.preparedBy} (${ent.notes})</td>
                        <td class="p-2 border text-right">${actionBtn}</td>
                    </tr>
                `;
            });

            html += `
                <tr class="bg-slate-100 font-bold border-t-2 border-slate-300">
                    <td colspan="5" class="p-2.5 text-right uppercase">সর্বমোট ডেলিভারি (Grand Total):</td>
                    <td class="p-2.5 text-center text-emerald-900 bg-emerald-100 text-sm">${totalDeliveredQty.toLocaleString()} টি</td>
                    <td class="p-2.5 text-right text-emerald-900 font-black">৳ ${totalDeliveredValue.toLocaleString()}</td>
                    <td colspan="2" class="p-2.5"></td>
                </tr>
            `;
        }
        html += `</tbody></table>`;
    } else if (type === 'dealerMoneyDue') {
        html += `<table class="w-full text-left border-collapse text-xs"><thead><tr class="bg-slate-100"><th class="p-2 border">ডিলার কোড ও নাম</th><th class="p-2 border">জোন</th><th class="p-2 border">স্ট্যাটাস</th><th class="p-2 border">মোট বিল (৳)</th><th class="p-2 border">নগদ কালেকশন (৳)</th><th class="p-2 border">বাকি (Due ৳)</th></tr></thead><tbody>`;
        if (dealers.length === 0) {
            html += `<tr><td colspan="6" class="p-4 text-center text-slate-500">কোনো ডিলার পাওয়া যায়নি।</td></tr>`;
        } else {
            dealers.forEach(d => {
                const dlrOrders = orders.filter(o => o.dealerCode === d.code);
                const totBill = dlrOrders.reduce((sum, o) => sum + o.amount, 0);
                const totColl = dlrOrders.reduce((sum, o) => sum + o.collection, 0);
                const totDue = totBill - totColl;
                const statusBadge = isDealerActive(d)
                    ? `<span class="text-emerald-700 font-bold">সক্রিয়</span>`
                    : `<span class="text-red-600 font-bold">নিষ্ক্রিয়</span>`;
                html += `<tr><td class="p-2 border font-medium">[${d.code}] ${d.name}</td><td class="p-2 border text-blue-700 font-semibold">${d.zone}</td><td class="p-2 border">${statusBadge}</td><td class="p-2 border font-bold">৳${totBill.toLocaleString()}</td><td class="p-2 border text-emerald-700 font-bold">৳${totColl.toLocaleString()}</td><td class="p-2 border text-amber-600 font-bold">৳${totDue.toLocaleString()}</td></tr>`;
            });
        }
        html += `</tbody></table>`;
    } else if (type === 'salesTargetAchieve') {
        html += `<table class="w-full text-left border-collapse text-xs"><thead><tr class="bg-slate-100"><th class="p-2 border">নাম ও ক্যাটাগরি</th><th class="p-2 border">জোন</th><th class="p-2 border">টার্গেট (৳)</th><th class="p-2 border">অর্জন (৳)</th><th class="p-2 border">পেন্ডিং (৳)</th><th class="p-2 border">অর্জন হার (%)</th></tr></thead><tbody>`;
        if (targets.length === 0) {
            html += `<tr><td colspan="6" class="p-4 text-center text-slate-500">কোনো টার্গেট ডাটা পাওয়া যায়নি।</td></tr>`;
        } else {
            targets.forEach(t => {
                const pending = t.target - t.achieved;
                const pct = t.target > 0 ? ((t.achieved / t.target) * 100).toFixed(1) : '0';
                html += `<tr><td class="p-2 border font-medium">${t.name} <span class="text-[10px] text-slate-500">(${t.category})</span></td><td class="p-2 border text-blue-700 font-semibold">${t.zone}</td><td class="p-2 border font-bold">৳${t.target.toLocaleString()}</td><td class="p-2 border text-emerald-700 font-bold">৳${t.achieved.toLocaleString()}</td><td class="p-2 border text-amber-600 font-bold">৳${(pending > 0 ? pending : 0).toLocaleString()}</td><td class="p-2 border font-bold text-slate-800">${pct}%</td></tr>`;
            });
        }
        html += `</tbody></table>`;
    }

    html += marksBlock + `</div>`;
    container.innerHTML = html;
}

export function renderOrders() {
    let list = getOrders();
    const tbody = document.getElementById('orderTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const role = getCurrentRole();
    const userZone = getCurrentZone();

    if (role === 'employee') {
        list = list.filter(o => o.zone === userZone);
    }

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-slate-500">কোনো অর্ডার পাওয়া যায়নি (${role === 'employee' ? userZone + ' জোন' : 'সকল জোন'})।</td></tr>`;
        return;
    }

    list.forEach((o) => {
        const itemsHtml = o.items.map(i => `[${i.code}] ${i.name} (${i.qty} ${i.unit})`).join('<br>');
        const statusBadge = o.deliveryStatus === 'Delivered'
            ? `<button onclick="window.openOrderLineStatusModal('${o.id}')" class="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition shadow-xs"><i class="fa-solid fa-circle-check text-emerald-600"></i> Delivered</button>`
            : `<button onclick="window.openOrderLineStatusModal('${o.id}')" class="bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition shadow-xs"><i class="fa-solid fa-clock text-amber-600"></i> Pending</button>`;

        let actionBtns = `<button onclick="printOrderInvoice('${o.id}')" class="bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded text-xs font-semibold mr-1 inline-flex items-center gap-1" title="ইনভয়েস প্রিন্ট"><i class="fa-solid fa-print"></i></button>`;
        if (role === 'admin') {
            actionBtns += `
                <button onclick="window.openEditOrderModal('${o.id}')" class="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded text-xs font-semibold mr-1 inline-flex items-center gap-1 shadow-xs"><i class="fa-solid fa-pen-to-square"></i> ইডিট</button>
                <button onclick="window.deleteOrderById('${o.id}')" class="text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1 rounded text-xs font-semibold inline-flex items-center gap-1 shadow-xs"><i class="fa-solid fa-trash"></i> ডিলিট</button>
            `;
        } else {
            actionBtns += `
                <button onclick="window.attemptSalesmanDeleteOrder('${o.id}')" class="text-slate-400 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-2.5 py-1 rounded text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"><i class="fa-solid fa-trash text-slate-400"></i> ডিলিট</button>
            `;
        }

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 border-b">
                <td class="p-3 font-bold text-emerald-800">${o.id}<br><span class="text-[11px] text-slate-500 font-normal">${o.date}</span></td>
                <td class="p-3 font-medium">${o.dealerName}<br><span class="text-xs text-blue-700 font-semibold bg-blue-50 px-1.5 py-0.5 rounded">${o.zone}</span></td>
                <td class="p-3 text-xs font-semibold text-slate-700">${o.emp}</td>
                <td class="p-3 text-xs leading-relaxed">${itemsHtml}</td>
                <td class="p-3 text-xs">বিল: <b>৳${o.amount.toLocaleString()}</b><br>কালেকশন: <span class="text-emerald-700 font-semibold">৳${o.collection.toLocaleString()}</span><br>বাকি: <span class="text-amber-600 font-bold">৳${o.due.toLocaleString()}</span></td>
                <td class="p-3 text-xs font-semibold">${statusBadge}</td>
                <td class="p-3 text-right whitespace-nowrap">
                    ${actionBtns}
                </td>
            </tr>
        `;
    });
    renderFactoryChallanPanel();
}

export function openOrderLineStatusModal(orderId: string) {
    const orders = getOrders();
    const o = orders.find(x => x.id === orderId);
    if (!o) return;

    (document.getElementById('olsOrderId') as HTMLElement).innerText = o.id;
    (document.getElementById('olsDate') as HTMLElement).innerText = o.date;
    (document.getElementById('olsDealer') as HTMLElement).innerText = `${o.dealerName} (${o.zone})`;
    (document.getElementById('olsEmp') as HTMLElement).innerText = o.emp;
    (document.getElementById('olsTotal') as HTMLElement).innerText = `৳ ${o.amount.toLocaleString()}`;
    (document.getElementById('olsCollection') as HTMLElement).innerText = `৳ ${o.collection.toLocaleString()}`;
    (document.getElementById('olsDue') as HTMLElement).innerText = `৳ ${o.due.toLocaleString()}`;

    const isFullyDelivered = o.deliveryStatus === 'Delivered';
    const statusOverallBadge = isFullyDelivered
        ? `<span class="bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5"><i class="fa-solid fa-circle-check text-emerald-600"></i> সম্পূর্ণ ডেলিভারি সম্পন্ন</span>`
        : `<span class="bg-amber-100 text-amber-800 border border-amber-300 px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5"><i class="fa-solid fa-clock text-amber-600"></i> ডেলিভারি পেন্ডিং</span>`;

    const overallBadgeEl = document.getElementById('olsOverallStatusBadge');
    if (overallBadgeEl) overallBadgeEl.innerHTML = statusOverallBadge;

    const tbody = document.getElementById('olsLinesTableBody');
    const tfoot = document.getElementById('olsLinesTableFoot');
    let totalOrdQty = 0;
    let totalDelQty = 0;
    let totalPendQty = 0;
    let totalBill = 0;

    if (tbody) {
        tbody.innerHTML = '';
        o.items.forEach((item, idx) => {
            const delivered = isFullyDelivered ? (item.deliveredQty !== undefined ? item.deliveredQty : item.qty) : (item.deliveredQty || 0);
            const pending = Math.max(0, item.qty - delivered);
            const itemTotal = item.qty * item.rate;

            totalOrdQty += item.qty;
            totalDelQty += delivered;
            totalPendQty += pending;
            totalBill += itemTotal;

            let lineBadge = '';
            if (pending === 0) {
                lineBadge = `<span class="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded text-xs font-bold inline-flex items-center gap-1"><i class="fa-solid fa-check"></i> সম্পূর্ণ ডেলিভার্ড (${delivered} ${item.unit})</span>`;
            } else if (delivered > 0) {
                lineBadge = `<span class="bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded text-xs font-bold inline-flex items-center gap-1"><i class="fa-solid fa-truck-ramp-box"></i> আংশিক (${delivered}/${item.qty} ${item.unit})</span>`;
            } else {
                lineBadge = `<span class="bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded text-xs font-bold inline-flex items-center gap-1"><i class="fa-solid fa-clock"></i> পেন্ডিং (${pending} ${item.unit})</span>`;
            }

            const cancelActionBtn = pending > 0
                ? `<button onclick="window.openOrderCancelModal('${o.id}', '${item.code}')" class="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-2 py-1 rounded text-xs font-bold shadow-xs inline-flex items-center gap-1 transition" title="আইটেম ক্যানসেল ও ক্রেডিট আবেদন"><i class="fa-solid fa-ban"></i> ক্যানসেল</button>`
                : `<span class="text-slate-400 text-[11px]">-</span>`;

            tbody.innerHTML += `
                <tr class="hover:bg-slate-50 border-b">
                    <td class="p-2.5 text-center text-slate-500 font-bold">${idx + 1}</td>
                    <td class="p-2.5">
                        <span class="font-bold text-slate-800">[${item.code}] ${item.name}</span>
                        <div class="text-[11px] text-slate-500">একক রেট: ৳${item.rate.toLocaleString()} / ${item.unit}</div>
                    </td>
                    <td class="p-2.5 text-center font-bold text-slate-700 bg-slate-50/50">${item.qty} ${item.unit}</td>
                    <td class="p-2.5 text-center font-bold text-emerald-700 bg-emerald-50/40">${delivered} ${item.unit}</td>
                    <td class="p-2.5 text-center font-bold text-amber-700 bg-amber-50/40">${pending} ${item.unit}</td>
                    <td class="p-2.5 text-right font-bold text-slate-800">৳${itemTotal.toLocaleString()}</td>
                    <td class="p-2.5 text-center">${lineBadge}</td>
                    <td class="p-2.5 text-right">${cancelActionBtn}</td>
                </tr>
            `;
        });
    }

    if (tfoot) {
        tfoot.innerHTML = `
            <tr>
                <td colspan="2" class="p-2.5 text-right uppercase text-slate-600">সর্বমোট (Total):</td>
                <td class="p-2.5 text-center text-slate-800">${totalOrdQty}</td>
                <td class="p-2.5 text-center text-emerald-800 bg-emerald-50">${totalDelQty}</td>
                <td class="p-2.5 text-center text-amber-800 bg-amber-50">${totalPendQty}</td>
                <td class="p-2.5 text-right text-emerald-800 font-bold">৳${totalBill.toLocaleString()}</td>
                <td class="p-2.5 text-center text-[11px] text-slate-500 font-normal">
                    ${totalPendQty === 0 ? 'সকল আইটেম ডেলিভার্ড' : totalDelQty > 0 ? 'আংশিক ডেলিভারি চলমান' : 'সম্পূর্ণ পেন্ডিং'}
                </td>
            </tr>
        `;
    }

    const challanBtnContainer = document.getElementById('olsChallanBtnContainer');
    if (challanBtnContainer) {
        challanBtnContainer.innerHTML = `
            <button onclick="closeModal('orderLineStatusModal'); window.viewChallanByOrderId('${o.id}')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold shadow inline-flex items-center gap-1.5 transition">
                <i class="fa-solid fa-file-invoice"></i> সংশ্লিষ্ট ডেলিভারি চালান দেখুন
            </button>
        `;
    }

    document.getElementById('orderLineStatusModal')?.classList.remove('hidden');
}

export function openEditOrderModal(orderId: string) {
    if (getCurrentRole() !== 'admin') {
        alert('শুধুমাত্র এডমিন অর্ডার ইডিট করতে পারেন!');
        return;
    }
    const orders = getOrders();
    const o = orders.find(x => x.id === orderId);
    if (!o) return;

    (document.getElementById('editOrdId') as HTMLInputElement).value = o.id;
    (document.getElementById('editOrdIdDisplay') as HTMLElement).innerText = `${o.id} (ডিলার: ${o.dealerName} - ${o.zone})`;
    (document.getElementById('editOrdCollection') as HTMLInputElement).value = o.collection.toString();
    (document.getElementById('editOrdStatus') as HTMLSelectElement).value = o.deliveryStatus;

    document.getElementById('editOrderModal')?.classList.remove('hidden');
}

export function saveEditOrder(e: Event) {
    e.preventDefault();
    if (getCurrentRole() !== 'admin') {
        alert('শুধুমাত্র এডমিন অর্ডার ইডিট করতে পারেন!');
        return;
    }

    const id = (document.getElementById('editOrdId') as HTMLInputElement).value;
    const collection = Number((document.getElementById('editOrdCollection') as HTMLInputElement).value) || 0;
    const status = (document.getElementById('editOrdStatus') as HTMLSelectElement).value as 'Pending' | 'Delivered';

    const orders = getOrders();
    const o = orders.find(x => x.id === id);
    if (!o) return;

    o.collection = collection;
    o.due = Math.max(0, o.amount - collection - (o.creditUsed || 0));
    o.deliveryStatus = status;

    if (status === 'Delivered') {
        o.items.forEach(i => {
            i.deliveredQty = i.qty;
        });
    }

    saveOrders(orders);
    closeModal('editOrderModal');
    renderOrders();
    alert(`অর্ডার [${id}] সফলভাবে ইডিট করা হয়েছে!`);
}

export function printOrderInvoice(id: string) {
    const orders = getOrders();
    const o = orders.find(x => x.id === id);
    if (!o) return;

    (document.getElementById('printOrdId') as HTMLElement).innerText = o.id;
    (document.getElementById('printDate') as HTMLElement).innerText = o.date;
    (document.getElementById('printZone') as HTMLElement).innerText = o.zone;
    (document.getElementById('printDlrName') as HTMLElement).innerText = o.dealerName;
    (document.getElementById('printTotalBill') as HTMLElement).innerText = '৳ ' + o.amount.toLocaleString();
    (document.getElementById('printCollection') as HTMLElement).innerText = '৳ ' + o.collection.toLocaleString();
    (document.getElementById('printDue') as HTMLElement).innerText = '৳ ' + o.due.toLocaleString();

    const tbody = document.getElementById('printItemTableBody');
    if (tbody) {
        tbody.innerHTML = '';
        o.items.forEach(i => {
            tbody.innerHTML += `
                <tr class="border-b">
                    <td class="p-2">[${i.code}] ${i.name}</td>
                    <td class="p-2 text-center">${i.qty} ${i.unit}</td>
                    <td class="p-2 text-center">৳ ${i.rate}</td>
                    <td class="p-2 text-right font-bold">৳ ${(i.qty * i.rate).toLocaleString()}</td>
                </tr>
            `;
        });
    }
    printContent('printableArea', `অর্ডার ইনভয়েস - ${o.id}`);
}

export function deleteOrderById(id: string) {
    if (getCurrentRole() !== 'admin') {
        alert('⚠️ অনুমতি সংরক্ষিত: সেলসম্যান কোনো অর্ডার ডিলিট করতে পারবে না!\nশুধুমাত্র এডমিন অর্ডার ইডিট বা ডিলিট করতে পারবেন।');
        return;
    }
    if (confirm(`অর্ডার [${id}] সত্যিই ডিলিট করতে চান? ডিলিট করলে এটি সিস্টেমে থাকবে না।`)) {
        let orders = getOrders();
        orders = orders.filter(o => o.id !== id);
        saveOrders(orders);
        renderOrders();
        alert(`অর্ডার [${id}] সফলভাবে ডিলিট করা হয়েছে!`);
    }
}

export function attemptSalesmanDeleteOrder(id: string) {
    alert(`⚠️ পারমিশন সংরক্ষিত: সেলসম্যান আইডি [${getCurrentUser()}] দিয়ে অর্ডার [${id}] ডিলিট করা যাবে না!\n\nসিস্টেমের নিয়মানুযায়ী শুধুমাত্র এডমিন অর্ডার ইডিট বা ডিলিট করতে পারবেন।`);
}

export function renderProducts() {
    const list = getProducts();
    const tbody = document.getElementById('productTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const role = getCurrentRole();

    list.forEach((p, idx) => {
        const imgScr = p.image || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=80&auto=format&fit=crop&q=60';
        const act = role === 'admin' ? `
            <button onclick="editProd(${idx})" class="bg-blue-50 text-blue-600 px-2.5 py-1 rounded text-xs font-semibold mr-1">এডিট</button>
            <button onclick="deleteProd(${idx})" class="bg-red-50 text-red-600 px-2.5 py-1 rounded text-xs font-semibold">ডিলিট</button>
        ` : `<span class="text-xs text-slate-400">রিড-অনলি</span>`;

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 border-b">
                <td class="p-3"><img src="${imgScr}" class="w-10 h-10 object-cover rounded-lg border cursor-pointer" onclick="zoomImage('${imgScr}')"></td>
                <td class="p-3 font-bold text-emerald-800">${p.code}</td>
                <td class="p-3 font-medium text-slate-800">${p.name}</td>
                <td class="p-3"><span class="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">${p.unit || 'পিস'}</span></td>
                <td class="p-3 text-emerald-700 font-bold">৳ ${p.rate}</td>
                <td class="p-3 font-medium">${p.stock}</td>
                <td class="p-3 text-right whitespace-nowrap">${act}</td>
            </tr>
        `;
    });
}

export function openProductModal() {
    if (getCurrentRole() !== 'admin') {
        alert('শুধুমাত্র Admin প্রোডাক্ট যোগ করতে পারবেন!');
        return;
    }
    (document.getElementById('productModalTitle') as HTMLElement).innerText = "নতুন প্রোডাক্ট যোগ করুন";
    (document.getElementById('prodEditIndex') as HTMLInputElement).value = "-1";
    (document.getElementById('prodCode') as HTMLInputElement).value = "PRD-" + (getProducts().length + 101);
    (document.getElementById('prodName') as HTMLInputElement).value = "";
    (document.getElementById('prodRate') as HTMLInputElement).value = "";
    (document.getElementById('prodStock') as HTMLInputElement).value = "100";
    const fileInput = document.getElementById('prodImageFile') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
    document.getElementById('productModal')?.classList.remove('hidden');
}

export function editProd(idx: number) {
    const list = getProducts();
    const p = list[idx];
    (document.getElementById('productModalTitle') as HTMLElement).innerText = `প্রোডাক্ট এডিট: ${p.name}`;
    (document.getElementById('prodEditIndex') as HTMLInputElement).value = idx.toString();
    (document.getElementById('prodCode') as HTMLInputElement).value = p.code;
    (document.getElementById('prodName') as HTMLInputElement).value = p.name;
    (document.getElementById('prodUnit') as HTMLSelectElement).value = p.unit || 'পিস';
    (document.getElementById('prodRate') as HTMLInputElement).value = p.rate.toString();
    (document.getElementById('prodStock') as HTMLInputElement).value = p.stock.toString();
    const fileInput = document.getElementById('prodImageFile') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
    document.getElementById('productModal')?.classList.remove('hidden');
}

export async function saveProduct(e: Event) {
    e.preventDefault();
    const editIdx = parseInt((document.getElementById('prodEditIndex') as HTMLInputElement).value);
    const list = getProducts();
    let imgData = editIdx >= 0 ? list[editIdx].image : '';

    const fileInput = document.getElementById('prodImageFile') as HTMLInputElement;
    if (fileInput?.files && fileInput.files[0]) {
        imgData = await readFileAsBase64(fileInput.files[0]);
    }

    const prodData: Product = {
        code: (document.getElementById('prodCode') as HTMLInputElement).value.trim(),
        name: (document.getElementById('prodName') as HTMLInputElement).value.trim(),
        unit: (document.getElementById('prodUnit') as HTMLSelectElement).value,
        rate: Number((document.getElementById('prodRate') as HTMLInputElement).value),
        stock: Number((document.getElementById('prodStock') as HTMLInputElement).value),
        date: new Date().toISOString().split('T')[0],
        status: editIdx >= 0 && list[editIdx].status ? list[editIdx].status : 'Active',
        image: imgData
    };

    if (editIdx >= 0) list[editIdx] = prodData;
    else list.push(prodData);

    saveProducts(list);
    closeModal('productModal');
    renderProducts();
    alert('প্রোডাক্ট সফলভাবে সংরক্ষণ করা হয়েছে!');
}

export function deleteProd(idx: number) {
    if (confirm('ডিলিট করতে চান?')) {
        const list = getProducts();
        list.splice(idx, 1);
        saveProducts(list);
        renderProducts();
    }
}

export function renderProfileAndLedger() {
    const nameEl = document.getElementById('profName');
    const roleZoneEl = document.getElementById('profRoleZone');
    const ledgerEl = document.getElementById('profileLedgerContent');
    const role = getCurrentRole();
    const user = getCurrentUser();
    const zone = getCurrentZone();

    if (nameEl) nameEl.innerText = user;
    if (roleZoneEl) roleZoneEl.innerText = `রোল: ${role.toUpperCase()} | জোন: ${zone}`;

    if (ledgerEl) {
        const orders = getOrders().filter(o => role === 'employee' ? o.zone === zone : true);
        const totalSales = orders.reduce((s, o) => s + o.amount, 0);
        const totalColl = orders.reduce((s, o) => s + o.collection, 0);
        const totalDue = totalSales - totalColl;

        ledgerEl.innerHTML = `
            <div class="grid grid-cols-3 gap-3 mb-4">
                <div class="bg-white p-3 rounded-lg border text-center"><p class="text-xs text-slate-500">মোট বিক্রয়</p><p class="text-base font-bold text-emerald-800">৳ ${totalSales.toLocaleString()}</p></div>
                <div class="bg-white p-3 rounded-lg border text-center"><p class="text-xs text-slate-500">নগদ আদায়</p><p class="text-base font-bold text-emerald-600">৳ ${totalColl.toLocaleString()}</p></div>
                <div class="bg-white p-3 rounded-lg border text-center"><p class="text-xs text-slate-500">বর্তমান বাকি</p><p class="text-base font-bold text-amber-600">৳ ${totalDue.toLocaleString()}</p></div>
            </div>
            <p class="text-xs text-slate-600">অর্ডার সংখ্যা: <b>${orders.length} টি</b> | সংরক্ষিত তথ্য হালনাগাদ করা হয়েছে।</p>
        `;
    }
    renderProfileLeaveSection();
}

export function renderSalesPersons() {
    const list = getSalesPersons();
    const tbody = document.getElementById('salesPersonTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const role = getCurrentRole();

    list.forEach((sp, idx) => {
        const isActive = sp.status === 'Active' || sp.status === 'সক্রিয়';
        const statusBadge = isActive
            ? `<span class="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> সক্রিয়</span>`
            : `<span class="bg-red-100 text-red-800 px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-red-600"></span> নিষ্ক্রিয়</span>`;

        let actionHtml = '';
        if (role === 'admin') {
            const toggleText = isActive ? 'নিষ্ক্রিয় করুন' : 'সক্রিয় করুন';
            const toggleClass = isActive ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200';
            actionHtml = `
                <button onclick="toggleSalesPersonStatus(${idx})" class="${toggleClass} px-2.5 py-1 rounded text-xs font-semibold mr-1 transition shadow-sm">
                    ${toggleText}
                </button>
                <button onclick="deleteSalesPerson(${idx})" class="text-red-600 bg-red-50 hover:bg-red-100 px-2 py-1 rounded text-xs font-semibold">ডিলিট</button>
            `;
        } else {
            actionHtml = `<span class="text-xs text-slate-400">রিড-অনলি</span>`;
        }

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 border-b">
                <td class="p-2"><img src="${sp.image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=60'}" class="w-8 h-8 rounded-full border"></td>
                <td class="p-2"><b>ID: ${sp.id}</b><br>${sp.name}</td>
                <td class="p-2">${sp.designation}<br><b class="text-blue-700">${sp.zone}</b></td>
                <td class="p-2">${sp.compMobile}</td>
                <td class="p-2">NID: ${sp.nid}</td>
                <td class="p-2 font-bold">৳${Number(sp.salary).toLocaleString()}</td>
                <td class="p-2">${statusBadge}</td>
                <td class="p-2 text-right whitespace-nowrap">${actionHtml}</td>
            </tr>
        `;
    });
}

export function toggleSalesPersonStatus(idx: number) {
    if (getCurrentRole() !== 'admin') {
        alert('শুধুমাত্র এডমিনের সেলস পার্সন সক্রিয় বা নিষ্ক্রিয় করার অনুমতি রয়েছে!');
        return;
    }
    const list = getSalesPersons();
    const sp = list[idx];
    if (!sp) return;

    const wasActive = sp.status === 'Active' || sp.status === 'সক্রিয়';
    sp.status = wasActive ? 'Inactive' : 'Active';
    saveSalesPersons(list);

    const users = getUsers();
    const userObj = users.find(u => u.name === sp.name || u.code === sp.id);
    if (userObj) {
        userObj.status = sp.status;
        saveUsers(users);
    }

    renderSalesPersons();
    alert(`সেলস পার্সন [${sp.name}] সফলভাবে ${sp.status === 'Active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে!`);
}

export function openSalesPersonModal() {
    document.getElementById('salesPersonModal')?.classList.remove('hidden');
}

export function saveSalesPerson(e: Event) {
    e.preventDefault();
    const list = getSalesPersons();
    list.push({
        id: (document.getElementById('spId') as HTMLInputElement).value,
        name: (document.getElementById('spName') as HTMLInputElement).value,
        designation: (document.getElementById('spDesignation') as HTMLInputElement).value,
        zone: (document.getElementById('spZone') as HTMLSelectElement).value,
        compMobile: (document.getElementById('spCompMobile') as HTMLInputElement).value,
        nid: (document.getElementById('spNid') as HTMLInputElement).value,
        salary: (document.getElementById('spSalary') as HTMLInputElement).value,
        status: 'Active'
    });
    saveSalesPersons(list);
    closeModal('salesPersonModal');
    renderSalesPersons();
    alert('সেলস পার্সন সংরক্ষিত হয়েছে!');
}

export function deleteSalesPerson(idx: number) {
    const list = getSalesPersons();
    list.splice(idx, 1);
    saveSalesPersons(list);
    renderSalesPersons();
}

export function openSalesTargetModal() {
    const sel = document.getElementById('stName') as HTMLSelectElement;
    if (!sel) return;
    sel.innerHTML = '';
    getSalesPersons().forEach(sp => sel.innerHTML += `<option value="${sp.name}">${sp.name} (SalesPerson - ${sp.zone})</option>`);
    getDealers().forEach(d => sel.innerHTML += `<option value="${d.name}">${d.name} (Dealer - ${d.zone})</option>`);
    document.getElementById('salesTargetModal')?.classList.remove('hidden');
}

export function saveSalesTarget(e: Event) {
    e.preventDefault();
    const targets = getSalesTargets();
    targets.push({
        name: (document.getElementById('stName') as HTMLSelectElement).value,
        category: (document.getElementById('stCategory') as HTMLSelectElement).value,
        zone: (document.getElementById('stZone') as HTMLInputElement).value,
        target: Number((document.getElementById('stTarget') as HTMLInputElement).value),
        achieved: Number((document.getElementById('stAchieved') as HTMLInputElement).value)
    });
    saveSalesTargets(targets);
    closeModal('salesTargetModal');
    renderAdminEvaluationBoard();
    alert('টার্গেট সংরক্ষিত হয়েছে!');
}

export function renderAdminEvaluationBoard() {
    const tbody = document.getElementById('adminEvaluationTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const targets = getSalesTargets();

    targets.forEach(t => {
        const pending = t.target - t.achieved;
        const pct = t.target > 0 ? ((t.achieved / t.target) * 100).toFixed(1) : '0';
        const grade = Number(pct) >= 80 ? '<span class="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">Good (ভাল)</span>' : '<span class="text-red-700 font-bold bg-red-50 px-2 py-0.5 rounded">Bad (পেন্ডিং)</span>';

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 border-b">
                <td class="p-2 font-semibold">${t.name} <span class="text-[10px] text-slate-500">(${t.category})</span></td>
                <td class="p-2 font-semibold text-blue-700">${t.zone}</td>
                <td class="p-2 font-bold">৳ ${t.target.toLocaleString()}</td>
                <td class="p-2 text-emerald-700 font-bold">৳ ${t.achieved.toLocaleString()} (${pct}%)</td>
                <td class="p-2 text-amber-600 font-bold">৳ ${(pending > 0 ? pending : 0).toLocaleString()}</td>
                <td class="p-2">${grade}</td>
            </tr>
        `;
    });
}

export function renderSystemUsers() {
    const tbody = document.getElementById('userTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const role = getCurrentRole();

    if (role !== 'admin') {
        tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400">শুধুমাত্র এডমিন এই ইউজার তালিকা ও পাসওয়ার্ড নিয়ন্ত্রণ করতে পারেন।</td></tr>`;
        return;
    }

    const users = getUsers();
    users.forEach((u, idx) => {
        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 border-b">
                <td class="p-2 font-semibold text-slate-800">${u.name}</td>
                <td class="p-2 text-blue-700 font-semibold">${u.role} (${u.zone || 'সকল'})</td>
                <td class="p-2 text-xs">
                    ইউজারনেম: <code class="bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-800">${u.username}</code><br>
                    <span class="inline-flex items-center gap-1 mt-1">
                        পাসওয়ার্ড: <code class="bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded font-bold font-mono">${u.pass}</code>
                    </span>
                </td>
                <td class="p-2 text-right whitespace-nowrap">
                    <button onclick="openAdminChangeUserPassModal('${u.username}')" class="bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded text-xs font-semibold shadow mr-1">
                        <i class="fa-solid fa-key mr-1"></i> পাসওয়ার্ড পরিবর্তন
                    </button>
                    ${u.role !== 'admin' ? `<button onclick="deleteUser(${idx})" class="text-red-600 bg-red-50 hover:bg-red-100 px-2 py-1 rounded text-xs">ডিলিট</button>` : ''}
                </td>
            </tr>
        `;
    });
}

export function openAdminChangeUserPassModal(username: string) {
    if (getCurrentRole() !== 'admin') {
        alert('শুধুমাত্র এডমিন পাসওয়ার্ড দেখতে ও পরিবর্তন করতে পারবেন!');
        return;
    }
    const users = getUsers();
    const u = users.find(x => x.username === username);
    if (!u) return;

    (document.getElementById('adminCpUsername') as HTMLInputElement).value = u.username;
    (document.getElementById('adminCpName') as HTMLElement).innerText = `${u.name} (${u.role} - জোন: ${u.zone || 'সকল'})`;
    (document.getElementById('adminCpCurrentPass') as HTMLElement).innerText = u.pass;
    (document.getElementById('adminCpNewPass') as HTMLInputElement).value = '';

    document.getElementById('adminChangeUserPassModal')?.classList.remove('hidden');
}

export function saveAdminUserPass(e: Event) {
    e.preventDefault();
    if (getCurrentRole() !== 'admin') {
        alert('শুধুমাত্র এডমিন পাসওয়ার্ড পরিবর্তন করতে পারবেন!');
        return;
    }
    const username = (document.getElementById('adminCpUsername') as HTMLInputElement).value;
    const newPass = (document.getElementById('adminCpNewPass') as HTMLInputElement).value.trim();
    if (!newPass) {
        alert('অনুগ্রহ করে নতুন পাসওয়ার্ড লিখুন!');
        return;
    }
    const users = getUsers();
    const u = users.find(x => x.username === username);
    if (u) {
        u.pass = newPass;
        saveUsers(users);
        closeModal('adminChangeUserPassModal');
        renderSystemUsers();
        alert(`ইউজার [${u.username}] এর পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!`);
    }
}

export function deleteUser(idx: number) {
    const users = getUsers();
    users.splice(idx, 1);
    saveUsers(users);
    renderSystemUsers();
}

export function openDealerAppModal() {
    const zoneSel = document.getElementById('appDlrZone') as HTMLSelectElement | null;
    const role = getCurrentRole();
    const userZone = getCurrentZone();

    if (zoneSel) {
        zoneSel.innerHTML = '';
        if (role === 'employee') {
            zoneSel.innerHTML = `<option value="${userZone}" selected>${userZone} জেলা (আপনার নির্ধারিত জোন)</option>`;
            zoneSel.disabled = true;
        } else {
            zoneSel.disabled = false;
            bdDistricts.forEach(d => {
                zoneSel.innerHTML += `<option value="${d}">${d} জেলা</option>`;
            });
        }
    }
    document.getElementById('dealerAppModal')?.classList.remove('hidden');
}

export function submitDealerApp(e: Event) {
    e.preventDefault();
    const role = getCurrentRole();
    const userZone = getCurrentZone();
    const apps = getDealerApps();
    const targetZone = role === 'employee' ? userZone : ((document.getElementById('appDlrZone') as HTMLSelectElement).value || userZone);

    apps.push({
        code: (document.getElementById('appDlrCode') as HTMLInputElement).value.trim(),
        name: (document.getElementById('appDlrName') as HTMLInputElement).value.trim(),
        chairman: (document.getElementById('appDlrChairman') as HTMLInputElement).value.trim(),
        zone: targetZone,
        mobile: (document.getElementById('appDlrMobile') as HTMLInputElement).value.trim(),
        address: (document.getElementById('appDlrAddress') as HTMLInputElement).value.trim(),
        employee: getCurrentUser(),
        applicantUsername: getCurrentUsername(),
        status: 'Pending',
        date: new Date().toISOString().split('T')[0]
    });
    saveDealerApps(apps);
    closeModal('dealerAppModal');
    renderDealerApps();
    alert('ডিলার আবেদন সফলভাবে জমা দেওয়া হয়েছে! এডমিনের অনুমোদনের পর সক্রিয় তালিকায় যুক্ত হবে।');
}

export function renderDealerApps() {
    const apps = getDealerApps();
    const tbody = document.getElementById('dealerAppTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const role = getCurrentRole();

    if (apps.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400">কোনো ডিলার আবেদন নেই।</td></tr>`;
        return;
    }

    apps.forEach((app, idx) => {
        const isApproved = app.status === 'Approved' || app.status === 'অনুমোদিত';
        const isRejected = app.status === 'Rejected' || app.status === 'বাতিলকৃত';

        let statusBadge = '';
        if (isApproved) {
            statusBadge = `<span class="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1"><i class="fa-solid fa-circle-check text-emerald-600"></i> অনুমোদিত</span>`;
        } else if (isRejected) {
            statusBadge = `<span class="bg-red-100 text-red-800 px-2.5 py-0.5 rounded-full text-xs font-bold">বাতিলকৃত</span>`;
        } else {
            statusBadge = `<span class="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full text-xs font-semibold">বিবেচনাধীন</span>`;
        }

        let actionHtml = '';
        if (isApproved) {
            actionHtml = `<span class="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded border border-emerald-200">অনুমোদন সম্পন্ন</span>`;
        } else if (isRejected) {
            actionHtml = `<span class="text-xs text-red-500 font-semibold">বাতিল</span>`;
        } else if (role === 'admin') {
            actionHtml = `
                <button onclick="approveDealerApp(${idx})" class="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded text-xs font-semibold shadow mr-1 transition">
                    অনুমোদন করুন
                </button>
                <button onclick="rejectDealerApp(${idx})" class="bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-semibold border border-red-200">
                    বাতিল
                </button>
            `;
        } else {
            actionHtml = `<span class="text-xs text-slate-400 italic">শুধুমাত্র এডমিন অনুমোদন করতে পারেন</span>`;
        }

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 border-b">
                <td class="p-2 font-semibold"><b>${app.code}</b><br>${app.name}</td>
                <td class="p-2 text-blue-700 font-semibold">${app.zone}</td>
                <td class="p-2 text-xs font-medium text-slate-700">${app.employee || 'সেলস ম্যান'}</td>
                <td class="p-2">${statusBadge}</td>
                <td class="p-2 text-right whitespace-nowrap">${actionHtml}</td>
            </tr>
        `;
    });
}

export function approveDealerApp(idx: number) {
    if (getCurrentRole() !== 'admin') {
        alert('শুধুমাত্র এডমিন ডিলার আবেদন অনুমোদন করতে পারেন!');
        return;
    }
    const apps = getDealerApps();
    const app = apps[idx];
    if (!app) return;

    app.status = 'Approved';
    saveDealerApps(apps);

    const dealers = getDealers();
    if (!dealers.some(d => d.code === app.code)) {
        dealers.push({
            code: app.code,
            name: app.name,
            chairman: app.chairman || '',
            zone: app.zone,
            mobile: app.mobile || '',
            address: app.address || '',
            status: 'Active'
        });
        saveDealers(dealers);
    }

    const notifs = getNotifications();
    notifs.unshift({
        id: 'NOTIF-' + Date.now(),
        targetUser: app.employee || app.applicantUsername || 'emp1',
        title: '🎉 ডিলার আবেদন অনুমোদিত হয়েছে!',
        message: `আপনার আবেদনকৃত ডিলার [${app.code}] ${app.name} (${app.zone}) এডমিন কর্তৃক অনুমোদিত হয়েছে।`,
        type: 'dealer_approval',
        date: new Date().toLocaleDateString('bn-BD'),
        read: false
    });
    saveNotifications(notifs);

    renderDealerApps();
    renderDealers();
    checkUserNotifications();
    alert(`ডিলার [${app.name}] সফলভাবে অনুমোদিত হয়েছে!`);
}

export function rejectDealerApp(idx: number) {
    if (getCurrentRole() !== 'admin') {
        alert('শুধুমাত্র এডমিন ডিলার আবেদন বাতিল করতে পারেন!');
        return;
    }
    const apps = getDealerApps();
    apps[idx].status = 'Rejected';
    saveDealerApps(apps);
    renderDealerApps();
    alert('আবেদন বাতিল করা হয়েছে।');
}

export function openLeaveApplyModal() { document.getElementById('leaveApplyModal')?.classList.remove('hidden'); }
export function submitLiveApp(e: Event) {
    e.preventDefault();
    const apps = getLiveApps();
    const userName = getCurrentUser();
    apps.push({
        name: (document.getElementById('laName') as HTMLInputElement).value || userName,
        reason: (document.getElementById('laReason') as HTMLTextAreaElement).value,
        date: new Date().toISOString().split('T')[0],
        status: 'Pending'
    });
    saveLiveApps(apps);
    closeModal('leaveApplyModal');
    renderLiveApps();
    alert('ছুটির আবেদন সফলভাবে সাবমিট হয়েছে! এডমিন পর্যালোচনা করে অনুমোদন করবেন।');
}

export function renderLiveApps() {
    const apps = getLiveApps();
    const tbody = document.getElementById('liveAppTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const role = getCurrentRole();

    if (apps.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400">কোনো ছুটির আবেদন নেই।</td></tr>`;
        return;
    }

    apps.forEach((app, idx) => {
        const isApproved = app.status === 'Approved' || app.status === 'অনুমোদিত';
        const isRejected = app.status === 'Rejected' || app.status === 'বাতিলকৃত';

        let statusBadge = '';
        if (isApproved) {
            statusBadge = `<span class="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1"><i class="fa-solid fa-circle-check text-emerald-600"></i> অনুমোদিত</span>`;
        } else if (isRejected) {
            statusBadge = `<span class="bg-red-100 text-red-800 px-2.5 py-0.5 rounded-full text-[11px] font-bold">বাতিলকৃত</span>`;
        } else {
            statusBadge = `<span class="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full text-[11px] font-bold">বিবেচনাধীন</span>`;
        }

        let actionHtml = '';
        if (isApproved) {
            actionHtml = `<span class="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded border border-emerald-200">অনুমোদিত</span>`;
        } else if (isRejected) {
            actionHtml = `<span class="text-xs text-red-500 font-semibold">বাতিল</span>`;
        } else if (role === 'admin') {
            actionHtml = `
                <button onclick="approveLiveApp(${idx})" class="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded text-xs font-semibold shadow mr-1 transition">
                    অনুমোদন করুন
                </button>
                <button onclick="rejectLiveApp(${idx})" class="bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-semibold border border-red-200">
                    বাতিল
                </button>
            `;
        } else {
            actionHtml = `<span class="text-xs text-slate-400 italic">শুধুমাত্র এডমিন অনুমোদন করতে পারেন</span>`;
        }

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 border-b">
                <td class="p-2 font-semibold text-slate-800">${app.name}</td>
                <td class="p-2 text-slate-700">${app.reason}</td>
                <td class="p-2 text-xs text-slate-500">${app.date}</td>
                <td class="p-2">${statusBadge}</td>
                <td class="p-2 text-right whitespace-nowrap">${actionHtml}</td>
            </tr>
        `;
    });
}

export function approveLiveApp(idx: number) {
    if (getCurrentRole() !== 'admin') {
        alert('শুধুমাত্র এডমিন ছুটির আবেদন অনুমোদন করতে পারবেন!');
        return;
    }
    const apps = getLiveApps();
    const app = apps[idx];
    if (!app) return;

    app.status = 'Approved';
    saveLiveApps(apps);

    const notifs = getNotifications();
    notifs.unshift({
        id: 'NOTIF-' + Date.now(),
        targetUser: app.name,
        title: '🏖️ ছুটির আবেদন অনুমোদিত হয়েছে!',
        message: `আপনার ${app.date} তারিখের ছুটির আবেদন (${app.reason}) এডমিন কর্তৃক অনুমোদিত হয়েছে।`,
        type: 'leave_approval',
        date: new Date().toLocaleDateString('bn-BD'),
        read: false
    });
    saveNotifications(notifs);

    renderLiveApps();
    checkUserNotifications();
    alert(`সেলস পার্সন [${app.name}] এর ছুটির আবেদন সফলভাবে অনুমোদিত হয়েছে!`);
}

export function rejectLiveApp(idx: number) {
    if (getCurrentRole() !== 'admin') {
        alert('শুধুমাত্র এডমিন ছুটির আবেদন বাতিল করতে পারেন!');
        return;
    }
    const apps = getLiveApps();
    apps[idx].status = 'Rejected';
    saveLiveApps(apps);
    renderLiveApps();
    alert('ছুটির আবেদন বাতিল করা হয়েছে।');
}

function isNotificationRead(n: AppNotification, user: string, username: string): boolean {
    if (n.read) return true;
    if (n.readByUsers && (n.readByUsers.includes(username) || n.readByUsers.includes(user))) {
        return true;
    }
    const readIdsUser = getUserReadNotifIds(user);
    const readIdsUsername = getUserReadNotifIds(username);
    if (readIdsUser.includes(n.id) || readIdsUsername.includes(n.id)) {
        return true;
    }
    return false;
}

export function checkUserNotifications() {
    const user = getCurrentUser();
    const username = getCurrentUsername();
    const notifs = getNotifications();

    const userNotifs = notifs.filter(n => 
        n.targetUser === user || 
        n.targetUser === username || 
        n.targetUser === 'All'
    );
    const unread = userNotifs.filter(n => !isNotificationRead(n, user, username));

    const badge = document.getElementById('notifCountBadge');
    const tickerBadge = document.getElementById('liveAlertBadge');

    if (badge) {
        if (unread.length > 0) {
            badge.innerText = unread.length.toString();
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    if (tickerBadge) {
        if (unread.length > 0) {
            tickerBadge.innerText = `🔔 ${unread[0].title} (${unread.length}টি নতুন)`;
            tickerBadge.classList.remove('hidden');
            tickerBadge.onclick = openNotificationModal;
            tickerBadge.style.cursor = 'pointer';
        } else {
            tickerBadge.classList.add('hidden');
        }
    }
}

export function openNotificationModal() {
    const user = getCurrentUser();
    const username = getCurrentUsername();
    const notifs = getNotifications();

    const userNotifs = notifs.filter(n => 
        n.targetUser === user || 
        n.targetUser === username || 
        n.targetUser === 'All'
    );

    const notifIds = userNotifs.map(n => n.id);
    markAllNotifsAsReadForUser(user, notifIds);
    markAllNotifsAsReadForUser(username, notifIds);

    notifs.forEach(n => {
        if (n.targetUser === user || n.targetUser === username || n.targetUser === 'All') {
            n.read = true;
            if (!n.readByUsers) n.readByUsers = [];
            if (!n.readByUsers.includes(username)) n.readByUsers.push(username);
            if (!n.readByUsers.includes(user)) n.readByUsers.push(user);
        }
    });
    saveNotifications(notifs);

    document.getElementById('notifCountBadge')?.classList.add('hidden');
    document.getElementById('liveAlertBadge')?.classList.add('hidden');

    const container = document.getElementById('notificationListContainer');
    if (container) {
        container.innerHTML = '';
        if (userNotifs.length === 0) {
            container.innerHTML = `<p class="text-center text-slate-400 py-6">আপনার কোনো নোটিফিকেশন নেই।</p>`;
        } else {
            userNotifs.forEach(n => {
                const challanMatch = n.challanId || (n.title.match(/CHL-\d+/) || n.message.match(/CHL-\d+/))?.[0];
                const challanBtn = challanMatch 
                    ? `<button onclick="closeModal('notificationModal'); window.viewChallanById('${challanMatch}')" class="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-1 rounded shadow inline-flex items-center gap-1 transition"><i class="fa-solid fa-file-invoice"></i> চালান দেখুন ও প্রিন্ট করুন</button>`
                    : '';

                container.innerHTML += `
                    <div class="p-3.5 rounded-xl border bg-slate-50 border-slate-200 space-y-1.5 hover:shadow-xs transition">
                        <div class="flex justify-between items-center text-xs">
                            <h4 class="font-bold text-slate-800 flex items-center gap-1.5">
                                <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                                ${n.title}
                            </h4>
                            <div class="flex items-center gap-2">
                                <span class="text-slate-400 text-[10px]">${n.date}</span>
                                <button onclick="window.dismissNotification('${n.id}')" class="text-slate-400 hover:text-red-600 text-xs px-1" title="মুছে ফেলুন"><i class="fa-solid fa-trash-can"></i></button>
                            </div>
                        </div>
                        <p class="text-xs text-slate-700 leading-relaxed">${n.message}</p>
                        <div class="flex items-center justify-between pt-1">
                            ${challanBtn ? `<div>${challanBtn}</div>` : '<div></div>'}
                            <span class="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
                                <i class="fa-solid fa-check-double text-emerald-600"></i> পড়া হয়েছে
                            </span>
                        </div>
                    </div>
                `;
            });
        }
    }

    document.getElementById('notificationModal')?.classList.remove('hidden');
}

export function dismissNotification(id: string) {
    const user = getCurrentUser();
    const username = getCurrentUsername();
    markNotifAsReadForUser(id, user);
    markNotifAsReadForUser(id, username);

    let notifs = getNotifications();
    notifs = notifs.filter(n => n.id !== id);
    saveNotifications(notifs);
    openNotificationModal();
    checkUserNotifications();
}

export function markAllNotificationsRead() {
    const user = getCurrentUser();
    const username = getCurrentUsername();
    const notifs = getNotifications();

    const notifIds = notifs.map(n => n.id);
    markAllNotifsAsReadForUser(user, notifIds);
    markAllNotifsAsReadForUser(username, notifIds);

    notifs.forEach(n => {
        if (n.targetUser === user || n.targetUser === username || n.targetUser === 'All') {
            n.read = true;
            if (!n.readByUsers) n.readByUsers = [];
            if (!n.readByUsers.includes(username)) n.readByUsers.push(username);
            if (!n.readByUsers.includes(user)) n.readByUsers.push(user);
        }
    });

    saveNotifications(notifs);
    checkUserNotifications();
    closeModal('notificationModal');
}

export function openNoticeModal() { 
    const storedNotice = localStorage.getItem('bcare_notice');
    const topNoticeEl = document.getElementById('topNoticeText');
    const currentNotice = storedNotice || (topNoticeEl ? topNoticeEl.innerText.trim() : 'BCarebd.Com পোর্টালে স্বাগতম। জোনভিত্তিক সেলস ও কালেকশন নিয়মিত আপডেট করুন।');
    
    const input = document.getElementById('newNoticeInput') as HTMLTextAreaElement | null;
    if (input) {
        input.value = currentNotice.trim();
        setTimeout(() => {
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
        }, 50);
    }
    document.getElementById('noticeModal')?.classList.remove('hidden'); 
}

export function saveNewNotice() {
    const input = document.getElementById('newNoticeInput') as HTMLTextAreaElement | null;
    const n = input ? input.value.trim() : '';
    if (!n) {
        alert('অনুগ্রহ করে নোটিসের বিবরণ লিখুন!');
        return;
    }
    localStorage.setItem('bcare_notice', n);
    const topNotice = document.getElementById('topNoticeText');
    if (topNotice) topNotice.innerText = n;
    closeModal('noticeModal');
    alert('নোটিস বোর্ড সফলভাবে আপডেট হয়েছে!');
}

export function openChangePassModal() { document.getElementById('changePassModal')?.classList.remove('hidden'); }
export function processPasswordChange(e: Event) {
    e.preventDefault();
    const uname = (document.getElementById('cpUsername') as HTMLInputElement).value;
    const oldP = (document.getElementById('cpOldPass') as HTMLInputElement).value;
    const newP = (document.getElementById('cpNewPass') as HTMLInputElement).value;
    const users = getUsers();
    const u = users.find(x => x.username === uname && x.pass === oldP);
    if (u) {
        u.pass = newP;
        saveUsers(users);
        closeModal('changePassModal');
        alert('পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!');
    } else {
        alert('ভুল ইউজারনেম বা পাসওয়ার্ড!');
    }
}

export function openUserCreateModal() { document.getElementById('userCreateModal')?.classList.remove('hidden'); }
export function saveNewUserCredential(e: Event) {
    e.preventDefault();
    const users = getUsers();
    users.push({
        name: (document.getElementById('ucName') as HTMLInputElement).value,
        role: (document.getElementById('ucRole') as HTMLSelectElement).value,
        zone: (document.getElementById('ucZone') as HTMLSelectElement).value,
        username: (document.getElementById('ucUsername') as HTMLInputElement).value,
        pass: (document.getElementById('ucPassword') as HTMLInputElement).value
    });
    saveUsers(users);
    closeModal('userCreateModal');
    renderSystemUsers();
    alert('নতুন ইউজার সফলভাবে তৈরি করা হয়েছে!');
}

if (typeof window !== 'undefined') {
    window.handleLogin = handleLogin;
    window.handleLogout = handleLogout;
    window.switchTab = switchTab;
    window.closeModal = closeModal;
    window.zoomImage = zoomImage;
    window.closeImageZoom = closeImageZoom;
    window.openProductModal = openProductModal;
    window.editProd = editProd;
    window.saveProduct = saveProduct;
    window.deleteProd = deleteProd;
    window.openDealerModal = openDealerModal;
    window.saveDealerDirect = saveDealerDirect;
    window.openEditDealerModal = openEditDealerModal;
    window.saveEditDealer = saveEditDealer;
    window.previewDealerEditImage = previewDealerEditImage;
    window.toggleDealerStatus = toggleDealerStatus;
    window.deleteDealerByCode = deleteDealerByCode;
    window.filterDealersByZone = filterDealersByZone;
    window.openDealerAppModal = openDealerAppModal;
    window.submitDealerApp = submitDealerApp;
    window.approveDealerApp = approveDealerApp;
    window.rejectDealerApp = rejectDealerApp;
    window.openOrderModal = openOrderModal;
    window.addOrderItemRow = addOrderItemRow;
    window.calculateOrderLiveTotal = calculateOrderLiveTotal;
    window.checkSelectedDealerForOrder = checkSelectedDealerForOrder;
    window.saveOrder = saveOrder;
    window.openOrderLineStatusModal = openOrderLineStatusModal;
    window.openEditOrderModal = openEditOrderModal;
    window.saveEditOrder = saveEditOrder;
    window.deleteOrderById = deleteOrderById;
    window.attemptSalesmanDeleteOrder = attemptSalesmanDeleteOrder;
    window.renderFactoryChallanPanel = renderFactoryChallanPanel;
    window.loadDealerPendingChallanItems = loadDealerPendingChallanItems;
    window.processCreateChallan = processCreateChallan;
    window.viewChallanById = viewChallanById;
    window.viewChallanByOrderId = viewChallanByOrderId;
    window.openMasterModifyModal = openMasterModifyModal;
    window.switchMasterModifyTab = switchMasterModifyTab;
    window.printContent = printContent;
    window.generateMasterReport = generateMasterReport;
    window.printOrderInvoice = printOrderInvoice;
    window.openSalesPersonModal = openSalesPersonModal;
    window.saveSalesPerson = saveSalesPerson;
    window.toggleSalesPersonStatus = toggleSalesPersonStatus;
    window.deleteSalesPerson = deleteSalesPerson;
    window.openSalesTargetModal = openSalesTargetModal;
    window.saveSalesTarget = saveSalesTarget;
    window.openUserCreateModal = openUserCreateModal;
    window.saveNewUserCredential = saveNewUserCredential;
    window.deleteUser = deleteUser;
    window.openNoticeModal = openNoticeModal;
    window.saveNewNotice = saveNewNotice;
    window.openChangePassModal = openChangePassModal;
    window.processPasswordChange = processPasswordChange;
    window.openAdminChangeUserPassModal = openAdminChangeUserPassModal;
    window.saveAdminUserPass = saveAdminUserPass;
    window.openLeaveApplyModal = openLeaveApplyModal;
    window.submitLiveApp = submitLiveApp;
    window.approveLiveApp = approveLiveApp;
    window.rejectLiveApp = rejectLiveApp;
    window.openLeaveFormModal = openLeaveFormModal;
    window.saveLeaveApplicationForm = saveLeaveApplicationForm;
    window.renderProfileLeaveSection = renderProfileLeaveSection;
    window.renderAdminLeaveBoard = renderAdminLeaveBoard;
    window.openAdminLeaveApprovalModal = openAdminLeaveApprovalModal;
    window.confirmAdminLeaveApproval = confirmAdminLeaveApproval;
    window.rejectLeaveDirect = rejectLeaveDirect;
    window.openProductionEntryModal = openProductionEntryModal;
    window.saveProductionEntry = saveProductionEntry;
    window.renderProductionManagementBoard = renderProductionManagementBoard;
    window.openAdminProductionApprovalModal = openAdminProductionApprovalModal;
    window.confirmAdminProductionApproval = confirmAdminProductionApproval;
    window.rejectProductionEntry = rejectProductionEntry;
    window.openNotificationModal = openNotificationModal;
    window.markAllNotificationsRead = markAllNotificationsRead;
    window.searchDealerForChallan = searchDealerForChallan;
    window.switchDealerSubTab = switchDealerSubTab;
    window.renderDealerPortal = renderDealerPortal;
    window.openCompanyBrandingModal = openCompanyBrandingModal;
    window.saveCompanyBranding = saveCompanyBranding;
    window.applyCompanyBranding = applyCompanyBranding;
    window.openOrderCancelModal = openOrderCancelModal;
    window.submitOrderCancelRequest = submitOrderCancelRequest;
    window.renderOrderCancelManagementBoard = renderOrderCancelManagementBoard;
    window.approveOrderCancelRequest = approveOrderCancelRequest;
    window.rejectOrderCancelRequest = rejectOrderCancelRequest;
    window.requestDealerCashRefund = requestDealerCashRefund;
    window.openSalesReturnModal = openSalesReturnModal;
    window.initSalesReturnTab = initSalesReturnTab;
    window.syncSalesReturnDealerInput = syncSalesReturnDealerInput;
    window.syncSalesReturnDealerSelect = syncSalesReturnDealerSelect;
    window.selectDeliveryDateForReturn = selectDeliveryDateForReturn;
    window.showAllDeliveredForReturn = showAllDeliveredForReturn;
    window.toggleReturnItemSelection = toggleReturnItemSelection;
    window.toggleSelectAllReturnItems = toggleSelectAllReturnItems;
    window.searchDeliveredChallanForReturn = searchDeliveredChallanForReturn;
    window.updateReturnDraftQty = updateReturnDraftQty;
    window.updateReturnCondition = updateReturnCondition;
    window.removeReturnDraftItem = removeReturnDraftItem;
    window.submitSalesReturnEntry = submitSalesReturnEntry;
    window.renderSalesReturnManagementBoard = renderSalesReturnManagementBoard;
    window.openAdminReturnApprovalModal = openAdminReturnApprovalModal;
    window.confirmAdminReturnApproval = confirmAdminReturnApproval;
    window.rejectSalesReturn = rejectSalesReturn;
    window.togglePasswordVisibility = togglePasswordVisibility;

    window.addEventListener('DOMContentLoaded', () => {
        initBCareApp();
    });
}
