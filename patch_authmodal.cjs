const fs = require('fs');
let code = fs.readFileSync('src/components/AuthModal.tsx', 'utf-8');

// 1. Add UserCog import if not exists
if (!code.includes('UserCog')) {
  code = code.replace('X, Phone, Loader2, ArrowRight }', 'X, Phone, Loader2, ArrowRight, UserCog, Key }');
}

// 2. Add isStaffMode state
if (!code.includes('isStaffMode')) {
  code = code.replace(
    'const [loading, setLoading] = useState(false);',
    'const [loading, setLoading] = useState(false);\n  const [isStaffMode, setIsStaffMode] = useState(false);'
  );
}

// 3. Update the interface to include isStaffMode
code = code.replace(
  'onAuthSuccess: (phoneNumber: string) => Promise<void> | void;',
  'onAuthSuccess: (phoneNumber: string, isStaffMode?: boolean) => Promise<void> | void;'
);

// 4. Update handleSubmit
code = code.replace(
  `    const cleanPhone = phoneNumber.trim();
    if (!/^03\\d{9}$/.test(cleanPhone)) {
      setError("Please enter a valid 11-digit mobile number starting with 03.");
      return;
    }`,
  `    const cleanPhone = phoneNumber.trim();
    if (!isStaffMode && !/^03\\d{9}$/.test(cleanPhone)) {
      setError("Please enter a valid 11-digit mobile number starting with 03.");
      return;
    }
    if (isStaffMode && cleanPhone.length < 4) {
      setError("Please enter a valid pass number.");
      return;
    }`
);

code = code.replace(
  'await onAuthSuccess(cleanPhone);',
  'await onAuthSuccess(cleanPhone, isStaffMode);'
);

// 5. Add the Staff toggle button (top-left) and update the form for Staff mode
code = code.replace(
  `<button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full z-10 transition-colors"
        >`,
  `<button
          onClick={() => {
            setIsStaffMode(!isStaffMode);
            setPhoneNumber("");
            setError("");
          }}
          className="absolute top-4 left-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full z-10 transition-colors"
          title="Staff Login"
        >
          <UserCog className="w-5 h-5" />
        </button>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full z-10 transition-colors"
        >`
);

// 6. Update text for Staff Mode
code = code.replace(
  `Apna Number Dalein`,
  `{isStaffMode ? "Staff Login" : "Apna Number Dalein"}`
);

code = code.replace(
  `placeholder="03XX-XXXXXXX"`,
  `placeholder={isStaffMode ? "Enter Pass Number" : "03XX-XXXXXXX"}`
);

code = code.replace(
  `disabled={loading || phoneNumber.length < 11}`,
  `disabled={loading || (isStaffMode ? phoneNumber.length < 4 : phoneNumber.length < 11)}`
);

code = code.replace(
  `onChange={(e) => setPhoneNumber(e.target.value.replace(/\\D/g, "").slice(0, 11))}`,
  `onChange={(e) => {
                    const val = e.target.value.replace(/\\D/g, "");
                    setPhoneNumber(isStaffMode ? val.slice(0, 20) : val.slice(0, 11));
                  }}`
);

code = code.replace(
  `<Phone className="absolute left-4 top-3.5 w-5 h-5 text-zinc-500" />`,
  `{isStaffMode ? <Key className="absolute left-4 top-3.5 w-5 h-5 text-zinc-500" /> : <Phone className="absolute left-4 top-3.5 w-5 h-5 text-zinc-500" />}`
);

fs.writeFileSync('src/components/AuthModal.tsx', code);
