// BCarebd.Com Enterprise Management Script
// Core Data Models, Storage Helpers, and State Management

export const bdDistricts = [
    "ঢাকা", "ফরিদপুর", "গাজীপুর", "গোপালগঞ্জ", "কিশোরগঞ্জ", "মাদারীপুর", "মানিকগঞ্জ", "মুন্সিগঞ্জ", "নারায়ণগঞ্জ", "নরসিংদী", "রাজবাড়ী", "শরীয়তপুর", "টাঙ্গাইল",
    "বগুড়া", "জয়পুরহাট", "নওগাঁ", "নাটোর", "চাঁপাইনবাবগঞ্জ", "পাবনা", "রাজশাহী",
    "দিনাজপুর", "গাইবান্ধা", "কুড়িগ্রাম", "লালমনিরহাট", "নীলফামারী", "পঞ্চগড়", "রংপুর", "ঠাকুরগাঁও",
    "বান্দরবান", "ব্রাহ্মণবাড়িয়া", "চাঁদপুর", "চট্টগ্রাম", "কক্সবাজার", "কুমিল্লা", "ফেনী", "খাগড়াশড়ি", "লক্ষ্মীপুর", "নোয়াখালী", "রাঙ্গামাটি",
    "হবিগঞ্জ", "মৌলভীবাজার", "সুনামগঞ্জ", "সিলেট",
    "বাগেরহাট", "চুয়াডাঙ্গা", "যশোর", "ঝিনাইদহ", "খুলনা", "কুষ্টিয়া", "মাগুরা", "মেহেরপুর", "নড়াইল", "সাতক্ষীরা",
    "বরগুনা", "বরিশাল", "ভোলা", "ঝালকাঠি", "পটুয়াখালী", "পিরোজপুর",
    "শেরপুর", "ময়মনসিংহ", "জামালপুর", "নেত্রকোণা"
];

export interface User {
    name: string;
    role: string; // 'admin' | 'factory' | 'accounts' | 'employee' | 'dealer'
    username: string;
    pass: string;
    zone: string;
    code?: string;
    mobile?: string;
    address?: string;
    status?: string;
    image?: string;
    date?: string;
}

export interface Dealer {
    code: string;
    name: string;
    chairman: string;
    zone: string;
    mobile: string;
    address: string;
    image?: string;
    status: 'Active' | 'Inactive' | 'সক্রিয়' | 'নিষ্ক্রিয়';
    date?: string;
    credit?: number;
}

export interface OrderItem {
    code: string;
    name: string;
    unit: string;
    qty: number;
    deliveredQty?: number;
    rate: number;
}

export interface Order {
    id: string;
    date: string;
    dealerCode: string;
    dealerName: string;
    zone: string;
    emp: string;
    items: OrderItem[];
    amount: number;
    collection: number;
    due: number;
    deliveryStatus: 'Pending' | 'Delivered';
    creditUsed?: number;
}

export interface Product {
    code: string;
    name: string;
    unit: string;
    rate: number;
    stock: number;
    badStock?: number;
    image?: string;
    status?: 'Active' | 'Inactive';
    date?: string;
}

export interface SalesPerson {
    id: string;
    name: string;
    designation: string;
    zone: string;
    compMobile: string;
    persMobile?: string;
    dob?: string;
    blood?: string;
    emergency?: string;
    nid: string;
    salary: string;
    promotion?: string;
    responsibility?: string;
    address?: string;
    transfer?: string;
    status: string;
    image?: string;
    date?: string;
}

export interface ChallanItem {
    code: string;
    name: string;
    unit: string;
    qty: number;
    rate: number;
    ordersInfo: string;
}

export interface PendingItemRemaining {
    orderId: string;
    orderDate: string;
    code: string;
    name: string;
    unit: string;
    remainingQty: number;
}

export interface Challan {
    id: string;
    dealerCode: string;
    dealerName: string;
    dealerZone: string;
    dealerMobile: string;
    dealerAddress: string;
    preparedBy: string;
    timestamp: string;
    date: string;
    items: ChallanItem[];
    remainingPending: PendingItemRemaining[];
    totalQty: number;
    notes?: string;
    printCount?: number;
}

