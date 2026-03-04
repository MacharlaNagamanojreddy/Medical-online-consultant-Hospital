import { useState } from 'react';
import { ShoppingCart, Pill, FlaskConical, Plus, X, ListPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Order {
    type: 'Lab' | 'Medication';
    name: string;
    details: string;
}

interface ClinicalOrderPanelProps {
    patientId: string;
    onSave?: (orders: Order[]) => void;
}

const ClinicalOrderPanel = ({ patientId, onSave }: ClinicalOrderPanelProps) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [medName, setMedName] = useState('');
    const [medDose, setMedDose] = useState('');
    const [labType, setLabType] = useState('CBC');

    const addMed = () => {
        if (!medName) return;
        setOrders([...orders, { type: 'Medication', name: medName, details: medDose }]);
        setMedName('');
        setMedDose('');
    };

    const addLab = () => {
        setOrders([...orders, { type: 'Lab', name: labType, details: 'Standard Panel' }]);
    };

    const removeOrder = (index: number) => {
        setOrders(orders.filter((_, i) => i !== index));
    };

    const labOptions = ['CBC', 'Metabolic Panel', 'Lipid Profile', 'Thyroid (TSH)', 'HbA1c', 'Urinalysis', 'Chest X-Ray', 'MRI Brain'];

    return (
        <div className="glass-card p-10 space-y-8 animate-slide-up border-white/5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500/20 to-teal-500/20 text-teal-400 ring-1 ring-teal-500/20">
                        <ListPlus size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white tracking-tight">Order Management</h3>
                        <p className="text-xs text-gray-500 font-medium">Diagnostic & Therapeutic Plan</p>
                    </div>
                </div>
                <ShoppingCart className="text-white/10" size={32} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Lab Orders */}
                <div className="space-y-5">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">
                        <FlaskConical size={14} className="text-orange-400" />
                        Diagnostics & Imaging
                    </div>
                    <div className="flex gap-3">
                        <select
                            value={labType}
                            onChange={(e) => setLabType(e.target.value)}
                            className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500/40 transition-all cursor-pointer hover:bg-white/[0.05]"
                        >
                            {labOptions.map(opt => <option key={opt} value={opt} className="bg-[#0C0F1A]">{opt}</option>)}
                        </select>
                        <button onClick={addLab} className="bg-white/5 text-white hover:bg-teal-500/20 rounded-xl border border-white/10 transition-all hover:scale-105 active:scale-95 size-11 flex items-center justify-center">
                            <Plus size={20} />
                        </button>
                    </div>
                </div>

                {/* Medication Orders */}
                <div className="space-y-5">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">
                        <Pill size={14} className="text-teal-400" />
                        Therapeutic Prescription
                    </div>
                    <div className="space-y-3">
                        <input
                            placeholder="Medication name..."
                            value={medName}
                            onChange={(e) => setMedName(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500/40 transition-all placeholder:text-gray-700"
                        />
                        <div className="flex gap-3">
                            <input
                                placeholder="Dosage (e.g. 500mg BID)"
                                value={medDose}
                                onChange={(e) => setMedDose(e.target.value)}
                                className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500/40 transition-all placeholder:text-gray-700"
                            />
                            <button onClick={addMed} className="bg-white/5 text-white hover:bg-teal-500/20 rounded-xl border border-white/10 transition-all hover:scale-105 active:scale-95 size-11 flex items-center justify-center">
                                <Plus size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Order Cart */}
            <div className="pt-8 border-t border-white/5">
                <div className="flex items-center justify-between mb-6">
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Order Summary ({orders.length})</h4>
                    {orders.length > 0 && (
                        <button
                            onClick={() => setOrders([])}
                            className="text-[10px] font-bold text-red-400/60 hover:text-red-400 uppercase tracking-widest transition-colors"
                        >
                            Clear Cart
                        </button>
                    )}
                </div>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {orders.map((order, i) => (
                        <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 group animate-in slide-in-from-right-4 duration-300 hover:border-teal-500/20 transition-all">
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-lg ${order.type === 'Lab' ? 'bg-orange-500/10 text-orange-400' : 'bg-teal-500/10 text-teal-400'}`}>
                                    {order.type === 'Lab' ? <FlaskConical size={16} /> : <Pill size={16} />}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white tracking-tight">{order.name}</p>
                                    <p className="text-[11px] text-gray-500 font-medium">{order.details}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => removeOrder(i)}
                                className="p-2 text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/5 rounded-lg"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ))}
                    {orders.length === 0 && (
                        <div className="text-center py-10 border border-dashed border-white/10 rounded-2xl">
                            <p className="text-xs text-gray-600 font-medium italic">No diagnostic or therapeutic orders added.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button
                    onClick={() => {
                        if (orders.length === 0) return toast.info('Add orders to the cart first.');
                        onSave?.(orders);
                        toast.success(`${orders.length} clinical orders finalized.`);
                        setOrders([]);
                    }}
                    disabled={orders.length === 0}
                    className="bg-gradient-to-r from-orange-500 to-teal-500 hover:from-orange-600 hover:to-teal-600 text-white rounded-xl px-12 py-6 text-sm font-bold shadow-xl shadow-teal-500/10 transition-all active:scale-95 disabled:grayscale disabled:opacity-50"
                >
                    Finalize Clinical Orders
                </button>
            </div>
        </div>
    );
};

export default ClinicalOrderPanel;
