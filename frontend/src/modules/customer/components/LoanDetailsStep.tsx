interface LoanData {
  amount: number;
  tenure: number;
  purpose: string;
}
 
interface Props {
  data: LoanData;
  onUpdate: (data: LoanData) => void;
  calculateEMI: (amount: number, tenure: number) => number;
}
 
export default function LoanDetailsStep({ data, onUpdate, calculateEMI }: Props) {
  const tenures = [12, 24, 36, 48, 60];
  const purposes = ['Medical', 'Education', 'Vehicle', 'Home', 'Business', 'Wedding', 'Other'];
 
  const update = (field: keyof LoanData, value: any) => {
    onUpdate({ ...data, [field]: value });
  };
 
  const emi = calculateEMI(data.amount, data.tenure);
 
  return (
    <div>
      <h2 className="text-2xl font-bold text-blue-900 mb-8 text-center">
        LOAN DETAILS CONFIGURATION
      </h2>
      
      {/* Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Amount */}
        <div className="border-2 border-gray-200 rounded-xl p-6">
          <label className="block text-sm font-semibold text-blue-900 mb-4">AMOUNT</label>
          <div className="text-3xl font-bold text-gray-900 mb-4">
            â‚¹{data.amount.toLocaleString()}
          </div>
          <input
            type="range"
            min="50000"
            max="2000000"
            step="10000"
            value={data.amount}
            onChange={(e) => update('amount', parseInt(e.target.value))}
            className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-sm text-gray-500 mt-2">
            <span>50K</span>
            <span>20L</span>
          </div>
        </div>
 
        {/* Tenure */}
        <div className="border-2 border-gray-200 rounded-xl p-6">
          <label className="block text-sm font-semibold text-blue-900 mb-4">TENURE</label>
          <div className="text-3xl font-bold text-gray-900 mb-4">
            {data.tenure} Months
          </div>
          <div className="flex flex-wrap gap-2">
            {tenures.map((t) => (
              <button
                key={t}
                onClick={() => update('tenure', t)}
                className={`
                  px-4 py-2 rounded-lg border-2
                  ${data.tenure === t
                    ? 'bg-blue-100 border-blue-900 text-blue-900'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'}
                `}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
 
        {/* Purpose */}
        <div className="border-2 border-gray-200 rounded-xl p-6">
          <label className="block text-sm font-semibold text-blue-900 mb-4">PURPOSE</label>
          <div className="text-3xl font-bold text-gray-900 mb-4">
            {data.purpose}
          </div>
          <select
            value={data.purpose}
            onChange={(e) => update('purpose', e.target.value)}
            className="w-full p-3 border-2 border-gray-300 rounded-lg"
          >
            {purposes.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>
 
      {/* EMI Preview */}
      <div className="border-t-2 border-gray-200 pt-8">
        <h3 className="text-xl font-bold text-blue-900 mb-6">EMI PREVIEW</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-gray-600 mb-2">Principal: <span className="font-bold">â‚¹{data.amount.toLocaleString()}</span></p>
            <p className="text-gray-600 mb-2">Interest: <span className="font-bold">12.5% p.a.</span></p>
          </div>
          <div>
            <p className="text-gray-600 mb-2">Tenure: <span className="font-bold">{data.tenure}m</span></p>
            <p className="text-gray-600 mb-2">Processing: <span className="font-bold">â‚¹{(data.amount * 0.02).toLocaleString()} (2%)</span></p>
          </div>
        </div>
        <div className="bg-blue-900 text-white rounded-xl p-8 text-center">
          <div className="text-4xl font-bold mb-2">â‚¹{emi.toLocaleString()}</div>
          <div className="text-lg opacity-90">per month</div>
        </div>
      </div>
    </div>
  );
}
