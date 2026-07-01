const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const oldAuthSuccess = `<AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={async (phone) => {
          const blacklistRef = doc(db, "blacklist", phone);
          const blacklistSnap = await getDoc(blacklistRef);
          if (blacklistSnap.exists()) {
            throw new Error("Yeh number register nahi ho sakta.");
          }

          const profileRef = doc(db, "users", phone);
          const profileSnap = await getDoc(profileRef);

          if (profileSnap.exists()) {
            const data = profileSnap.data();
            if (data.status === 'blocked' || data.isBlacklisted) {
              throw new Error("Yeh number register nahi ho sakta.");
            }
          }

          localStorage.setItem("dadu_user_phone", phone);
          window.dispatchEvent(new StorageEvent("storage", { key: "dadu_user_phone" }));
          
          if (!profileSnap.exists()) {
            await setDoc(profileRef, {
              uid: phone,
              name: "",
              phone: phone,
              address: "",
              role: phone === "03277004471" ? "admin" : "buyer",
              status: "locked",
              ordersCount: 0,
              totalOrders: 0,
              isBlacklisted: false,
              createdAt: new Date(),
            });
          }
          setIsAuthOpen(false);
        }}
      />`;

const newAuthSuccess = `<AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={async (inputValue, isStaffMode) => {
          let phone = inputValue;

          if (isStaffMode) {
            // Staff Login Flow
            // If they enter the special admin code or the admin phone number
            if (phone === "03277004471" || phone === "786786" || phone === "admin") {
              phone = "03277004471";
            }
            
            const profileRef = doc(db, "users", phone);
            const profileSnap = await getDoc(profileRef);
            
            if (profileSnap.exists()) {
              const role = profileSnap.data().role;
              if (role !== "admin" && role !== "rider") {
                throw new Error("Invalid Staff Pass Number.");
              }
            } else if (phone === "03277004471") {
               // Admin is logging in for the first time
               await setDoc(profileRef, {
                  uid: phone,
                  name: "meerali120",
                  phone: phone,
                  address: "",
                  role: "admin",
                  status: "verified",
                  ordersCount: 0,
                  totalOrders: 0,
                  isBlacklisted: false,
                  createdAt: new Date(),
               });
            } else {
              throw new Error("Invalid Staff Pass Number. Rider account not found.");
            }

            localStorage.setItem("dadu_user_phone", phone);
            window.dispatchEvent(new StorageEvent("storage", { key: "dadu_user_phone" }));
            
            if (phone === "03277004471") {
              setIsAdminConsoleOpen(true);
            }
            setIsAuthOpen(false);
            return;
          }

          // Normal User Login Flow
          const blacklistRef = doc(db, "blacklist", phone);
          const blacklistSnap = await getDoc(blacklistRef);
          if (blacklistSnap.exists()) {
            throw new Error("Yeh number register nahi ho sakta.");
          }

          const profileRef = doc(db, "users", phone);
          const profileSnap = await getDoc(profileRef);

          if (profileSnap.exists()) {
            const data = profileSnap.data();
            if (data.status === 'blocked' || data.isBlacklisted) {
              throw new Error("Yeh number register nahi ho sakta.");
            }
          }

          localStorage.setItem("dadu_user_phone", phone);
          window.dispatchEvent(new StorageEvent("storage", { key: "dadu_user_phone" }));
          
          if (!profileSnap.exists()) {
            await setDoc(profileRef, {
              uid: phone,
              name: "",
              phone: phone,
              address: "",
              role: "buyer",
              status: "locked", // new users are locked
              ordersCount: 0,
              totalOrders: 0,
              isBlacklisted: false,
              createdAt: new Date(),
            });
          }
          setIsAuthOpen(false);
        }}
      />`;

code = code.replace(oldAuthSuccess, newAuthSuccess);
fs.writeFileSync('src/App.tsx', code);
