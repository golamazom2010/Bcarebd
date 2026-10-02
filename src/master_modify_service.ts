import {
    getProducts, saveProducts,
    getDealers, saveDealers,
    getSalesPersons, saveSalesPersons,
    getUsers, saveUsers,
    getCurrentRole,
    Product, Dealer, SalesPerson, User,
    bdDistricts
} from './bcare.ts';

let activeMasterTab: 'product' | 'dealer' | 'salesPerson' | 'staff' = 'product';

export function openMasterModifyModal() {
    if (getCurrentRole() !== 'admin') {
        alert('শুধুমাত্র এডমিন পরিবর্তন ও নিয়ন্ত্রণ কেন্দ্রে প্রবেশ করতে পারবেন!');
        return;
    }
    document.getElementById('masterModifyModal')?.classList.remove('hidden');
    switchMasterModifyTab(activeMasterTab);
}

export function switchMasterModifyTab(tab: 'product' | 'dealer' | 'salesPerson' | 'staff') {
    activeMasterTab = tab;
    ['product', 'dealer', 'salesPerson', 'staff'].forEach(t => {
        const btn = document.getElementById(`mmTabBtn-${t}`);
        if (btn) {
            if (t === tab) {
                btn.className = 'px-4 py-2 border-b-2 font-bold text-sm text-indigo-600 border-indigo-600 bg-indigo-50/50 rounded-t-lg';
            } else {
                btn.className = 'px-4 py-2 border-b-2 font-semibold text-sm text-slate-600 border-transparent hover:text-slate-800';
            }
        }
    });

    const container = document.getElementById('masterModifyContentArea');
    if (!container) return;

    if (tab === 'product') renderMasterProductSection(container);
    else if (tab === 'dealer') renderMasterDealerSection(container);
    else if (tab === 'salesPerson') renderMasterSalesPersonSection(container);
    else if (tab === 'staff') renderMasterStaffSection(container);
}

export function readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