export function getChallans(): Challan[] {
    const data = localStorage.getItem('bcare_challans');
    if (data) {
        try { 
            const parsed = JSON.parse(data); 
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch { /* fallback */ }
    }
    return [
        {
            id: 'CHL-146409',
            dealerCode: '2201',
            dealerName: 'Aleya International',
            dealerZone: 'ঢাকা',
            dealerMobile: '01711538134',
            dealerAddress: 'House-12, Road-4, Dhanmondi, Dhaka-1205',
            preparedBy: 'ফ্যাক্টরি ম্যানেজার',
            timestamp: '2026-09-27 10:15:30',
            date: '2026-09-27',
            items: [
                {
                    code: '8801',
                    name: 'Calcium Oral Liquid (with Phosphorus, Vitamin D3 & B12)',
                    unit: 'লিটার',
                    qty: 14,
                    rate: 550,
                    ordersInfo: 'ORD-1001 (তারিখ: 2026-09-25, পরিমাণ: 14)'
                }
            ],
            remainingPending: [
                {
                    orderId: 'ORD-1001',
                    orderDate: '2026-09-25',
                    code: '8801',
                    name: 'Calcium Oral Liquid',
                    unit: 'লিটার',
                    remainingQty: 6
                }
            ],
            totalQty: 14,
            notes: 'ট্রাক নং: ঢাকা মেট্রো-ট-১২৩৪, চালক: রফিক (০১৭১...)',
            printCount: 1
        },
        {
            id: 'CHL-146410',
            dealerCode: '2202',
            dealerName: 'Alliance Animal Health',
            dealerZone: 'সিলেট',
            dealerMobile: '01716146397',
            dealerAddress: 'Nayasarak Main Road, Sylhet',
            preparedBy: 'ফ্যাক্টরি ম্যানেজার',
            timestamp: '2026-10-01 11:30:15',
            date: '2026-10-01',
            items: [
                {
                    code: '8802',
                    name: 'Calcium Borogluconate (Injection)',
                    unit: 'পিস',
                    qty: 16,
                    rate: 250,
                    ordersInfo: 'ORD-1002 (তারিখ: 2026-09-28, পরিমাণ: 16)'
                }
            ],
            remainingPending: [],
            totalQty: 16,
            notes: 'ট্রাক নং: সিলেট-ট-৫৬৭৮, চালক: জামিল (০১৭১৬...)',
            printCount: 1
        }
    ];
}

export function saveChallans(d: Challan[]) {
    localStorage.setItem('bcare_challans', JSON.stringify(d));
}

export interface SalesTarget {
    name: string;
    category: string;
    zone: string;
    target: number;
    achieved: number;
}

export function getUsers(): User[] {
    const data = localStorage.getItem('bcare_users');
    let list: User[] = [];
    if (data) {
        try { list = JSON.parse(data); } catch { /* fallback */ }
    }
    
    const defaults: User[] = [
        {name: 'Admin 1 (এডমিন এক)', role: 'admin', username: 'admin1', pass: '12345', zone: 'All', status: 'Active', date: '2026-09-01', image: ''},
        {name: 'Admin 2 (এডমিন দুই)', role: 'admin', username: 'admin2', pass: '12345', zone: 'All', status: 'Active', date: '2026-09-01', image: ''},
        {name: 'Admin', role: 'admin', username: 'admin', pass: '12345', zone: 'All', status: 'Active', date: '2026-09-01', image: ''},
        {name: 'ফ্যাক্টরি ম্যানেজার', role: 'factory', username: 'factory1', pass: '12345', zone: 'All', status: 'Active', date: '2026-09-01', image: ''},
        {name: 'একাউন্টস ম্যানেজার', role: 'accounts', username: 'acc1', pass: '12345', zone: 'All', status: 'Active', date: '2026-09-01', image: ''},
        {name: 'Md. Rakibul Hasan', role: 'employee', username: 'emp1', code: '9901', pass: '12345', zone: 'ঢাকা', status: 'Active', date: '2026-09-01', image: ''},
        {name: 'Kamal Ahmed', role: 'employee', username: 'emp2', code: '9902', pass: '12345', zone: 'সিলেট', status: 'Active', date: '2026-09-01', image: ''},
        {name: 'Aleya International', role: 'dealer', username: '2201', code: '2201', pass: '12345', zone: 'ঢাকা', mobile: '01711538134', address: 'House-12, Road-4, Dhanmondi, Dhaka-1205', status: 'Active', date: '2026-09-01', image: ''},
        {name: 'Alliance Animal Health', role: 'dealer', username: '2202', code: '2202', pass: '12345', zone: 'সিলেট', mobile: '01716146397', address: 'Nayasarak Main Road, Sylhet', status: 'Active', date: '2026-09-05', image: ''},
        {name: 'Dhaka Agro Vet Traders', role: 'dealer', username: '2203', code: '2203', pass: '12345', zone: 'ঢাকা', mobile: '01711000001', address: 'Mirpur-10, Dhaka', status: 'Inactive', date: '2026-09-10', image: ''},
        {name: 'Chittagong Vet Care', role: 'dealer', username: '2204', code: '2204', pass: '12345', zone: 'চট্টগ্রাম', mobile: '01819000002', address: 'GEC Circle, Chittagong', status: 'Active', date: '2026-09-15', image: ''}
    ];

    if (list.length === 0) {
        return defaults;
    }

    defaults.forEach(def => {
        if (!list.some(u => u.username.toLowerCase() === def.username.toLowerCase())) {
            list.push(def);
        }
    });

    return list;
}

export function saveUsers(d: User[]) {
    localStorage.setItem('bcare_users', JSON.stringify(d));
}

export function getDealers(): Dealer[] {
    const data = localStorage.getItem('bcare_dealers');
    if (data) {
        try { return JSON.parse(data); } catch { /* fallback */ }
    }
    return [
        {code: '2201', name: 'Aleya International', chairman: 'KHONDAKAR MONSUR HOSSAIN', zone: 'ঢাকা', mobile: '01711538134', address: 'House-12, Road-4, Dhanmondi, Dhaka-1205', image: '', status: 'Active', date: '2026-09-01'},
        {code: '2202', name: 'Alliance Animal Health', chairman: 'MD SHIRAJUL HOQUE', zone: 'সিলেট', mobile: '01716146397', address: 'Nayasarak Main Road, Sylhet', image: '', status: 'Active', date: '2026-09-05'},
        {code: '2203', name: 'Dhaka Agro Vet Traders', chairman: 'MOHAMMAD ALI', zone: 'ঢাকা', mobile: '01711000001', address: 'Mirpur-10, Dhaka', image: '', status: 'Inactive', date: '2026-09-10'},
        {code: '2204', name: 'Chittagong Vet Care', chairman: 'RAFIQUL ISLAM', zone: 'চট্টগ্রাম', mobile: '01819000002', address: 'GEC Circle, Chittagong', image: '', status: 'Active', date: '2026-09-15'}
    ];
}

export function saveDealers(d: Dealer[]) {
    localStorage.setItem('bcare_dealers', JSON.stringify(d));
}

export function getProducts(): Product[] {
    const data = localStorage.getItem('bcare_products');
    if (data) {
        try { 
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch { /* fallback */ }
    }
    return [
        {code: '8801', name: 'Calcium Oral Liquid (with Phosphorus, Vitamin D3 & B12)', unit: 'লিটার', rate: 550, stock: 500, badStock: 15, image: '', status: 'Active', date: '2026-09-01'},
        {code: '8802', name: 'Calcium Borogluconate (Injection)', unit: 'পিস', rate: 250, stock: 300, badStock: 8, image: '', status: 'Active', date: '2026-09-01'},
        {code: '8803', name: 'Calcium Phosphate (Feed Grade Powder)', unit: 'কেজি', rate: 180, stock: 800, badStock: 0, image: '', status: 'Active', date: '2026-09-01'}
    ];
}

export function saveProducts(d: Product[]) {
    localStorage.setItem('bcare_products', JSON.stringify(d));
}

export function getOrders(): Order[] {
    const data = localStorage.getItem('bcare_orders');
    if (data) {
        try { 
            const parsed: Order[] = JSON.parse(data);
            if (Array.isArray(parsed) && parsed.length > 0) {
                // Fix for Aleya International demo if not updated yet
                const ord1 = parsed.find(o => o.id === 'ORD-1001');
                if (ord1 && ord1.items && ord1.items[0]) {
                    if (ord1.items[0].deliveredQty === undefined || ord1.items[0].deliveredQty === 0) {
                        ord1.items[0].deliveredQty = 14;
                    }
                }
                return parsed;
            }
        } catch { /* fallback */ }
    }
    return [
        {
            id: 'ORD-1001',
            date: '2026-09-25',
            dealerCode: '2201',
            dealerName: 'Aleya International',
            zone: 'ঢাকা',
            emp: 'Md. Rakibul Hasan',
            items: [{code: '8801', name: 'Calcium Oral Liquid', unit: 'লিটার', qty: 20, deliveredQty: 14, rate: 550}],
            amount: 11000,
            collection: 8000,
            due: 3000,
            deliveryStatus: 'Pending'
        },
        {
            id: 'ORD-1002',
            date: '2026-09-28',
            dealerCode: '2202',
            dealerName: 'Alliance Animal Health',
            zone: 'সিলেট',
            emp: 'Kamal Ahmed',
            items: [{code: '8802', name: 'Calcium Borogluconate', unit: 'পিস', qty: 16, deliveredQty: 16, rate: 250}],
            amount: 4000,
            collection: 4000,
            due: 0,
            deliveryStatus: 'Delivered'
        }
    ];
}

export function saveOrders(d: Order[]) {
    localStorage.setItem('bcare_orders', JSON.stringify(d));
    localStorage.setItem('bcare_last_update', Date.now().toString());
}

export function getSalesPersons(): SalesPerson[] {
    const data = localStorage.getItem('bcare_sales_persons');
    if (data) {
        try { return JSON.parse(data); } catch { /* fallback */ }
    }
    return [
        {id: '9901', name: 'Md. Rakibul Hasan', designation: 'Territory Sales Officer', zone: 'ঢাকা', compMobile: '01712345671', persMobile: '01812345671', dob: '1995-01-15', blood: 'B+', emergency: '01912345671', nid: '1995123456789', salary: '25000', promotion: 'Eligible for ASM', responsibility: 'Dealer management & sales monitoring in Dhaka zone', address: 'Dhanmondi, Dhaka', transfer: 'Joining from Head Office', status: 'Active', image: ''},
        {id: '9902', name: 'Kamal Ahmed', designation: 'Area Sales Manager', zone: 'সিলেট', compMobile: '01712345672', persMobile: '01812345672', dob: '1992-05-20', blood: 'A+', emergency: '01912345672', nid: '1992987654321', salary: '32000', promotion: 'Senior Manager', responsibility: 'Sylhet division sales & network', address: 'Zindabazar, Sylhet', transfer: 'Promoted', status: 'Active', image: ''}
    ];
}

export function saveSalesPersons(d: SalesPerson[]) {
    localStorage.setItem('bcare_sales_persons', JSON.stringify(d));
}

export function getSalesTargets(): SalesTarget[] {
    const data = localStorage.getItem('bcare_sales_targets');
    if (data) {
        try { return JSON.parse(data); } catch { /* fallback */ }
    }
    return [
        {name: 'Md. Rakibul Hasan', category: 'SalesPerson', zone: 'ঢাকা', target: 500000, achieved: 350000},
        {name: 'Kamal Ahmed', category: 'SalesPerson', zone: 'সিলেট', target: 450000, achieved: 420000},
        {name: 'Aleya International', category: 'Dealer', zone: 'ঢাকা', target: 300000, achieved: 220000},
        {name: 'Alliance Animal Health', category: 'Dealer', zone: 'সিলেট', target: 350000, achieved: 310000}
    ];
}

export function saveSalesTargets(d: SalesTarget[]) {
    localStorage.setItem('bcare_sales_targets', JSON.stringify(d));
}

export function getDealerApps(): any[] {
    return JSON.parse(localStorage.getItem('bcare_dealer_apps') || '[]');
}

export function saveDealerApps(d: any[]) {
    localStorage.setItem('bcare_dealer_apps', JSON.stringify(d));
}

export function getLiveApps(): any[] {
    return JSON.parse(localStorage.getItem('bcare_live_apps') || '[]');
}

export function saveLiveApps(d: any[]) {
    localStorage.setItem('bcare_live_apps', JSON.stringify(d));
}

export function getCurrentRole(): string {
    return localStorage.getItem('bcare_role') || 'guest';
}

export function getCurrentUser(): string {
    return localStorage.getItem('bcare_user') || 'Admin';
}

export function getCurrentZone(): string {
    return localStorage.getItem('bcare_zone') || 'ঢাকা';
}

export function getCurrentUsername(): string {
    return localStorage.getItem('bcare_username') || 'admin';
}

export function getCurrentDealerCode(): string {
    const directCode = localStorage.getItem('bcare_dealer_code');
    if (directCode) return directCode;
    const username = getCurrentUsername();
    const user = getCurrentUser();
    const dealers = getDealers();
    const d = dealers.find(x => x.code === username || x.name === user || username.includes(x.code) || user.includes(x.code));
    return d ? d.code : '2201';
}

export interface AppNotification {
    id: string;
    targetUser: string;
    title: string;
    message: string;
    type: 'dealer_approval' | 'leave_approval' | 'general' | 'challan_ready' | 'production_approval' | 'sales_return' | 'order_cancel';
    date: string;
    read: boolean;
    readByUsers?: string[];
    challanId?: string;
}

export interface ProductionEntry {
    id: string;
    batchNo: string;
    prodCode: string;
    prodName: string;
    unit: string;
    qty: number;
    approvedQty?: number;
    date: string;
    enteredBy: string;
    notes?: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    adminNote?: string;
}

export function getProductionEntries(): ProductionEntry[] {
    return JSON.parse(localStorage.getItem('bcare_production_entries') || '[]');
}

export function saveProductionEntries(d: ProductionEntry[]) {
    localStorage.setItem('bcare_production_entries', JSON.stringify(d));
}

export interface SalesReturnItem {
    code: string;
    name: string;
    unit: string;
    qty: number;
    rate: number;
    condition: 'Damaged' | 'Good';
}

export interface SalesReturn {
    id: string;
    dealerCode: string;
    dealerName: string;
    dealerZone: string;
    challanId: string;
    date: string;
    items: SalesReturnItem[];
    reason: 'ড্যামেজ' | 'ডিলার গ্রহণ করেনি' | 'অন্যান্য';
    note?: string;
    challanPhoto?: string;
    enteredBy: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    adminNote?: string;
}

export function getSalesReturns(): SalesReturn[] {
    return JSON.parse(localStorage.getItem('bcare_sales_returns') || '[]');
}

export function saveSalesReturns(d: SalesReturn[]) {
    localStorage.setItem('bcare_sales_returns', JSON.stringify(d));
}

export interface OrderCancelRequest {
    id: string;
    orderId: string;
    dealerCode: string;
    dealerName: string;
    itemCode: string;
    itemName: string;
    unit: string;
    cancelQty: number;
    amount: number;
    requestedBy: string;
    date: string;
    reason: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    adminNote?: string;
}

export function getOrderCancelRequests(): OrderCancelRequest[] {
    return JSON.parse(localStorage.getItem('bcare_order_cancel_requests') || '[]');
}

export function saveOrderCancelRequests(d: OrderCancelRequest[]) {
    localStorage.setItem('bcare_order_cancel_requests', JSON.stringify(d));
}

export interface LeaveApplication {
    id: string;
    name: string;
    username: string;
    zone: string;
    reason: string;
    days: number;
    approvedDays?: number;
    fromDate: string;
    toDate: string;
    applyDate: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    adminNote?: string;
}

export function getLeaveApplications(): LeaveApplication[] {
    const data = localStorage.getItem('bcare_leave_applications');
    if (data) return JSON.parse(data);
    return [
        {
            id: 'LV-101',
            name: 'Md. Rakibul Hasan',
            username: 'emp1',
            zone: 'ঢাকা',
            reason: 'জরুরি পারিবারিক কাজ',
            days: 3,
            fromDate: '2026-10-05',
            toDate: '2026-10-07',
            applyDate: '2026-10-01',
            status: 'Pending'
        }
    ];
}

export function saveLeaveApplications(d: LeaveApplication[]) {
    localStorage.setItem('bcare_leave_applications', JSON.stringify(d));
}

export function getNotifications(): AppNotification[] {
    const data = localStorage.getItem('bcare_notifications');
    if (data) {
        try { return JSON.parse(data); } catch { /* fallback */ }
    }
    return [
        {
            id: 'NOTIF-146410',
            targetUser: 'All',
            title: '📦 নতুন চালান প্রস্তুত: CHL-146410',
            message: '2026-10-01 তারিখে ডিলার [Alliance Animal Health] এর জন্য 16 পিস পণ্যের চালান সফলভাবে প্রস্তুত হয়েছে। প্রস্তুতকারক: ফ্যাক্টরি ম্যানেজার',
            type: 'challan_ready',
            date: '2026-10-01',
            read: false,
            challanId: 'CHL-146410'
        }
    ];
}

export function saveNotifications(d: AppNotification[]) {
    localStorage.setItem('bcare_notifications', JSON.stringify(d));
}

export function getUserReadNotifIds(userKey: string): string[] {
    if (!userKey) return [];
    try {
        const stored = localStorage.getItem(`bcare_read_notifs_${userKey.toLowerCase().trim()}`);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

export function markNotifAsReadForUser(notifId: string, userKey: string): void {
    if (!userKey || !notifId) return;
    const key = `bcare_read_notifs_${userKey.toLowerCase().trim()}`;
    const ids = getUserReadNotifIds(userKey);
    if (!ids.includes(notifId)) {
        ids.push(notifId);
        localStorage.setItem(key, JSON.stringify(ids));
    }
}

export function markAllNotifsAsReadForUser(userKey: string, notifIds: string[]): void {
    if (!userKey) return;
    const key = `bcare_read_notifs_${userKey.toLowerCase().trim()}`;
    const ids = getUserReadNotifIds(userKey);
    notifIds.forEach(id => {
        if (!ids.includes(id)) ids.push(id);
    });
    localStorage.setItem(key, JSON.stringify(ids));
}

export function isDealerActive(dealer: Dealer): boolean {
    const s = (dealer.status || '').toLowerCase().trim();
    return s === 'active' || s === 'সক্রিয়';
}