function renderMasterProductSection(container: HTMLElement) {
    const products = getProducts();
    container.innerHTML = `
        <div class="space-y-4">
            <div class="flex justify-between items-center bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                <div>
                    <h4 class="font-bold text-slate-800 text-sm">১। প্রোডাক্ট ম্যানেজমেন্ট ও ইমেজ আপলোড</h4>
                    <p class="text-xs text-slate-600">প্রোডাক্টের ছবি সংযুক্ত করুন, নতুন যোগ করুন, পরিবর্তন বা সক্রিয়/নিষ্ক্রিয় করুন</p>
                </div>
                <button onclick="window.showProductEditForm(-1)" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow">
                    <i class="fa-solid fa-plus mr-1"></i> নতুন প্রোডাক্ট যোগ করুন
                </button>
            </div>

            <div id="mmProductFormDiv" class="hidden bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h5 id="mmProdFormTitle" class="font-bold text-slate-800 text-sm mb-3">প্রোডাক্ট তথ্য</h5>
                <form onsubmit="window.handleSaveMasterProduct(event)" class="space-y-3">
                    <input type="hidden" id="mmProdIndex" value="-1">
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">প্রোডাক্ট কোড *</label>
                            <input type="text" id="mmProdCode" required class="w-full px-3 py-1.5 border rounded bg-white">
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">প্রোডাক্ট নাম *</label>
                            <input type="text" id="mmProdName" required class="w-full px-3 py-1.5 border rounded bg-white">
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">একক (Unit) *</label>
                            <select id="mmProdUnit" class="w-full px-3 py-1.5 border rounded bg-white">
                                <option value="লিটার">লিটার</option>
                                <option value="পিস">পিস</option>
                                <option value="কেজি">কেজি</option>
                                <option value="বক্স">বক্স</option>
                            </select>
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">রেট (৳) *</label>
                            <input type="number" id="mmProdRate" required class="w-full px-3 py-1.5 border rounded bg-white">
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">স্টক *</label>
                            <input type="number" id="mmProdStock" required class="w-full px-3 py-1.5 border rounded bg-white">
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">তারিখ</label>
                            <input type="date" id="mmProdDate" class="w-full px-3 py-1.5 border rounded bg-white">
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">স্ট্যাটাস</label>
                            <select id="mmProdStatus" class="w-full px-3 py-1.5 border rounded bg-white font-semibold">
                                <option value="Active">সক্রিয় (Active)</option>
                                <option value="Inactive">নিষ্ক্রিয় (Inactive)</option>
                            </select>
                        </div>
                        <div class="sm:col-span-2">
                            <label class="block font-semibold text-slate-700 mb-1">প্রোডাক্টের ছবি ফাইল সংযুক্ত করুন (Image File)</label>
                            <input type="file" id="mmProdImageFile" accept="image/*" class="w-full px-2 py-1 border rounded bg-white text-xs">
                            <input type="hidden" id="mmProdExistingImg">
                        </div>
                    </div>
                    <div class="flex justify-end gap-2 pt-2">
                        <button type="button" onclick="document.getElementById('mmProductFormDiv').classList.add('hidden')" class="px-3 py-1.5 bg-slate-200 rounded text-xs font-semibold">বাতিল</button>
                        <button type="submit" class="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold shadow">সংরক্ষণ করুন</button>
                    </div>
                </form>
            </div>

            <div class="overflow-x-auto border rounded-xl">
                <table class="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr class="bg-slate-100 text-slate-700 font-bold uppercase">
                            <th class="p-2.5">ছবি</th>
                            <th class="p-2.5">কোড</th>
                            <th class="p-2.5">নাম</th>
                            <th class="p-2.5 text-center">একক</th>
                            <th class="p-2.5 text-right">রেট (৳)</th>
                            <th class="p-2.5 text-center">স্টক</th>
                            <th class="p-2.5">তারিখ</th>
                            <th class="p-2.5 text-center">স্ট্যাটাস</th>
                            <th class="p-2.5 text-right">অ্যাকশন</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y">
                        ${products.map((p, idx) => {
                            const isActive = p.status !== 'Inactive';
                            const statusBadge = isActive
                                ? `<span class="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">সক্রিয়</span>`
                                : `<span class="bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold">নিষ্ক্রিয়</span>`;
                            const img = p.image || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=80&auto=format&fit=crop&q=60';
                            return `
                                <tr class="hover:bg-slate-50">
                                    <td class="p-2"><img src="${img}" class="w-9 h-9 object-cover rounded border"></td>
                                    <td class="p-2 font-bold text-indigo-700">${p.code}</td>
                                    <td class="p-2 font-medium">${p.name}</td>
                                    <td class="p-2 text-center">${p.unit}</td>
                                    <td class="p-2 text-right font-bold text-emerald-700">৳ ${p.rate}</td>
                                    <td class="p-2 text-center font-medium">${p.stock}</td>
                                    <td class="p-2 text-slate-500">${p.date || '২০২৬-০৯-০১'}</td>
                                    <td class="p-2 text-center">${statusBadge}</td>
                                    <td class="p-2 text-right whitespace-nowrap">
                                        <button onclick="window.showProductEditForm(${idx})" class="text-blue-600 bg-blue-50 px-2 py-1 rounded font-semibold mr-1">পরিবর্তন</button>
                                        <button onclick="window.toggleMasterProductStatus(${idx})" class="${isActive ? 'text-amber-700 bg-amber-50' : 'text-emerald-700 bg-emerald-50'} px-2 py-1 rounded font-semibold mr-1">
                                            ${isActive ? 'নিষ্ক্রিয়' : 'সক্রিয়'}
                                        </button>
                                        <button onclick="window.deleteMasterProduct(${idx})" class="text-red-600 bg-red-50 px-2 py-1 rounded">ডিলিট</button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

export function showProductEditForm(idx: number) {
    const div = document.getElementById('mmProductFormDiv');
    if (!div) return;
    div.classList.remove('hidden');
    const products = getProducts();

    if (idx >= 0 && products[idx]) {
        const p = products[idx];
        (document.getElementById('mmProdFormTitle') as HTMLElement).innerText = `প্রোডাক্ট পরিবর্তন: [${p.code}] ${p.name}`;
        (document.getElementById('mmProdIndex') as HTMLInputElement).value = idx.toString();
        (document.getElementById('mmProdCode') as HTMLInputElement).value = p.code;
        (document.getElementById('mmProdName') as HTMLInputElement).value = p.name;
        (document.getElementById('mmProdUnit') as HTMLSelectElement).value = p.unit || 'পিস';
        (document.getElementById('mmProdRate') as HTMLInputElement).value = p.rate.toString();
        (document.getElementById('mmProdStock') as HTMLInputElement).value = p.stock.toString();
        (document.getElementById('mmProdDate') as HTMLInputElement).value = p.date || new Date().toISOString().split('T')[0];
        (document.getElementById('mmProdStatus') as HTMLSelectElement).value = p.status || 'Active';
        (document.getElementById('mmProdExistingImg') as HTMLInputElement).value = p.image || '';
    } else {
        (document.getElementById('mmProdFormTitle') as HTMLElement).innerText = 'নতুন প্রোডাক্ট যোগ করুন';
        (document.getElementById('mmProdIndex') as HTMLInputElement).value = '-1';
        (document.getElementById('mmProdCode') as HTMLInputElement).value = 'PRD-' + (products.length + 101);
        (document.getElementById('mmProdName') as HTMLInputElement).value = '';
        (document.getElementById('mmProdUnit') as HTMLSelectElement).value = 'পিস';
        (document.getElementById('mmProdRate') as HTMLInputElement).value = '';
        (document.getElementById('mmProdStock') as HTMLInputElement).value = '100';
        (document.getElementById('mmProdDate') as HTMLInputElement).value = new Date().toISOString().split('T')[0];
        (document.getElementById('mmProdStatus') as HTMLSelectElement).value = 'Active';
        (document.getElementById('mmProdExistingImg') as HTMLInputElement).value = '';
    }
}

export async function handleSaveMasterProduct(e: Event) {
    e.preventDefault();
    const idx = parseInt((document.getElementById('mmProdIndex') as HTMLInputElement).value);
    const products = getProducts();
    const fileInput = document.getElementById('mmProdImageFile') as HTMLInputElement;
    let imgData = (document.getElementById('mmProdExistingImg') as HTMLInputElement).value;

    if (fileInput?.files && fileInput.files[0]) {
        imgData = await readFileAsBase64(fileInput.files[0]);
    }

    const prodObj: Product = {
        code: (document.getElementById('mmProdCode') as HTMLInputElement).value.trim(),
        name: (document.getElementById('mmProdName') as HTMLInputElement).value.trim(),
        unit: (document.getElementById('mmProdUnit') as HTMLSelectElement).value,
        rate: Number((document.getElementById('mmProdRate') as HTMLInputElement).value),
        stock: Number((document.getElementById('mmProdStock') as HTMLInputElement).value),
        date: (document.getElementById('mmProdDate') as HTMLInputElement).value,
        status: (document.getElementById('mmProdStatus') as HTMLSelectElement).value as any,
        image: imgData
    };

    if (idx >= 0) products[idx] = prodObj;
    else products.push(prodObj);

    saveProducts(products);
    switchMasterModifyTab('product');
    if ((window as any).loadAllData) (window as any).loadAllData();
    alert('প্রোডাক্ট সফলভাবে সংরক্ষণ করা হয়েছে!');
}

export function toggleMasterProductStatus(idx: number) {
    const products = getProducts();
    if (!products[idx]) return;
    products[idx].status = products[idx].status === 'Inactive' ? 'Active' : 'Inactive';
    saveProducts(products);
    switchMasterModifyTab('product');
    if ((window as any).loadAllData) (window as any).loadAllData();
}

export function deleteMasterProduct(idx: number) {
    if (confirm('এই প্রোডাক্ট ডিলিট করতে চান?')) {
        const products = getProducts();
        products.splice(idx, 1);
        saveProducts(products);
        switchMasterModifyTab('product');
        if ((window as any).loadAllData) (window as any).loadAllData();
    }
}

function renderMasterDealerSection(container: HTMLElement) {
    const dealers = getDealers();
    container.innerHTML = `
        <div class="space-y-4">
            <div class="flex justify-between items-center bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                <div>
                    <h4 class="font-bold text-slate-800 text-sm">২। ডিলার পরিবর্তন ও দোকান/প্রোফাইল ছবি সংযুক্ত</h4>
                    <p class="text-xs text-slate-600">ডিলারের ছবি সংযুক্ত করুন, তথ্য পরিবর্তন বা সক্রিয়/নিষ্ক্রিয় করুন</p>
                </div>
                <button onclick="window.showDealerEditForm(-1)" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow">
                    <i class="fa-solid fa-plus mr-1"></i> নতুন ডিলার যোগ করুন
                </button>
            </div>

            <div id="mmDealerFormDiv" class="hidden bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h5 id="mmDlrFormTitle" class="font-bold text-slate-800 text-sm mb-3">ডিলার তথ্য</h5>
                <form onsubmit="window.handleSaveMasterDealer(event)" class="space-y-3">
                    <input type="hidden" id="mmDlrIndex" value="-1">
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">ডিলার কোড *</label>
                            <input type="text" id="mmDlrCode" required class="w-full px-3 py-1.5 border rounded bg-white">
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">ডিলার/ফার্মের নাম *</label>
                            <input type="text" id="mmDlrName" required class="w-full px-3 py-1.5 border rounded bg-white">
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">চেয়ারম্যান/প্রোপাইটর *</label>
                            <input type="text" id="mmDlrChairman" required class="w-full px-3 py-1.5 border rounded bg-white">
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">জোন *</label>
                            <select id="mmDlrZone" class="w-full px-3 py-1.5 border rounded bg-white">
                                ${bdDistricts.map(d => `<option value="${d}">${d} জেলা</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">মোবাইল নম্বর *</label>
                            <input type="text" id="mmDlrMobile" required class="w-full px-3 py-1.5 border rounded bg-white">
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">ঠিকানা</label>
                            <input type="text" id="mmDlrAddress" class="w-full px-3 py-1.5 border rounded bg-white">
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">নিবন্ধন তারিখ</label>
                            <input type="date" id="mmDlrDate" class="w-full px-3 py-1.5 border rounded bg-white">
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">স্ট্যাটাস</label>
                            <select id="mmDlrStatus" class="w-full px-3 py-1.5 border rounded bg-white font-semibold">
                                <option value="Active">সক্রিয় (Active)</option>
                                <option value="Inactive">নিষ্ক্রিয় (Inactive)</option>
                            </select>
                        </div>
                        <div class="sm:col-span-2">
                            <label class="block font-semibold text-slate-700 mb-1">ডিলারের দোকান / প্রোফাইল ছবি সংযুক্ত করুন (Image File)</label>
                            <input type="file" id="mmDlrImageFile" accept="image/*" class="w-full px-2 py-1 border rounded bg-white text-xs">
                            <input type="hidden" id="mmDlrExistingImg">
                        </div>
                    </div>
                    <div class="flex justify-end gap-2 pt-2">
                        <button type="button" onclick="document.getElementById('mmDealerFormDiv').classList.add('hidden')" class="px-3 py-1.5 bg-slate-200 rounded text-xs font-semibold">বাতিল</button>
                        <button type="submit" class="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold shadow">সংরক্ষণ করুন</button>
                    </div>
                </form>
            </div>

            <div class="overflow-x-auto border rounded-xl">
                <table class="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr class="bg-slate-100 text-slate-700 font-bold uppercase">
                            <th class="p-2.5">ছবি</th>
                            <th class="p-2.5">কোড</th>
                            <th class="p-2.5">ডিলার নাম</th>
                            <th class="p-2.5">চেয়ারম্যান</th>
                            <th class="p-2.5">জোন</th>
                            <th class="p-2.5">মোবাইল</th>
                            <th class="p-2.5">তারিখ</th>
                            <th class="p-2.5 text-center">স্ট্যাটাস</th>
                            <th class="p-2.5 text-right">অ্যাকশন</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y">
                        ${dealers.map((d, idx) => {
                            const isActive = d.status === 'Active' || d.status === 'সক্রিয়';
                            const statusBadge = isActive
                                ? `<span class="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">সক্রিয়</span>`
                                : `<span class="bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold">নিষ্ক্রিয়</span>`;
                            const img = d.image || 'https://images.unsplash.com/photo-1578496781985-452d4a934d50?w=80&auto=format&fit=crop&q=60';
                            return `
                                <tr class="hover:bg-slate-50">
                                    <td class="p-2"><img src="${img}" class="w-9 h-9 object-cover rounded border"></td>
                                    <td class="p-2 font-bold text-indigo-700">${d.code}</td>
                                    <td class="p-2 font-medium">${d.name}</td>
                                    <td class="p-2 text-slate-600">${d.chairman || '-'}</td>
                                    <td class="p-2 text-blue-700 font-semibold">${d.zone}</td>
                                    <td class="p-2">${d.mobile}</td>
                                    <td class="p-2 text-slate-500">${d.date || '২০২৬-০৯-০১'}</td>
                                    <td class="p-2 text-center">${statusBadge}</td>
                                    <td class="p-2 text-right whitespace-nowrap">
                                        <button onclick="window.showDealerEditForm(${idx})" class="text-blue-600 bg-blue-50 px-2 py-1 rounded font-semibold mr-1">পরিবর্তন</button>
                                        <button onclick="window.toggleMasterDealerStatus(${idx})" class="${isActive ? 'text-amber-700 bg-amber-50' : 'text-emerald-700 bg-emerald-50'} px-2 py-1 rounded font-semibold mr-1">
                                            ${isActive ? 'নিষ্ক্রিয়' : 'সক্রিয়'}
                                        </button>
                                        <button onclick="window.deleteMasterDealer(${idx})" class="text-red-600 bg-red-50 px-2 py-1 rounded">ডিলিট</button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

export function showDealerEditForm(idx: number) {
    const div = document.getElementById('mmDealerFormDiv');
    if (!div) return;
    div.classList.remove('hidden');
    const dealers = getDealers();

    if (idx >= 0 && dealers[idx]) {
        const d = dealers[idx];
        (document.getElementById('mmDlrFormTitle') as HTMLElement).innerText = `ডিলার পরিবর্তন: [${d.code}] ${d.name}`;
        (document.getElementById('mmDlrIndex') as HTMLInputElement).value = idx.toString();
        (document.getElementById('mmDlrCode') as HTMLInputElement).value = d.code;
        (document.getElementById('mmDlrName') as HTMLInputElement).value = d.name;
        (document.getElementById('mmDlrChairman') as HTMLInputElement).value = d.chairman || '';
        (document.getElementById('mmDlrZone') as HTMLSelectElement).value = d.zone;
        (document.getElementById('mmDlrMobile') as HTMLInputElement).value = d.mobile;
        (document.getElementById('mmDlrAddress') as HTMLInputElement).value = d.address || '';
        (document.getElementById('mmDlrDate') as HTMLInputElement).value = d.date || new Date().toISOString().split('T')[0];
        (document.getElementById('mmDlrStatus') as HTMLSelectElement).value = d.status === 'Inactive' ? 'Inactive' : 'Active';
        (document.getElementById('mmDlrExistingImg') as HTMLInputElement).value = d.image || '';
    } else {
        (document.getElementById('mmDlrFormTitle') as HTMLElement).innerText = 'নতুন ডিলার যোগ করুন';
        (document.getElementById('mmDlrIndex') as HTMLInputElement).value = '-1';
        (document.getElementById('mmDlrCode') as HTMLInputElement).value = '22' + (dealers.length + 10);
        (document.getElementById('mmDlrName') as HTMLInputElement).value = '';
        (document.getElementById('mmDlrChairman') as HTMLInputElement).value = '';
        (document.getElementById('mmDlrZone') as HTMLSelectElement).value = 'ঢাকা';
        (document.getElementById('mmDlrMobile') as HTMLInputElement).value = '';
        (document.getElementById('mmDlrAddress') as HTMLInputElement).value = '';
        (document.getElementById('mmDlrDate') as HTMLInputElement).value = new Date().toISOString().split('T')[0];
        (document.getElementById('mmDlrStatus') as HTMLSelectElement).value = 'Active';
        (document.getElementById('mmDlrExistingImg') as HTMLInputElement).value = '';
    }
}

export async function handleSaveMasterDealer(e: Event) {
    e.preventDefault();
    const idx = parseInt((document.getElementById('mmDlrIndex') as HTMLInputElement).value);
    const dealers = getDealers();
    const fileInput = document.getElementById('mmDlrImageFile') as HTMLInputElement;
    let imgData = (document.getElementById('mmDlrExistingImg') as HTMLInputElement).value;

    if (fileInput?.files && fileInput.files[0]) {
        imgData = await readFileAsBase64(fileInput.files[0]);
    }

    const dlrObj: Dealer = {
        code: (document.getElementById('mmDlrCode') as HTMLInputElement).value.trim(),
        name: (document.getElementById('mmDlrName') as HTMLInputElement).value.trim(),
        chairman: (document.getElementById('mmDlrChairman') as HTMLInputElement).value.trim(),
        zone: (document.getElementById('mmDlrZone') as HTMLSelectElement).value,
        mobile: (document.getElementById('mmDlrMobile') as HTMLInputElement).value.trim(),
        address: (document.getElementById('mmDlrAddress') as HTMLInputElement).value.trim(),
        date: (document.getElementById('mmDlrDate') as HTMLInputElement).value,
        status: (document.getElementById('mmDlrStatus') as HTMLSelectElement).value as any,
        image: imgData
    };

    if (idx >= 0) dealers[idx] = dlrObj;
    else dealers.push(dlrObj);

    saveDealers(dealers);
    switchMasterModifyTab('dealer');
    if ((window as any).loadAllData) (window as any).loadAllData();
    alert('ডিলার তথ্য সফলভাবে সংরক্ষণ করা হয়েছে!');
}

export function toggleMasterDealerStatus(idx: number) {
    const dealers = getDealers();
    if (!dealers[idx]) return;
    const isAct = dealers[idx].status === 'Active' || dealers[idx].status === 'সক্রিয়';
    dealers[idx].status = isAct ? 'Inactive' : 'Active';
    saveDealers(dealers);
    switchMasterModifyTab('dealer');
    if ((window as any).loadAllData) (window as any).loadAllData();
}

export function deleteMasterDealer(idx: number) {
    if (confirm('এই ডিলার ডিলিট করতে চান?')) {
        const dealers = getDealers();
        dealers.splice(idx, 1);
        saveDealers(dealers);
        switchMasterModifyTab('dealer');
        if ((window as any).loadAllData) (window as any).loadAllData();
    }
}

function renderMasterSalesPersonSection(container: HTMLElement) {
    const sps = getSalesPersons();
    container.innerHTML = `
        <div class="space-y-4">
            <div class="flex justify-between items-center bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                <div>
                    <h4 class="font-bold text-slate-800 text-sm">৩। সেলস পার্সন পরিবর্তন, জোন সংযুক্তি ও ছবি আপলোড</h4>
                    <p class="text-xs text-slate-600">সেলস ম্যানের ছবি সংযুক্ত করুন, জোন নির্ধারণ, পরিবর্তন বা সক্রিয়/নিষ্ক্রিয় করুন</p>
                </div>
                <button onclick="window.showSalesPersonEditForm(-1)" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow">
                    <i class="fa-solid fa-plus mr-1"></i> নতুন সেলস পার্সন যুক্ত করুন
                </button>
            </div>

            <div id="mmSpFormDiv" class="hidden bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h5 id="mmSpFormTitle" class="font-bold text-slate-800 text-sm mb-3">সেলস পার্সন তথ্য</h5>
                <form onsubmit="window.handleSaveMasterSalesPerson(event)" class="space-y-3">
                    <input type="hidden" id="mmSpIndex" value="-1">
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">আইডি নম্বর *</label>
                            <input type="text" id="mmSpId" required class="w-full px-3 py-1.5 border rounded bg-white">
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">পূর্ণ নাম *</label>
                            <input type="text" id="mmSpName" required class="w-full px-3 py-1.5 border rounded bg-white">
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">পদবী *</label>
                            <input type="text" id="mmSpDesignation" required class="w-full px-3 py-1.5 border rounded bg-white">
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">নির্ধারিত জোন (এডমিন কর্তৃক সংযুক্তি) *</label>
                            <select id="mmSpZone" class="w-full px-3 py-1.5 border rounded bg-white font-bold text-emerald-800">
                                ${bdDistricts.map(d => `<option value="${d}">${d} জেলা</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">কোম্পানি মোবাইল *</label>
                            <input type="text" id="mmSpMobile" required class="w-full px-3 py-1.5 border rounded bg-white">
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">এনআইডি নম্বর</label>
                            <input type="text" id="mmSpNid" class="w-full px-3 py-1.5 border rounded bg-white">
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">মাসিক বেতন (৳)</label>
                            <input type="number" id="mmSpSalary" class="w-full px-3 py-1.5 border rounded bg-white">
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">যোগদানের তারিখ</label>
                            <input type="date" id="mmSpDate" class="w-full px-3 py-1.5 border rounded bg-white">
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">স্ট্যাটাস</label>
                            <select id="mmSpStatus" class="w-full px-3 py-1.5 border rounded bg-white font-semibold">
                                <option value="Active">সক্রিয় (Active)</option>
                                <option value="Inactive">নিষ্ক্রিয় (Inactive)</option>
                            </select>
                        </div>
                        <div class="sm:col-span-2">
                            <label class="block font-semibold text-slate-700 mb-1">সেলস পার্সনের ছবি ফাইল সংযুক্ত করুন (Photo File)</label>
                            <input type="file" id="mmSpImageFile" accept="image/*" class="w-full px-2 py-1 border rounded bg-white text-xs">
                            <input type="hidden" id="mmSpExistingImg">
                        </div>
                    </div>
                    <div class="flex justify-end gap-2 pt-2">
                        <button type="button" onclick="document.getElementById('mmSpFormDiv').classList.add('hidden')" class="px-3 py-1.5 bg-slate-200 rounded text-xs font-semibold">বাতিল</button>
                        <button type="submit" class="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold shadow">সংরক্ষণ করুন</button>
                    </div>
                </form>
            </div>

            <div class="overflow-x-auto border rounded-xl">
                <table class="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr class="bg-slate-100 text-slate-700 font-bold uppercase">
                            <th class="p-2.5">ছবি</th>
                            <th class="p-2.5">আইডি</th>
                            <th class="p-2.5">নাম</th>
                            <th class="p-2.5">পদবী</th>
                            <th class="p-2.5">জোন</th>
                            <th class="p-2.5">মোবাইল</th>
                            <th class="p-2.5">তারিখ</th>
                            <th class="p-2.5 text-center">স্ট্যাটাস</th>
                            <th class="p-2.5 text-right">অ্যাকশন</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y">
                        ${sps.map((s, idx) => {
                            const isActive = s.status === 'Active' || s.status === 'সক্রিয়';
                            const statusBadge = isActive
                                ? `<span class="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">সক্রিয়</span>`
                                : `<span class="bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold">নিষ্ক্রিয়</span>`;
                            const img = s.image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=60';
                            return `
                                <tr class="hover:bg-slate-50">
                                    <td class="p-2"><img src="${img}" class="w-9 h-9 object-cover rounded-full border"></td>
                                    <td class="p-2 font-bold text-indigo-700">${s.id}</td>
                                    <td class="p-2 font-medium">${s.name}</td>
                                    <td class="p-2 text-slate-600">${s.designation}</td>
                                    <td class="p-2 text-blue-700 font-bold bg-blue-50/50">${s.zone}</td>
                                    <td class="p-2">${s.compMobile}</td>
                                    <td class="p-2 text-slate-500">${s.date || '২০২৬-০৯-০১'}</td>
                                    <td class="p-2 text-center">${statusBadge}</td>
                                    <td class="p-2 text-right whitespace-nowrap">
                                        <button onclick="window.showSalesPersonEditForm(${idx})" class="text-blue-600 bg-blue-50 px-2 py-1 rounded font-semibold mr-1">পরিবর্তন</button>
                                        <button onclick="window.toggleMasterSalesPersonStatus(${idx})" class="${isActive ? 'text-amber-700 bg-amber-50' : 'text-emerald-700 bg-emerald-50'} px-2 py-1 rounded font-semibold mr-1">
                                            ${isActive ? 'নিষ্ক্রিয়' : 'সক্রিয়'}
                                        </button>
                                        <button onclick="window.deleteMasterSalesPerson(${idx})" class="text-red-600 bg-red-50 px-2 py-1 rounded">ডিলিট</button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

export function showSalesPersonEditForm(idx: number) {
    const div = document.getElementById('mmSpFormDiv');
    if (!div) return;
    div.classList.remove('hidden');
    const sps = getSalesPersons();

    if (idx >= 0 && sps[idx]) {
        const s = sps[idx];
        (document.getElementById('mmSpFormTitle') as HTMLElement).innerText = `সেলস পার্সন পরিবর্তন: [${s.id}] ${s.name}`;
        (document.getElementById('mmSpIndex') as HTMLInputElement).value = idx.toString();
        (document.getElementById('mmSpId') as HTMLInputElement).value = s.id;
        (document.getElementById('mmSpName') as HTMLInputElement).value = s.name;
        (document.getElementById('mmSpDesignation') as HTMLInputElement).value = s.designation;
        (document.getElementById('mmSpZone') as HTMLSelectElement).value = s.zone;
        (document.getElementById('mmSpMobile') as HTMLInputElement).value = s.compMobile;
        (document.getElementById('mmSpNid') as HTMLInputElement).value = s.nid || '';
        (document.getElementById('mmSpSalary') as HTMLInputElement).value = s.salary || '';
        (document.getElementById('mmSpDate') as HTMLInputElement).value = s.date || new Date().toISOString().split('T')[0];
        (document.getElementById('mmSpStatus') as HTMLSelectElement).value = s.status === 'Inactive' ? 'Inactive' : 'Active';
        (document.getElementById('mmSpExistingImg') as HTMLInputElement).value = s.image || '';
    } else {
        (document.getElementById('mmSpFormTitle') as HTMLElement).innerText = 'নতুন সেলস পার্সন যুক্ত করুন';
        (document.getElementById('mmSpIndex') as HTMLInputElement).value = '-1';
        (document.getElementById('mmSpId') as HTMLInputElement).value = '99' + (sps.length + 10);
        (document.getElementById('mmSpName') as HTMLInputElement).value = '';
        (document.getElementById('mmSpDesignation') as HTMLInputElement).value = 'Territory Sales Officer';
        (document.getElementById('mmSpZone') as HTMLSelectElement).value = 'ঢাকা';
        (document.getElementById('mmSpMobile') as HTMLInputElement).value = '';
        (document.getElementById('mmSpNid') as HTMLInputElement).value = '';
        (document.getElementById('mmSpSalary') as HTMLInputElement).value = '25000';
        (document.getElementById('mmSpDate') as HTMLInputElement).value = new Date().toISOString().split('T')[0];
        (document.getElementById('mmSpStatus') as HTMLSelectElement).value = 'Active';
        (document.getElementById('mmSpExistingImg') as HTMLInputElement).value = '';
    }
}

export async function handleSaveMasterSalesPerson(e: Event) {
    e.preventDefault();
    const idx = parseInt((document.getElementById('mmSpIndex') as HTMLInputElement).value);
    const sps = getSalesPersons();
    const fileInput = document.getElementById('mmSpImageFile') as HTMLInputElement;
    let imgData = (document.getElementById('mmSpExistingImg') as HTMLInputElement).value;

    if (fileInput?.files && fileInput.files[0]) {
        imgData = await readFileAsBase64(fileInput.files[0]);
    }

    const assignedZone = (document.getElementById('mmSpZone') as HTMLSelectElement).value;
    const spName = (document.getElementById('mmSpName') as HTMLInputElement).value.trim();
    const spId = (document.getElementById('mmSpId') as HTMLInputElement).value.trim();
    const spStatus = (document.getElementById('mmSpStatus') as HTMLSelectElement).value;

    const spObj: SalesPerson = {
        id: spId,
        name: spName,
        designation: (document.getElementById('mmSpDesignation') as HTMLInputElement).value.trim(),
        zone: assignedZone,
        compMobile: (document.getElementById('mmSpMobile') as HTMLInputElement).value.trim(),
        nid: (document.getElementById('mmSpNid') as HTMLInputElement).value.trim(),
        salary: (document.getElementById('mmSpSalary') as HTMLInputElement).value.trim(),
        date: (document.getElementById('mmSpDate') as HTMLInputElement).value,
        status: spStatus,
        image: imgData
    };

    if (idx >= 0) sps[idx] = spObj;
    else sps.push(spObj);

    saveSalesPersons(sps);

    const users = getUsers();
    const matchedUser = users.find(u => u.name === spName || u.code === spId);
    if (matchedUser) {
        matchedUser.zone = assignedZone;
        matchedUser.status = spStatus;
        if (imgData) matchedUser.image = imgData;
        saveUsers(users);
    }

    switchMasterModifyTab('salesPerson');
    if ((window as any).loadAllData) (window as any).loadAllData();
    alert('সেলস পার্সন তথ্য সফলভাবে সংরক্ষণ ও জোন হালনাগাদ করা হয়েছে!');
}

export function toggleMasterSalesPersonStatus(idx: number) {
    const sps = getSalesPersons();
    if (!sps[idx]) return;
    const isAct = sps[idx].status === 'Active' || sps[idx].status === 'সক্রিয়';
    sps[idx].status = isAct ? 'Inactive' : 'Active';
    saveSalesPersons(sps);

    const users = getUsers();
    const matched = users.find(u => u.name === sps[idx].name || u.code === sps[idx].id);
    if (matched) {
        matched.status = sps[idx].status;
        saveUsers(users);
    }

    switchMasterModifyTab('salesPerson');
    if ((window as any).loadAllData) (window as any).loadAllData();
}

export function deleteMasterSalesPerson(idx: number) {
    if (confirm('এই সেলস পার্সন ডিলিট করতে চান?')) {
        const sps = getSalesPersons();
        sps.splice(idx, 1);
        saveSalesPersons(sps);
        switchMasterModifyTab('salesPerson');
        if ((window as any).loadAllData) (window as any).loadAllData();
    }
}

function renderMasterStaffSection(container: HTMLElement) {
    const users = getUsers();
    container.innerHTML = `
        <div class="space-y-4">
            <div class="flex justify-between items-center bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                <div>
                    <h4 class="font-bold text-slate-800 text-sm">৪। অফিস স্টাফ পরিবর্তন, ছবি সংযুক্তি ও পারমিশন</h4>
                    <p class="text-xs text-slate-600">ফ্যাক্টরি ম্যানেজার, একাউন্টস ও অফিস স্টাফদের ছবি সংযুক্ত করুন, পাসওয়ার্ড ও রোল পরিবর্তন করুন</p>
                </div>
                <button onclick="window.showStaffEditForm(-1)" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow">
                    <i class="fa-solid fa-plus mr-1"></i> নতুন অফিস স্টাফ যুক্ত করুন
                </button>
            </div>

            <div id="mmStaffFormDiv" class="hidden bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h5 id="mmStaffFormTitle" class="font-bold text-slate-800 text-sm mb-3">অফিস স্টাফ তথ্য</h5>
                <form onsubmit="window.handleSaveMasterStaff(event)" class="space-y-3">
                    <input type="hidden" id="mmStaffIndex" value="-1">
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">পূর্ণ নাম *</label>
                            <input type="text" id="mmStaffName" required class="w-full px-3 py-1.5 border rounded bg-white">
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">অফিস রোল *</label>
                            <select id="mmStaffRole" class="w-full px-3 py-1.5 border rounded bg-white font-semibold">
                                <option value="factory">ফ্যাক্টরি ম্যানেজার (Factory Manager)</option>
                                <option value="accounts">একাউন্টস ম্যানেজার (Accounts Manager)</option>
                                <option value="admin">এডমিন (System Admin)</option>
                                <option value="employee">সেলস ম্যান (Employee)</option>
                            </select>
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">জোন</label>
                            <select id="mmStaffZone" class="w-full px-3 py-1.5 border rounded bg-white">
                                <option value="All">সকল জোন (All Zones)</option>
                                ${bdDistricts.map(d => `<option value="${d}">${d} জেলা</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">ইউজারনেম (Login ID) *</label>
                            <input type="text" id="mmStaffUsername" required class="w-full px-3 py-1.5 border rounded bg-white font-mono">
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">পাসওয়ার্ড *</label>
                            <input type="text" id="mmStaffPass" required class="w-full px-3 py-1.5 border rounded bg-white font-mono">
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">নিবন্ধন তারিখ</label>
                            <input type="date" id="mmStaffDate" class="w-full px-3 py-1.5 border rounded bg-white">
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">স্ট্যাটাস</label>
                            <select id="mmStaffStatus" class="w-full px-3 py-1.5 border rounded bg-white font-semibold">
                                <option value="Active">সক্রিয় (Active)</option>
                                <option value="Inactive">নিষ্ক্রিয় (Inactive)</option>
                            </select>
                        </div>
                        <div class="sm:col-span-2">
                            <label class="block font-semibold text-slate-700 mb-1">স্টাফের ছবি ফাইল সংযুক্ত করুন (Photo File)</label>
                            <input type="file" id="mmStaffImageFile" accept="image/*" class="w-full px-2 py-1 border rounded bg-white text-xs">
                            <input type="hidden" id="mmStaffExistingImg">
                        </div>
                    </div>
                    <div class="flex justify-end gap-2 pt-2">
                        <button type="button" onclick="document.getElementById('mmStaffFormDiv').classList.add('hidden')" class="px-3 py-1.5 bg-slate-200 rounded text-xs font-semibold">বাতিল</button>
                        <button type="submit" class="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold shadow">সংরক্ষণ করুন</button>
                    </div>
                </form>
            </div>

            <div class="overflow-x-auto border rounded-xl">
                <table class="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr class="bg-slate-100 text-slate-700 font-bold uppercase">
                            <th class="p-2.5">ছবি</th>
                            <th class="p-2.5">নাম</th>
                            <th class="p-2.5">রোল</th>
                            <th class="p-2.5">জোন</th>
                            <th class="p-2.5">ইউজারনেম</th>
                            <th class="p-2.5">পাসওয়ার্ড</th>
                            <th class="p-2.5">তারিখ</th>
                            <th class="p-2.5 text-center">স্ট্যাটাস</th>
                            <th class="p-2.5 text-right">অ্যাকশন</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y">
                        ${users.map((u, idx) => {
                            const isActive = u.status !== 'Inactive';
                            const statusBadge = isActive
                                ? `<span class="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">সক্রিয়</span>`
                                : `<span class="bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold">নিষ্ক্রিয়</span>`;
                            const img = u.image || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=60';
                            return `
                                <tr class="hover:bg-slate-50">
                                    <td class="p-2"><img src="${img}" class="w-9 h-9 object-cover rounded-full border"></td>
                                    <td class="p-2 font-medium">${u.name}</td>
                                    <td class="p-2 text-indigo-700 font-bold">${u.role}</td>
                                    <td class="p-2">${u.zone || 'সকল'}</td>
                                    <td class="p-2 font-mono text-slate-700 font-bold">${u.username}</td>
                                    <td class="p-2 font-mono text-emerald-800 bg-emerald-50 px-1 rounded">${u.pass}</td>
                                    <td class="p-2 text-slate-500">${u.date || '২০২৬-০৯-০১'}</td>
                                    <td class="p-2 text-center">${statusBadge}</td>
                                    <td class="p-2 text-right whitespace-nowrap">
                                        <button onclick="window.showStaffEditForm(${idx})" class="text-blue-600 bg-blue-50 px-2 py-1 rounded font-semibold mr-1">পরিবর্তন</button>
                                        <button onclick="window.toggleMasterStaffStatus(${idx})" class="${isActive ? 'text-amber-700 bg-amber-50' : 'text-emerald-700 bg-emerald-50'} px-2 py-1 rounded font-semibold mr-1">
                                            ${isActive ? 'নিষ্ক্রিয়' : 'সক্রিয়'}
                                        </button>
                                        ${u.role !== 'admin' ? `<button onclick="window.deleteMasterStaff(${idx})" class="text-red-600 bg-red-50 px-2 py-1 rounded">ডিলিট</button>` : ''}
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

export function showStaffEditForm(idx: number) {
    const div = document.getElementById('mmStaffFormDiv');
    if (!div) return;
    div.classList.remove('hidden');
    const users = getUsers();

    if (idx >= 0 && users[idx]) {
        const u = users[idx];
        (document.getElementById('mmStaffFormTitle') as HTMLElement).innerText = `স্টাফ তথ্য পরিবর্তন: ${u.name}`;
        (document.getElementById('mmStaffIndex') as HTMLInputElement).value = idx.toString();
        (document.getElementById('mmStaffName') as HTMLInputElement).value = u.name;
        (document.getElementById('mmStaffRole') as HTMLSelectElement).value = u.role;
        (document.getElementById('mmStaffZone') as HTMLSelectElement).value = u.zone || 'All';
        (document.getElementById('mmStaffUsername') as HTMLInputElement).value = u.username;
        (document.getElementById('mmStaffPass') as HTMLInputElement).value = u.pass;
        (document.getElementById('mmStaffDate') as HTMLInputElement).value = u.date || new Date().toISOString().split('T')[0];
        (document.getElementById('mmStaffStatus') as HTMLSelectElement).value = u.status === 'Inactive' ? 'Inactive' : 'Active';
        (document.getElementById('mmStaffExistingImg') as HTMLInputElement).value = u.image || '';
    } else {
        (document.getElementById('mmStaffFormTitle') as HTMLElement).innerText = 'নতুন অফিস স্টাফ যুক্ত করুন';
        (document.getElementById('mmStaffIndex') as HTMLInputElement).value = '-1';
        (document.getElementById('mmStaffName') as HTMLInputElement).value = '';
        (document.getElementById('mmStaffRole') as HTMLSelectElement).value = 'factory';
        (document.getElementById('mmStaffZone') as HTMLSelectElement).value = 'All';
        (document.getElementById('mmStaffUsername') as HTMLInputElement).value = 'staff' + (users.length + 1);
        (document.getElementById('mmStaffPass') as HTMLInputElement).value = '12345';
        (document.getElementById('mmStaffDate') as HTMLInputElement).value = new Date().toISOString().split('T')[0];
        (document.getElementById('mmStaffStatus') as HTMLSelectElement).value = 'Active';
        (document.getElementById('mmStaffExistingImg') as HTMLInputElement).value = '';
    }
}

export async function handleSaveMasterStaff(e: Event) {
    e.preventDefault();
    const idx = parseInt((document.getElementById('mmStaffIndex') as HTMLInputElement).value);
    const users = getUsers();
    const fileInput = document.getElementById('mmStaffImageFile') as HTMLInputElement;
    let imgData = (document.getElementById('mmStaffExistingImg') as HTMLInputElement).value;

    if (fileInput?.files && fileInput.files[0]) {
        imgData = await readFileAsBase64(fileInput.files[0]);
    }

    const staffObj: User = {
        name: (document.getElementById('mmStaffName') as HTMLInputElement).value.trim(),
        role: (document.getElementById('mmStaffRole') as HTMLSelectElement).value,
        zone: (document.getElementById('mmStaffZone') as HTMLSelectElement).value,
        username: (document.getElementById('mmStaffUsername') as HTMLInputElement).value.trim(),
        pass: (document.getElementById('mmStaffPass') as HTMLInputElement).value.trim(),
        date: (document.getElementById('mmStaffDate') as HTMLInputElement).value,
        status: (document.getElementById('mmStaffStatus') as HTMLSelectElement).value,
        image: imgData
    };

    if (idx >= 0) users[idx] = staffObj;
    else users.push(staffObj);

    saveUsers(users);
    switchMasterModifyTab('staff');
    if ((window as any).loadAllData) (window as any).loadAllData();
    alert('অফিস স্টাফ তথ্য সফলভাবে সংরক্ষণ করা হয়েছে!');
}

export function toggleMasterStaffStatus(idx: number) {
    const users = getUsers();
    if (!users[idx]) return;
    users[idx].status = users[idx].status === 'Inactive' ? 'Active' : 'Inactive';
    saveUsers(users);
    switchMasterModifyTab('staff');
    if ((window as any).loadAllData) (window as any).loadAllData();
}

export function deleteMasterStaff(idx: number) {
    if (confirm('এই ইউজার ডিলিট করতে চান?')) {
        const users = getUsers();
        users.splice(idx, 1);
        saveUsers(users);
        switchMasterModifyTab('staff');
        if ((window as any).loadAllData) (window as any).loadAllData();
    }
}

if (typeof window !== 'undefined') {
    (window as any).openMasterModifyModal = openMasterModifyModal;
    (window as any).switchMasterModifyTab = switchMasterModifyTab;
    (window as any).showProductEditForm = showProductEditForm;
    (window as any).handleSaveMasterProduct = handleSaveMasterProduct;
    (window as any).toggleMasterProductStatus = toggleMasterProductStatus;
    (window as any).deleteMasterProduct = deleteMasterProduct;
    (window as any).showDealerEditForm = showDealerEditForm;
    (window as any).handleSaveMasterDealer = handleSaveMasterDealer;
    (window as any).toggleMasterDealerStatus = toggleMasterDealerStatus;
    (window as any).deleteMasterDealer = deleteMasterDealer;
    (window as any).showSalesPersonEditForm = showSalesPersonEditForm;
    (window as any).handleSaveMasterSalesPerson = handleSaveMasterSalesPerson;
    (window as any).toggleMasterSalesPersonStatus = toggleMasterSalesPersonStatus;
    (window as any).deleteMasterSalesPerson = deleteMasterSalesPerson;
    (window as any).showStaffEditForm = showStaffEditForm;
    (window as any).handleSaveMasterStaff = handleSaveMasterStaff;
    (window as any).toggleMasterStaffStatus = toggleMasterStaffStatus;
    (window as any).deleteMasterStaff = deleteMasterStaff;
}
